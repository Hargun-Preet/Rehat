"""Product back-test and robustness, using the exact tiers, allowance and caps in `rules.py`.

Data:
- Heat: hourly WBGT per station, observed where NEA has it, corrected ERA5 rebuild elsewhere (2000 onward).
- Rain: MSS daily records per station (2000 onward; Changi from 1980). Hourly tiers need clock-hour totals, which MSS
  does not publish, so daily rain hours in the window are estimated from the day's highest 60-minute rainfall and the
  rest of the day's total (`rain_day_hours`), scaled by the share of heavy-rain hours that fall in 08:00 to 18:00.
  The share is calibrated on NEA 5-minute gauges where both exist (`calibrate_rain_share`), else 0.55 (assumption).
- Haze: NEA 24-hour PSI where pulled (2025 onward; earlier PSI is patchy). Haze before that is NOT in the back-test,
  so the back-test understates haze years (1997, 2006, 2013, 2015, 2019). Stated in docs/backtest.md.

Representative firm: 1 worker on the published Standard plan. Its benefit and
premium are read from the versioned product specification.
"""
from __future__ import annotations

import json
from dataclasses import dataclass
from functools import lru_cache
from itertools import product

import numpy as np
import pandas as pd

from rehat import rules
from rehat import product as product_source
from rehat.ledger import demo_book
from rehat.paths import DOCS, PROCESSED, SEED, WEB_DATA
from rehat.stations import haversine_km, nearest, psi_region_for, wbgt_stations

PREMIUM_STANDARD = product_source.get_product().default_plan.per_worker_year
BENEFIT = product_source.get_product().product.benefit_per_worker_hour
FIRST_YEAR, LAST_YEAR = 2000, 2025  # complete years
BASELINE = (2000, 2024)  # normals
DEFAULT_RAIN_SHARE = 0.55
MSS_CODES = ["S24", "S06", "S43", "S109", "S44", "S50", "S60", "S117", "S81", "S64", "S107"]  # with gauge coordinates


def published_calibration() -> dict[str, object]:
    """Return the approved Standard calibration without recalculating it from the pilot mix.

    The fictitious pilot book is useful for geographic portfolio diagnostics,
    but its changing station mix is not a customer price input.  The published
    calibration therefore remains a product decision with its own cited basis.
    """
    raw = product_source.product_dict()
    economics = raw["unit_economics_standard_per_worker"]
    if not isinstance(economics, dict):
        raise ValueError("product.json unit_economics_standard_per_worker must be an object")
    expected_hours = economics["expected_insured_hours_year"]
    expected_payout = economics["expected_payout_year"]
    one_in_ten = economics["one_in_ten_year_payout"]
    worst = economics["worst_backtest_year_payout"]
    if not all(isinstance(item, dict) for item in (expected_hours, expected_payout, one_in_ten, worst)):
        raise ValueError("product.json Standard unit-economics entries must be objects")
    return {
        "scope": "Published Standard pricing calibration. It is not recalculated from the fictional pilot-book geographic mix.",
        "expected_insured_h": float(expected_hours["value"]),
        "expected_payout": float(expected_payout["value"]),
        "standard_price": PREMIUM_STANDARD,
        "observed_loss_ratio": round(float(expected_payout["value"]) / PREMIUM_STANDARD, 3),
        "one_in_ten_payout": float(one_in_ten["value"]),
        "one_in_ten_loss_ratio": float(one_in_ten["loss_ratio"]),
        "worst_payout": float(worst["value"]),
        "worst_loss_ratio": float(worst["loss_ratio"]),
        "source": expected_payout.get("source"),
        "basis": expected_payout.get("basis"),
    }


# ---------------------------------------------------------------- heat
@lru_cache
def heat_matrix() -> tuple[pd.DatetimeIndex, list[str], np.ndarray]:
    """Window hours (Mon to Sat, 08 to 17, minus 12:00 meal hour) x stations, WBGT."""
    d = pd.read_parquet(PROCESSED / "wbgt_hourly_rebuilt.parquet", columns=["station_id", "hour", "wbgt"])
    d = d[(d.hour.dt.year >= FIRST_YEAR) & (d.hour.dt.year <= LAST_YEAR)]
    d = d[(d.hour.dt.weekday < 6) & (d.hour.dt.hour != rules.DEFAULT_MEAL_HOUR)]
    w = d.pivot(index="hour", columns="station_id", values="wbgt").sort_index()
    return w.index, list(w.columns), w.values.astype("float32")


