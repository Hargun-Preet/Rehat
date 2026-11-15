"""Liquidity forecasting for Income: cash needed for each monthly settlement, season and annual views.

Forecasts NEVER change a payout or a price (AGENTS.md). They plan Income's cash and reinsurance only.

Data model (same as the back-test): daily counted hours a worker per station group, heat from hourly WBGT (observed
where NEA has it, corrected ERA5 rebuild elsewhere), rain from MSS daily via the estimator, Sundays excluded.
Month-end Monte Carlo: days already passed are actual; the next 1 to 3 days come from the archived Open-Meteo forecast
(converted to WBGT with the same Liljegren code and station bias); the remaining days are a block from one historical
year per path (same calendar month), shared by all stations so spatial correlation is kept.
"""
from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import date, timedelta
from functools import lru_cache

import numpy as np
import pandas as pd

from rehat import backtest as B
from rehat import rules
from rehat.ingest.openmeteo import cell_id
from rehat.ledger import demo_book
from rehat.paths import DOCS, PROCESSED, WEB_DATA
from rehat.stations import nearest, psi_region_for, station_by_id, wbgt_stations
from rehat.wbgt_rebuild import rebuild_cell

N_PATHS = 2000
FORECAST_DAYS = 3
SEED = 11


# ---------------------------------------------------------------- daily arrays
@dataclass
class Daily:
    dates: pd.DatetimeIndex
    heat: np.ndarray  # (groups, days) counted heat hours a worker
    rain: np.ndarray  # (groups, days)
    payrate: np.ndarray  # (groups,) sum over firms of workers x benefit (S$ per insured hour)
    workers: np.ndarray
    group_station: list[str]


@lru_cache
def daily() -> Daily:
    d = pd.read_parquet(PROCESSED / "wbgt_hourly_rebuilt.parquet", columns=["station_id", "hour", "wbgt"])
    d = d[(d.hour.dt.weekday < 6) & (d.hour.dt.hour != rules.DEFAULT_MEAL_HOUR) & (d.hour.dt.year >= B.FIRST_YEAR)]
    w = d.pivot(index="hour", columns="station_id", values="wbgt").sort_index()
    cols = list(w.columns)
    X = w.values.astype("float32")
    day_idx = w.index.normalize()
    dates = pd.date_range(day_idx.min(), day_idx.max(), freq="D")
    pos = dates.get_indexer(day_idx)

    rm_share = B.rain_monthly_by_mss()[1]
    m = B.mss_daily()
    m = m[(m.date.dt.year >= B.FIRST_YEAR)].copy()
    m["est"] = B.rain_day_hours(m.rain_mm.values, m.rain_max60_mm.values) * rm_share
    m.loc[m.date.dt.weekday == 6, "est"] = 0.0
    rain_by_code = {c: g.set_index("date").est.reindex(dates) for c, g in m.groupby("station_code")}
    changi = rain_by_code["S24"]

    pool = tuple(s for s in wbgt_stations() if s.station_id in cols)
    groups: dict[tuple, list] = {}
    for f in demo_book():
        site = f.sites[0]
        st = nearest(site.lat, site.lon, pool, 1)[0][0].station_id
        key = (st, B.mss_for_station(site.lat, site.lon))
        groups.setdefault(key, []).append(f)
    heat, rain, payrate, workers, gst = [], [], [], [], []
    for (st, code), firms in sorted(groups.items()):
        mins = B.heat_minutes(X[:, cols.index(st)])
        hd = np.zeros(len(dates))
        np.add.at(hd, pos, np.nan_to_num(mins) / 60.0)
        heat.append(hd)
        r = rain_by_code.get(code, changi).fillna(changi).fillna(0.0).values
        rain.append(r)
        payrate.append(sum(f.outdoor_workers * f.benefit for f in firms))
        workers.append(sum(f.outdoor_workers for f in firms))
        gst.append(st)
    return Daily(dates, np.array(heat), np.array(rain), np.array(payrate, float), np.array(workers, float), gst)


