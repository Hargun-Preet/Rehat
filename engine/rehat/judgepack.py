"""Write the decision pack from the same versioned data used by the app."""
from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Any

from rehat import product
from rehat.paths import DOCS, PROCESSED, WEB_DATA


def _j(name: str) -> dict[str, Any]:
    return json.loads((PROCESSED / f"{name}.json").read_text())


def _web(name: str) -> dict[str, Any]:
    path = WEB_DATA / name
    return json.loads(path.read_text()) if path.exists() else {}


def _pct(value: float) -> str:
    return f"{value:.0%}"


def _sgd(value: float, decimals: int = 0) -> str:
    return f"S${value:,.{decimals}f}"


def _plan(pricing: dict[str, Any], plan_id: str) -> dict[str, Any]:
    return next(plan for plan in pricing["plans"] if plan["id"] == plan_id)


def build() -> str:
    """Build a concise, product-accurate ten-beat decision pack."""
    spec = product.get_product()
    raw = product.product_dict()
    pricing = _j("pricing")
    backtest = _j("backtest")
    liquidity = _j("liquidity")
    compliance = _web("compliance.json").get("rows", [])
    standard = _plan(pricing, spec.default_plan.id)
    observed = pricing["observed_calibration"]
    firm = pricing["firm_20"]
    loss = pricing["loss_ratios"]
    portfolio_loss = pricing.get("portfolio_loss_ratios", loss)
    published_haze_stress = pricing.get("published_haze_stress", {})
    reins = pricing["reinsurance"]
    pilot = pricing["pilot"]
    market = pricing["market"]
    economics = raw["unit_economics_standard_per_worker"]
    probability = raw["probabilities"]
    path = raw["three_year_path"]
    base = backtest["base"]
    current = liquidity.get("current", {})
    years = f"{base['years'][0]} to {base['years'][-1]}"
    plan_rows = [
        f"| {item['plan']} | {item['deductible_label']} | {_sgd(item['week'], 2)} | {_sgd(item['year'], 2)} |"
        for item in pricing["plans"]
    ]
    compliance_summary = "; ".join(row["requirement"] for row in compliance[:3]) if compliance else "The app records the published terms, consent and receipt trail."
    next_settlement = (
        f"The next cash view is {current.get('month', 'the current month')}: "
        f"P50 {_sgd(float(current.get('p50', 0)))}, P90 {_sgd(float(current.get('p90', 0)))}."
        if current
        else "The cash view is generated from the same fixed payout rules."
    )

    lines: list[str] = [
        "# Rehat decision pack",
        "",
        f"Generated {datetime.now():%d %b %Y %H:%M} from the same product terms and offline engine outputs used by the app.",
        "",
        "## 1. The owner problem",
        "",
        f"{spec.copy_text('hook')} {spec.copy_text('human_line')}",
        "",
        "## 2. What the cover pays for",
        "",
        f"Rehat is weather downtime cover attached to a current {spec.product.host_policy} policy. It pays {_sgd(spec.product.benefit_per_worker_hour)} per declared outdoor worker for each insured hour. The firm keeps the rest of the wage cost. Payment goes by {raw['product']['payment']}.",
        "",
        "## 3. The three published plans",
        "",
        "| Plan | Monthly allowance | Per worker a week | Per worker a year |",
        "|---|---|---:|---:|",
        *plan_rows,
        "",
        "The plan changes only the monthly allowance. Work class is set from the WIC job class, not selected by the customer.",
        "",
        "## 4. The payout is fixed arithmetic",
        "",
        "Hourly NEA heat readings, rain readings and regional PSI are counted against the named station's normal month and plan allowance. Missing or partial readings stay PENDING. A person reviews any exception; a model does not reject a claim or change a payout.",
        "",
        "## 5. What history shows",
        "",
        f"Across {years}, the Standard back-test observes {_sgd(observed['expected_payout_per_worker'], 2)} expected payout a worker a year. At the deliberately cautious {_sgd(standard['year'], 2)} published annual price, that is {_pct(observed['observed_loss_ratio'])} returned to firms. Standard pays in {raw['probabilities']['months_paying_standard']['say']} of months.",
        "The generated 500-firm station mix is kept separate as a portfolio diagnostic for capital and cash planning. It never changes this published price calibration or a customer payment.",
        "",
        "## 6. A 20-worker Standard example",
        "",
        f"Premium is {_sgd(firm['premium_before_gst'])} before GST and {_sgd(firm['premium_with_gst'])} with GST. The observed expected payout is {_sgd(firm['expected_payout'])}. The contractual annual cap is {_sgd(firm['worst_capped'])}. {_sgd(economics['normal_downtime_hours_year']['total']) if isinstance(economics['normal_downtime_hours_year']['total'], float) else str(economics['normal_downtime_hours_year']['total'])} normal downtime hours is a simulation estimate, not a payment promise.",
        "",
        "## 7. Portfolio economics and capital",
        "",
        "The approved plan split is 65% claims, 20% expenses, 5% reinsurance and 10% profit. The first-year pilot retains risk; aggregate stop-loss starts in year two. "
        f"It attaches at {_pct(reins['chosen_attach'])}. The published {published_haze_stress.get('label', 'haze capital stress')} is {_pct(published_haze_stress.get('loss_ratio', portfolio_loss['worst_plus_haze_stress']))}; it is a capital scenario, not a customer payout input. The observed historical series hits that attachment in {reins['chosen']['years_hit']} of {reins['chosen']['years']} years, so it is a tail-risk purchase rather than evidence of normal claims cost.",
        "",
        "## 8. A bounded rollout",
        "",
        f"The plan starts with {pilot['firms']:,} firms and {pilot['workers']:,} workers in {pilot['start']}. Premium is {_sgd(pilot['premium'])}; the known contractual cap is {_sgd(pilot['capped_worst_case'])}. The three-year path totals {_sgd(path['total_premium'])} of premium and {_sgd(path['total_profit'])} planned profit.",
        "",
        "## 9. Cash and operations",
        "",
        f"{next_settlement} Forecasts help plan cash and reinsurance only. They cannot change a customer's price or payment. {compliance_summary}",
        "",
        "## 10. The decision to test",
        "",
        f"The first proof point is whether firms understand the named-station limit before they buy: “{spec.copy_text('may_not_pay')}” The product records the teach-back answer and warranty tick before purchase. {spec.copy_text('legal_status')}.",
        "",
        "## Limits stated plainly",
        "",
        f"- The published Standard calibration's worst back-test loss ratio is {_pct(loss['worst_backtest'])}. The published {published_haze_stress.get('label', 'haze capital stress')} is {_pct(published_haze_stress.get('loss_ratio', portfolio_loss['worst_plus_haze_stress']))}; it is a capital scenario. The separate geographic-mix portfolio diagnostic reaches {_pct(portfolio_loss['worst_plus_haze_stress'])} with its stated 20-hour haze stress.",
        "- Historical heat before NEA coverage uses a validated rebuild. It supports frequency analysis, not a single historical payment.",
        "- Non-English worker and receipt copy remains unavailable until native-speaker review. English is the canonical source.",
        "- Site-specific logs are evaluated only in Labs and do not affect the core plan price or payment rule.",
        "",
        spec.copy_text("footer"),
    ]
    return "\n".join(lines) + "\n"


def run() -> None:
    (DOCS / "judge-pack.md").write_text(build())
    print(f"wrote {DOCS / 'judge-pack.md'}")


if __name__ == "__main__":
    run()