def heat_minutes(x: np.ndarray, delta: float = 0.0, nearmiss: bool = True) -> np.ndarray:
    """rules.heat_rest_minutes, vectorised. delta = estimation error minus threshold shift."""
    v = x + delta
    return np.select([v >= 33.0, v >= 32.0, (v >= 31.5) & nearmiss], [15, 10, 5], 0).astype("float32")


def monthly_sum(index: pd.DatetimeIndex, values: np.ndarray) -> np.ndarray:
    """Sum hourly values into a (years, 12) array."""
    y = index.year.values - FIRST_YEAR
    m = index.month.values - 1
    out = np.zeros((LAST_YEAR - FIRST_YEAR + 1, 12), dtype="float64")
    np.add.at(out, (y, m), np.nan_to_num(values))
    return out


# ---------------------------------------------------------------- rain
def rain_day_hours(total: np.ndarray, max60: np.ndarray) -> np.ndarray:
    """Estimated rain hours in a whole day from MSS daily data: the wettest hour by tier, plus 0.5 h for each further
    5 mm of the day's total (at most 3 more half-hours). Window share applied separately."""
    top = np.select([max60 >= 10.0, max60 >= 2.5], [1.0, 0.5], 0.0)
    rest = np.clip(np.floor(np.clip(total - max60, 0, None) / 5.0), 0, 3) * 0.5
    return np.where(np.isfinite(total) & np.isfinite(max60), top + rest, np.nan)


MAX60_BINS = [0, 2.5, 5, 10, 20, 40, 80, 10_000]


@lru_cache
def max60_ratio() -> tuple[float, ...]:
    """Median (highest 60-min rain / daily total) by daily-total bin, from MSS days that have both (2020 onward)."""
    m = pd.read_parquet(PROCESSED / "mss_daily.parquet")
    b = m.dropna(subset=["rain_mm", "rain_max60_mm"])
    b = b[b.rain_mm > 0]
    cut = pd.cut(b.rain_mm, MAX60_BINS)
    r = (b.rain_max60_mm / b.rain_mm).groupby(cut, observed=False).median()
    return tuple(float(x) if np.isfinite(x) else 0.8 for x in r.values)


@lru_cache
def mss_daily() -> pd.DataFrame:
    """MSS daily. MSS publishes the highest 60-minute rainfall only from 2020; earlier it is imputed as the daily total
    times the median ratio for that size of day (column max60_imputed marks it)."""
    m = pd.read_parquet(PROCESSED / "mss_daily.parquet")
    ratio = np.array(max60_ratio())
    miss = m.rain_max60_mm.isna() & m.rain_mm.notna()
    bins = np.clip(np.digitize(m.rain_mm.fillna(0).values, MAX60_BINS[1:-1], right=True), 0, len(ratio) - 1)
    m["max60_imputed"] = miss
    m.loc[miss, "rain_max60_mm"] = m.loc[miss, "rain_mm"] * ratio[bins[miss.values]]
    return m


@lru_cache
def rain_gauge_coords() -> dict[str, tuple[float, float]]:
    raw = json.loads((SEED / "stations_rain.json").read_text())
    return {r["station_id"]: (r["lat"], r["lon"]) for r in raw}


def mss_for_station(lat: float, lon: float) -> str:
    coords = rain_gauge_coords()
    have = set(mss_daily().station_code.unique())
    cands = [c for c in MSS_CODES if c in coords and c in have]
    return min(cands, key=lambda c: haversine_km(lat, lon, *coords[c]))


