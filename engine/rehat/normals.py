"""Monthly normals per station and peril (counted hours per worker in the insured window).

Until P5 computes normals from history, the interim table in data/seed/normals_interim.json is used and every value
is tagged as an assumption. Computed normals, when present in data/processed/normals.json, take precedence.
"""
from __future__ import annotations

import json
from functools import lru_cache

from rehat.paths import PROCESSED, SEED


@lru_cache
def _interim() -> dict:
    return json.loads((SEED / "normals_interim.json").read_text())


@lru_cache
def _computed() -> dict:
    p = PROCESSED / "normals.json"
    return json.loads(p.read_text()) if p.exists() else {}


def normal(station_id: str, month_num: int, peril: str) -> tuple[float, str, bool]:
    """Return (hours, basis, is_assumption)."""
    comp = _computed().get(peril, {}).get(station_id, {})
    if str(month_num) in comp:
        return float(comp[str(month_num)]), _computed().get("basis", {}).get(peril, "computed from history"), False
    t = _interim()[peril]
    return float(t["by_month"][str(month_num)]), t["basis"], True


def clear() -> None:
    _interim.cache_clear()
    _computed.cache_clear()
