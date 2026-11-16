"""Typed access to the versioned Rehat product specification.

``data/seed/product.json`` is deliberately the source of product terms and
verbatim copy.  This module gives engine code one validated entry point rather
than letting each module load a slightly different interpretation of the file.
"""
from __future__ import annotations

import json
import math
from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, ValidationError

from rehat.paths import SEED

Source = Literal["published", "back-test", "simulation", "assumption", "contract", "formula", "plan"]
PriceInput = Literal["plan", "headcount"]
HourState = Literal["TRIGGERED", "NOT_TRIGGERED", "PENDING"]


class ProductValidationError(ValueError):
    """Raised when the checked-in product specification is incomplete or inconsistent."""


class ProductModel(BaseModel):
    """Base model that keeps forward-compatible product fields in API output."""

    model_config = ConfigDict(extra="allow", frozen=True, populate_by_name=True)


class ProductTerms(ProductModel):
    name: str = Field(min_length=1)
    descriptor: str = Field(min_length=1)
    underwriter_line: str = Field(min_length=1)
    host_policy: str = Field(min_length=1)
    benefit_per_worker_hour: float = Field(gt=0)
    target_loss_ratio: float = Field(gt=0, lt=1)
    gst_rate: float = Field(ge=0, lt=1)
    term_months: int = Field(gt=0)
    mid_term_wait_days: int = Field(ge=0)


class PlanExample(ProductModel):
    premium_year: float = Field(gt=0)
    average_payout_year: float = Field(ge=0)
    worst_year_payout: float = Field(ge=0)
    premium_year_with_gst: float | None = Field(default=None, gt=0)


class Plan(ProductModel):
    id: str = Field(min_length=1)
    name: str = Field(min_length=1)
    allowance_multiple: float = Field(gt=0)
    deductible_label: str = Field(min_length=1)
    per_worker_week: float = Field(gt=0)
    per_worker_year: float = Field(gt=0)
    example_20_workers: PlanExample
    months_that_pay: str = Field(min_length=1)
    source: Source
    default: bool = False


class PremiumShare(ProductModel):
    id: str = Field(min_length=1)
    label: str = Field(min_length=1)
    share: float = Field(ge=0, le=1)


class DemoFirm(ProductModel):
    name: str = Field(min_length=1)
    uen: str = Field(min_length=1)
    owner_display: str = Field(min_length=1)
    trade: str = Field(min_length=1)
    work_class: str = Field(min_length=1)
    outdoor_workers: int = Field(gt=0)
    site_area: str = Field(min_length=1)
    plan: str = Field(min_length=1)
    wic_policy_no: str = Field(min_length=1)
    fictional: bool


class DemoClock(ProductModel):
    today: str = Field(min_length=1)
    month: str = Field(min_length=1)
    replay_day: str = Field(min_length=1)
    replay_receipt_month: str = Field(min_length=1)


class ProductCopy(ProductModel):
    tagline: str = Field(min_length=1)
    hook: str = Field(min_length=1)
    human_line: str = Field(min_length=1)
    may_not_pay: str = Field(min_length=1)
    warranty: str = Field(min_length=1)
    rule_statement: str = Field(min_length=1)
    footer: str = Field(min_length=1)
    legal_status: str = Field(min_length=1)
    never_say: tuple[str, ...] = Field(min_length=1)


class ProductSpec(ProductModel):
    version: str = Field(min_length=1)
    product: ProductTerms
    plans: tuple[Plan, ...] = Field(min_length=1)
    retired: tuple[str, ...]
    price_inputs_allowed: tuple[PriceInput, ...]
    hour_states: tuple[HourState, ...]
    premium_split: tuple[PremiumShare, ...] = Field(min_length=1)
    demo_clock: DemoClock
    demo_firm: DemoFirm
    copy_texts: ProductCopy = Field(alias="copy", serialization_alias="copy")
    pdpa_fields_collected: tuple[str, ...] = Field(min_length=1)

    def plan_by_id(self, plan_id: str) -> Plan:
        """Return a plan by its stable identifier, with a clear error for invalid input."""
        for plan in self.plans:
            if plan.id == plan_id:
                return plan
        raise KeyError(f"Unknown Rehat plan: {plan_id}")

    @property
    def default_plan(self) -> Plan:
        """Return the one default plan after the product invariants have been checked."""
        return next(plan for plan in self.plans if plan.default)

    def copy_text(self, key: str) -> str:
        """Access verbatim customer copy without callers reaching into raw JSON."""
        try:
            value = getattr(self.copy_texts, key)
        except AttributeError as exc:
            raise KeyError(f"Unknown product copy key: {key}") from exc
        if not isinstance(value, str):
            raise KeyError(f"Product copy key is not a string: {key}")
        return value


