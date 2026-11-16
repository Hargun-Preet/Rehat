import numpy as np
import pandas as pd
import pytest

from rehat import rules
from rehat.backtest import heat_minutes, rain_day_hours, simulate


@pytest.mark.parametrize("v", [25.0, 31.49, 31.5, 31.99, 32.0, 32.99, 33.0, 35.0])
def test_vectorised_heat_matches_rules(v: float) -> None:
    assert heat_minutes(np.array([v]))[0] == rules.heat_rest_minutes(v)


def test_heat_variants() -> None:
    assert heat_minutes(np.array([31.6]), nearmiss=False)[0] == 0
    assert heat_minutes(np.array([31.6]), delta=0.5)[0] == 10
    assert heat_minutes(np.array([32.2]), delta=-0.5)[0] == 5


def test_rain_day_hours() -> None:
    got = rain_day_hours(np.array([0.0, 3.0, 12.0, 30.0, np.nan]), np.array([0.0, 3.0, 12.0, 10.0, 5.0]))
    assert got[:4].tolist() == [0.0, 0.5, 1.0, 1.0 + 1.5]
    assert np.isnan(got[4])


def test_rain_station_gap_uses_changi_before_local_coverage(monkeypatch: pytest.MonkeyPatch) -> None:
    """A station introduced later must not turn its earlier history into zero rain."""
    from rehat import backtest

    dates = pd.date_range("2000-01-01", "2000-01-04", freq="D")
    source = pd.DataFrame({
        "station_code": ["S24", "S24", "S24", "S24", "S99"],
        "date": [*dates, dates[-1]],
        "rain_mm": [10.0, 0.0, 5.0, 20.0, 1.0],
        "rain_max60_mm": [10.0, 0.0, 5.0, 10.0, 1.0],
    })

    monkeypatch.setattr(backtest, "FIRST_YEAR", 2000)
    monkeypatch.setattr(backtest, "LAST_YEAR", 2000)
    monkeypatch.setattr(backtest, "calibrate_rain_share", lambda: (1.0, "test"))
    monkeypatch.setattr(backtest, "mss_daily", lambda: source.copy())
    backtest.rain_monthly_by_mss.cache_clear()
    try:
        by_station, _, _ = backtest.rain_monthly_by_mss()

        # S99 only starts on 4 Jan. Its first two working days must follow
        # Changi, while its own observed day remains its own (0 h for 1 mm).
        assert by_station["S99"][0, 0] == 1.5
        assert by_station["S24"][0, 0] == 3.5
    finally:
        backtest.rain_monthly_by_mss.cache_clear()


def test_simulate_allowance_and_caps() -> None:
    years = 26
    heat = np.zeros((years, 12))
    rain = np.full((years, 12), 4.0)
    rain[-1, :] = 40.0  # one very wet year
    out = simulate(heat, rain, np.zeros((years, 12)))
    # normal = baseline mean (first 25 years) = 4.0 -> allowance 5.0; wet year: 35 h/month above, cap 20/month, 60/year
    assert out["annual"][-1] == 60.0
    assert out["monthly"][-1, :3].tolist() == [20.0, 20.0, 20.0] and out["monthly"][-1, 3] == 0.0
    assert out["annual"][:25].sum() == 0.0


def test_haze_limit_in_simulation() -> None:
    haze = np.zeros((26, 12))
    haze[5, 8] = 30.0
    out = simulate(np.zeros((26, 12)), np.zeros((26, 12)), haze)
    assert out["annual"][5] == 20.0