@lru_cache
def normals() -> tuple[np.ndarray, np.ndarray]:
    """(groups, 12) monthly normals of heat and rain, baseline years."""
    D = daily()
    yrs = D.dates.year
    sel = (yrs >= B.BASELINE[0]) & (yrs <= B.BASELINE[1])
    months = D.dates.month.values
    nh = np.zeros((D.heat.shape[0], 12))
    nr = np.zeros_like(nh)
    n_years = B.BASELINE[1] - B.BASELINE[0] + 1
    for mth in range(1, 13):
        msk = sel & (months == mth)
        nh[:, mth - 1] = D.heat[:, msk].sum(axis=1) / n_years
        nr[:, mth - 1] = D.rain[:, msk].sum(axis=1) / n_years
    return nh, nr


def month_payout(heat_m: np.ndarray, rain_m: np.ndarray, month: int, ytd: np.ndarray | float = 0.0) -> np.ndarray:
    """Book payout (S$) from month totals per group (..., groups). Applies allowance, monthly and yearly caps."""
    nh, nr = normals()
    D = daily()
    ins = np.clip(heat_m - 1.25 * nh[:, month - 1], 0, None) + np.clip(rain_m - 1.25 * nr[:, month - 1], 0, None)
    ins = np.minimum(np.minimum(ins, rules.MONTHLY_CAP_H), np.clip(rules.YEARLY_CAP_H - ytd, 0, None))
    return (ins * D.payrate).sum(axis=-1)


def _month_slice(y: int, m: int) -> np.ndarray:
    D = daily()
    return np.where((D.dates.year == y) & (D.dates.month == m))[0]


def actual_month(y: int, m: int) -> tuple[float, np.ndarray]:
    D = daily()
    sl = _month_slice(y, m)
    ytd = ytd_insured(y, m)
    return float(month_payout(D.heat[:, sl].sum(axis=1), D.rain[:, sl].sum(axis=1), m, ytd)), ytd


def ytd_insured(y: int, m: int) -> np.ndarray:
    """Insured hours already paid per group in earlier months of the calendar (policy) year."""
    D = daily()
    nh, nr = normals()
    ytd = np.zeros(D.heat.shape[0])
    for mm in range(1, m):
        sl = _month_slice(y, mm)
        if len(sl) == 0:
            continue
        ins = np.clip(D.heat[:, sl].sum(axis=1) - 1.25 * nh[:, mm - 1], 0, None) + np.clip(D.rain[:, sl].sum(axis=1) - 1.25 * nr[:, mm - 1], 0, None)
        ytd += np.minimum(np.minimum(ins, rules.MONTHLY_CAP_H), np.clip(rules.YEARLY_CAP_H - ytd, 0, None))
    return ytd


# ---------------------------------------------------------------- forecast
@lru_cache
def forecast_daily() -> tuple[pd.DatetimeIndex, np.ndarray, np.ndarray] | None:
    """Archived forecast -> daily counted heat and rain hours per group (same groups as daily())."""
    p = PROCESSED / "forecast_hourly.parquet"
    if not p.exists():
        return None
    fc = pd.read_parquet(p)
    reb = pd.read_parquet(PROCESSED / "wbgt_hourly_rebuilt.parquet", columns=["station_id", "hour", "wbgt_raw", "wbgt_rebuilt"])
    reb["month"], reb["hod"] = reb.hour.dt.month, reb.hour.dt.hour
    bias = (reb.wbgt_rebuilt - reb.wbgt_raw).groupby([reb.station_id, reb.month, reb.hod]).mean()
    D = daily()
    out_h, out_r = [], []
    cache: dict[str, pd.DataFrame] = {}
    dates = None
    for st in D.group_station:
        s = station_by_id(st)
        cid = cell_id(s.lat, s.lon)
        if cid not in cache:
            e = fc[fc.cell_id == cid].rename(columns={"cell_id": "cid"})
            lat, lon = (float(x) for x in cid[1:].split("_"))
            r = rebuild_cell(e, lat, lon)
            r["precip"] = e.sort_values("ts_sgt").precipitation.shift(-1).values
            cache[cid] = r
        r = cache[cid].copy()
        r = r[(r.hour.dt.weekday < 6) & (r.hour.dt.hour >= 8) & (r.hour.dt.hour < 18) & (r.hour.dt.hour != 12)]
        b = bias.reindex(pd.MultiIndex.from_arrays([[st] * len(r), r.hour.dt.month, r.hour.dt.hour])).fillna(0).values
        r["wbgt"] = r.wbgt_raw.values + b
        r["heat"] = B.heat_minutes(r.wbgt.values) / 60.0
        r["rain"] = [rules.rain_hours(x) if np.isfinite(x) else 0.0 for x in r.precip.values]
        g = r.groupby(r.hour.dt.normalize())[["heat", "rain"]].sum()
        if dates is None:
            dates = pd.date_range(g.index.min(), g.index.max(), freq="D")
        g = g.reindex(dates).fillna(0)
        out_h.append(g.heat.values)
        out_r.append(g.rain.values)
    return dates, np.array(out_h), np.array(out_r)


