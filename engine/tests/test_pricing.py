"""Published v2 prices and risk views stay aligned with product.json."""
from __future__ import annotations

import inspect

import numpy as np
import pytest

from rehat import pricing, product


def test_every_v2_plan_uses_the_published_price_and_benefit() -> None:
    spec = product.get_product()
    for plan in spec.plans:
        price = pricing.plan_price(plan.id)
        assert price.plan == plan.name
        assert price.year == plan.per_worker_year
        assert price.week == plan.per_worker_week
        assert price.allowance_multiple == plan.allowance_multiple
        assert price.benefit == spec.product.benefit_per_worker_hour == 8.0


def test_standard_quote_matches_published_twenty_worker_example() -> None:
    quote = pricing.quote(20, "standard")
    assert quote["inputs_used"] == ["plan", "headcount"]
    assert quote["premium_before_gst"] == 2575.0
    assert quote["gst"] == 231.75
    assert quote["premium_with_gst"] == 2806.75
    assert quote["max_payout_year"] == 9600.0


def test_quote_has_no_personal_or_weather_pricing_inputs() -> None:
    assert set(inspect.signature(pricing.quote).parameters) == {"workers", "plan"}
    with pytest.raises(KeyError):
        pricing.plan_price("lite")


def test_expense_view_uses_the_v2_expense_ceiling() -> None:
    model = pricing.expense_model(2575.0)
    assert model["expense_budget_ratio"] == pytest.approx(0.20)
    assert model["profit_plan_ratio"] == pytest.approx(0.10)
    assert model["policies_at_expense_ceiling"] > 0


def test_market_is_read_from_the_published_v2_market_terms() -> None:
    market = pricing.market()
    assert market["firms_mid"] == 12_400
    assert market["total_premium"]["mid"] == 23_900_000
    assert market["year3_obtainable_premium"] == 1_918_375


def test_stop_loss_recovery_is_deterministic() -> None:
    lrs = np.array([0.5, 0.8, 1.6, 2.0])
    result = pricing.stop_loss(lrs, 1.5, 3.73)
    assert result["expected_recovery_pct"] == pytest.approx(100 * (0.1 + 0.5) / 4)
    assert result["years_hit"] == 2
