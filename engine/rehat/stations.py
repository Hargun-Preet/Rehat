"""Station metadata and assignment.

Station: "One named primary and one backup, printed on the schedule. Default nearest; a representativeness check may
suggest another, with reason shown. No correction factor applied".
Rain uses its own gauge network (decision: nearest rain gauge is named on the schedule as the rain gauge).
"""
from __future__ import annotations

import json
import math
from dataclasses import dataclass
from functools import lru_cache

from rehat.paths import SEED


@dataclass(frozen=True)
class Station:
    station_id: str
    name: str
    lat: float
    lon: float


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


@lru_cache
def wbgt_stations() -> tuple[Station, ...]:
    raw = json.loads((SEED / "stations_wbgt.json").read_text())
    return tuple(Station(s["station_id"], s.get("town") or s["name"], s["lat"], s["lon"]) for s in raw)


@lru_cache
def rain_gauges() -> tuple[Station, ...]:
    raw = json.loads((SEED / "stations_rain.json").read_text())
    return tuple(Station(s["station_id"], s["name"], s["lat"], s["lon"]) for s in raw)


@lru_cache
def psi_regions() -> tuple[tuple[str, float, float], ...]:
    raw = json.loads((SEED / "psi_regions.json").read_text())
    return tuple((r["region"], r["lat"], r["lon"]) for r in raw)


def station_by_id(sid: str) -> Station:
    for s in wbgt_stations() + rain_gauges():
        if s.station_id == sid:
            return s
    raise KeyError(sid)


def nearest(lat: float, lon: float, pool: tuple[Station, ...], k: int = 3) -> list[tuple[Station, float]]:
    ranked = sorted(((s, haversine_km(lat, lon, s.lat, s.lon)) for s in pool), key=lambda x: x[1])
    return ranked[:k]


def psi_region_for(lat: float, lon: float) -> str:
    return min(psi_regions(), key=lambda r: haversine_km(lat, lon, r[1], r[2]))[0]


def region_of_station(st: Station) -> str:
    return psi_region_for(st.lat, st.lon)


def assign(lat: float, lon: float) -> dict:
    """Default assignment: nearest WBGT station primary, second nearest backup, nearest rain gauge, PSI region."""
    w = nearest(lat, lon, wbgt_stations(), 2)
    r = nearest(lat, lon, rain_gauges(), 2)
    return {
        "primary_station": w[0][0].station_id,
        "primary_km": round(w[0][1], 2),
        "backup_station": w[1][0].station_id,
        "backup_km": round(w[1][1], 2),
        "rain_gauge": r[0][0].station_id,
        "rain_gauge_km": round(r[0][1], 2),
        "rain_backup": r[1][0].station_id,
        "psi_region": psi_region_for(lat, lon),
        "reason": f"Nearest NEA heat-stress station is {w[0][0].name}, {w[0][1]:.1f} km from your site. "
        f"Backup is {w[1][0].name}, {w[1][1]:.1f} km. Rain is read at the {r[0][0].name} gauge, {r[0][1]:.1f} km.",
    }