def calibrate_rain_share() -> tuple[float, str]:
    """Share of estimated daily rain hours that fall in the insured window, from NEA 5-minute gauges with the same code
    as an MSS station. Returns (share, basis)."""
    p = PROCESSED / "rain_5min.parquet"
    if not p.exists():
        return DEFAULT_RAIN_SHARE, "assumption: 55% of heavy-rain hours fall in 08:00 to 18:00 (no 5-minute overlap yet)"
    r = pd.read_parquet(p)
    r = r[r.station_id.isin(MSS_CODES)].copy()
    if r.empty:
        return DEFAULT_RAIN_SHARE, "assumption: 55% (no overlap stations)"
    r["hour"] = (r.ts_sgt - pd.Timedelta(seconds=1)).dt.floor("h")
    h = r.groupby(["station_id", "hour"]).mm.agg(["sum", "count"]).reset_index()
    h = h[h["count"] >= rules.RAIN_MIN_VALID_5MIN]
    h["rh"] = h["sum"].map(rules.rain_hours)
    h["date"] = h.hour.dt.normalize()
    win = h[(h.hour.dt.hour >= 8) & (h.hour.dt.hour < 18) & (h.hour.dt.hour != 12)]
    actual = win.groupby(["station_id", "date"]).rh.sum()
    m = mss_daily()
    m = m.assign(date=m.date.dt.normalize()).set_index(["station_code", "date"])
    est = pd.Series(rain_day_hours(m.rain_mm.values, m.rain_max60_mm.values), index=m.index)
    days = actual.index.intersection(est.index)
    if len(days) < 300 or est.loc[days].sum() == 0:
        return DEFAULT_RAIN_SHARE, f"assumption: 55% (only {len(days)} overlapping station-days)"
    share = float(actual.loc[days].sum() / est.loc[days].sum())
    return round(share, 3), f"calibrated on {len(days)} station-days where NEA 5-minute gauges and MSS daily records overlap"


@lru_cache
def rain_monthly_by_mss() -> tuple[dict[str, np.ndarray], float, str]:
    share, basis = calibrate_rain_share()
    m = mss_daily()
    m = m[(m.date.dt.year >= FIRST_YEAR) & (m.date.dt.year <= LAST_YEAR) & (m.date.dt.weekday < 6)].copy()
    m["est"] = rain_day_hours(m.rain_mm.values, m.rain_max60_mm.values)
    # Fill a missing day from Changi on the same date (documented gap fill for
    # the back-test only). Reindex before filling so a station which began
    # later in the historical period does not silently contribute zero rain.
    days = pd.date_range(f"{FIRST_YEAR}-01-01", f"{LAST_YEAR}-12-31", freq="D")
    days = days[days.weekday < 6]
    changi = m[m.station_code == "S24"].set_index("date").est.reindex(days)
    out = {}
    for code, g in m.groupby("station_code"):
        g = g.set_index("date").est.reindex(days)
        g = g.fillna(changi)
        idx = pd.DatetimeIndex(g.index)
        out[code] = monthly_sum(idx, g.values * share)
    return out, share, f"{basis}; missing MSS station-days, including before a local station began, use Changi on the same date"


# ---------------------------------------------------------------- haze
def haze_monthly(region: str, min_days: int = 3) -> tuple[np.ndarray, np.ndarray]:
    """Monthly haze hours and a mask of months with PSI coverage, using rules.haze_hours."""
    hz = np.zeros((LAST_YEAR - FIRST_YEAR + 1, 12))
    cov = np.zeros_like(hz, dtype=bool)
    p = PROCESSED / "psi_hourly.parquet"
    if not p.exists():
        return hz, cov
    psi = pd.read_parquet(p)
    psi = psi[(psi.region == region) & (psi.ts_sgt.dt.hour == 12)]
    if psi.empty:
        return hz, cov
    days = {ts.date(): float(v) for ts, v in zip(psi.ts_sgt, psi.psi_24h)}
    lo, hi = min(days), max(days)
    series = [(d.date(), days.get(d.date())) for d in pd.date_range(lo, hi)]
    if min_days == 3:
        res = rules.haze_hours(series)
    else:  # robustness: pays from day 2
        res = []
        streak = 0
        for d, v in series:
            streak = streak + 1 if (v is not None and v > 100) else 0
            t = rules.haze_tier_hours(v) if v is not None else 0
            ok = d.weekday() < 6 and (t > 1 or (t == 1 and streak >= min_days))
            res.append(rules.HazeDay(d, v, float(t) if ok else 0.0, rules.TRIGGERED if ok else rules.NOT_TRIGGERED, streak, ""))
    for hd in res:
        if FIRST_YEAR <= hd.day.year <= LAST_YEAR:
            hz[hd.day.year - FIRST_YEAR, hd.day.month - 1] += hd.hours
            cov[hd.day.year - FIRST_YEAR, hd.day.month - 1] = True
    return hz, cov