def product_path() -> Path:
    """Return the checked-in canonical product specification path."""
    return SEED / "product.json"


def _validate_product(product: ProductSpec) -> None:
    """Validate invariants that express the v2 product decision, not just JSON shape."""
    if product.version != "2.0":
        raise ProductValidationError(f"Expected product version 2.0, got {product.version!r}")

    expected_plans = {
        "essential": ("Essential", 1.5),
        "standard": ("Standard", 1.25),
        "plus": ("Plus", 1.0),
    }
    found_ids = {plan.id for plan in product.plans}
    if found_ids != set(expected_plans):
        raise ProductValidationError(
            "Plans must be exactly Essential, Standard and Plus; "
            f"found {', '.join(sorted(found_ids)) or 'none'}"
        )
    if len(product.plans) != len(found_ids):
        raise ProductValidationError("Plan identifiers must be unique")

    for plan in product.plans:
        expected_name, expected_multiple = expected_plans[plan.id]
        if plan.name != expected_name:
            raise ProductValidationError(f"Plan {plan.id!r} must be named {expected_name!r}")
        if not math.isclose(plan.allowance_multiple, expected_multiple, rel_tol=0, abs_tol=1e-9):
            raise ProductValidationError(
                f"Plan {plan.name} must use deductible multiple {expected_multiple}, "
                f"not {plan.allowance_multiple}"
            )
        expected_premium = plan.per_worker_year * 20
        if not math.isclose(plan.example_20_workers.premium_year, expected_premium, rel_tol=0, abs_tol=0.01):
            raise ProductValidationError(
                f"Plan {plan.name} 20-worker premium must equal 20 x its annual worker price "
                f"({expected_premium:.2f})"
            )

    defaults = [plan for plan in product.plans if plan.default]
    if len(defaults) != 1 or defaults[0].id != "standard":
        raise ProductValidationError("Standard must be the one default plan")
    if not math.isclose(product.product.benefit_per_worker_hour, 8.0, rel_tol=0, abs_tol=1e-9):
        raise ProductValidationError("Every v2 plan must use the S$8 benefit per worker-hour")

    if set(product.price_inputs_allowed) != {"plan", "headcount"}:
        raise ProductValidationError("Price inputs must be exactly plan and headcount")
    if set(product.hour_states) != {"TRIGGERED", "NOT_TRIGGERED", "PENDING"}:
        raise ProductValidationError("Hour states must be TRIGGERED, NOT_TRIGGERED and PENDING")
    if not math.isclose(sum(row.share for row in product.premium_split), 1.0, rel_tol=0, abs_tol=1e-9):
        raise ProductValidationError("Premium split shares must add to 1.0")
    if product.demo_firm.plan != product.default_plan.id:
        raise ProductValidationError("The demo firm must use the default plan")
    if not product.demo_firm.fictional:
        raise ProductValidationError("The demo firm must be marked fictional")


def load_product(path: Path | None = None) -> ProductSpec:
    """Load and validate a product JSON file, primarily useful for tests and exports."""
    source = path or product_path()
    try:
        raw = json.loads(source.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise ProductValidationError(f"Product specification not found: {source}") from exc
    except json.JSONDecodeError as exc:
        raise ProductValidationError(f"Product specification is not valid JSON: {source}: {exc.msg}") from exc

    try:
        product = ProductSpec.model_validate(raw)
    except ValidationError as exc:
        raise ProductValidationError(f"Product specification failed schema validation: {exc}") from exc
    _validate_product(product)
    return product


@lru_cache(maxsize=1)
def get_product() -> ProductSpec:
    """Return the process-cached canonical product specification."""
    return load_product()


def clear_product_cache() -> None:
    """Clear the product cache for controlled reloads in tests or development."""
    get_product.cache_clear()


def product_dict() -> dict[str, object]:
    """Return a JSON-safe product object for API responses without re-reading disk."""
    return get_product().model_dump(mode="json", by_alias=True)
