"""Declaration anomaly flags: compare declared outdoor headcount and wage band with firm size and activity.

Isolation forest on the demo book plus rules. FLAG ONLY: a flag asks a person to check the WIC declaration. It never
changes a price or a payout. Inputs are firm-level only (no worker personal data, no nationality, age or health).
Firm size and activity code are fictional stand-ins for an ACRA lookup.
"""
from __future__ import annotations

import json

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest

from rehat.ledger import demo_book
from rehat.paths import PROCESSED, WEB_DATA

SSIC = {"construction": "43", "landscaping": "81300", "cleaning": "81291"}  # fictional mapping for the demo dataset
WAGE_IDX = {"S$1,600 to S$2,000": 0, "S$2,000 to S$2,400": 1, "S$2,400 to S$2,600": 2}
SEEDED = {  # index in demo book -> what was seeded
    10: "outdoor headcount above total employees",
    25: "cleaning firm with 60 outdoor workers in top wage band and 61 employees",
    40: "outdoor share 100% for a 58-worker construction firm with tiny paid-up capital",
    77: "headcount jumped 4x at renewal",
    120: "landscaping firm declaring 59 outdoor workers with 8 employees on ACRA",
    150: "outdoor headcount above total employees",
    210: "top wage band with 2 employees",
    260: "headcount jumped 5x at renewal",
}


def features(seed: int = 5) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    rows = []
    for i, f in enumerate(demo_book()):
        total = int(round(f.outdoor_workers * rng.uniform(1.15, 1.8)))
        last_year = int(round(f.outdoor_workers * rng.uniform(0.85, 1.15)))
        capital = float(np.exp(rng.normal(np.log(50_000 + 2_000 * total), 0.4)))
        rows.append({"uen": f.uen, "name": f.name, "sector": f.sector, "outdoor": f.outdoor_workers, "total_employees": total,
                     "wage_idx": WAGE_IDX[f.wage_band], "last_year_outdoor": last_year, "paid_up_capital": capital})
    df = pd.DataFrame(rows)
    for i, what in SEEDED.items():
        if "above total" in what:
            df.loc[i, "total_employees"] = int(df.loc[i, "outdoor"] * 0.7)
        elif "cleaning" in what:
            df.loc[i, ["sector", "outdoor", "total_employees", "wage_idx"]] = ["cleaning", 60, 61, 2]
        elif "tiny paid-up" in what:
            df.loc[i, ["outdoor", "total_employees", "paid_up_capital"]] = [58, 58, 1_000.0]
        elif "jumped" in what:
            df.loc[i, "last_year_outdoor"] = max(2, int(df.loc[i, "outdoor"] / (4 if "4x" in what else 5)))
        elif "8 employees" in what:
            df.loc[i, ["sector", "outdoor", "total_employees"]] = ["landscaping", 59, 8]
        elif "2 employees" in what:
            df.loc[i, ["wage_idx", "total_employees", "outdoor"]] = [2, 2, 2]
    df["outdoor_share"] = df.outdoor / df.total_employees.clip(lower=1)
    df["growth"] = df.outdoor / df.last_year_outdoor.clip(lower=1)
    df["log_capital_per_worker"] = np.log(df.paid_up_capital / df.outdoor.clip(lower=1))
    df["seeded"] = [i in SEEDED for i in range(len(df))]
    return df


def flag(df: pd.DataFrame | None = None) -> pd.DataFrame:
    df = features() if df is None else df
    X = df[["outdoor", "outdoor_share", "wage_idx", "growth", "log_capital_per_worker"]].values
    iso = IsolationForest(n_estimators=300, contamination=0.04, random_state=0).fit(X)
    df = df.copy()
    df["iso_flag"] = iso.predict(X) == -1
    df["iso_score"] = -iso.score_samples(X)
    reasons = []
    for _, r in df.iterrows():
        rs = []
        if r.outdoor_share > 1.0:
            rs.append("Declared outdoor workers exceed total employees on ACRA.")
        if r.growth >= 3:
            rs.append(f"Outdoor headcount is {r.growth:.1f}x last year's declaration.")
        if r.wage_idx == 2 and r.total_employees <= 3:
            rs.append("Top wage band for a very small firm.")
        if r.log_capital_per_worker < np.log(200):
            rs.append("Paid-up capital is very low for this many workers.")
        if r.iso_flag and not rs:
            rs.append("Unusual mix of headcount, wage band and size compared with similar firms.")
        reasons.append(rs)
    df["reasons"] = reasons
    df["flagged"] = df.reasons.map(bool)
    return df


def run() -> dict:
    df = flag()
    tp = int((df.flagged & df.seeded).sum())
    fp = int((df.flagged & ~df.seeded).sum())
    fn = int((~df.flagged & df.seeded).sum())
    out = {"firms": len(df), "seeded": int(df.seeded.sum()), "flagged": int(df.flagged.sum()), "true_positive": tp, "false_positive": fp, "missed": fn,
           "precision": round(tp / max(tp + fp, 1), 3), "recall": round(tp / max(tp + fn, 1), 3),
           "flags": df[df.flagged][["uen", "name", "sector", "outdoor", "total_employees", "reasons", "seeded"]].to_dict(orient="records"),
           "note": "Flag only. A person checks the WIC declaration. Price and payout never change from a flag."}
    (PROCESSED / "anomaly.json").write_text(json.dumps(out, indent=1, default=str))
    WEB_DATA.mkdir(parents=True, exist_ok=True)
    (WEB_DATA / "anomaly.json").write_text(json.dumps(out, default=str))
    return out


if __name__ == "__main__":
    r = run()
    print({k: v for k, v in r.items() if k != "flags"})
