"""MSS historical daily records (weather.gov.sg).

Verified 2026-11-15: monthly CSV per station at
  https://www.weather.gov.sg/files/dailydata/DAILYDATA_<CODE>_<YYYYMM>.csv
Columns: Station, Year, Month, Day, Daily Rainfall Total (mm), Highest 30/60/120 min Rainfall (mm),
Mean/Maximum/Minimum Temperature (C), Mean/Max Wind Speed (km/h). Encoding latin-1 with BOM; "-" or blank = missing.
Raw files are cached to data/raw/mss/<CODE>/<YYYYMM>.csv. A 404 is cached as an empty marker.
"""
from __future__ import annotations

import io
import json
import time
from datetime import date

import pandas as pd
import requests

from rehat.paths import PROCESSED, RAW

URL = "https://www.weather.gov.sg/files/dailydata/DAILYDATA_{code}_{ym}.csv"
CACHE = RAW / "mss"
UA = {"User-Agent": "Mozilla/5.0 (rehat-prototype research)"}

# Long-record stations chosen to sit near WBGT stations. Codes confirmed by discover_codes(); names come from the files.
DEFAULT_STATIONS: dict[str, int] = {
    "S24": 1980,   # Changi, longest record (near WBGT S124)
    "S06": 2000,   # Paya Lebar
    "S43": 2000,   # Tai Seng (near Bishan S128 / Kallang S127)
    "S109": 2000,  # Ang Mo Kio (near Bishan S128, Yio Chu Kang S141)
    "S44": 2000,   # Jurong (West) (near S132)
    "S50": 2000,   # Clementi (near S130)
    "S89": 2000,   # Tuas (near S139)
    "S60": 2000,   # Sentosa Island (near S142)
    "S117": 2000,  # Jurong Island (near S137)
    "S81": 2000,   # Punggol (near S143)
    "S80": 2000,   # Sembawang (near Woodlands S125)
    "S64": 2000,   # Bukit Panjang (near Choa Chu Kang S126/S140)
    "S107": 2000,  # East Coast Parkway (near Bedok S129)
}


def _fetch(code: str, ym: str) -> str | None:
    path = CACHE / code / f"{ym}.csv"
    miss = CACHE / code / f"{ym}.missing"
    if path.exists():
        return path.read_bytes().decode("latin-1")
    if miss.exists():
        return None
    path.parent.mkdir(parents=True, exist_ok=True)
    for attempt in range(4):
        try:
            r = requests.get(URL.format(code=code, ym=ym), headers=UA, timeout=30)
        except requests.RequestException:
            time.sleep(2 * (attempt + 1))
            continue
        if r.status_code == 200 and r.content and b"Station" in r.content[:200]:
            path.write_bytes(r.content)
            (path.parent / f"{ym}.meta.json").write_text(
                json.dumps({"url": r.url, "fetched_at_utc": pd.Timestamp.utcnow().isoformat()})
            )
            return r.content.decode("latin-1")
        if r.status_code in (404, 403) or (r.status_code == 200 and b"Station" not in r.content[:200]):
            miss.write_text(str(r.status_code))
            return None
        time.sleep(2 * (attempt + 1))
    return None


def _parse(text: str) -> pd.DataFrame:
    df = pd.read_csv(io.StringIO(text.lstrip("﻿").lstrip("ï»¿")), na_values=["-", "—", " -", "", " "], skipinitialspace=True)
    df.columns = [c.strip().replace("Â", "").replace("﻿", "").replace("ï»¿", "") for c in df.columns]
    ren = {
        "Daily Rainfall Total (mm)": "rain_mm",
        "Highest 30 min Rainfall (mm)": "rain_max30_mm",
        "Highest 60 min Rainfall (mm)": "rain_max60_mm",
        "Highest 120 min Rainfall (mm)": "rain_max120_mm",
        "Mean Temperature (°C)": "t_mean",
        "Maximum Temperature (°C)": "t_max",
        "Minimum Temperature (°C)": "t_min",
        "Mean Wind Speed (km/h)": "wind_mean_kmh",
        "Max Wind Speed (km/h)": "wind_max_kmh",
    }
    df = df.rename(columns=ren)
    for c in ren.values():
        if c in df:
            df[c] = pd.to_numeric(df[c], errors="coerce")
    df["date"] = pd.to_datetime(dict(year=df["Year"], month=df["Month"], day=df["Day"]), errors="coerce")
    return df.rename(columns={"Station": "station_name"})


def discover_codes(max_code: int = 130, ym: str = "202405") -> dict[str, str]:
    """Map MSS codes to station names by reading one month per code (cached)."""
    out = {}
    for i in range(1, max_code + 1):
        for code in {f"S{i:02d}", f"S{i}"}:
            txt = _fetch(code, ym)
            if txt:
                name = _parse(txt)["station_name"].dropna().iloc[0]
                out[code] = str(name).strip()
    (PROCESSED / "mss_station_codes.json").write_text(json.dumps(out, indent=1))
    return out


def pull_station(code: str, start_year: int, end: date | None = None) -> pd.DataFrame:
    end = end or date.today()
    frames = []
    y, m = start_year, 1
    while (y, m) <= (end.year, end.month):
        txt = _fetch(code, f"{y}{m:02d}")
        if txt:
            frames.append(_parse(txt).assign(station_code=code))
        m += 1
        if m > 12:
            y, m = y + 1, 1
    return pd.concat(frames, ignore_index=True) if frames else pd.DataFrame()


def pull_all(stations: dict[str, int] | None = None) -> pd.DataFrame:
    stations = stations or DEFAULT_STATIONS
    frames = [pull_station(c, y) for c, y in stations.items()]
    df = pd.concat([f for f in frames if not f.empty], ignore_index=True)
    keep = ["station_code", "station_name", "date", "rain_mm", "rain_max30_mm", "rain_max60_mm", "rain_max120_mm", "t_mean", "t_max", "t_min", "wind_mean_kmh", "wind_max_kmh"]
    df = df[[c for c in keep if c in df]].sort_values(["station_code", "date"]).reset_index(drop=True)
    df.to_parquet(PROCESSED / "mss_daily.parquet", index=False)
    print(f"mss: {len(df)} rows, stations {sorted(df.station_code.unique())}")
    return df