# ---------------------------------------------------------------- Monte Carlo
def forecast_month(asof: date, n_paths: int = N_PATHS, pool_years: list[int] | None = None, use_forecast: bool = True,
                   year_weights: dict[int, float] | None = None, seed: int = SEED) -> dict:
    """Distribution of the month's book payout as of `asof` (data known for days before asof)."""
    D = daily()
    y, m = asof.year, asof.month
    sl = _month_slice(y, m)
    month_days = pd.date_range(date(y, m, 1), periods=pd.Period(f"{y}-{m:02d}").days_in_month, freq="D")
    known = month_days < pd.Timestamp(asof)
    k = int(known.sum())
    ytd = ytd_insured(y, m)
    if pool_years is None:
        pool_years = [yy for yy in range(B.FIRST_YEAR, y) if len(_month_slice(yy, m)) >= 28]
    rng = np.random.default_rng(seed)
    if year_weights:
        wts = np.array([year_weights.get(yy, 0.0) for yy in pool_years], float)
        wts = wts / wts.sum()
    else:
        wts = None
    draw = rng.choice(pool_years, size=n_paths, p=wts)
    acc_h = D.heat[:, sl[:k]].sum(axis=1) if k else np.zeros(D.heat.shape[0])
    acc_r = D.rain[:, sl[:k]].sum(axis=1) if k else np.zeros(D.heat.shape[0])
    rem_days = month_days[k:]
    fc_used = 0
    fc_h = np.zeros(D.heat.shape[0])
    fc_r = np.zeros(D.heat.shape[0])
    if use_forecast and len(rem_days):
        f = forecast_daily()
        if f is not None:
            fdates, FH, FR = f
            for dd in rem_days[:FORECAST_DAYS]:
                i = fdates.get_indexer([dd])[0]
                if i >= 0:
                    fc_h += FH[:, i]
                    fc_r += FR[:, i]
                    fc_used += 1
    sim_days = rem_days[fc_used:]
    dom = sim_days.day.values
    totals_h = np.zeros((n_paths, D.heat.shape[0]))
    totals_r = np.zeros_like(totals_h)
    for yy in np.unique(draw):
        idx = np.where(draw == yy)[0]
        ys = _month_slice(int(yy), m)
        ydates = D.dates[ys]
        sel = ys[np.isin(ydates.day.values, dom)]
        totals_h[idx] = D.heat[:, sel].sum(axis=1)
        totals_r[idx] = D.rain[:, sel].sum(axis=1)
    H = acc_h + fc_h + totals_h
    R = acc_r + fc_r + totals_r
    pay = month_payout(H, R, m, ytd)
    accrued_if_ended = float(month_payout(acc_h, acc_r, m, ytd))
    q = np.quantile(pay, [0.1, 0.5, 0.9, 0.99])
    return {
        "asof": asof.isoformat(), "month": f"{y}-{m:02d}", "settlement_date": rules.settlement_date(f"{y}-{m:02d}").isoformat(),
        "days_known": k, "forecast_days_used": fc_used, "paths": n_paths, "pool_years": [int(min(pool_years)), int(max(pool_years))],
        "accrued_counted_heat_h_per_worker": round(float((acc_h * D.workers).sum() / D.workers.sum()), 3),
        "accrued_counted_rain_h_per_worker": round(float((acc_r * D.workers).sum() / D.workers.sum()), 3),
        "insured_if_month_ended_today": round(accrued_if_ended),
        "p10": round(float(q[0])), "p50": round(float(q[1])), "p90": round(float(q[2])), "p99": round(float(q[3])),
        "buffer_p99_minus_p50": round(float(q[3] - q[1])),
        "mean": round(float(pay.mean())),
        "histogram": np.histogram(pay, bins=24)[0].tolist(), "histogram_edges": [round(float(x)) for x in np.histogram(pay, bins=24)[1]],
    }