# ---------------------------------------------------------------- simulation
def simulate(heat: np.ndarray, rain: np.ndarray, haze: np.ndarray, allow_mult: float = 1.25, mcap: float = 20.0, ycap: float = 60.0,
             haze_limit: float = rules.HAZE_YEARLY_LIMIT_H) -> dict[str, np.ndarray]:
    """heat, rain, haze: (..., years, 12) counted hours a worker. Normals = baseline-year mean per calendar month."""
    b0, b1 = BASELINE[0] - FIRST_YEAR, BASELINE[1] - FIRST_YEAR + 1
    nh = heat[..., b0:b1, :].mean(axis=-2, keepdims=True)
    nr = rain[..., b0:b1, :].mean(axis=-2, keepdims=True)
    ins_h = np.clip(heat - allow_mult * nh, 0, None)
    ins_r = np.clip(rain - allow_mult * nr, 0, None)
    hz = np.minimum(np.cumsum(haze, axis=-1), haze_limit)
    hz = np.diff(np.concatenate([np.zeros(hz.shape[:-1] + (1,)), hz], axis=-1), axis=-1)
    before = ins_h + ins_r + hz
    after = np.zeros_like(before)
    ytd = np.zeros(before.shape[:-1])
    for m in range(12):
        x = np.minimum(np.minimum(before[..., m], mcap), np.clip(ycap - ytd, 0, None))
        after[..., m] = x
        ytd = ytd + x
    return {"monthly": after, "annual": after.sum(axis=-1), "normal_heat": nh[..., 0, :], "normal_rain": nr[..., 0, :],
            "ins_heat": ins_h, "ins_rain": ins_r, "haze": hz, "cap_hit": (ytd >= ycap - 1e-9)}


# ---------------------------------------------------------------- firm groups (station rule)
@dataclass
class Group:
    stations: tuple[int, int, int]  # indices into heat matrix columns: nearest three
    mss: str
    region: str
    workers: int


@lru_cache
def groups() -> list[Group]:
    _, cols, _ = heat_matrix()
    pool = tuple(s for s in wbgt_stations() if s.station_id in cols)
    agg: dict[tuple, int] = {}
    for f in demo_book():
        site = f.sites[0]
        n3 = nearest(site.lat, site.lon, pool, 3)
        key = (tuple(cols.index(s.station_id) for s, _ in n3), mss_for_station(site.lat, site.lon), psi_region_for(site.lat, site.lon))
        agg[key] = agg.get(key, 0) + f.outdoor_workers
    return [Group(k[0], k[1], k[2], w) for k, w in sorted(agg.items())]


def group_heat(rule: str, delta: float, nearmiss: bool) -> np.ndarray:
    idx, _, X = heat_matrix()
    out = []
    for g in groups():
        if rule == "nearest":
            x = X[:, g.stations[0]]
        elif rule == "second":
            x = X[:, g.stations[1]]
        else:
            x = np.nanmedian(X[:, list(g.stations)], axis=1)
        out.append(monthly_sum(idx, heat_minutes(x, delta, nearmiss)) / 60.0)
    return np.stack(out)


def group_rain(rule: str) -> np.ndarray:
    rm, _, _ = rain_monthly_by_mss()
    _, cols, _ = heat_matrix()
    st = {s.station_id: s for s in wbgt_stations()}
    out = []
    for g in groups():
        if rule == "nearest":
            out.append(rm[g.mss])
        else:
            alts = [mss_for_station(st[cols[i]].lat, st[cols[i]].lon) for i in g.stations]
            if rule == "second":
                out.append(rm[alts[1]])
            else:
                out.append(np.median(np.stack([rm[a] for a in alts]), axis=0))
    return np.stack(out)


def group_haze(min_days: int = 3) -> np.ndarray:
    cache = {r: haze_monthly(r, min_days)[0] for r in {g.region for g in groups()}}
    return np.stack([cache[g.region] for g in groups()])


def weights() -> np.ndarray:
    w = np.array([g.workers for g in groups()], float)
    return w / w.sum()


