"""FastAPI service for the Rehat engine."""
from __future__ import annotations

import json
from functools import lru_cache
from typing import Any, Literal

import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from rehat import ledger as L
from rehat.paths import PROCESSED
from rehat.stations import rain_gauges, wbgt_stations

app = FastAPI(title="Rehat engine (concept prototype)", version="0.1.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/stations")
def stations() -> dict[str, Any]:
    return {
        "wbgt": [s.__dict__ for s in wbgt_stations()],
        "rain": [s.__dict__ for s in rain_gauges()],
    }


def _policy_months(firm: L.Firm, month: str) -> list[str]:
    """Months of the current policy year up to and including `month` (policy year starts at cover_start)."""
    start = pd.Timestamp(firm.cover_start)
    target = pd.Timestamp(f"{month}-01")
    while start + pd.DateOffset(years=1) <= target:
        start += pd.DateOffset(years=1)
    return [p.strftime("%Y-%m") for p in pd.period_range(start, target, freq="M")]


@lru_cache(maxsize=256)
def _ledger(uen: str, month: str) -> L.FirmMonthLedger:
    try:
        firm = L.firm_by_uen(uen)
    except KeyError:
        raise HTTPException(404, f"No demo firm with UEN {uen}")
    return L.policy_year_ledgers(firm, _policy_months(firm, month))[-1]


@app.get("/ledger/{uen}/{month}")
def get_ledger(uen: str, month: str) -> dict[str, Any]:
    return _ledger(uen, month).to_dict(include_hours=True)


@app.get("/receipt/{uen}/{month}")
def get_receipt(uen: str, month: str) -> dict[str, Any]:
    d = _ledger(uen, month).to_dict(include_hours=False)
    keep = ["firm", "month", "stations", "perils", "insured_before_caps_h", "insured_after_caps_h", "monthly_cap_h", "yearly_cap_h", "ytd_insured_before_h", "payout_sgd", "settlement_date", "receipt_lines", "not_counted", "exclusions"]
    return {k: d[k] for k in keep}


class QuoteIn(BaseModel):
    """Only plan, benefit (from plan) and headcount. No personal data."""

    workers: int = Field(gt=0, le=500)
    plan: Literal["Lite", "Standard"] = "Standard"
    site_match: bool = False


@app.post("/quote")
def post_quote(q: QuoteIn) -> dict[str, Any]:
    from rehat import pricing

    p = json.loads((PROCESSED / "pricing.json").read_text())
    return pricing.quote(q.workers, q.plan, p["expected_insured_h"], q.site_match, p["site_match_rider"]["week"])


@app.get("/backtest")
def get_backtest() -> dict[str, Any]:
    return json.loads((PROCESSED / "backtest.json").read_text())


@app.get("/reinsurance")
def get_reinsurance(attach: float = 1.5) -> dict[str, Any]:
    p = json.loads((PROCESSED / "pricing.json").read_text())
    rows = [r for r in p["reinsurance"]["table"] if abs(r["attach"] - attach) < 1e-9]
    return {"requested": attach, "row": rows[0] if rows else None, "table": p["reinsurance"]["table"], "note": p["reinsurance"]["note"]}


@app.get("/liquidity")
def get_liquidity(asof: str | None = None) -> dict[str, Any]:
    """Cash call distribution for the settlement of the month containing `asof`. Plans Income's cash only."""
    from datetime import date as _date

    from rehat import liquidity

    if asof is None:
        return json.loads((PROCESSED / "liquidity.json").read_text())
    return liquidity.forecast_month(_date.fromisoformat(asof))
