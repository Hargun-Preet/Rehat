"""Site Match: a Labs pilot for firms whose site is hotter than the named station.

The firm uploads the main contractor's hourly WBGT log. Rules-based checks with explicit reasons compare it to the
station network. Inside the band: APPROVED top-up = extra rest minutes implied by the log over the station's, capped at
10 h a year. Outside: REVIEW by a person, with the reasons. The model never rejects a claim (CONTEXT.md section 4).

Built from the documented checker rules and kept outside the core payout path.
"""
from __future__ import annotations

import hashlib
import io
import json
import os
import re
from dataclasses import asdict, dataclass, field
from datetime import date, datetime
from functools import lru_cache
from typing import Any

import numpy as np
import pandas as pd

from rehat import product, rules
from rehat.paths import DOCS, PROCESSED, SEED, WEB_DATA

UPLIFT_MIN, UPLIFT_MAX = -1.0, 2.0
MIN_CORR = 0.7
MIN_DIFF_STD = 0.05
MAX_BUNCHED = 0.35
MAX_BUNCHED_AMONG_HOT = 0.6  # additional check: share among readings at 31.5+
MIN_DIFF_CORR = 0.3  # added check: same-day hour-to-hour changes
WINDOW_HOURS = list(range(rules.WINDOW_START_H, rules.WINDOW_END_H))


# ---------------------------------------------------------------- reference curves
@lru_cache
def _obs_hourly() -> pd.DataFrame:
    p = PROCESSED / "wbgt_15min.parquet"
    if not p.exists():
        return pd.DataFrame(columns=["station_id", "hour", "wbgt"])
    w = pd.read_parquet(p, columns=["station_id", "ts_sgt", "wbgt"]).dropna()
    w["hour"] = w.ts_sgt.dt.floor("h")
    g = w.groupby(["station_id", "hour"]).wbgt.agg(["mean", "count"]).reset_index()
    return g[g["count"] >= 3].rename(columns={"mean": "wbgt"})[["station_id", "hour", "wbgt"]]


def station_curve(station: str, day: date) -> pd.Series:
    """Hourly mean WBGT at the station for 08:00 to 17:00 on `day` (index = hour of day)."""
    o = _obs_hourly()
    s = o[(o.station_id == station) & (o.hour.dt.date == day)]
    if s.empty and day == date(2025, 10, 31):
        d = pd.read_csv(SEED / "d1031.csv")
        d["h"] = d.time.str[:2].astype(int)
        if station in d:
            return d.groupby("h")[station].mean().loc[8:17]
    s = s.set_index(s.hour.dt.hour).wbgt
    return s.loc[(s.index >= 8) & (s.index <= 17)]


# ---------------------------------------------------------------- parsing
class LogError(ValueError):
    pass


def parse_csv(text: str, day: date) -> tuple[pd.Series, list[str]]:
    """Parse a site log CSV with columns time, wbgt. Returns hourly means (index hour) and parse notes.

    `time` may be HH:MM or a full timestamp. Readings outside the claimed day raise a timestamp problem."""
    try:
        df = pd.read_csv(io.StringIO(text.strip()))
    except Exception as e:  # noqa: BLE001
        raise LogError(f"Could not read the file as CSV: {e}") from e
    cols = {c.lower().strip(): c for c in df.columns}
    if "time" not in cols or "wbgt" not in cols:
        raise LogError("The log needs two columns: time and wbgt.")
    t = df[cols["time"]].astype(str).str.strip()
    v = pd.to_numeric(df[cols["wbgt"]], errors="coerce")
    notes = []
    full = t.str.contains(r"\d{4}-\d{2}-\d{2}")
    ts = pd.Series(pd.to_datetime(np.where(full, t, day.isoformat() + " " + t), errors="coerce"))
    bad_ts = ts.isna().sum()
    if bad_ts:
        notes.append(f"{bad_ts} rows have a time we could not read and were skipped.")
    other_day = (ts.dt.date != day) & ts.notna()
    if other_day.any():
        notes.append(f"{int(other_day.sum())} readings are dated on another day than the claim ({day:%d %b %Y}).")
    if v.isna().any():
        notes.append(f"{int(v.isna().sum())} rows have no WBGT value and were skipped.")
    ok = (ts.notna() & v.notna()).values
    s = pd.Series(v.values[ok], index=pd.DatetimeIndex(ts.values[ok]))
    return s, notes


