"""Gap-fill for PENDING station-hours: neighbour median, median + offset, ridge.

Never pays on its own (rules.fallback): after 48 h it only PROPOSES a value, labelled "model estimate", for human review.
Validation: leave one station out, train on the earlier 70% of days, test on the last 30%.
"""
from __future__ import annotations

import json

import numpy as np
import pandas as pd
from sklearn.linear_model import Ridge

from rehat import rules
from rehat.paths import DOCS, PROCESSED, WEB_DATA


def band(v: np.ndarray) -> np.ndarray:
    v = np.asarray(v, float)
    return np.select([v >= 33, v >= 32, v >= 31.5], [3, 2, 1], 0)


def hourly_wide() -> pd.DataFrame:
    w = pd.read_parquet(PROCESSED / "wbgt_15min.parquet", columns=["station_id", "ts_sgt", "wbgt"]).dropna()
    w["hour"] = w.ts_sgt.dt.floor("h")
    g = w.groupby(["station_id", "hour"]).wbgt.agg(["mean", "count"])
    g = g[g["count"] >= 3]["mean"].unstack("station_id")
    return g[(g.index.hour >= 8) & (g.index.hour < 18)]


def validate(min_station_hours: int = 300) -> dict:
    H = hourly_wide()
    days = np.array(sorted(set(H.index.normalize())))
    cut = days[int(len(days) * 0.7)] if len(days) > 3 else days[-1]
    rows = []
    for st in H.columns:
        y = H[st]
        others = H.drop(columns=st)
        ok = y.notna() & (others.notna().sum(axis=1) >= 5)
        if ok.sum() < min_station_hours:
            continue
        Z = others[ok]
        med = Z.median(axis=1)
        Zf = Z.apply(lambda c: c.fillna(med))
        yy = y[ok]
        tr = yy.index < cut
        te = ~tr
        if te.sum() < 30 or tr.sum() < 30:
            continue
        off = float((yy[tr] - med[tr]).mean())
        keep = Zf.columns[Zf[tr].notna().all()]
        rdg = Ridge(alpha=5.0).fit(Zf.loc[tr, keep].values, yy[tr].values)
        preds = {"median": med[te].values, "median+offset": med[te].values + off, "ridge": rdg.predict(Zf.loc[te, keep].values)}
        obs = yy[te].values
        near = (obs >= 31) & (obs <= 34)
        for name, p in preds.items():
            rows.append({"station_id": st, "method": name, "n": int(te.sum()), "mae": float(np.mean(np.abs(p - obs))),
                         "band_agreement": float(np.mean(band(p) == band(obs))),
                         "trigger_agreement": float(np.mean((p >= 31.5) == (obs >= 31.5))),
                         "mae_31_34": float(np.mean(np.abs(p[near] - obs[near]))) if near.any() else np.nan,
                         "band_agreement_31_34": float(np.mean(band(p[near]) == band(obs[near]))) if near.any() else np.nan})
    df = pd.DataFrame(rows)
    summary = df.groupby("method")[["mae", "band_agreement", "trigger_agreement", "mae_31_34", "band_agreement_31_34"]].mean().round(3)
    return {"test_from": str(cut)[:10], "stations": int(df.station_id.nunique()) if len(df) else 0, "summary": summary.reset_index().to_dict(orient="records"),
            "decision": "Not good enough to pay on. Pending hours wait up to 48 h for a backup station, then a model estimate is proposed for human review only."}


def propose(station: str, hour: pd.Timestamp, hours_since: float) -> dict:
    """Propose a value for a pending station-hour. Returns PENDING with a labelled estimate; never pays."""
    H = hourly_wide()
    if hour not in H.index or hours_since < 48:
        return {"state": rules.PENDING, "value": None, "label": None, "note": "Waiting up to 48 h for the backup station."}
    row = H.loc[hour].drop(labels=[station], errors="ignore").dropna()
    if len(row) < 5:
        return {"state": rules.PENDING, "value": None, "label": None, "note": "Too few neighbours reporting."}
    v = float(row.median())
    return {"state": rules.PENDING, "value": round(v, 2), "label": "model estimate", "rest_minutes_if_accepted": rules.heat_rest_minutes(v),
            "note": "Proposed from the network median. Sent for human review. Not paid on its own."}


def run() -> dict:
    v = validate()
    (PROCESSED / "gapfill.json").write_text(json.dumps(v, indent=1))
    WEB_DATA.mkdir(parents=True, exist_ok=True)
    (WEB_DATA / "gapfill.json").write_text(json.dumps(v))
    return v


if __name__ == "__main__":
    print(json.dumps(run(), indent=1))
