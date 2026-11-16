"""Version 2 pricing, unit economics and aggregate stop-loss views.

Published plan terms are owned by ``data/seed/product.json``.  This module
uses the historical back-test only to describe the observed result and to
plan capital; it does not calculate a customer price from worker data or
change a payout rule.
"""
from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from typing import Any

import numpy as np

from rehat import product, rules
from rehat.paths import DOCS, PROCESSED, WEB_DATA

WEEKS_PER_YEAR = 52
MONTHS_PER_YEAR = 12
WORKING_DAYS_PER_YEAR = 302
HAZE_LOAD_H = 1.0
FIXED_OPERATING_COST_SGD = 250_000.0


def _raw() -> dict[str, Any]:
    """Return the complete validated specification, including typed extras."""
    return product.get_product().model_dump(mode="json", by_alias=True)


def _number(value: Any, label: str) -> float:
    """Read a numeric product value with a useful failure if the spec changes."""
    try:
        return float(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"product.json {label} must be numeric") from exc


def _plan(plan_id: str) -> product.Plan:
    return product.get_product().plan_by_id(plan_id.strip().lower())


@dataclass(frozen=True)
class PlanPrice:
    """Published plan price rendered into convenient periods for exports."""

    id: str
    plan: str
    deductible_label: str
    allowance_multiple: float
    benefit: float
    year: float
    month: float
    week: float
    working_day: float
    year_gst: float
    week_gst: float
    source: str


def plan_price(plan: str) -> PlanPrice:
    """Return a published plan price.

    The customer-facing quote accepts only a plan and headcount.  There is no
    expected-hours, rider, credit, job-history or personal-data input here.
    """
    selected = _plan(plan)
    terms = product.get_product().product
    year = selected.per_worker_year
    return PlanPrice(
        id=selected.id,
        plan=selected.name,
        deductible_label=selected.deductible_label,
        allowance_multiple=selected.allowance_multiple,
        benefit=terms.benefit_per_worker_hour,
        year=year,
        month=round(year / MONTHS_PER_YEAR, 2),
        week=selected.per_worker_week,
        working_day=round(year / WORKING_DAYS_PER_YEAR, 3),
        year_gst=round(year * (1 + terms.gst_rate), 2),
        week_gst=round(selected.per_worker_week * (1 + terms.gst_rate), 2),
        source=selected.source,
    )


def quote(workers: int, plan: str) -> dict[str, Any]:
    """Quote the published plan for a declared outdoor headcount only."""
    if workers <= 0:
        raise ValueError("workers must be positive")
    spec = product.get_product()
    selected = plan_price(plan)
    before_gst = round(workers * selected.year, 2)
    gst = round(before_gst * spec.product.gst_rate, 2)
    return {
        "inputs_used": list(spec.price_inputs_allowed),
        "plan": selected.id,
        "plan_name": selected.plan,
        "deductible_label": selected.deductible_label,
        "benefit_per_hour": spec.product.benefit_per_worker_hour,
        "workers": workers,
        "per_worker_year": selected.year,
        "per_worker_week": selected.week,
        "premium_before_gst": before_gst,
        "gst_rate": spec.product.gst_rate,
        "gst": gst,
        "premium_with_gst": round(before_gst + gst, 2),
        "max_payout_year": round(workers * spec.product.benefit_per_worker_hour * rules.YEARLY_CAP_H, 2),
    }


def _split() -> dict[str, float]:
    return {row.id: row.share for row in product.get_product().premium_split}


def expense_model(premium_per_policy: float, fixed_cost: float = FIXED_OPERATING_COST_SGD) -> dict[str, Any]:
    """Show the stated expense ceiling without inventing a separate price rule."""
    if premium_per_policy <= 0:
        raise ValueError("premium_per_policy must be positive")
    split = _split()
    expense_ratio = split["expenses"]
    profit_ratio = split["profit"]
    policies_at_expense_ceiling = int(np.ceil(fixed_cost / (expense_ratio * premium_per_policy)))
    policies_at_expense_and_profit = int(np.ceil(fixed_cost / ((expense_ratio + profit_ratio) * premium_per_policy)))
    points = (100, 250, 500, 750, 1_000, 1_250, 1_500, 2_000)
    return {
        "premium_per_policy": round(premium_per_policy, 2),
        "fixed_cost_assumption": fixed_cost,
        "expense_budget_ratio": expense_ratio,
        "profit_plan_ratio": profit_ratio,
        "policies_at_expense_ceiling": policies_at_expense_ceiling,
        "policies_at_expense_and_profit": policies_at_expense_and_profit,
        "curve": [
            {
                "policies": count,
                "fixed_cost_ratio": round(fixed_cost / (count * premium_per_policy), 4),
                "within_expense_ceiling": fixed_cost / (count * premium_per_policy) <= expense_ratio,
            }
            for count in points
        ],
    }