# ---------------------------------------------------------------- checks
@dataclass
class Check:
    code: str
    passed: bool
    value: float | str | None
    rule: str
    text: str


def hourly(series: pd.Series, day: date) -> pd.Series:
    s = series[series.index.date == day] if len(series) and isinstance(series.index, pd.DatetimeIndex) else series
    if isinstance(s.index, pd.DatetimeIndex):
        s = s.groupby(s.index.hour).mean()
    return s.loc[(s.index >= 8) & (s.index <= 17)]


def run_checks(site_raw: pd.Series, day: date, ref: pd.Series, address_ok: bool, meal_hour: int | None = rules.DEFAULT_MEAL_HOUR) -> tuple[list[Check], pd.Series]:
    checks: list[Check] = []
    in_day = site_raw.index.date == day if isinstance(site_raw.index, pd.DatetimeIndex) else np.ones(len(site_raw), bool)
    in_win = (site_raw.index.hour >= 8) & (site_raw.index.hour < 18) if isinstance(site_raw.index, pd.DatetimeIndex) else np.ones(len(site_raw), bool)
    frac_ok = float(np.mean(in_day & in_win)) if len(site_raw) else 0.0
    checks.append(Check("TIMESTAMPS", frac_ok >= 0.95, round(frac_ok, 3), "95% of readings on the claimed day, 08:00 to 18:00",
                        "Readings are on the claimed day and inside work hours." if frac_ok >= 0.95 else f"Only {frac_ok:.0%} of readings are on the claimed day inside 08:00 to 18:00."))
    checks.append(Check("ADDRESS", address_ok, None, "Log site matches a declared site on the policy",
                        "Site on the log matches a declared site." if address_ok else "The site on the log does not match a declared site on the policy."))
    site = hourly(site_raw[in_day] if isinstance(site_raw.index, pd.DatetimeIndex) else site_raw, day)
    common = site.index.intersection(ref.index)
    if len(common) < 6:
        checks.append(Check("COVERAGE", False, len(common), "At least 6 hours that match station hours", f"Only {len(common)} hours could be matched to the station."))
        return checks, site
    s, r = site.loc[common].values, ref.loc[common].values
    up = float(np.median(s - r))
    checks.append(Check("UPLIFT", UPLIFT_MIN <= up <= UPLIFT_MAX, round(up, 2), "Median site minus station within -1 to +2 C",
                        f"Site is {up:+.1f} C from the station on median, inside the -1 to +2 C band." if UPLIFT_MIN <= up <= UPLIFT_MAX
                        else f"Site is {up:+.1f} C from the station on median, outside the -1 to +2 C band."))
    corr = float(np.corrcoef(s, r)[0, 1]) if np.std(s) > 0 and np.std(r) > 0 else 0.0
    checks.append(Check("SHAPE", corr >= MIN_CORR, round(corr, 2), "Correlation with the station's daily shape at least 0.7",
                        f"Daily shape follows the station (r = {corr:.2f})." if corr >= MIN_CORR else f"Daily shape does not follow the station (r = {corr:.2f}, needs 0.7)."))
    dstd = float(np.std(np.diff(s)))
    checks.append(Check("NOT_FLAT", dstd >= MIN_DIFF_STD, round(dstd, 3), "Hour-to-hour change has spread of at least 0.05 C",
                        "Readings vary hour to hour like a real meter." if dstd >= MIN_DIFF_STD else "Readings are flat or copied."))
    vals = site_raw.values if len(site_raw) else s
    just = ((vals >= 33.0) & (vals < 33.15)) | ((vals >= 32.0) & (vals < 32.15))
    near = float(np.mean(just))
    hot = vals >= 31.5
    near_hot = float(just[hot].mean()) if hot.sum() >= 3 else 0.0
    ok_b = near <= MAX_BUNCHED and near_hot <= MAX_BUNCHED_AMONG_HOT
    checks.append(Check("NOT_BUNCHED", ok_b, round(max(near, near_hot), 3), "At most 35% of all readings, and at most 60% of readings at 31.5+, sit just above 32.0 or 33.0",
                        "Readings are not bunched at the payout thresholds." if ok_b else f"{near_hot:.0%} of the paying readings sit just above 32.0 or 33.0."))
    if len(s) >= 6 and np.std(np.diff(r)) > 0 and np.std(np.diff(s)) > 0:
        dcorr = float(np.corrcoef(np.diff(s), np.diff(r))[0, 1])
        checks.append(Check("SAME_DAY", dcorr >= MIN_DIFF_CORR, round(dcorr, 2), "Hour-to-hour changes follow the station's on the same day (r at least 0.3)",
                            "Clouds and showers at the station show up in the log too." if dcorr >= MIN_DIFF_CORR
                            else f"Hour-to-hour changes do not match the station that day (r = {dcorr:.2f}). The log may be from another day."))
    return checks, site


