"""FastAPI service for the Rehat engine."""
from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from functools import lru_cache
from pathlib import Path
from threading import Lock
from typing import Any, Literal
from zoneinfo import ZoneInfo

import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from rehat import ledger as L
from rehat import product as product_source
from rehat.paths import PROCESSED, RAW
from rehat.stations import rain_gauges, wbgt_stations

app = FastAPI(title="Rehat engine", version="2.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


SINGAPORE_TZ = ZoneInfo("Asia/Singapore")
LIVE_CACHE_ROOT = RAW / "live"
LIVE_CACHE_TTL = timedelta(minutes=5)
LIVE_MAX_PAGES = 8
_LIVE_LOCK = Lock()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/product")
def get_product() -> dict[str, object]:
    """Canonical, validated product terms and verbatim copy for online clients."""
    return product_source.product_dict()


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
    """Only the selected v2 plan and declared outdoor headcount. No personal data."""

    workers: int = Field(gt=0, le=500)
    plan: Literal["essential", "standard", "plus"] = "standard"


@app.post("/quote")
def post_quote(q: QuoteIn) -> dict[str, Any]:
    """Return a quote from the versioned product terms, including 9% GST.

    This does not depend on the historical pricing calibration file. That file
    remains a diagnostic input for the Labs back-test, while a live quote must
    use the published plan terms in ``product.json``.
    """
    spec = product_source.get_product()
    plan = spec.plan_by_id(q.plan)
    before_gst = round(q.workers * plan.per_worker_year, 2)
    gst = round(before_gst * spec.product.gst_rate, 2)
    return {
        "inputs_used": list(spec.price_inputs_allowed),
        "plan": {"id": plan.id, "name": plan.name, "deductible_label": plan.deductible_label, "source": plan.source},
        "benefit_per_hour": spec.product.benefit_per_worker_hour,
        "workers": q.workers,
        "per_worker_year": plan.per_worker_year,
        "per_worker_week": plan.per_worker_week,
        "premium_before_gst": before_gst,
        "gst_rate": spec.product.gst_rate,
        "gst": gst,
        "premium_with_gst": round(before_gst + gst, 2),
    }


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


def _singapore_now() -> datetime:
    """Return the clock used by NEA's date-based endpoints."""
    return datetime.now(SINGAPORE_TZ)


def _live_cache_entry(path: Path, now: datetime) -> tuple[dict[str, Any], datetime] | None:
    """Read a fresh live response together with its audit timestamp.

    Live data changes through the day, so this cache deliberately has a short
    lifetime. It still prevents two browser requests in quick succession from
    making the same data.gov.sg request again.
    """
    try:
        envelope = json.loads(path.read_text())
        data = envelope["response"]
        fetched_at = datetime.fromisoformat(envelope["fetched_at_utc"])
        if fetched_at.tzinfo is None:
            fetched_at = fetched_at.replace(tzinfo=timezone.utc)
    except (KeyError, OSError, TypeError, ValueError, json.JSONDecodeError):
        return None
    if now.astimezone(timezone.utc) - fetched_at.astimezone(timezone.utc) > LIVE_CACHE_TTL:
        return None
    return data, fetched_at


def _request_live_data(url: str, params: dict[str, str]) -> dict[str, Any]:
    """Fetch one live data.gov.sg page and reject malformed API responses."""
    import requests

    from rehat.ingest.datagov import _headers

    response = requests.get(url, params=params, headers=_headers(), timeout=20)
    response.raise_for_status()
    body = response.json()
    if body.get("code") not in (0, None):
        raise RuntimeError(str(body.get("errorMsg") or "data.gov.sg returned an error"))
    data = body.get("data")
    if not isinstance(data, dict):
        raise RuntimeError("data.gov.sg returned no data object")
    return data


def _live_pages(kind: str, url: str, base_params: dict[str, str], day: str, now: datetime) -> tuple[list[dict[str, Any]], list[datetime], bool]:
    """Return all pages for a live source, using a short-lived, audited disk cache."""
    from rehat.ingest.cache import write_cached

    folder = LIVE_CACHE_ROOT / day / kind
    pages: list[dict[str, Any]] = []
    fetched_at: list[datetime] = []
    all_cached = True
    token: str | None = None
    for page in range(LIVE_MAX_PAGES):
        params = {**base_params, "date": day}
        if token:
            params["paginationToken"] = token
        cache_file = folder / f"{page:03d}.json"
        cached = _live_cache_entry(cache_file, now)
        if cached is None:
            data = _request_live_data(url, params)
            write_cached(cache_file, url, params, data)
            cached = _live_cache_entry(cache_file, _singapore_now())
            if cached is None:  # Defensive only: the cache write is synchronous.
                raise RuntimeError("could not read the live response after caching it")
            all_cached = False
        data, fetched = cached
        pages.append(data)
        fetched_at.append(fetched)
        token = data.get("paginationToken")
        if not token:
            return pages, fetched_at, all_cached
    raise RuntimeError(f"data.gov.sg returned more than {LIVE_MAX_PAGES} live {kind} pages")


def _as_singapore_time(value: object) -> datetime | None:
    if not isinstance(value, str):
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=SINGAPORE_TZ)
    return parsed.astimezone(SINGAPORE_TZ)