# ---------------------------------------------------------------- reinsurance
def stop_loss(lrs: np.ndarray, attach: float, cap_lr: float) -> dict[str, Any]:
    """Calculate the historical aggregate recovery above an attachment."""
    recovery = np.clip(lrs - attach, 0, cap_lr - attach)
    return {
        "attach": attach,
        "expected_recovery_pct": round(100 * float(recovery.mean()), 2),
        "years_hit": int((lrs > attach).sum()),
        "years": int(len(lrs)),
    }


def reinsurance(lrs: np.ndarray, cap_lr: float) -> dict[str, Any]:
    """Return the decided product attachment and its observed history.

    The product's simulation-based planning estimate is preserved separately
    from this 26-year observed series.  It is not used to alter a payout.
    """
    raw = _raw()["reinsurance"]
    if not isinstance(raw, dict):
        raise ValueError("product.json reinsurance must be an object")
    load = _number(raw["reinsurer_load"]["value"], "reinsurance.reinsurer_load.value")
    budget = _number(raw["budget_share"], "reinsurance.budget_share")
    chosen_attach = _number(raw["attachment_loss_ratio"], "reinsurance.attachment_loss_ratio")
    rows: list[dict[str, Any]] = []
    for attach in (1.00, 1.10, 1.25, chosen_attach, 1.75):
        row = stop_loss(lrs, attach, cap_lr)
        row["cost_pct"] = round(row["expected_recovery_pct"] * load, 2)
        row["inside_budget"] = row["cost_pct"] <= 100 * budget
        row["retained_worst_lr"] = round(float(min(lrs.max(), attach)), 3)
        rows.append(row)
    chosen = next(row for row in rows if np.isclose(row["attach"], chosen_attach))
    expected_recovery = raw.get("expected_recovery_share", {})
    haze_stress = raw.get("haze_stress_scenario")
    if not isinstance(haze_stress, dict):
        raise ValueError("product.json reinsurance.haze_stress_scenario must be an object")
    published_haze_stress = {
        "label": str(haze_stress["label"]),
        "loss_ratio": _number(haze_stress["loss_ratio"], "reinsurance.haze_stress_scenario.loss_ratio"),
        "source": str(haze_stress["source"]),
        "basis": str(haze_stress["basis"]),
    }
    return {
        "scope": (
            "Fictional pilot-book geographic-mix diagnostic for capital planning. "
            "It is not the published Standard pricing calibration and never changes a payout."
        ),
        "type": raw.get("type", "Aggregate stop-loss"),
        "load": load,
        "budget_pct": round(100 * budget, 2),
        "table": rows,
        "chosen_attach": chosen_attach,
        "chosen": chosen,
        # Kept for the capital-console contract. The published attachment is
        # the decision; this does not infer a different attachment from a
        # changing pilot geography.
        "rule_suggests_attach": chosen_attach,
        "hard_cap_lr": round(cap_lr, 3),
        "simulation_expected_recovery_share": expected_recovery.get("simulation"),
        "backtest_plan_recovery_share": expected_recovery.get("back-test"),
        "starts_year": raw.get("starts_year"),
        "published_haze_stress": published_haze_stress,
        "note": (
            f"The plan attaches at {chosen_attach:.0%}. It is a tail-risk purchase: "
            f"the observed series reaches it in {chosen['years_hit']} of {chosen['years']} years. "
            "Simulation recovery is a capital-planning estimate, not a payout input."
        ),
    }