def rest_minutes(series: pd.Series, meal_hour: int | None) -> pd.Series:
    out = series.map(rules.heat_rest_minutes)
    if meal_hour is not None and meal_hour in out.index:
        out.loc[meal_hour] = 0
    return out


def topup_minutes(site: pd.Series, ref: pd.Series, meal_hour: int | None = rules.DEFAULT_MEAL_HOUR) -> tuple[int, list[dict]]:
    common = site.index.intersection(ref.index)
    rs, rr = rest_minutes(site.loc[common], meal_hour), rest_minutes(ref.loc[common], meal_hour)
    lines = []
    total = 0
    for h in common:
        extra = int(max(0, rs.loc[h] - rr.loc[h]))
        total += extra
        lines.append({"hour": f"{h:02d}:00", "site": round(float(site.loc[h]), 2), "station": round(float(ref.loc[h]), 2),
                      "site_rest": int(rs.loc[h]), "station_rest": int(rr.loc[h]), "top_up": extra, "meal_hour": h == meal_hour})
    return total, lines


# ---------------------------------------------------------------- claim
@dataclass
class Claim:
    claim_id: str
    uen: str
    firm: str
    day: str
    station: str
    workers: int
    benefit: float
    status: str  # APPROVED | REVIEW
    checks: list[dict]
    hours: list[dict]
    topup_minutes_per_worker: int
    topup_hours_per_worker: float
    topup_sgd: float
    ytd_topup_h_before: float
    notes: list[str]
    audit: list[dict] = field(default_factory=list)
    human_decision: str | None = None


def _norm_addr(a: str) -> str:
    return re.sub(r"[^a-z0-9]", "", a.lower())


