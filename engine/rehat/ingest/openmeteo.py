"""Open-Meteo ERA5 archive and historical forecast APIs (no key).

Verified 2026-11-15:
- Archive (ERA5):  https://archive-api.open-meteo.com/v1/archive
- Historical forecast: https://historical-forecast-api.open-meteo.com/v1/forecast (from about 2022)
Both take latitude, longitude, start_date, end_date, hourly=..., timezone=Asia/Singapore.
Cached per station and year at data/raw/openmeteo/<kind>/<station>/<year>.json.
"""
from __future__ import annotations

import json
import time
from datetime import date, timedelta

import pandas as pd
import requests

from rehat.ingest.cache import read_cached, write_cached
from rehat.paths import PROCESSED, RAW

ARCHIVE = "https://archive-api.open-meteo.com/v1/archive"
HISTFC = "https://historical-forecast-api.open-meteo.com/v1/forecast"
HOURLY = [
    "temperature_2m",
    "relative_humidity_2m",
    "dew_point_2m",
    "wind_speed_10m",
    "shortwave_radiation",
    "direct_radiation",
    "diffuse_radiation",
    "surface_pressure",
    "precipitation",
]


def _stations() -> list[dict]:
    return json.loads((PROCESSED / "stations_wbgt.json").read_text())


def cell_of(lat: float, lon: float, step: float = 0.25) -> tuple[float, float]:
    """Snap to the ERA5 0.25 degree grid. Several stations share one cell."""
    return round(round(lat / step) * step, 2), round(round(lon / step) * step, 2)


def cell_id(lat: float, lon: float) -> str:
    a, b = cell_of(lat, lon)
    return f"c{a:.2f}_{b:.2f}"


def _pull(kind: str, url: str, sid: str, lat: float, lon: float, year: int, end: date) -> dict | None:
    cache = RAW / "openmeteo" / kind / sid / f"{year}.json"
    got = read_cached(cache)
    if got is not None:
        return got
    start = date(year, 1, 1)
    stop = min(date(year, 12, 31), end)
    if stop < start:
        return None
    params = {
        "latitude": lat,
        "longitude": lon,
        "start_date": start.isoformat(),
        "end_date": stop.isoformat(),
        "hourly": ",".join(HOURLY),
        "timezone": "Asia/Singapore",
        "wind_speed_unit": "ms",
    }
    if kind == "era5":
        params["models"] = "era5"
    for attempt in range(6):
        r = requests.get(url, params=params, timeout=120)
        if r.status_code == 200:
            body = r.json()
            # Do not cache the current year as final: it is still filling in.
            if year < date.today().year:
                write_cached(cache, url, params, body)
            return body
        if r.status_code == 429:
            time.sleep(30 * (attempt + 1))
            continue
        raise RuntimeError(f"open-meteo {r.status_code}: {r.text[:200]}")
    raise RuntimeError("open-meteo rate limit")


def _to_frame(body: dict, sid: str) -> pd.DataFrame:
    h = pd.DataFrame(body["hourly"])
    h["ts_sgt"] = pd.to_datetime(h.pop("time"))
    h.insert(0, "station_id", sid)
    return h


def _pull_kind(kind: str, url: str, first_year: int, out: str) -> pd.DataFrame:
    end = date.today() - timedelta(days=6 if kind == "era5" else 1)
    frames = []
    cells: dict[str, tuple[float, float]] = {}
    for st in _stations():
        cells[cell_id(st["lat"], st["lon"])] = cell_of(st["lat"], st["lon"])
    for cid, (lat, lon) in sorted(cells.items()):
        for y in range(first_year, end.year + 1):
            body = _pull(kind, url, cid, lat, lon, y, end)
            if body:
                frames.append(_to_frame(body, cid))
        print(f"{kind} {cid} done", flush=True)
    df = pd.concat(frames, ignore_index=True).rename(columns={"station_id": "cell_id"})
    df.to_parquet(PROCESSED / out, index=False)
    print(f"{kind}: {len(df)} rows")
    return df


def pull_era5_all(first_year: int = 2000) -> pd.DataFrame:
    return _pull_kind("era5", ARCHIVE, first_year, "era5_hourly.parquet")


def pull_historical_forecast_all(first_year: int = 2022) -> pd.DataFrame:
    return _pull_kind("histfc", HISTFC, first_year, "forecast_hourly.parquet")
