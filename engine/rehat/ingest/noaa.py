"""NOAA Climate Prediction Center Oceanic Nino Index (ONI).

Verified 2026-11-15: https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt
Columns: SEAS YR TOTAL ANOM. SEAS is a 3-month season code (DJF, JFM, ..., NDJ); centre month used.
enso_state: El Nino if ANOM >= 0.5, La Nina if <= -0.5, else neutral (single-season rule; NOAA's official
episode definition needs 5 overlapping seasons, noted in docs).
"""
from __future__ import annotations

import io

import pandas as pd
import requests

from rehat.ingest.cache import read_cached, write_cached
from rehat.paths import PROCESSED, RAW

URL = "https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt"
SEAS_CENTRE = {"DJF": 1, "JFM": 2, "FMA": 3, "MAM": 4, "AMJ": 5, "MJJ": 6, "JJA": 7, "JAS": 8, "ASO": 9, "SON": 10, "OND": 11, "NDJ": 12}


def enso_state(anom: float) -> str:
    if anom >= 0.5:
        return "El Nino"
    if anom <= -0.5:
        return "La Nina"
    return "neutral"


def pull_oni() -> pd.DataFrame:
    cache = RAW / "noaa" / "oni.json"
    text = read_cached(cache)
    if text is None:
        text = requests.get(URL, timeout=30).text
        write_cached(cache, URL, {}, text)
    df = pd.read_csv(io.StringIO(text), sep=r"\s+")
    df.columns = ["season", "year", "total", "oni"]
    df["month"] = df["season"].map(SEAS_CENTRE)
    df["enso_state"] = df["oni"].map(enso_state)
    df.to_parquet(PROCESSED / "oni.parquet", index=False)
    print(f"oni: {len(df)} seasons to {df.year.max()} {df.season.iloc[-1]}")
    return df