def check_claim(uen: str, day: date, csv_text: str, site_address: str | None = None, ytd_topup_h: float = 0.0, now: datetime | None = None) -> Claim:
    from rehat.ledger import firm_by_uen

    firm = firm_by_uen(uen)
    now = now or datetime.now()
    raw, notes = parse_csv(csv_text, day)
    ref = station_curve(firm.primary_station, day)
    if ref.empty:
        ref = station_curve(firm.backup_station, day)
        notes.append("Primary station had no readings that day; compared with the backup station.")
    declared = [_norm_addr(s.address) for s in firm.sites]
    address_ok = site_address is None or _norm_addr(site_address) in declared or any(_norm_addr(site_address) in d or d in _norm_addr(site_address) for d in declared)
    checks, site = run_checks(raw, day, ref, address_ok, firm.meal_hour)
    passed = all(c.passed for c in checks)
    mins, lines = topup_minutes(site, ref, firm.meal_hour) if len(site) else (0, [])
    room_h = max(0.0, rules.SITE_MATCH_YEARLY_CAP_H - ytd_topup_h)
    hrs = min(mins / 60.0, room_h)
    if hrs < mins / 60.0:
        notes.append(f"Top-up cut to {hrs:.2f} h by the 10 h a year Site Match cap.")
    status = "APPROVED" if passed else "REVIEW"
    claim = Claim(
        claim_id=f"SM-{uen[-5:]}-{day:%Y%m%d}-{hashlib.sha1(csv_text.encode()).hexdigest()[:4].upper()}", uen=uen, firm=firm.name, day=day.isoformat(), station=firm.primary_station, workers=firm.outdoor_workers,
        benefit=firm.benefit, status=status, checks=[asdict(c) for c in checks], hours=lines, topup_minutes_per_worker=int(mins),
        topup_hours_per_worker=round(hrs, 3) if passed else 0.0, topup_sgd=float(round(hrs * firm.benefit * firm.outdoor_workers)) if passed else 0.0,
        ytd_topup_h_before=ytd_topup_h, notes=notes,
    )
    claim.audit.append({"at": now.isoformat(timespec="seconds"), "by": "Site Match checker", "event": status,
                        "detail": "All checks inside the band." if passed else "Sent to a person: " + "; ".join(c.text for c in checks if not c.passed)})
    return claim


# ---------------------------------------------------------------- review queue
QUEUE = PROCESSED / "review_queue.json"


def load_queue() -> list[dict]:
    return json.loads(QUEUE.read_text()) if QUEUE.exists() else []


def enqueue(claim: Claim) -> None:
    q = [c for c in load_queue() if c["claim_id"] != claim.claim_id]
    q.append(asdict(claim))
    QUEUE.write_text(json.dumps(q, indent=1))


def decide(claim_id: str, decision: str, reviewer: str, reason: str, now: datetime | None = None) -> dict:
    """Human decision on a REVIEW claim. decision: approve | decline. Only a person can decline."""
    if decision not in ("approve", "decline"):
        raise ValueError("decision must be approve or decline")
    q = load_queue()
    for c in q:
        if c["claim_id"] == claim_id:
            c["human_decision"] = decision
            if decision == "approve":
                mins = c["topup_minutes_per_worker"]
                hrs = min(mins / 60.0, rules.SITE_MATCH_YEARLY_CAP_H - c["ytd_topup_h_before"])
                c["topup_hours_per_worker"] = round(hrs, 3)
                c["topup_sgd"] = float(round(hrs * c["benefit"] * c["workers"]))
            c["audit"].append({"at": (now or datetime.now()).isoformat(timespec="seconds"), "by": reviewer, "event": f"HUMAN_{decision.upper()}", "detail": reason})
            QUEUE.write_text(json.dumps(q, indent=1))
            return c
    raise KeyError(claim_id)


# ---------------------------------------------------------------- optional vision extraction
def extract_from_image(image_bytes: bytes) -> dict:
    """Optional: read a photo or PDF of a log with a vision model. Only if OPENAI_API_KEY is set.
    The user always confirms the extracted table before submitting."""
    if not os.getenv("OPENAI_API_KEY"):
        return {"available": False, "message": "Photo reading is unavailable without an API key. Upload the CSV export from the site's WBGT meter."}
    return {"available": False, "message": "Vision extraction is unavailable in this Labs pilot. Upload CSV."}


# ---------------------------------------------------------------- simulation and evaluation
KINDS = ["honest", "inflated", "flat", "threshold", "pasted_day"]