def fan(y: int, m: int, step: int = 1) -> list[dict]:
    out = []
    n = pd.Period(f"{y}-{m:02d}").days_in_month
    for d in range(1, n + 2, step):
        asof = date(y, m, 1) + timedelta(days=d - 1)
        r = forecast_month(asof if asof.month == m else date(y, m, n) + timedelta(days=1) - timedelta(days=0), n_paths=600) if asof.month == m else None
        if r is None:
            act, _ = actual_month(y, m)
            out.append({"day": d, "p10": round(act), "p50": round(act), "p90": round(act), "p99": round(act), "accrued": round(act)})
            continue
        out.append({"day": d, "p10": r["p10"], "p50": r["p50"], "p90": r["p90"], "p99": r["p99"], "accrued": r["insured_if_month_ended_today"]})
    return out


# ---------------------------------------------------------------- season and annual views
@lru_cache
def year_states(season_months: tuple[int, ...] = (8, 9, 10)) -> dict[int, str]:
    oni = pd.read_parquet(PROCESSED / "oni.parquet")
    o = oni[oni.month.isin(season_months)].groupby("year").oni.mean()
    from rehat.ingest.noaa import enso_state

    return {int(y): enso_state(float(v)) for y, v in o.items()}


def season_view(month: int = 10) -> dict:
    bt = json.loads((PROCESSED / "backtest.json").read_text())
    years = bt["base"]["years"]
    annual_h = np.array(bt["base"]["annual_insured_h"])
    pr = json.loads((PROCESSED / "pricing.json").read_text())
    prem = pr["plans"][0]["year"]
    st = year_states()
    D = daily()
    monthly = {yy: actual_month(yy, month)[0] for yy in years if len(_month_slice(yy, month)) >= 28}
    rows = []
    for state in ("El Nino", "neutral", "La Nina"):
        ys = [yy for yy in years if st.get(yy) == state]
        if not ys:
            continue
        lr = annual_h[[years.index(yy) for yy in ys]] * 8.0 / prem
        cash = np.array([monthly[yy] for yy in ys if yy in monthly])
        rows.append({"state": state, "years": ys, "n": len(ys), "annual_lr_mean": round(float(lr.mean()), 3), "annual_lr_p90": round(float(np.quantile(lr, 0.9)), 3),
                     "month_cash_mean": round(float(cash.mean())) if len(cash) else None, "month_cash_p90": round(float(np.quantile(cash, 0.9))) if len(cash) else None})
    current = st.get(max(st))
    return {"month": month, "book_workers": int(D.workers.sum()), "states": rows, "latest_state": current, "latest_year": int(max(st)),
            "note": "Years classified by mean ONI over Aug to Oct (haze and inter-monsoon season). Reweighting changes cash planning only."}


def annual_view() -> dict:
    pr = json.loads((PROCESSED / "pricing.json").read_text())
    lr = pr["loss_ratios"]
    re = pr["reinsurance"]
    D = daily()
    prem_book = float(sum(f.outdoor_workers * (pr["plans"][0]["year"] if f.plan == "Standard" else pr["plans"][1]["year"]) for f in demo_book()))
    return {"loss_ratio_by_year": dict(zip(lr["years"], lr["by_year"])), "expected_lr": lr["expected"], "one_in_ten_lr": lr["one_in_ten"],
            "worst_lr": lr["worst_backtest"], "haze_stress_lr": lr["worst_plus_haze_stress"], "hard_cap_lr": lr["hard_cap"],
            "attach": re["chosen_attach"], "rule_suggests_attach": re["rule_suggests_attach"], "retained_worst_lr": min(lr["worst_plus_haze_stress"], re["chosen_attach"]),
            "book_premium": round(prem_book), "book_workers": int(D.workers.sum()), "book_hard_cap": round(float(D.payrate.sum() * rules.YEARLY_CAP_H))}


