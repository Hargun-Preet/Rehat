import pandas as pd
import pytest

from rehat.ingest.coverage import seed_check
from rehat.ingest.normalise import load_seed_d1031
from rehat.ingest.noaa import enso_state
from rehat.paths import PROCESSED


def test_seed_fixture_loads() -> None:
    s = load_seed_d1031()
    assert s.station_id.nunique() == 15
    assert s.wbgt.max() == 35.0  # record peak, Sentosa 12:15
    assert s.loc[s.wbgt.idxmax(), "station_id"] == "S142"


@pytest.mark.skipif(not (PROCESSED / "wbgt_15min.parquet").exists(), reason="WBGT not pulled")
def test_api_matches_seed_for_31_oct_2025() -> None:
    w = pd.read_parquet(PROCESSED / "wbgt_15min.parquet")
    if not (w.ts_sgt.dt.date == pd.Timestamp("2025-10-31").date()).any():
        pytest.skip("31 Oct 2025 not pulled")
    sc = seed_check(w)
    assert sc.within_tol.sum() >= 10


def test_enso_state() -> None:
    assert enso_state(0.5) == "El Nino" and enso_state(-0.5) == "La Nina" and enso_state(0.2) == "neutral"