def simulate_log(kind: str, ref: np.ndarray, other_day: np.ndarray, rng: np.random.Generator) -> np.ndarray:
    n = len(ref)
    if kind == "honest":
        return ref + rng.normal(0.8, 0.5) + rng.normal(0, 0.3, n)
    if kind == "inflated":
        return ref + rng.uniform(2.5, 4.0) + rng.normal(0, 0.3, n)
    if kind == "flat":
        return np.full(n, 33.0 + rng.uniform(0, 0.4))
    if kind == "threshold":
        return np.where(ref > 30.5, 33.0 + rng.uniform(0, 0.1, n), ref + 0.5)
    # a real log from another day at the same station pasted in, shifted up
    return other_day + rng.uniform(0.5, 1.5) + rng.normal(0, 0.3, n)


def _check_arrays(site: np.ndarray, ref: np.ndarray) -> list[str]:
    s_idx = pd.Index(range(8, 8 + len(ref)))
    raw = pd.Series(site, index=s_idx)
    checks, _ = run_checks(raw, date(2000, 1, 1), pd.Series(ref, index=s_idx), True)
    return [c.code for c in checks if not c.passed and c.code not in ("TIMESTAMPS",)]


def real_days(n_extra: int = 10) -> list[date]:
    o = _obs_hourly()
    if o.empty:
        return [date(2025, 10, 31)]
    o = o[(o.hour.dt.hour >= 8) & (o.hour.dt.hour <= 17) & (o.hour.dt.weekday < 6)]
    full = o.groupby([o.hour.dt.date, "station_id"]).size()
    full = full[full == 10].reset_index().groupby("hour").size()
    good_days = set(full[full >= 12].index)
    hot = o[o.hour.dt.date.isin(good_days)].groupby(o.hour.dt.date).wbgt.max().sort_values(ascending=False)
    days = [d for d in hot.index if d != date(2025, 10, 31)][:n_extra]
    return [date(2025, 10, 31)] + sorted(days)


