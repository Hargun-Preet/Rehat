"""Pricing reproduces CONTEXT.md section 5 when fed the kit's inputs."""
import numpy as np
import pytest

from rehat import pricing


def test_standard_premium_from_kit_inputs() -> None:
    p = pricing.plan_price("Standard", 8.0, 10.46)
    assert p.year == pytest.approx(128.70, abs=0.05)  # kit: S$128.70
    assert p.week == pytest.approx(2.48, abs=0.005)


def test_lite_premium_from_kit_inputs() -> None:
    p = pricing.plan_price("Lite", 5.0, 10.46)
    assert p.year == pytest.approx(80.0, abs=0.5)  # kit: about S$80
    assert p.week == pytest.approx(1.55, abs=0.005)


def test_gst_and_launch_credit() -> None:
    q = pricing.quote(20, "Standard", 10.46)
    assert q["premium_before_gst"] == pytest.approx(2574.8, abs=1)  # kit: S$2,575
    assert q["premium_before_gst_no_credit_gst"] == pytest.approx(2806.5, abs=1.5)  # kit: S$2,806
    assert q["premium_after_credit"] == pytest.approx(q["premium_before_gst"] * 0.7, abs=0.01)
    assert q["inputs_used"] == ["plan", "benefit", "outdoor headcount"]
    assert q["max_payout_year"] == 9600.0  # kit: worst capped S$9,600


def test_breakeven_from_kit_inputs() -> None:
    e = pricing.expense_model(2575.0)  # kit 20-worker premium
    assert e["breakeven_policies"] == 647  # kit: 647
    assert e["expense_ratio_at_breakeven"] == pytest.approx(0.30, abs=0.005)  # kit: 30%
    assert e["policies_for_20pct_expense_ratio"] == 1457 or e["policies_for_20pct_expense_ratio"] == 1456  # kit: 1,456


def test_market_from_kit_inputs() -> None:
    m = pricing.market(129.0)
    assert m["total_premium"]["mid"] == pytest.approx(23.9e6, rel=0.01)  # kit: S$23.9M
    assert m["income_wic_slice"] == pytest.approx(2.9e6, rel=0.02)  # kit: S$2.9M
    assert m["year3_obtainable_premium"] == pytest.approx(1.92e6, rel=0.01)  # kit: S$1.92M


def test_stop_loss_recovery() -> None:
    lrs = np.array([0.5, 0.8, 1.6, 2.0])
    r = pricing.stop_loss(lrs, 1.5, 3.73)
    assert r["expected_recovery_pct"] == pytest.approx(100 * (0.1 + 0.5) / 4)
    assert r["years_hit"] == 2


def test_price_ignores_personal_data() -> None:
    import inspect

    params = set(inspect.signature(pricing.quote).parameters)
    assert params <= {"workers", "plan", "expected_insured_h", "site_match", "rider_week"}
