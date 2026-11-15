"""Read-only access to processed data, loaded once per process."""
from __future__ import annotations

from functools import lru_cache

import pandas as pd

from rehat.paths import PROCESSED


@lru_cache
def wbgt() -> pd.DataFrame:
    p = PROCESSED / "wbgt_15min.parquet"
    if not p.exists():
        return pd.DataFrame(columns=["station_id", "ts_sgt", "wbgt"])
    return pd.read_parquet(p, columns=["station_id", "ts_sgt", "wbgt"])


@lru_cache
def rain() -> pd.DataFrame:
    p = PROCESSED / "rain_5min.parquet"
    if not p.exists():
        return pd.DataFrame(columns=["station_id", "ts_sgt", "mm"])
    return pd.read_parquet(p)


@lru_cache
def psi() -> pd.DataFrame:
    p = PROCESSED / "psi_hourly.parquet"
    if not p.exists():
        return pd.DataFrame(columns=["region", "ts_sgt", "psi_24h"])
    return pd.read_parquet(p)


def days_pulled(api: str) -> set[str]:
    """Dates for which the raw API day is fully cached (data was asked for, even if a station was silent)."""
    from rehat.ingest.datagov import CACHE_ROOT, day_is_cached

    root = CACHE_ROOT / api
    if not root.exists():
        return set()
    return {p.name for p in root.iterdir() if p.is_dir() and day_is_cached(api, p.name)}


def clear() -> None:
    wbgt.cache_clear()
    rain.cache_clear()
    psi.cache_clear()