def evaluate(n_logs: int = 400, seed: int = 7) -> dict:
    rng = np.random.default_rng(seed)
    days = real_days()
    o = _obs_hourly()
    curves = {}
    for d in days:
        for st in o[o.hour.dt.date == d].station_id.unique() if not o.empty else []:
            c = station_curve(st, d)
            if len(c) == 10:
                curves[(st, d)] = c.values
    if not curves:
        d0 = date(2025, 10, 31)
        seed_df = pd.read_csv(SEED / "d1031.csv")
        for st in [c for c in seed_df.columns if c.startswith("S")]:
            curves[(st, d0)] = station_curve(st, d0).values
    keys = list(curves)
    res = []
    for k in range(n_logs * len(days) // 1 if False else n_logs):
        st, d = keys[rng.integers(len(keys))]
        ref = curves[(st, d)]
        others = [kk for kk in keys if kk[0] == st and kk[1] != d] or [kk for kk in keys if kk[1] != d]
        other = curves[others[rng.integers(len(others))]] if others else ref[::-1]
        kind = (["honest"] * 3 + KINDS[1:])[k % 7]
        site = simulate_log(kind, ref, other, rng)
        fails = _check_arrays(site, ref)
        idx = pd.Index(range(8, 8 + len(ref)))
        gain, _ = topup_minutes(pd.Series(site, index=idx), pd.Series(ref, index=idx))
        res.append({"kind": kind, "flagged": bool(fails), "fails": fails, "day": str(d), "gain_min": gain, "leak": (not fails) and gain > 0})
    df = pd.DataFrame(res)
    rates = df.groupby("kind").flagged.mean().round(3).to_dict()
    leak = df.groupby("kind").leak.mean().round(3).to_dict()
    leak_min = df[df.leak].groupby("kind").gain_min.mean().round(1).to_dict()
    by_check = {kind: pd.Series([f for fl in g.fails for f in fl]).value_counts().to_dict() for kind, g in df.groupby("kind")}
    return {"logs": n_logs, "days": [str(d) for d in days], "station_days": len(curves), "flag_rate": rates, "approved_with_topup_rate": leak,
            "mean_topup_min_when_leaked": leak_min, "fails_by_check": by_check}


def price_rider(benefit: float = 8.0, uplift_mean: float = 0.8, uplift_sd: float = 0.5, claim_share: float = 0.5, seed: int = 3) -> dict:
    """Expected top-up hours a worker a year for honest sites, priced at the 0.65 target loss ratio.

    Assumptions: site uplift ~ N(0.8, 0.5) C per firm-year (simulation prior until real logs are tested); firms file on
    a share of eligible days (claim_share, assumption 50%); cap 10 h a year."""
    reb = PROCESSED / "wbgt_hourly_rebuilt.parquet"
    d = pd.read_parquet(reb, columns=["station_id", "hour", "wbgt"])
    d = d[(d.hour.dt.year >= 2000) & (d.hour.dt.year <= 2025) & (d.hour.dt.weekday < 6) & (d.hour.dt.hour != 12)]
    rng = np.random.default_rng(seed)
    st_rest = d.wbgt.map(rules.heat_rest_minutes).values
    yrs = d.hour.dt.year.values
    sts = d.station_id.values
    per_year = []
    for (st, y), idx in pd.Series(range(len(d))).groupby([sts, yrs]).groups.items():
        idx = np.asarray(list(idx))
        u = rng.normal(uplift_mean, uplift_sd)
        site = d.wbgt.values[idx] + u
        extra = np.clip(np.select([site >= 33, site >= 32, site >= 31.5], [15, 10, 5], 0) - st_rest[idx], 0, None)
        h = min(extra.sum() / 60.0 * claim_share, rules.SITE_MATCH_YEARLY_CAP_H)
        per_year.append(h)
    exp_h = float(np.mean(per_year))
    price = exp_h * benefit / 0.65
    return {"expected_topup_h": round(exp_h, 2), "rider_price_year": round(price, 2), "rider_price_week": round(price / 52, 2),
            "assumptions": {"uplift_mean_c": uplift_mean, "uplift_sd_c": uplift_sd, "claim_share": claim_share, "cap_h": rules.SITE_MATCH_YEARLY_CAP_H, "benefit": benefit},
            "share_years_at_cap": round(float(np.mean(np.array(per_year) >= rules.SITE_MATCH_YEARLY_CAP_H - 1e-9)), 3)}


# ---------------------------------------------------------------- sample logs
def write_sample_logs() -> list[dict]:
    """10 demo CSVs for Tanjong Greenworks (S132, Jurong West) on 31 Oct 2025."""
    out_dir = SEED / "site_logs"
    out_dir.mkdir(parents=True, exist_ok=True)
    d = pd.read_csv(SEED / "d1031.csv")
    ref15 = d.set_index("time")["S132"]
    other15 = d.set_index("time")["S124"]  # Changi's curve stands in for "another day" shape
    rng = np.random.default_rng(31)
    specs = [
        ("01_honest_contractor_log.csv", "honest", 0.9), ("02_honest_shaded_side.csv", "honest", 0.4), ("03_honest_open_slab.csv", "honest", 1.5),
        ("04_honest_quarter_hourly.csv", "honest", 0.8), ("05_inflated_plus3.csv", "inflated", 3.2), ("06_inflated_plus2_5.csv", "inflated", 2.6),
        ("07_flat_copied.csv", "flat", None), ("08_threshold_bunched.csv", "threshold", None), ("09_pasted_other_day.csv", "pasted_day", None),
        ("10_wrong_day_timestamps.csv", "wrong_day", 0.8),
    ]
    meta = []
    for name, kind, up in specs:
        times = list(ref15.index)
        if kind == "honest":
            vals = ref15.values + up + rng.normal(0, 0.15, len(times))
        elif kind == "inflated":
            vals = ref15.values + up + rng.normal(0, 0.15, len(times))
        elif kind == "flat":
            vals = np.full(len(times), 33.2)
        elif kind == "threshold":
            vals = np.where(ref15.values > 30.5, 33.0 + rng.uniform(0, 0.12, len(times)), ref15.values + 0.4)
        elif kind == "pasted_day":
            vals = other15.values[::-1] + 1.2 + rng.normal(0, 0.15, len(times))
        else:
            vals = ref15.values + up + rng.normal(0, 0.15, len(times))
        if name.startswith("04"):
            rows = [f"{t},{v:.1f}" for t, v in zip(times, vals)]
        elif kind == "wrong_day":
            rows = [f"2025-10-30 {t},{v:.1f}" for t, v in zip(times[::4], vals[::4])]
        else:
            rows = [f"{t},{np.mean(vals[i:i + 4]):.1f}" for i, t in zip(range(0, len(times), 4), times[::4])]
        (out_dir / name).write_text("time,wbgt\n" + "\n".join(rows) + "\n")
        meta.append({"file": name, "kind": kind, "label": name[3:-4].replace("_", " ")})
    (out_dir / "index.json").write_text(json.dumps(meta, indent=1))
    return meta


# ---------------------------------------------------------------- run
def run() -> dict:
    samples = write_sample_logs()
    from rehat.ledger import demo_book

    uen = demo_book()[0].uen
    day = date(2025, 10, 31)
    results = []
    for s in samples:
        c = check_claim(uen, day, (SEED / "site_logs" / s["file"]).read_text(), site_address=demo_book()[0].sites[0].address,
                        now=datetime(2025, 11, 3, 9, 0))
        results.append({"file": s["file"], "kind": s["kind"], "label": s["label"], "claim": asdict(c)})
    QUEUE.write_text(json.dumps([r["claim"] for r in results if r["claim"]["status"] == "REVIEW"], indent=1))
    ev = evaluate()
    pilot_terms = product.product_dict()["site_match_pilot_rider"]
    out = {
        "samples": results,
        "evaluation": ev,
        "pilot_rider": pilot_terms,
        "headline": {
            "Simulated logs": f"{ev['logs']} logs on {ev['station_days']} real station-days ({len(ev['days'])} days incl. 31 Oct 2025)",
            "Honest logs flagged": f"{ev['flag_rate'].get('honest', 0):.0%}",
            "Inflated logs caught": f"{ev['flag_rate'].get('inflated', 0):.0%}",
            "Flat logs caught": f"{ev['flag_rate'].get('flat', 0):.0%}",
            "Threshold-bunched caught": f"{ev['flag_rate'].get('threshold', 0):.0%}",
            "Pasted-from-another-day caught": f"{ev['flag_rate'].get('pasted_day', 0):.0%}",
            "Fakes approved with a top-up": ", ".join(f"{k} {v:.0%}" for k, v in ev["approved_with_topup_rate"].items() if k != "honest"),
            "Pilot status": "Labs only. It is separate from core plan price and payout.",
            "Sample logs": f"{sum(r['claim']['status'] == 'APPROVED' for r in results)} approved, {sum(r['claim']['status'] == 'REVIEW' for r in results)} sent for review",
        },
    }
    (PROCESSED / "sitematch.json").write_text(json.dumps(out, indent=1, default=str))
    WEB_DATA.mkdir(parents=True, exist_ok=True)
    (WEB_DATA / "sitematch.json").write_text(json.dumps(out, default=str))
    for s in samples:
        (WEB_DATA / "site_logs").mkdir(exist_ok=True)
        (WEB_DATA / "site_logs" / s["file"]).write_text((SEED / "site_logs" / s["file"]).read_text())
    return out


if __name__ == "__main__":
    r = run()
    print(json.dumps(r["headline"], indent=1))
    print(json.dumps(r["evaluation"]["fails_by_check"], indent=1))
    for s in r["samples"]:
        c = s["claim"]
        print(s["file"], c["status"], c["topup_minutes_per_worker"], c["topup_sgd"], [x["code"] for x in c["checks"] if not x["passed"]])