def book_summary(sim: dict[str, np.ndarray], benefit: float = BENEFIT, premium: float = PREMIUM_STANDARD) -> dict:
    w = weights()
    annual = (sim["annual"] * w[:, None]).sum(axis=0)  # book insured hours per worker per year
    payout = annual * benefit
    lr = payout / premium
    months_paying = float(((sim["monthly"] > 0).mean(axis=(1, 2)) * w).sum())
    station_zero_years = float(((sim["annual"] == 0).sum(axis=1) * w).sum())
    years = list(range(FIRST_YEAR, LAST_YEAR + 1))
    return {
        "expected_insured_h": round(float(annual.mean()), 2),
        "expected_payout": round(float(payout.mean()), 1),
        "loss_ratio_mean": round(float(lr.mean()), 3),
        "loss_ratio_1in10": round(float(np.quantile(lr, 0.9)), 3),
        "payout_1in10": round(float(np.quantile(payout, 0.9)), 1),
        "worst_year": int(years[int(np.argmax(payout))]),
        "worst_payout": round(float(payout.max()), 1),
        "worst_loss_ratio": round(float(lr.max()), 3),
        "zero_payout_years_book": int((annual == 0).sum()),
        "zero_payout_years_avg_firm": round(station_zero_years, 2),
        "pct_months_paying": round(100 * months_paying, 1),
        "cap_hit_station_years_pct": round(100 * float((sim["cap_hit"].mean(axis=1) * w).sum()), 2),
        "years": years,
        "annual_insured_h": [round(float(x), 3) for x in annual],
    }


# ---------------------------------------------------------------- basis risk
def basis_risk() -> dict:
    w = pd.read_parquet(PROCESSED / "wbgt_15min.parquet", columns=["station_id", "ts_sgt", "wbgt"]).dropna()
    w["hour"] = w.ts_sgt.dt.floor("h")
    h = w.groupby(["station_id", "hour"]).wbgt.agg(["mean", "count"])
    h = h[h["count"] >= 3]["mean"].unstack("station_id")
    h = h[(h.index.weekday < 6) & (h.index.hour >= 8) & (h.index.hour < 18) & (h.index.hour != 12)]
    trig = h.ge(31.5).where(h.notna())
    st = {s.station_id: s for s in wbgt_stations()}
    rows = []
    for sid in h.columns:
        s = st[sid]
        nb = [x.station_id for x, _ in nearest(s.lat, s.lon, tuple(v for k, v in st.items() if k != sid and k in h.columns), 2)]
        mine = trig[sid]
        nbt = trig[nb]
        valid = mine.notna() & nbt.notna().any(axis=1)
        miss = valid & (mine == False) & (nbt == True).any(axis=1)  # noqa: E712
        rows.append({"station_id": sid, "name": s.name, "neighbours": nb, "hours": int(valid.sum()),
                     "basis_risk_pct": round(100 * float(miss.sum() / max(valid.sum(), 1)), 2),
                     "station_triggered_pct": round(100 * float((mine == True).sum() / max(mine.notna().sum(), 1)), 2)})  # noqa: E712
    tot_h = sum(r["hours"] for r in rows)
    overall = sum(r["basis_risk_pct"] * r["hours"] for r in rows) / max(tot_h, 1)
    return {"overall_pct": round(overall, 2), "by_station": sorted(rows, key=lambda r: -r["basis_risk_pct"]), "period": [str(h.index.min()), str(h.index.max())]}


# ---------------------------------------------------------------- MSS Changi long view
def changi_long_view(first: int = 1983, last: int = 2018) -> dict:
    m = mss_daily()
    c = m[(m.station_code == "S24") & (m.date.dt.year >= first) & (m.date.dt.year <= last)].copy()
    share, _, _ = rain_monthly_by_mss()[1], None, None
    c["est"] = rain_day_hours(c.rain_mm.values, c.rain_max60_mm.values) * share
    c.loc[c.date.dt.weekday == 6, "est"] = 0
    c["y"], c["m"] = c.date.dt.year, c.date.dt.month
    mon = c.pivot_table(index="y", columns="m", values="est", aggfunc="sum").reindex(columns=range(1, 13)).fillna(0)
    rain_days = c[c.rain_mm >= 10].groupby("y").size().reindex(range(first, last + 1), fill_value=0)
    normal = mon.mean(axis=0)
    ins = np.clip(mon.values - 1.25 * normal.values, 0, None)
    sim = np.minimum(ins, 20.0)
    annual = []
    for row in sim:
        ytd = 0.0
        tot = 0.0
        for x in row:
            x = min(x, max(0.0, 60 - ytd))
            ytd += x
            tot += x
        annual.append(tot)
    annual = np.array(annual)
    return {
        "years": f"{first} to {last}",
        "rain_days_10mm_mean": round(float(rain_days.mean()), 1),
        "rain_days_10mm_min": [int(rain_days.idxmin()), int(rain_days.min())],
        "rain_days_10mm_max": [int(rain_days.idxmax()), int(rain_days.max())],
        "rain_only_expected_insured_h": round(float(annual.mean()), 2),
        "rain_only_zero_payout_years": int((annual == 0).sum()),
        "rain_only_pct_months_paying": round(100 * float((sim > 0).mean()), 1),
        "missing_max60_days_pct": round(100 * float(c.max60_imputed.mean()), 1),
    }


