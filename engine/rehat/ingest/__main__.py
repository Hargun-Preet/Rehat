"""CLI: python -m rehat.ingest --from 2025-02-01 --to 2026-11-14 --what wbgt,rain,psi
        python -m rehat.ingest --what era5,mss,oni
"""
from __future__ import annotations

import argparse
from datetime import date, timedelta

from rehat.ingest import normalise
from rehat.ingest.datagov import day_is_cached, fetch_day


def _days(start: str, end: str, newest_first: bool) -> list[str]:
    a, b = date.fromisoformat(start), date.fromisoformat(end)
    out = [(a + timedelta(days=i)).isoformat() for i in range((b - a).days + 1)]
    return out[::-1] if newest_first else out


def main() -> None:
    p = argparse.ArgumentParser(prog="rehat.ingest")
    p.add_argument("--from", dest="start", default="2025-02-01")
    p.add_argument("--to", dest="end", default=(date.today() - timedelta(days=1)).isoformat())
    p.add_argument("--what", default="wbgt,psi")
    p.add_argument("--newest-first", action="store_true")
    p.add_argument("--pause", type=float, default=0.0, help="seconds to sleep after each network call")
    p.add_argument("--normalise-only", action="store_true")
    a = p.parse_args()
    what = [w.strip() for w in a.what.split(",") if w.strip()]

    for api in [w for w in what if w in ("wbgt", "rain", "temp", "psi")]:
        if not a.normalise_only:
            days = _days(a.start, a.end, a.newest_first)
            for i, d in enumerate(days):
                if day_is_cached(api, d):
                    continue
                n = sum(1 for _ in fetch_day(api, d, pause=a.pause))
                print(f"{api} {d} pages={n} ({i + 1}/{len(days)})", flush=True)
        df = getattr(normalise, f"normalise_{api}")()
        print(f"{api}: {len(df)} rows normalised", flush=True)

    if "era5" in what:
        from rehat.ingest import openmeteo

        openmeteo.pull_era5_all()
    if "forecast" in what:
        from rehat.ingest import openmeteo

        openmeteo.pull_historical_forecast_all()
    if "mss" in what:
        from rehat.ingest import mss

        mss.pull_all()
    if "oni" in what:
        from rehat.ingest import noaa

        noaa.pull_oni()


if __name__ == "__main__":
    main()