def _live_stations(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Turn quarter-hour records into a state-safe latest hourly reading per station."""
    from rehat import rules

    samples: dict[str, dict[datetime, dict[datetime, float]]] = {}
    details: dict[str, dict[str, Any]] = {}
    for record in records:
        stamp = _as_singapore_time(record.get("datetime"))
        readings = record.get("item", {}).get("readings", [])
        if stamp is None or not isinstance(readings, list):
            continue
        hour = stamp.replace(minute=0, second=0, microsecond=0)
        for reading in readings:
            if not isinstance(reading, dict):
                continue
            station = reading.get("station", {})
            location = reading.get("location", {})
            station_id = station.get("id") if isinstance(station, dict) else None
            if not isinstance(station_id, str):
                continue
            try:
                wbgt = float(reading["wbgt"])
                lat = float(location["latitude"])
                lon = float(location["longitude"])
            except (KeyError, TypeError, ValueError):
                continue
            samples.setdefault(station_id, {}).setdefault(hour, {})[stamp] = wbgt
            current = details.get(station_id)
            if current is None or stamp >= current["latest_raw_at"]:
                name = station.get("townCenter") or station.get("name") or station_id
                details[station_id] = {
                    "name": name,
                    "lat": lat,
                    "lon": lon,
                    "latest_raw_at": stamp,
                    "latest_raw_wbgt": wbgt,
                }

    stations: list[dict[str, Any]] = []
    for station_id in sorted(samples):
        latest_hour = max(samples[station_id])
        readings = samples[station_id][latest_hour]
        hourly_wbgt, state = rules.hourly_wbgt_state(list(readings.values()))
        rest_minutes = rules.heat_rest_minutes(hourly_wbgt) if hourly_wbgt is not None else None
        detail = details[station_id]
        stations.append(
            {
                "station_id": station_id,
                "name": detail["name"],
                "lat": detail["lat"],
                "lon": detail["lon"],
                # Keep these established fields while adding explicit state-safe fields below.
                "ts": latest_hour.isoformat(),
                "wbgt": None if hourly_wbgt is None else round(hourly_wbgt, 2),
                "rest_if_hour_mean": rest_minutes,
                "state": state,
                "rest_minutes": rest_minutes,
                "sample_count": len(readings),
                "latest_raw_ts": detail["latest_raw_at"].isoformat(),
                "latest_raw_wbgt": detail["latest_raw_wbgt"],
            }
        )
    return stations


def _live_psi(pages: list[dict[str, Any]]) -> dict[str, Any]:
    items = [item for page in pages for item in page.get("items", []) if isinstance(item, dict)]
    items = [item for item in items if _as_singapore_time(item.get("timestamp")) is not None]
    if not items:
        return {"ts": None, "regions": {}, "state": "PENDING"}
    latest = max(items, key=lambda item: _as_singapore_time(item["timestamp"]) or datetime.min.replace(tzinfo=SINGAPORE_TZ))
    readings = latest.get("readings")
    regions = readings.get("psi_twenty_four_hourly", {}) if isinstance(readings, dict) else {}
    return {"ts": latest["timestamp"], "regions": regions if isinstance(regions, dict) else {}, "state": "AVAILABLE"}


def _live_pending(day: str, now: datetime, message: str) -> dict[str, Any]:
    return {
        "mode": "live",
        "day": day,
        "timezone": "Asia/Singapore",
        "fetched_at_sgt": now.isoformat(),
        "source": "data.gov.sg v2 real-time API",
        "availability": "pending",
        "message": message,
        "stations": [],
        "psi": {"ts": None, "regions": {}, "state": "PENDING"},
        "cache": {"status": "unavailable", "ttl_seconds": int(LIVE_CACHE_TTL.total_seconds())},
    }


@app.get("/live")
def get_live() -> dict[str, Any]:
    """Return the current Singapore date's NEA weather state for an optional live view.

    This endpoint never changes a payout or price. A station needs at least
    three valid quarter-hour readings before its current hour is classified;
    otherwise the station is explicitly PENDING.
    """
    from rehat.ingest.datagov import BASE

    now = _singapore_now()
    day = now.date().isoformat()
    with _LIVE_LOCK:
        try:
            wbgt_pages, wbgt_fetched, wbgt_cached = _live_pages("wbgt", f"{BASE}/weather", {"api": "wbgt"}, day, now)
        except Exception:  # noqa: BLE001 - live mode must degrade to an explicit pending state.
            return _live_pending(day, now, "Live NEA readings are unavailable. They remain pending until the source responds.")
        try:
            psi_pages, psi_fetched, psi_cached = _live_pages("psi", f"{BASE}/psi", {}, day, now)
            psi_available = True
        except Exception:  # noqa: BLE001 - a PSI outage must not hide a valid heat reading.
            psi_pages, psi_fetched, psi_cached = [], [], False
            psi_available = False

    records = [record for page in wbgt_pages for record in page.get("records", []) if isinstance(record, dict)]
    stations = _live_stations(records)
    fetched = wbgt_fetched + psi_fetched
    fetched_at = max(fetched).astimezone(SINGAPORE_TZ) if fetched else now
    availability = "available" if stations else "pending"
    if not stations:
        message = "NEA has not published WBGT readings for this Singapore date yet. They remain pending."
    elif not psi_available:
        message = "Live heat readings are available. PSI remains pending until NEA responds."
    else:
        message = None
    return {
        "mode": "live",
        "day": day,
        "timezone": "Asia/Singapore",
        "fetched_at_sgt": fetched_at.isoformat(),
        "source": "data.gov.sg v2 real-time API",
        "availability": availability,
        "message": message,
        "stations": stations,
        "psi": _live_psi(psi_pages),
        "cache": {
            "status": "cached" if wbgt_cached and psi_cached else "refreshed" if psi_available else "partial",
            "ttl_seconds": int(LIVE_CACHE_TTL.total_seconds()),
        },
    }


@app.get("/uen/{uen}")
def get_uen(uen: str) -> dict[str, Any]:
    """Format check plus ACRA public register lookup. Fictional T99DM UENs are never sent out."""
    from rehat import uen as _uen

    return _uen.check(uen)
