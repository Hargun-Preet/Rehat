"""Turn cached data.gov.sg pages into tidy parquet files in data/processed."""
from __future__ import annotations

import json
from pathlib import Path

import pandas as pd

from rehat.ingest.cache import read_cached
from rehat.ingest.datagov import CACHE_ROOT
from rehat.paths import PROCESSED


def _pages(api: str, dates: list[str] | None = None) -> list[tuple[str, dict]]:
    root = CACHE_ROOT / api
    out: list[tuple[str, dict]] = []
    if not root.exists():
        return out
    for day_dir in sorted(p for p in root.iterdir() if p.is_dir()):
        if dates and day_dir.name not in dates:
            continue
        for f in sorted(day_dir.glob("*.json")):
            data = read_cached(f)
            if data:
                out.append((day_dir.name, data))
    return out


def _to_sgt(ts: pd.Series) -> pd.Series:
    return pd.to_datetime(ts, utc=True).dt.tz_convert("Asia/Singapore").dt.tz_localize(None)


def normalise_wbgt() -> pd.DataFrame:
    rows, meta = [], {}
    for _, data in _pages("wbgt"):
        for rec in data.get("records", []):
            ts = rec["datetime"]
            for r in rec.get("item", {}).get("readings", []):
                st = r["station"]
                sid = st["id"]
                lat, lon = float(r["location"]["latitude"]), float(r["location"]["longitude"])
                meta[sid] = {"station_id": sid, "name": st.get("name"), "town": st.get("townCenter"), "lat": lat, "lon": lon}
                try:
                    v = float(r["wbgt"])
                except (TypeError, ValueError):
                    v = float("nan")
                rows.append((sid, st.get("townCenter") or st.get("name"), lat, lon, ts, v))
    df = pd.DataFrame(rows, columns=["station_id", "name", "lat", "lon", "ts_sgt", "wbgt"])
    if df.empty:
        return df
    df["ts_sgt"] = _to_sgt(df["ts_sgt"])
    df = df.drop_duplicates(["station_id", "ts_sgt"]).sort_values(["station_id", "ts_sgt"]).reset_index(drop=True)
    PROCESSED.mkdir(parents=True, exist_ok=True)
    df.to_parquet(PROCESSED / "wbgt_15min.parquet", index=False)
    (PROCESSED / "stations_wbgt.json").write_text(json.dumps(sorted(meta.values(), key=lambda m: m["station_id"]), indent=1))
    return df


def _normalise_station_series(api: str, value_name: str, out_name: str, meta_name: str) -> pd.DataFrame:
    rows, meta = [], {}
    for _, data in _pages(api):
        for st in data.get("stations", []):
            meta[st["id"]] = {
                "station_id": st["id"],
                "name": st.get("name"),
                "lat": float(st["location"]["latitude"]),
                "lon": float(st["location"]["longitude"]),
            }
        for rd in data.get("readings", []):
            ts = rd["timestamp"]
            for d in rd.get("data", []):
                rows.append((d["stationId"], ts, d.get("value")))
    df = pd.DataFrame(rows, columns=["station_id", "ts_sgt", value_name])
    if df.empty:
        return df
    df["ts_sgt"] = _to_sgt(df["ts_sgt"])
    df[value_name] = pd.to_numeric(df[value_name], errors="coerce")
    df = df.drop_duplicates(["station_id", "ts_sgt"]).sort_values(["station_id", "ts_sgt"]).reset_index(drop=True)
    df.to_parquet(PROCESSED / out_name, index=False)
    (PROCESSED / meta_name).write_text(json.dumps(sorted(meta.values(), key=lambda m: m["station_id"]), indent=1))
    return df


def normalise_rain() -> pd.DataFrame:
    return _normalise_station_series("rain", "mm", "rain_5min.parquet", "stations_rain.json")


def normalise_temp() -> pd.DataFrame:
    return _normalise_station_series("temp", "temp_c", "temp_1min_or_5min.parquet", "stations_temp.json")


def normalise_psi() -> pd.DataFrame:
    rows = []
    for _, data in _pages("psi"):
        for it in data.get("items", []):
            psi = (it.get("readings") or {}).get("psi_twenty_four_hourly") or {}
            for region, v in psi.items():
                rows.append((region, it["timestamp"], v))
    df = pd.DataFrame(rows, columns=["region", "ts_sgt", "psi_24h"])
    if df.empty:
        return df
    df["ts_sgt"] = _to_sgt(df["ts_sgt"])
    df = df.drop_duplicates(["region", "ts_sgt"]).sort_values(["region", "ts_sgt"]).reset_index(drop=True)
    df.to_parquet(PROCESSED / "psi_hourly.parquet", index=False)
    return df


def load_seed_d1031(path: Path | None = None) -> pd.DataFrame:
    """Seed fixture: NEA WBGT, 31 Oct 2025, 08:00 to 17:30, 15 stations, wide format -> long."""
    from rehat.paths import SEED

    d = pd.read_csv(path or SEED / "d1031.csv")
    long = d.melt(id_vars="time", var_name="station_id", value_name="wbgt")
    long["ts_sgt"] = pd.to_datetime("2025-10-31 " + long["time"])
    return long[["station_id", "ts_sgt", "wbgt"]]