# ---------------------------------------------------------------- validation
def validate(first: str = "2022-01", last: str | None = None, asof_days: tuple[int, ...] = (1, 10, 20)) -> dict:
    D = daily()
    last_full = (D.dates.max() - pd.offsets.MonthBegin(1)).to_period("M") - 1
    last = last or str(last_full)
    rows = []
    for per in pd.period_range(first, last, freq="M"):
        y, m = per.year, per.month
        if len(_month_slice(y, m)) < per.days_in_month:
            continue
        act, _ = actual_month(y, m)
        for dd in asof_days:
            r = forecast_month(date(y, m, dd), n_paths=1000, pool_years=[yy for yy in range(B.FIRST_YEAR, y)], seed=SEED + dd)
            rows.append({"month": str(per), "asof_day": dd, "actual": round(act), "p50": r["p50"], "p90": r["p90"], "p99": r["p99"],
                         "covered_p90": bool(act <= r["p90"] + 0.5), "covered_p99": bool(act <= r["p99"] + 0.5), "abs_err_p50": abs(act - r["p50"]),
                         "forecast_days_used": r["forecast_days_used"]})
    df = pd.DataFrame(rows)
    by_day = df.groupby("asof_day").agg(months=("month", "count"), p90_coverage=("covered_p90", "mean"), p99_coverage=("covered_p99", "mean"), mae_p50=("abs_err_p50", "mean")).round(3)
    return {"period": [first, last], "overall_p90_coverage": round(float(df.covered_p90.mean()), 3), "overall_p99_coverage": round(float(df.covered_p99.mean()), 3),
            "overall_mae_p50": round(float(df.abs_err_p50.mean())), "by_asof_day": by_day.reset_index().to_dict(orient="records"), "rows": rows}


# ---------------------------------------------------------------- alerts
def alerts(asof: date, max_items: int = 5) -> list[dict]:
    """Employer alerts from the 1 to 3 day forecast. Planning advice only; never changes a payout."""
    f = forecast_daily()
    if f is None:
        return []
    fc = pd.read_parquet(PROCESSED / "forecast_hourly.parquet")
    out = []
    D = daily()
    seen = set()
    for st in D.group_station:
        if st in seen:
            continue
        seen.add(st)
        s = station_by_id(st)
        cid = cell_id(s.lat, s.lon)
        e = fc[(fc.cell_id == cid) & (fc.ts_sgt >= pd.Timestamp(asof)) & (fc.ts_sgt < pd.Timestamp(asof) + pd.Timedelta(days=FORECAST_DAYS + 1))]
        if e.empty:
            continue
        lat, lon = (float(x) for x in cid[1:].split("_"))
        r = rebuild_cell(e, lat, lon)
        r = r[(r.hour.dt.hour >= 8) & (r.hour.dt.hour < 18) & (r.hour.dt.weekday < 6)]
        hot = r[r.wbgt_raw >= 32.5]  # raw rebuild runs warm; 32.5 raw is about 32 corrected in the afternoon (assumption)
        for day, g in hot.groupby(hot.hour.dt.date):
            h0, h1 = g.hour.min().hour, g.hour.max().hour + 1
            when = "today" if day == asof else ("tomorrow" if day == asof + timedelta(days=1) else pd.Timestamp(day).strftime("%A"))
            out.append({"station": st, "station_name": s.name, "date": str(day), "from": f"{h0:02d}:00", "to": f"{h1:02d}:00",
                        "employer": f"Heat stress likely {h0:02d}:00 to {h1:02d}:00 {when} at {s.name}. Plan heavy work early.",
                        "worker": f"Hot hours expected {h0:02d}:00 to {h1:02d}:00 {when}. Drink water. By MOM rule you get paid rest in shade. Your pay is not cut."})
    out.sort(key=lambda a: (a["date"], a["from"]))
    return out[:max_items]