# ---------------------------------------------------------------- market
def market() -> dict[str, Any]:
    """Return market numbers exactly as approved in the product specification."""
    raw = _raw()["market"]
    if not isinstance(raw, dict):
        raise ValueError("product.json market must be an object")
    small = raw["small_firms"]
    year_three = raw["year_3_target"]
    return {
        **raw,
        # Compatibility fields make historical offline data consumers explicit
        # without re-deriving market values from a retired price.
        "firms_mid": int(small["employers"]),
        "total_premium": {
            "low": small["premium_low"],
            "mid": small["premium"],
            "high": small["premium_high"],
        },
        "year3_obtainable_premium": year_three["premium"],
        "year3_firms": year_three["employers"],
        "year3_workers": year_three["workers"],
    }


def _plan_rows() -> list[PlanPrice]:
    return [plan_price(plan.id) for plan in product.get_product().plans]


def _standard_economics() -> dict[str, Any]:
    raw = _raw()["unit_economics_standard_per_worker"]
    if not isinstance(raw, dict):
        raise ValueError("product.json unit_economics_standard_per_worker must be an object")
    return raw


def _value(row: dict[str, Any], key: str) -> float:
    value = row[key]
    return _number(value["value"] if isinstance(value, dict) and "value" in value else value, key)


# ---------------------------------------------------------------- run
def run() -> dict[str, Any]:
    """Generate offline pricing data from approved terms plus the back-test."""
    spec = product.get_product()
    bt = json.loads((PROCESSED / "backtest.json").read_text())
    base = bt["base"]
    standard = plan_price(spec.default_plan.id)
    economics = _standard_economics()
    expected_h = _value(economics, "expected_insured_hours_year")
    expected_payout = _value(economics, "expected_payout_year")
    annual_h = np.array(base["annual_insured_h"], dtype=float)
    historical_payout = annual_h * spec.product.benefit_per_worker_hour
    historical_lrs = historical_payout / standard.year
    cap_lr = rules.YEARLY_CAP_H * spec.product.benefit_per_worker_hour / standard.year
    haze_stress_lr = (float(historical_payout.max()) + rules.HAZE_YEARLY_LIMIT_H * spec.product.benefit_per_worker_hour) / standard.year
    observed_lr = expected_payout / standard.year
    one_in_ten_payout = _value(economics, "one_in_ten_year_payout")
    one_in_ten_lr = _number(economics["one_in_ten_year_payout"]["loss_ratio"], "one_in_ten_year_payout.loss_ratio")
    worst_payout = _value(economics, "worst_backtest_year_payout")
    worst_lr = _number(economics["worst_backtest_year_payout"]["loss_ratio"], "worst_backtest_year_payout.loss_ratio")
    portfolio_loss_ratios = {
        "scope": (
            "Fictional 500-firm geographic-mix portfolio diagnostic. It supports capital and cash planning only; "
            "it does not replace the published Standard calibration."
        ),
        "expected": round(float(historical_lrs.mean()), 3),
        "one_in_ten": round(float(np.quantile(historical_lrs, 0.9)), 3),
        "worst_backtest": round(float(historical_lrs.max()), 3),
        "worst_plus_haze_stress": round(float(haze_stress_lr), 3),
        "hard_cap": round(float(cap_lr), 3),
        "by_year": [round(float(value), 3) for value in historical_lrs],
        "years": base["years"],
    }

    firm_workers = spec.demo_firm.outdoor_workers
    firm_quote = quote(firm_workers, standard.id)
    firm = {
        "workers": firm_workers,
        "premium_before_gst": firm_quote["premium_before_gst"],
        "premium_with_gst": firm_quote["premium_with_gst"],
        "expected_payout": round(firm_workers * expected_payout, 2),
        "expected_payout_source": economics["expected_payout_year"].get("source"),
        "worst_capped": round(firm_workers * rules.YEARLY_CAP_H * spec.product.benefit_per_worker_hour, 2),
        "average_payout_product_example": spec.default_plan.example_20_workers.average_payout_year,
    }
    split = _split()
    expense = expense_model(float(firm["premium_before_gst"]))
    pilot_raw = _raw()["pilot"]
    if not isinstance(pilot_raw, dict):
        raise ValueError("product.json pilot must be an object")
    pilot = {
        **pilot_raw,
        "observed_expected_claims": round(_number(pilot_raw["workers"], "pilot.workers") * expected_payout, 2),
        "observed_expected_loss_ratio": round(observed_lr, 3),
    }
    reinsurance_view = reinsurance(historical_lrs, cap_lr)
    published_haze_stress = reinsurance_view["published_haze_stress"]
    market_view = market()
    assumptions = {
        "historical_haze_load_hours": {
            "value": HAZE_LOAD_H,
            "basis": "Added to the observed WBGT and rain back-test because earlier PSI history is incomplete.",
            "source": "assumption",
        },
        "fixed_operating_cost": {
            "value": FIXED_OPERATING_COST_SGD,
            "basis": "Dedicated pilot-team sensitivity, not a customer price input.",
            "source": "assumption",
        },
    }
    output: dict[str, Any] = {
        "version": spec.version,
        "price_inputs": list(spec.price_inputs_allowed),
        "plans": [asdict(row) for row in _plan_rows()],
        "gst": spec.product.gst_rate,
        "split": split,
        "expected_insured_h": expected_h,
        "expected_insured_h_basis": economics["expected_insured_hours_year"].get("basis"),
        "observed_calibration": {
            "scope": (
                "Published Standard pricing calibration. It remains fixed when the fictional pilot-book geography changes."
            ),
            "expected_insured_hours_per_worker": expected_h,
            "expected_payout_per_worker": expected_payout,
            "premium_per_worker": standard.year,
            "observed_loss_ratio": round(observed_lr, 3),
            "one_in_ten_payout_per_worker": one_in_ten_payout,
            "one_in_ten_loss_ratio": one_in_ten_lr,
            "worst_payout_per_worker": worst_payout,
            "worst_loss_ratio": worst_lr,
            "source": economics["expected_payout_year"].get("source"),
            "basis": economics["expected_payout_year"].get("basis"),
        },
        "firm_20": firm,
        "loss_ratios": {
            "scope": "Published Standard calibration at the approved S$2.48 weekly price.",
            "expected": round(observed_lr, 3),
            "one_in_ten": one_in_ten_lr,
            "worst_backtest": worst_lr,
            "hard_cap": round(float(cap_lr), 3),
        },
        "portfolio_loss_ratios": portfolio_loss_ratios,
        "portfolio_diagnostic": {
            "scope": bt.get("portfolio_diagnostic", {}).get(
                "scope",
                "Fictional pilot-book geographic mix used for portfolio, capital and cash diagnostics only.",
            ),
            "firms": bt.get("portfolio_diagnostic", {}).get("firms"),
            "station_groups": bt.get("portfolio_diagnostic", {}).get("station_groups"),
            "expected_insured_h_per_worker": base["expected_insured_h"],
            "expected_payout_per_worker": base["expected_payout"],
            "loss_ratio_at_published_standard_price": base["loss_ratio_mean"],
        },
        "expense": expense,
        "reinsurance": reinsurance_view,
        "published_haze_stress": published_haze_stress,
        "pilot": pilot,
        "market": market_view,
        "assumptions": assumptions,
    }
    output["headline"] = {
        "Published Standard price": (
            f"S${standard.year:.2f} a worker a year, S${standard.week:.2f} a week before GST "
            f"(S${standard.year_gst:.2f} with GST)"
        ),
        "Observed 26-year Standard result": (
            f"S${expected_payout:.2f} expected payout a worker a year, "
            f"{observed_lr:.0%} of the cautious published price"
        ),
        "Published calibration basis": (
            f"{expected_h:.2f} insured hours and S${expected_payout:.2f} per worker; "
            "not recalculated from the pilot's station mix"
        ),
        "500-firm geographic-mix diagnostic": (
            f"S${base['expected_payout']:.2f} a worker a year in this generated mix; "
            "capital and cash only, not a price input"
        ),
        "20-worker Standard example": (
            f"S${firm['premium_before_gst']:,.0f} before GST, S${firm['premium_with_gst']:,.0f} with GST; "
            f"observed expected payout S${firm['expected_payout']:,.0f}"
        ),
        "Plan split": "65% claims, 20% expenses, 5% reinsurance and 10% profit (plan)",
        "2015-style haze capital stress": (
            f"{published_haze_stress['loss_ratio']:.0%} loss ratio ({published_haze_stress['source']}; "
            "capital planning only, never a customer payout input)"
        ),
        "Aggregate stop-loss": (
            f"Attaches at {reinsurance_view['chosen_attach']:.0%}; observed recovery is "
            f"{reinsurance_view['chosen']['expected_recovery_pct']}% over {reinsurance_view['chosen']['years']} years."
        ),
        "Market": (
            f"S${market_view['total_premium']['mid'] / 1e6:.1f}M small-firm premium at the midpoint; "
            f"year-three plan S${market_view['year3_obtainable_premium'] / 1e6:.2f}M"
        ),
    }
    (PROCESSED / "pricing.json").write_text(json.dumps(output, indent=1))
    WEB_DATA.mkdir(parents=True, exist_ok=True)
    (WEB_DATA / "pricing.json").write_text(json.dumps(output))
    write_doc(output)
    return output


