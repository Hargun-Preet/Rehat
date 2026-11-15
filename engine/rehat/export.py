"""`make export`: write every JSON the web app needs to web/public/data, so the demo runs with the engine stopped."""
from __future__ import annotations

import json
from dataclasses import asdict
from datetime import datetime, timezone

import numpy as np
import pandas as pd

from rehat import explain, rules
from rehat.ledger import FirmMonthLedger, demo_book, firm_by_uen, policy_year_ledgers
from rehat.paths import PROCESSED, SEED, WEB_DATA
from rehat.stations import psi_regions, rain_gauges, region_of_station, suggest_station, wbgt_stations

FLAGSHIP = "T99DM0001B"  # Tanjong Greenworks, Jurong West
BISHAN = "T99DM0002C"  # Lim Landscaping, Bishan


def _w(name: str, obj) -> None:
    (WEB_DATA / name).write_text(json.dumps(obj, default=str))


def stations() -> None:
    _w("stations.json", {
        "wbgt": [{**asdict(s), "region": region_of_station(s)} for s in wbgt_stations()],
        "rain": [asdict(s) for s in rain_gauges()],
        "psi_regions": [{"region": r, "lat": a, "lon": b} for r, a, b in psi_regions()],
    })


def _months_with_payout(uen: str, months: list[str]) -> list[str]:
    f = firm_by_uen(uen)
    out = []
    for m in months:
        if FirmMonthLedger(f, m).payout_sgd > 0:
            out.append(m)
    return out


def receipts() -> list[dict]:
    """Receipts with explanations for the demo firms. Picks recent months, plus the worked-month firm."""
    months = [p.strftime("%Y-%m") for p in pd.period_range("2025-03", "2026-10", freq="M")]
    out_index = []
    for uen in (FLAGSHIP, BISHAN):
        f = firm_by_uen(uen)
        leds = policy_year_ledgers(f, [m for m in months if m.startswith("2025")]) + policy_year_ledgers(f, [m for m in months if m.startswith("2026")])
        for led in leds:
            d = led.to_dict(include_hours=True)
            d["explain"] = {lang: explain.explain(d, lang, rephrase=None) for lang in explain.LANGS}
            d["why_not_paid"] = {lang: explain.why_not_paid(d, lang) for lang in explain.LANGS}
            _w(f"receipt_{uen}_{led.month}.json", d)
            out_index.append({"uen": uen, "firm": f.name, "month": led.month, "payout": led.payout_sgd,
                              "insured_h": led.insured_after_caps_h, "pending": led.perils["heat"]["pending_hours"] + led.perils["rain"]["pending_hours"]})
    _w("receipts_index.json", out_index)
    return out_index


def replay() -> None:
    """31 Oct 2025, 08:00 to 17:30, 15 stations (seed CSV, verified equal to the API)."""
    d = pd.read_csv(SEED / "d1031.csv")
    st = {s.station_id: s for s in wbgt_stations()}
    cols = [c for c in d.columns if c.startswith("S")]
    d["h"] = d.time.str[:2].astype(int)
    hourly = d.groupby("h")[cols].mean()
    rest = hourly.apply(lambda c: c.map(rules.heat_rest_minutes))
    meal = rules.DEFAULT_MEAL_HOUR
    out = {
        "date": "2025-10-31", "weekday": "Friday",
        "times": d.time.tolist(),
        "stations": [{"station_id": c, "name": st[c].name, "lat": st[c].lat, "lon": st[c].lon} for c in cols],
        "readings": {c: d[c].tolist() for c in cols},
        "hourly_mean": {c: [round(float(x), 2) for x in hourly[c]] for c in cols},
        "hours": hourly.index.tolist(),
        "rest_minutes": {c: [int(x) for x in rest[c]] for c in cols},
        "meal_hour": meal,
        "rest_minutes_excl_meal": {c: int(sum(m for h, m in zip(hourly.index, rest[c]) if h != meal)) for c in cols},
        "peak": {"station": "S142", "time": "12:15", "wbgt": 35.0},
        "source": "NEA WBGT via data.gov.sg (api=wbgt), 15-minute readings; checked equal to the API for all 15 stations",
    }
    f = firm_by_uen(FLAGSHIP)
    mins = out["rest_minutes_excl_meal"][f.primary_station]
    oct_led = FirmMonthLedger(f, "2025-10").to_dict(include_hours=False)
    out["firm"] = {"uen": f.uen, "name": f.name, "workers": f.outdoor_workers, "station": f.primary_station, "benefit": f.benefit,
                   "rest_minutes_today": mins, "rest_value_today": round(mins / 60 * f.benefit * f.outdoor_workers, 2),
                   "october": {k: oct_led[k] for k in ("perils", "insured_after_caps_h", "payout_sgd", "settlement_date", "receipt_lines")}}
    _w("replay_d1031.json", out)