# ---------------------------------------------------------------- run everything
BASE = dict(
    rule="nearest",
    delta=0.0,
    nearmiss=True,
    allow=product_source.get_product().default_plan.allowance_multiple,
    mcap=rules.MONTHLY_CAP_H,
    ycap=rules.YEARLY_CAP_H,
    haze_days=3,
)


def run_case(**kw) -> dict:
    p = {**BASE, **kw}
    sim = simulate(group_heat(p["rule"], p["delta"], p["nearmiss"]), group_rain(p["rule"]), group_haze(p["haze_days"]), p["allow"], p["mcap"], p["ycap"])
    return book_summary(sim)


def station_table() -> list[dict]:
    idx, cols, X = heat_matrix()
    rm, _, _ = rain_monthly_by_mss()
    st = {s.station_id: s for s in wbgt_stations()}
    rows = []
    for i, sid in enumerate(cols):
        s = st[sid]
        heat = monthly_sum(idx, heat_minutes(X[:, i])) / 60.0
        rain = rm[mss_for_station(s.lat, s.lon)]
        haze = haze_monthly(psi_region_for(s.lat, s.lon))[0]
        sim = simulate(heat, rain, haze)
        rows.append({
            "station_id": sid, "name": s.name,
            "heat_counted_h": round(float(heat.sum(axis=1).mean()), 2),
            "rain_counted_h": round(float(rain.sum(axis=1).mean()), 2),
            "expected_insured_h": round(float(sim["annual"].mean()), 2),
            "zero_payout_years": int((sim["annual"] == 0).sum()),
            "pct_months_paying": round(100 * float((sim["monthly"] > 0).mean()), 1),
            "cap_hit_years": int(sim["cap_hit"].sum()),
            "normal_heat": [round(float(x), 3) for x in sim["normal_heat"]],
            "normal_rain": [round(float(x), 3) for x in sim["normal_rain"]],
        })
    return rows


def write_normals(stations: list[dict], share_basis: str) -> None:
    out = {
        "heat": {r["station_id"]: {str(m + 1): r["normal_heat"][m] for m in range(12)} for r in stations},
        "rain": {r["station_id"]: {str(m + 1): r["normal_rain"][m] for m in range(12)} for r in stations},
        "basis": {
            "heat": f"Station normal: mean hours of mandated rest a worker for this calendar month, {BASELINE[0]} to {BASELINE[1]}, from NEA WBGT where observed and corrected ERA5 rebuild elsewhere.",
            "rain": f"Station normal: mean rain hours a worker for this calendar month, {BASELINE[0]} to {BASELINE[1]}, estimated from the nearest MSS daily record ({share_basis}).",
        },
    }
    (PROCESSED / "normals.json").write_text(json.dumps(out, indent=1))


def grid() -> dict:
    rules_ = ["nearest", "second", "median3"]
    deltas = [-1.0, -0.5, 0.0, 0.5, 1.0]
    allows, mcaps, ycaps = [1.0, 1.25, 1.5], [10.0, 20.0, 30.0], [40.0, 60.0, 80.0]
    haze = group_haze(3)
    out = {}
    for rule in rules_:
        rain = group_rain(rule)
        for delta, nm in product(deltas, [True, False]):
            heat = group_heat(rule, delta, nm)
            for a, mc, yc in product(allows, mcaps, ycaps):
                s = book_summary(simulate(heat, rain, haze, a, mc, yc))
                out[f"{rule}|{delta:g}|{int(nm)}|{a:g}|{mc:g}|{yc:g}"] = {
                    "h": s["expected_insured_h"], "lr10": s["loss_ratio_1in10"], "z": s["zero_payout_years_book"],
                    "zf": s["zero_payout_years_avg_firm"], "m": s["pct_months_paying"], "y": s["annual_insured_h"],
                }
    return {"dims": {"rule": rules_, "delta": deltas, "nearmiss": [1, 0], "allow": allows, "mcap": mcaps, "ycap": ycaps},
            "scope": "Geographic-mix portfolio sensitivity. It does not replace the published Standard pricing calibration.",
            "note": f"delta = estimation error minus threshold shift. Payout = hours x benefit. Loss ratio uses the published Standard annual price (S${PREMIUM_STANDARD:.2f}) and product benefit (S${BENEFIT:g}).",
            "cells": out}


