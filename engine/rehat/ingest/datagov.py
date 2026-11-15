"""data.gov.sg v2 real-time client: WBGT, rainfall, air temperature, PSI.

Verified 2026-11-15 (see docs/data-sources.md):
- WBGT:     GET https://api-open.data.gov.sg/v2/real-time/api/weather?api=wbgt&date=YYYY-MM-DD
            data.records[].{datetime, item.readings[].{station{id,name,townCenter}, location{latitude,longitude}, wbgt}}
- Rainfall: GET https://api-open.data.gov.sg/v2/real-time/api/rainfall?date=YYYY-MM-DD
            data.stations[], data.readings[].{timestamp, data[].{stationId, value}}  (5-minute totals, mm)
- Air temp: GET https://api-open.data.gov.sg/v2/real-time/api/air-temperature?date=YYYY-MM-DD (1-minute, deg C)
- PSI:      GET https://api-open.data.gov.sg/v2/real-time/api/psi?date=YYYY-MM-DD
            data.items[].{timestamp, readings.psi_twenty_four_hourly{west,east,central,south,north}}
All paginate with data.paginationToken (sent back as ?paginationToken=...). 25 timestamps a page.
"""
from __future__ import annotations

import os
import time
from pathlib import Path
from typing import Any, Iterator

import requests
from dotenv import load_dotenv

from rehat.ingest.cache import read_cached, write_cached
from rehat.paths import RAW, ROOT

load_dotenv(ROOT / ".env")

BASE = "https://api-open.data.gov.sg/v2/real-time/api"
APIS: dict[str, tuple[str, dict[str, str]]] = {
    "wbgt": ("weather", {"api": "wbgt"}),
    "rain": ("rainfall", {}),
    "temp": ("air-temperature", {}),
    "psi": ("psi", {}),
}
CACHE_ROOT = RAW / "datagov"


class DataGovError(RuntimeError):
    pass


def _headers() -> dict[str, str]:
    key = os.getenv("DATA_GOV_SG_API_KEY")
    return {"x-api-key": key} if key else {}


def _get(url: str, params: dict[str, str], max_tries: int = 20) -> dict[str, Any]:
    delay = 2.0
    for attempt in range(max_tries):
        try:
            r = requests.get(url, params=params, headers=_headers(), timeout=30)
        except requests.RequestException:
            time.sleep(delay)
            delay = min(delay * 2, 60)
            continue
        if r.status_code == 429 or r.status_code >= 500:
            time.sleep(delay)
            delay = min(delay * 2, 60)
            continue
        if r.status_code != 200:
            raise DataGovError(f"{r.status_code} for {r.url}: {r.text[:200]}")
        body = r.json()
        if body.get("code") not in (0, None):
            raise DataGovError(f"API error for {r.url}: {body.get('errorMsg')}")
        return body
    raise DataGovError(f"gave up after {max_tries} tries: {url} {params}")


def fetch_day(api: str, date: str, pause: float = 0.0) -> Iterator[dict[str, Any]]:
    """Yield every page (the `data` object) for one API and date, using the cache.

    Cache path: data/raw/datagov/<api>/<date>/<page>.json. A cached page is never refetched.
    """
    path_name, base_params = APIS[api]
    url = f"{BASE}/{path_name}"
    folder = CACHE_ROOT / api / date
    token: str | None = None
    page = 0
    while True:
        cache_file = folder / f"{page:03d}.json"
        params = dict(base_params, date=date)
        if token:
            params["paginationToken"] = token
        data = read_cached(cache_file)
        if data is None:
            body = _get(url, params)
            data = body.get("data", {})
            write_cached(cache_file, url, params, data)
            if pause:
                time.sleep(pause)
        yield data
        token = data.get("paginationToken")
        if not token:
            break
        page += 1


def day_is_cached(api: str, date: str) -> bool:
    folder: Path = CACHE_ROOT / api / date
    if not folder.exists():
        return False
    pages = sorted(folder.glob("*.json"))
    if not pages:
        return False
    last = read_cached(pages[-1])
    return not (last or {}).get("paginationToken")
