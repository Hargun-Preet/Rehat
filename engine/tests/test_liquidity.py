from datetime import date
from pathlib import Path

import pytest

from rehat.paths import PROCESSED

needs = pytest.mark.skipif(not (PROCESSED / "wbgt_hourly_rebuilt.parquet").exists() or not (PROCESSED / "mss_daily.parquet").exists(), reason="data not built")


@needs
def test_cash_call_for_november_settlement() -> None:
    from fastapi.testclient import TestClient

    from rehat.api import app

    r = TestClient(app).get("/liquidity", params={"asof": "2025-10-20"}).json()
    assert r["month"] == "2025-10" and r["settlement_date"] == "2025-11-07"
    assert r["p50"] <= r["p90"] <= r["p99"]
    assert r["buffer_p99_minus_p50"] == r["p99"] - r["p50"]


@needs
def test_band_narrows_and_known_days_count() -> None:
    from rehat.liquidity import forecast_month

    early = forecast_month(date(2025, 10, 2), n_paths=300)
    late = forecast_month(date(2025, 10, 28), n_paths=300)
    assert late["days_known"] > early["days_known"]
    assert (late["p99"] - late["p10"]) <= (early["p99"] - early["p10"])


def test_payout_code_never_imports_forecasts() -> None:
    root = Path(__file__).resolve().parents[1] / "rehat"
    for mod in ("rules.py", "ledger.py", "pricing.py"):
        src = (root / mod).read_text()
        assert "liquidity" not in src and "forecast" not in src.replace("forecasts", ""), mod