def run() -> dict:
    for f in (heat_matrix, max60_ratio, mss_daily, rain_monthly_by_mss, groups):
        f.cache_clear()
    _, share, share_basis = rain_monthly_by_mss()
    stations = station_table()
    write_normals(stations, share_basis)
    base = run_case()
    base["scope"] = "Fictional pilot-book geographic-mix portfolio diagnostic. It is not the published Standard pricing calibration."
    tornado_cases = {
        "No near-miss tier (31.5 to 31.9 pays nothing)": dict(nearmiss=False),
        "Heat thresholds +0.5 C (32.5 / 33.5)": dict(delta=-0.5),
        "Allowance x1.0": dict(allow=1.0),
        "Allowance x1.5": dict(allow=1.5),
        "Station: second nearest": dict(rule="second"),
        "Station: median of three": dict(rule="median3"),
        "Station readings +0.5 C (estimation error)": dict(delta=0.5),
        "Station readings -0.5 C (estimation error)": dict(delta=-0.5),
        "Haze pays from day 2": dict(haze_days=2),
    }
    tornado = []
    for label, kw in tornado_cases.items():
        r = run_case(**kw)
        tornado.append({"case": label, "expected_payout": r["expected_payout"], "loss_ratio_1in10": r["loss_ratio_1in10"],
                        "d_payout": round(r["expected_payout"] - base["expected_payout"], 1),
                        "d_lr10": round(r["loss_ratio_1in10"] - base["loss_ratio_1in10"], 3)})
    tornado.sort(key=lambda t: -abs(t["d_payout"]))
    br = basis_risk()
    changi = changi_long_view()
    _, haze_cov = haze_monthly("central")
    result = {
        "published_calibration": published_calibration(),
        "base": base,
        "portfolio_diagnostic": {
            "scope": "Fictional pilot-book geographic mix used for portfolio, capital and cash diagnostics only.",
            "firms": len(demo_book()),
            "station_groups": len(groups()),
        },
        "rain_window_share": share,
        "rain_window_share_basis": share_basis,
        "haze_months_covered": int(haze_cov.sum()),
        "stations": stations,
        "tornado": tornado,
        "basis_risk": br,
        "changi_long_view": changi,
        "groups": len(groups()),
    }
    (PROCESSED / "backtest.json").write_text(json.dumps(result, indent=1))
    WEB_DATA.mkdir(parents=True, exist_ok=True)
    (WEB_DATA / "backtest.json").write_text(json.dumps(result))
    (WEB_DATA / "backtest_grid.json").write_text(json.dumps(grid()))
    write_doc(result)
    return result