# ---------------------------------------------------------------- run
def run(asof: date | None = None) -> dict:
    D = daily()
    asof = asof or (D.dates.max() + timedelta(days=1)).date()
    cur = forecast_month(asof)
    demo = forecast_month(date(2025, 10, 20))
    last = (pd.Timestamp(asof) - pd.offsets.MonthBegin(1)).to_period("M") - 1 if asof.day == 1 else pd.Timestamp(asof).to_period("M") - 1
    last_y, last_m = last.year, last.month
    recent = [(p.year, p.month) for p in pd.period_range(last - 11, last, freq="M")]
    val = validate()
    out = {
        "asof": asof.isoformat(),
        "book": {"firms": len(demo_book()), "workers": int(D.workers.sum())},
        "current": cur,
        "demo_oct_2025": demo,
        "fan_last_month": {"month": f"{last_y}-{last_m:02d}", "actual": round(actual_month(last_y, last_m)[0]), "settlement_date": rules.settlement_date(f"{last_y}-{last_m:02d}").isoformat(), "series": fan(last_y, last_m, step=1)},
        "fan_current_month": {"month": f"{asof.year}-{asof.month:02d}", "series": [x for x in fan(asof.year, asof.month, step=1) if x["day"] <= asof.day]},
        "actual_oct_2025": round(actual_month(2025, 10)[0]),
        "recent_months": [{"month": f"{y}-{mm:02d}", "actual": round(actual_month(y, mm)[0]), "settlement_date": rules.settlement_date(f"{y}-{mm:02d}").isoformat()} for y, mm in recent],
        "season": season_view(asof.month),
        "annual": annual_view(),
        "validation": {k: v for k, v in val.items() if k != "rows"},
        "alerts": alerts(asof) or alerts(date(2025, 10, 30)),
    }
    out["headline"] = {
        "Book (demo)": f"{out['book']['firms']} firms, {out['book']['workers']:,} outdoor workers",
        "Next settlement": f"{cur['settlement_date']} for {cur['month']} (as of {cur['asof']}): P50 S${cur['p50']:,}, P90 S${cur['p90']:,}, P99 S${cur['p99']:,}; buffer S${cur['buffer_p99_minus_p50']:,}",
        "Cash call for Oct 2025, as of 20 Oct": f"P50 S${demo['p50']:,}, P90 S${demo['p90']:,}, P99 S${demo['p99']:,}; buffer S${demo['buffer_p99_minus_p50']:,}; settles {demo['settlement_date']}",
        "Forecast validation (P90 coverage)": f"{val['overall_p90_coverage']:.0%} of {len(val['rows'])} month-forecasts ({val['period'][0]} to {val['period'][1]}, as of day 1, 10, 20); target about 90%",
        "Forecast validation (P99 coverage)": f"{val['overall_p99_coverage']:.0%}",
    }
    (PROCESSED / "liquidity.json").write_text(json.dumps(out, indent=1, default=str))
    (PROCESSED / "liquidity_validation_rows.json").write_text(json.dumps(val["rows"], default=str))
    WEB_DATA.mkdir(parents=True, exist_ok=True)
    (WEB_DATA / "liquidity.json").write_text(json.dumps(out, default=str))
    write_doc(out, val)
    return out


def write_doc(o: dict, val: dict) -> None:
    lines = [
        "# Liquidity forecast validation",
        "",
        "Generated by `python -m rehat.liquidity`. Forecasts plan Income's cash only; they never change a payout or a price.",
        "",
        f"For every complete month from {val['period'][0]} to {val['period'][1]}, the month-end book payout was forecast as of day 1, 10 and 20 using only historical years before that month and the archived Open-Meteo forecast for the next 3 days. The actual is the book payout for that month from the same data.",
        "",
        f"- P90 coverage: **{val['overall_p90_coverage']:.0%}** (target about 90%).",
        f"- P99 coverage: {val['overall_p99_coverage']:.0%}.",
        f"- Mean absolute error of P50: S${val['overall_mae_p50']:,}.",
        "",
        "| As of day | Months | P90 coverage | P99 coverage | MAE of P50 (S$) |",
        "|---|---|---|---|---|",
        *[f"| {r['asof_day']} | {r['months']} | {r['p90_coverage']:.0%} | {r['p99_coverage']:.0%} | {r['mae_p50']:,.0f} |" for r in val["by_asof_day"]],
        "",
        "## Limits",
        "- Actuals before Feb 2025 use the corrected ERA5 rebuild, not NEA observations, so the test checks the forecasting machinery more than the weather data.",
        "- Open-Meteo's historical forecast stitches the first hours of each model run, so days 2 and 3 look more skilful than a true 3-day-ahead forecast.",
        "- Rain comes from MSS daily records through an estimator; haze is not forecast.",
        "- Normals use a 2000 to 2024 baseline, so months in 2022 to 2024 have a small look-ahead in their normals.",
    ]
    (DOCS / "liquidity-validation.md").write_text("\n".join(lines) + "\n")


if __name__ == "__main__":
    r = run()
    print(json.dumps(r["headline"], indent=1))
    print(json.dumps(r["validation"]["by_asof_day"], indent=1))
    print(r["alerts"][:3])
