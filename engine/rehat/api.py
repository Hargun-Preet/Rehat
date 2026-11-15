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


class SiteMatchIn(BaseModel):
    uen: str
    day: str
    csv: str
    site_address: str | None = None
    ytd_topup_h: float = 0.0


@app.post("/sitematch/check")
def post_sitematch(body: SiteMatchIn) -> dict[str, Any]:
    """Status is APPROVED or REVIEW, never REJECTED. Only a person can decline."""
    from dataclasses import asdict
    from datetime import date as _date

    from rehat import sitematch

    try:
        c = sitematch.check_claim(body.uen, _date.fromisoformat(body.day), body.csv, body.site_address, body.ytd_topup_h)
    except sitematch.LogError as e:
        raise HTTPException(422, str(e))
    if c.status == "REVIEW":
        sitematch.enqueue(c)
    return asdict(c)


@app.get("/sitematch/queue")
def get_queue() -> list[dict[str, Any]]:
    from rehat import sitematch

    return sitematch.load_queue()


class DecisionIn(BaseModel):
    claim_id: str
    decision: Literal["approve", "decline"]
    reviewer: str
    reason: str


@app.post("/sitematch/decide")
def post_decide(body: DecisionIn) -> dict[str, Any]:
    from rehat import sitematch

    try:
        return sitematch.decide(body.claim_id, body.decision, body.reviewer, body.reason)
    except KeyError:
        raise HTTPException(404, "No such claim in the review queue")


@app.get("/explain/{uen}/{month}")
def get_explain(uen: str, month: str, lang: str = "en") -> dict[str, Any]:
    from rehat import explain

    r = get_receipt(uen, month)
    if lang not in explain.LANGS:
        raise HTTPException(400, f"lang must be one of {list(explain.LANGS)}")
    return {**explain.explain(r, lang), "why_not_paid": explain.why_not_paid(r, lang)}


@app.get("/compliance")
def get_compliance() -> dict[str, Any]:
    p = PROCESSED.parent.parent / "web" / "public" / "data" / "compliance.json"
    return json.loads(p.read_text()) if p.exists() else {"rows": []}


@app.get("/live")
def get_live() -> dict[str, Any]:
    """Live mode: today's WBGT and PSI from data.gov.sg. Today's pages are still filling, so each response is saved to
    data/raw/live/ for audit instead of the day cache. The web app falls back to its offline snapshot on any error."""
    from datetime import datetime as _dt

    import requests as _rq

    from rehat import rules as _r
    from rehat.ingest.cache import write_cached
    from rehat.ingest.datagov import BASE, _headers
    from rehat.paths import RAW

    today = _dt.now().strftime("%Y-%m-%d")
    out: dict[str, Any] = {"mode": "live", "day": today, "stations": [], "psi": {}}
    url = f"{BASE}/weather"
    recs: list[dict] = []
    token = None
    for _ in range(8):
        params = {"api": "wbgt", "date": today, **({"paginationToken": token} if token else {})}
        body = _rq.get(url, params=params, headers=_headers(), timeout=20).json()
        data = body.get("data") or {}
        write_cached(RAW / "live" / f"{_dt.now():%Y%m%dT%H%M%S}_wbgt.json", url, params, data)
        recs += data.get("records", [])
        token = data.get("paginationToken")
        if not token:
            break
    latest: dict[str, dict] = {}
    for rec in sorted(recs, key=lambda r: r["datetime"]):
        for rd in rec["item"]["readings"]:
            latest[rd["station"]["id"]] = {"ts": rec["datetime"], "wbgt": float(rd["wbgt"]), "name": rd["station"].get("townCenter"),
                                           "lat": float(rd["location"]["latitude"]), "lon": float(rd["location"]["longitude"])}
    for sid, v in sorted(latest.items()):
        out["stations"].append({"station_id": sid, **v, "rest_if_hour_mean": _r.heat_rest_minutes(v["wbgt"])})
    pbody = _rq.get(f"{BASE}/psi", params={"date": today}, headers=_headers(), timeout=20).json().get("data") or {}
    write_cached(RAW / "live" / f"{_dt.now():%Y%m%dT%H%M%S}_psi.json", f"{BASE}/psi", {"date": today}, pbody)
    items = pbody.get("items", [])
    if items:
        out["psi"] = {"ts": items[-1]["timestamp"], "regions": items[-1]["readings"]["psi_twenty_four_hourly"]}
    return out


@app.get("/uen/{uen}")
def get_uen(uen: str) -> dict[str, Any]:
    """Format check plus ACRA public register lookup. Fictional T99DM UENs are never sent out."""
    from rehat import uen as _uen

    return _uen.check(uen)