def write_doc(r: dict) -> None:
    b, c = r["base"], r["changi_long_view"]
    published = r["published_calibration"]
    portfolio = r["portfolio_diagnostic"]
    lines = [
        "# Product back-test",
        "",
        "Generated by `python -m rehat.backtest`. Exact product rules (`rules.py`) on history: heat from NEA WBGT where observed and corrected ERA5 rebuild elsewhere; rain from MSS daily records; haze from NEA PSI where pulled.",
        f"Representative firm: 1 worker on the Standard plan, S${BENEFIT:g} benefit an insured hour and S${PREMIUM_STANDARD:.2f} annual price. Years {FIRST_YEAR} to {LAST_YEAR}. Normals: {BASELINE[0]} to {BASELINE[1]}.",
        "",
        "## Published Standard calibration",
        "",
        f"{published['scope']} Expected insured hours are {published['expected_insured_h']:.2f}; expected payout is S${published['expected_payout']:.2f}; observed loss ratio at the published price is {published['observed_loss_ratio']:.0%}. Basis: {published['basis']}",
        "",
        "## Pilot geographic-mix portfolio diagnostic",
        "",
        f"{portfolio['scope']} This run weights the {portfolio['firms']}-firm pilot book across {portfolio['station_groups']} station groups. It supports portfolio and cash analysis only; it does not replace the published calibration above.",
        "",
        "## Pilot geographic-mix diagnostic numbers",
        "",
        "| Number | Back-test |",
        "|---|---|",
        f"| Expected insured hours a worker a year | {b['expected_insured_h']} |",
        f"| Expected payout a worker a year | S${b['expected_payout']} |",
        f"| Zero-payout years (book) | {b['zero_payout_years_book']} of {len(b['years'])} |",
        f"| Zero-payout years (average firm) | {b['zero_payout_years_avg_firm']} of {len(b['years'])} |",
        f"| Months paying something | {b['pct_months_paying']}% |",
        f"| 1-in-10 loss ratio | {b['loss_ratio_1in10']:.0%} |",
        f"| Worst year | {b['worst_year']}: S${b['worst_payout']} ({b['worst_loss_ratio']:.0%}) |",
        f"| Firm-years hitting the 60 h cap | {b['cap_hit_station_years_pct']}% |",
        "",
        "## MSS Changi long view (rain only, 1983 to 2018)",
        "",
        f"- Rain days of 10 mm or more: mean {c['rain_days_10mm_mean']} a year (min {c['rain_days_10mm_min'][1]} in {c['rain_days_10mm_min'][0]}, max {c['rain_days_10mm_max'][1]} in {c['rain_days_10mm_max'][0]}).",
        f"- Rain-only expected insured hours: {c['rain_only_expected_insured_h']} a year; zero-payout years {c['rain_only_zero_payout_years']}; months paying {c['rain_only_pct_months_paying']}%.",
        f"- MSS publishes the highest 60-minute rainfall only from 2020. Before that it is imputed from the daily total (median ratio by size of day, measured 2020 onward): {c['missing_max60_days_pct']}% of these days are imputed.",
        "",
        "## Robustness (tornado, change from base)",
        "",
        "| Case | Expected payout | Change | 1-in-10 loss ratio | Change |",
        "|---|---|---|---|---|",
        *[f"| {t['case']} | S${t['expected_payout']} | {t['d_payout']:+} | {t['loss_ratio_1in10']:.0%} | {t['d_lr10']:+.0%} |" for t in r["tornado"]],
        "",
        "## Basis risk (observed NEA data)",
        "",
        f"Share of insured-window hours where the named station is below 31.5 C while at least one of its two nearest neighbours is at 31.5 C or more: **{r['basis_risk']['overall_pct']}%** overall ({r['basis_risk']['period'][0]} to {r['basis_risk']['period'][1]}).",
        "",
        "| Station | Basis risk % | Station triggered % | Neighbours |",
        "|---|---|---|---|",
        *[f"| {x['station_id']} {x['name']} | {x['basis_risk_pct']} | {x['station_triggered_pct']} | {', '.join(x['neighbours'])} |" for x in r["basis_risk"]["by_station"]],
        "",
        "## Limits of the historical test",
        "",
        f"- Rain hours come from MSS daily records with an estimator (wettest hour by tier plus 0.5 h per further 5 mm), scaled by the window share {r['rain_window_share']} ({r['rain_window_share_basis']}).",
        "- Heat comes from a WBGT rebuild whose band agreement near the threshold is limited (see docs/wbgt-validation.md). Heat frequencies are estimates.",
        f"- Haze: PSI is only in the back-test where NEA data was pulled ({r['haze_months_covered']} region-months). Haze years before 2025 (1997, 2006, 2013, 2015, 2019) are missing, so the back-test UNDERSTATES haze. Pricing adds a haze load (docs/pricing.md).",
        "- The allowance is relative to each station's own normal, so a uniformly hotter station does not pay more; only months worse than that station's normal pay.",
        "",
        "## Station table",
        "",
        "| Station | Heat counted h/yr | Rain counted h/yr | Expected insured h | Zero-payout years | Months paying % | Cap-hit years |",
        "|---|---|---|---|---|---|---|",
        *[f"| {s['station_id']} {s['name']} | {s['heat_counted_h']} | {s['rain_counted_h']} | {s['expected_insured_h']} | {s['zero_payout_years']} | {s['pct_months_paying']} | {s['cap_hit_years']} |" for s in r["stations"]],
    ]
    (DOCS / "backtest.md").write_text("\n".join(lines) + "\n")


if __name__ == "__main__":
    res = run()
    print(json.dumps(res["base"], indent=1)[:1500])
    print(json.dumps(res["changi_long_view"], indent=1))
    print(res["rain_window_share"], res["rain_window_share_basis"])
    for t in res["tornado"]:
        print(t)
    print("basis risk", res["basis_risk"]["overall_pct"])
