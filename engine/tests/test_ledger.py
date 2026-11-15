"""Ledger on synthetic data, so the test does not depend on what has been pulled."""
from datetime import datetime

import numpy as np
import pandas as pd
import pytest

from rehat import ledger, store
from rehat.ledger import Firm, FirmMonthLedger, Site

MONTH = "2026-05"


def _firm(**kw) -> Firm:
    base = dict(
        uen="T99DMTEST1A", name="Test Landscaping Pte Ltd", outdoor_workers=20, wage_band="S$2,000 to S$2,400",
        sites=[Site("Test site", 1.356, 103.85)], primary_station="S128", backup_station="S145",
        rain_gauge="S216", rain_backup="S43", psi_region="central", plan="Standard",
    )
    base.update(kw)
    return Firm(**base)


@pytest.fixture
def synthetic(monkeypatch):
    """Bishan WBGT 30.0 all month, except three hot hours; rain gauge dry except two wet hours; PSI 50."""
    idx = pd.date_range(f"{MONTH}-01", f"{MONTH}-31 23:45", freq="15min")
    w = pd.DataFrame({"station_id": "S128", "ts_sgt": idx, "wbgt": 30.0})
    hot = {"2026-05-04 10": 33.2, "2026-05-04 11": 32.4, "2026-05-05 14": 31.6, "2026-05-04 12": 34.0}  # 12:00 = meal
    for h, v in hot.items():
        w.loc[w.ts_sgt.dt.strftime("%Y-%m-%d %H") == h, "wbgt"] = v
    # two of four readings missing on one hour -> primary invalid -> no backup data -> PENDING
    gap = w.ts_sgt.isin(pd.to_datetime(["2026-05-06 09:15", "2026-05-06 09:30"]))
    w.loc[gap, "wbgt"] = np.nan
    r_idx = pd.date_range(f"{MONTH}-01 00:05", f"{MONTH}-31 23:55", freq="5min")
    r = pd.DataFrame({"station_id": "S216", "ts_sgt": r_idx, "mm": 0.0})
    r.loc[(r.ts_sgt > "2026-05-07 15:00") & (r.ts_sgt <= "2026-05-07 16:00"), "mm"] = 1.0  # 12 mm -> 1 h
    r.loc[(r.ts_sgt > "2026-05-08 09:00") & (r.ts_sgt <= "2026-05-08 10:00"), "mm"] = 0.3  # 3.6 mm -> 0.5 h
    p_idx = pd.date_range(f"{MONTH}-01", f"{MONTH}-31 23:00", freq="h").append(pd.date_range("2026-04-21", "2026-04-30 23:00", freq="h"))
    p = pd.DataFrame({"region": "central", "ts_sgt": p_idx, "psi_24h": 50.0})
    monkeypatch.setattr(store, "wbgt", lambda: w)
    monkeypatch.setattr(store, "rain", lambda: r)
    monkeypatch.setattr(store, "psi", lambda: p)
    monkeypatch.setattr(store, "days_pulled", lambda api: {d.strftime("%Y-%m-%d") for d in pd.date_range(f"{MONTH}-01", f"{MONTH}-31")})


def test_ledger_counts_heat_rain_and_meal_hour(synthetic) -> None:
    led = FirmMonthLedger(_firm(), MONTH, asof=datetime(2026, 6, 20))
    h, r = led.perils["heat"], led.perils["rain"]
    assert h["counted_h"] == pytest.approx((15 + 10 + 5) / 60, abs=0.01)  # meal hour 34.0 not counted
    assert h["pending_hours"] == 1
    assert r["counted_h"] == 1.5
    assert any("meal hour" in n["why"] for n in led.not_counted)
    assert any("pending" in n["what"] for n in led.not_counted)


def test_ledger_payout_matches_rules(synthetic, monkeypatch) -> None:
    led = FirmMonthLedger(_firm(), MONTH, asof=datetime(2026, 6, 20))
    h, r = led.perils["heat"], led.perils["rain"]
    expected_h = max(0, h["counted_h"] - h["allowance_h"]) + max(0, r["counted_h"] - r["allowance_h"])
    assert led.insured_after_caps_h == pytest.approx(round(expected_h, 2), abs=0.01)
    assert led.payout_sgd == round(led.insured_after_caps_h * 8 * 20)
    assert led.settlement.isoformat() == "2026-06-08"
    d = led.to_dict()
    assert d["receipt_lines"] and d["hours"]


def test_ledger_lapsed_wic_pays_nothing(synthetic) -> None:
    led = FirmMonthLedger(_firm(wic_active=False), MONTH, asof=datetime(2026, 6, 20))
    assert led.payout_sgd == 0.0
    assert any(n["what"] == "Whole month" for n in led.not_counted)


def test_ledger_mom_action_forfeits_heat(synthetic) -> None:
    led = FirmMonthLedger(_firm(mom_heat_action_months=[MONTH]), MONTH, asof=datetime(2026, 6, 20))
    assert led.perils["heat"]["insured_h"] == 0.0


def test_ledger_no_data_is_pending(monkeypatch) -> None:
    empty_w = pd.DataFrame(columns=["station_id", "ts_sgt", "wbgt"])
    empty_r = pd.DataFrame(columns=["station_id", "ts_sgt", "mm"])
    empty_p = pd.DataFrame(columns=["region", "ts_sgt", "psi_24h"])
    monkeypatch.setattr(store, "wbgt", lambda: empty_w)
    monkeypatch.setattr(store, "rain", lambda: empty_r)
    monkeypatch.setattr(store, "psi", lambda: empty_p)
    monkeypatch.setattr(store, "days_pulled", lambda api: set())
    led = FirmMonthLedger(_firm(), MONTH, asof=datetime(2026, 6, 20))
    work = [ln for ln in led.lines if ln.peril in ("heat", "rain") or datetime.fromisoformat(ln.ts).weekday() != 6]
    assert work and all(ln.state == "PENDING" for ln in work)
    assert led.payout_sgd == 0.0


def test_demo_book_has_300_fictional_firms() -> None:
    book = ledger.demo_book()
    assert len(book) == 300
    assert all(f.uen.startswith("T99DM") for f in book)
    assert book[0].name == "Tanjong Greenworks Pte Ltd" and book[0].primary_station == "S132"