def write_doc(output: dict[str, Any]) -> None:
    """Write a compact audit note from the same data shipped offline."""
    reinsurance_view = output["reinsurance"]
    observed = output["observed_calibration"]
    portfolio = output["portfolio_diagnostic"]
    portfolio_lrs = output["portfolio_loss_ratios"]
    published_haze_stress = output["published_haze_stress"]
    lines = [
        "# Pricing, unit economics and reinsurance",
        "",
        "Generated by `python -m rehat.pricing` from the approved product terms and `data/processed/backtest.json`.",
        "",
        "## Headline",
        "",
        "| Item | Value |",
        "|---|---|",
        *[f"| {key} | {value} |" for key, value in output["headline"].items()],
        "",
        "## Pricing boundary",
        "",
        "Customer prices use only the selected plan and declared headcount. The benefit and deductible are published plan terms. GST is shown separately.",
        "",
        "## Published calibration and portfolio diagnostic",
        "",
        (
            f"The approved Standard calibration is {observed['expected_insured_hours_per_worker']:.2f} insured hours and "
            f"S${observed['expected_payout_per_worker']:.2f} expected payout a worker a year, or "
            f"{observed['observed_loss_ratio']:.0%} of the S${observed['premium_per_worker']:.2f} published annual price. "
            "This is the customer and pitch calibration."
        ),
        (
            f"The regenerated {portfolio.get('firms') or 'pilot'}-firm geographic mix gives "
            f"{portfolio['expected_insured_h_per_worker']:.2f} insured hours and "
            f"S${portfolio['expected_payout_per_worker']:.2f} a worker a year. "
            "It is a portfolio diagnostic for capital and cash planning, not a replacement price calibration."
        ),
        (
            f"The published {published_haze_stress['label']} is "
            f"{published_haze_stress['loss_ratio']:.0%} loss ratio. {published_haze_stress['basis']}"
        ),
        "",
        "## Stop-loss table (portfolio diagnostic history)",
        "",
        "| Attachment | Expected recovery % of premium | Cost % at load | Years hit | Within 5% budget | Retained worst loss ratio |",
        "|---|---|---|---|---|---|",
        *[
            f"| {row['attach']:.0%} | {row['expected_recovery_pct']} | {row['cost_pct']} | "
            f"{row['years_hit']} of {row['years']} | {'yes' if row['inside_budget'] else 'no'} | {row['retained_worst_lr']:.0%} |"
            for row in reinsurance_view["table"]
        ],
        "",
        reinsurance_view["note"],
        "",
        (
            f"The diagnostic series has a {portfolio_lrs['worst_backtest']:.0%} worst observed loss ratio and "
            f"{portfolio_lrs['worst_plus_haze_stress']:.0%} with the stated 20-hour haze stress. "
            "Those figures are not substituted into the published Standard calibration."
        ),
        "",
        "## Assumptions",
        "",
        "| Name | Value | Basis |",
        "|---|---|---|",
        *[f"| {key} | {value['value']} | {value['basis']} |" for key, value in output["assumptions"].items()],
    ]
    (DOCS / "pricing.md").write_text("\n".join(lines) + "\n")


if __name__ == "__main__":
    print(json.dumps(run()["headline"], indent=1))