def live() -> None:
    """Offline snapshot of the latest pulled day: hourly WBGT state per station, PSI by region, rain if pulled."""
    w = pd.read_parquet(PROCESSED / "wbgt_15min.parquet", columns=["station_id", "ts_sgt", "wbgt"])
    last_ts = w.ts_sgt.max()
    day = last_ts.normalize()
    today = w[w.ts_sgt >= day]
    stations_out = []
    for s in wbgt_stations():
        g = today[today.station_id == s.station_id].set_index("ts_sgt").wbgt
        hours = []
        for h in range(8, 18):
            vals = [g.get(day + pd.Timedelta(hours=h, minutes=m)) for m in (0, 15, 30, 45)]
            v, state = rules.hourly_wbgt_state([None if (x is None or pd.isna(x)) else float(x) for x in vals])
            hours.append({"hour": h, "wbgt": None if v is None else round(v, 2), "state": state, "rest": rules.heat_rest_minutes(v) if v is not None else None})
        latest = g.dropna()
        stations_out.append({"station_id": s.station_id, "name": s.name, "lat": s.lat, "lon": s.lon, "region": region_of_station(s),
                             "latest": None if latest.empty else {"ts": str(latest.index[-1]), "wbgt": float(latest.iloc[-1])}, "hours": hours})
    psi = pd.read_parquet(PROCESSED / "psi_hourly.parquet")
    p_last = psi[psi.ts_sgt == psi.ts_sgt.max()]
    rain = {}
    rp = PROCESSED / "rain_5min.parquet"
    if rp.exists():
        r = pd.read_parquet(rp)
        r_day = r[r.ts_sgt.dt.normalize() == r.ts_sgt.max().normalize()]
        if not r_day.empty:
            rain = {"day": str(r_day.ts_sgt.max().date()), "totals_mm": r_day.groupby("station_id").mm.sum().round(1).to_dict()}
    _w("live.json", {"snapshot_day": str(day.date()), "latest_ts": str(last_ts), "stations": stations_out,
                     "psi": {"ts": str(p_last.ts_sgt.max()) if len(p_last) else None, "regions": dict(zip(p_last.region, p_last.psi_24h.astype(float)))},
                     "rain": rain, "mode": "offline snapshot", "source": "data.gov.sg v2 real-time API, cached"})


def worker() -> None:
    _w("worker.json", {"notices": explain.WORKER_NOTICE, "langs": {k: v for k, v in explain.LANGS.items()}, "note": explain.REVIEW_NOTE})


def onboarding() -> None:
    f = firm_by_uen(FLAGSHIP)
    s = f.sites[0]
    try:
        sug = suggest_station(s.lat, s.lon)
    except Exception:  # noqa: BLE001
        sug = None
    pr = json.loads((PROCESSED / "pricing.json").read_text())
    _w("onboarding.json", {
        "firm": {"uen": f.uen, "name": f.name, "trade": f.trade, "outdoor_workers": f.outdoor_workers, "wage_band": f.wage_band,
                 "wic_policy_no": f.wic_policy_no, "site": asdict(s), "primary_station": f.primary_station, "backup_station": f.backup_station,
                 "rain_gauge": f.rain_gauge, "psi_region": f.psi_region, "meal_hour": f.meal_hour},
        "station_reason": next(x["station_reason"] for x in json.loads((SEED / "firms.json").read_text()) if x["uen"] == f.uen),
        "suggestion": sug,
        "prices": {"plans": pr["plans"], "rider": pr["site_match_rider"], "gst": pr["gst"], "launch_credit": pr["launch_credit"], "launch_credit_ends": pr["launch_credit_ends"],
                   "expected_insured_h": pr["expected_insured_h"], "basis": pr["expected_insured_h_basis"]},
        "may_not_pay": "Rehat pays only when NEA's published readings at your named station cross the levels shown; your own site can be hotter or wetter than the station, so you can lose work time and receive nothing.",
        "sms": "Rehat: if NEA's Bishan station shows heat (WBGT 32+), heavy rain or haze in work hours beyond a normal month, we pay $8/worker/hr. Station only, not your site.",
    })


def book() -> None:
    rows = [{"uen": f.uen, "name": f.name, "trade": f.trade, "workers": f.outdoor_workers, "plan": f.plan, "site_match": f.site_match,
             "station": f.primary_station, "region": f.psi_region, "lat": f.sites[0].lat, "lon": f.sites[0].lon} for f in demo_book()]
    _w("book.json", rows)


def fairness() -> None:
    """Payout rate by region and firm size from the back-test station groups (price inputs: plan, benefit, headcount)."""
    bt = json.loads((PROCESSED / "backtest.json").read_text())
    st = {s["station_id"]: s for s in bt["stations"]}
    rows = []
    for f in demo_book():
        s = st.get(f.primary_station)
        if not s:
            continue
        size = "5 to 14" if f.outdoor_workers < 15 else ("15 to 29" if f.outdoor_workers < 30 else "30 to 60")
        rows.append({"region": f.psi_region, "size": size, "h": s["expected_insured_h"], "months": s["pct_months_paying"]})
    df = pd.DataFrame(rows)
    _w("fairness.json", {
        "price_inputs": ["Plan (Lite or Standard)", "Benefit per hour", "Declared outdoor headcount"],
        "never_used": ["Nationality", "Age", "Health", "Gender", "Any worker personal data", "Firm location (price is the same across Singapore)"],
        "by_region": df.groupby("region").agg(expected_insured_h=("h", "mean"), pct_months_paying=("months", "mean"), firms=("h", "size")).round(2).reset_index().to_dict(orient="records"),
        "by_size": df.groupby("size").agg(expected_insured_h=("h", "mean"), pct_months_paying=("months", "mean"), firms=("h", "size")).round(2).reset_index().to_dict(orient="records"),
    })


def main() -> None:
    WEB_DATA.mkdir(parents=True, exist_ok=True)
    from rehat import numbers

    steps = [stations, receipts, replay, live, worker, onboarding, book, fairness]
    done = []
    for step in steps:
        step()
        done.append(step.__name__)
    numbers.write()
    files = sorted(p.name for p in WEB_DATA.glob("*.json"))
    _w("meta.json", {"generated_at": datetime.now(timezone.utc).isoformat(), "steps": done, "files": files})
    print(f"exported {len(files)} files to {WEB_DATA}")


if __name__ == "__main__":
    main()
