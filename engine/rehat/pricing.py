"""Pricing, unit economics, expense model, reinsurance and market sizing.

Premium = expected insured hours x benefit / target loss ratio (CONTEXT.md section 5). Price depends only on plan,
benefit and headcount (AGENTS.md). Inputs that are assumptions are listed in ASSUMPTIONS and tagged in the UI.
"""
from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field

import numpy as np

from rehat.paths import DOCS, PROCESSED, WEB_DATA

GST = 0.09
TARGET_LR = 0.65
LAUNCH_CREDIT = 0.30
LAUNCH_CREDIT_ENDS = "2027-12-31"
SPLIT = {"claims": 0.65, "variable_expenses": 0.12, "reinsurance_and_capital": 0.05, "fixed_cost_and_margin": 0.18}
WEEKS_PER_YEAR = 52
MONTHS_PER_YEAR = 12
CAP_HOURS_YEAR = 60.0

ASSUMPTIONS = {
    "haze_load_h": (1.0, "About 5 haze episodes in 30 years (1997, 2006, 2013, 2015, 2019), roughly 5 to 20 insured haze hours each. Added because NEA PSI before 2025 is not in the back-test."),
    "working_days_per_year": (302, "Mon to Sat (312 days) minus about 10 public holidays on working days."),
    "fixed_cost_sgd": (300_000.0, "Income's fixed cost to add and run a section on an existing WIC policy (question for Income's mentor)."),
    "variable_expense_ratio": (0.12, "Commission, payments and servicing, from the CONTEXT.md premium split."),
    "policy_workers": (20, "Workers per policy for break-even and the firm sheet (the 20-worker example firm)."),
    "reinsurer_load": (1.75, "Reinsurer price as a multiple of expected recovery for an aggregate stop-loss."),
    "reinsurance_budget": (0.05, "Share of premium set aside for reinsurance and capital in the split."),
    "idle_hour_cost_sgd": (10.20, "Declared salary plus levy spread over working hours for a work permit holder."),
    "monthly_labour_cost_sgd": (2145.0, "Salary, levy and housing a work permit holder a month; sets premium as a share of the labour bill."),
    "site_match_rider_week": (0.50, "Rider price until real site logs are tested (replaced by the Site Match simulation in P8)."),
    "pilot_firms": (300, "Pilot size from CONTEXT.md section 5."),
    "pilot_workers": (6000, "Pilot size from CONTEXT.md section 5."),
}


def a(name: str) -> float:
    return ASSUMPTIONS[name][0]


@dataclass
class PlanPrice:
    plan: str
    benefit: float
    year: float
    month: float
    week: float
    working_day: float
    year_gst: float
    week_gst: float
    year_after_credit: float
    year_after_credit_gst: float


def premium_per_worker_year(expected_insured_h: float, benefit: float, target_lr: float = TARGET_LR) -> float:
    """Premium = expected insured hours x benefit / target loss ratio."""
    return expected_insured_h * benefit / target_lr


def plan_price(plan: str, benefit: float, expected_insured_h: float) -> PlanPrice:
    y = premium_per_worker_year(expected_insured_h, benefit)
    return PlanPrice(
        plan, benefit, round(y, 2), round(y / MONTHS_PER_YEAR, 2), round(y / WEEKS_PER_YEAR, 2), round(y / a("working_days_per_year"), 3),
        round(y * (1 + GST), 2), round(y / WEEKS_PER_YEAR * (1 + GST), 2), round(y * (1 - LAUNCH_CREDIT), 2), round(y * (1 - LAUNCH_CREDIT) * (1 + GST), 2),
    )


def quote(workers: int, plan: str, expected_insured_h: float, site_match: bool = False, rider_week: float | None = None) -> dict:
    """Quote for a firm. Inputs: plan, benefit (from plan) and headcount only."""
    benefit = {"Lite": 5.0, "Standard": 8.0}[plan]
    p = plan_price(plan, benefit, expected_insured_h)
    rider_y = (rider_week if rider_week is not None else a("site_match_rider_week")) * WEEKS_PER_YEAR if site_match else 0.0
    before = round(workers * (p.year + rider_y), 2)
    credit = round(before * LAUNCH_CREDIT, 2)
    after_credit = round(before - credit, 2)
    return {
        "inputs_used": ["plan", "benefit", "outdoor headcount"],
        "plan": plan, "benefit_per_hour": benefit, "workers": workers, "site_match": site_match,
        "per_worker_year": p.year, "per_worker_week": p.week, "rider_per_worker_year": round(rider_y, 2),
        "premium_before_gst": before, "launch_credit": credit, "launch_credit_ends": LAUNCH_CREDIT_ENDS,
        "premium_after_credit": after_credit, "gst": round(after_credit * GST, 2), "premium_after_credit_gst": round(after_credit * (1 + GST), 2),
        "premium_before_gst_no_credit_gst": round(before * (1 + GST), 2),
        "cap_hours_year": CAP_HOURS_YEAR, "max_payout_year": round(workers * benefit * CAP_HOURS_YEAR, 2),
    }


# ---------------------------------------------------------------- expenses
def expense_model(premium_per_policy: float, fixed: float | None = None, var: float | None = None) -> dict:
    fixed = a("fixed_cost_sgd") if fixed is None else fixed
    var = a("variable_expense_ratio") if var is None else var
    margin = 1 - SPLIT["claims"] - var - SPLIT["reinsurance_and_capital"]
    breakeven = fixed / (margin * premium_per_policy)
    er_at_be = var + fixed / (breakeven * premium_per_policy)
    n20 = fixed / ((0.20 - var) * premium_per_policy)
    curve = [{"policies": n, "expense_ratio": round(var + fixed / (n * premium_per_policy), 4)} for n in (100, 200, 300, 500, 647, 750, 1000, 1456, 2000, 3000, 5000)]
    return {"premium_per_policy": round(premium_per_policy, 2), "fixed_cost": fixed, "variable_ratio": var, "margin_ratio": round(margin, 3),
            "breakeven_policies": int(round(breakeven)), "expense_ratio_at_breakeven": round(er_at_be, 3), "policies_for_20pct_expense_ratio": int(round(n20)), "curve": curve}


# ---------------------------------------------------------------- reinsurance
def stop_loss(lrs: np.ndarray, attach: float, cap_lr: float) -> dict:
    rec = np.clip(lrs - attach, 0, cap_lr - attach)
    return {"attach": attach, "expected_recovery_pct": round(100 * float(rec.mean()), 2), "years_hit": int((lrs > attach).sum()), "years": int(len(lrs))}


DECIDED_ATTACH = 1.50  # CONTEXT.md section 5 "Reinsurance and capital (decided)"


def reinsurance(lrs: np.ndarray, cap_lr: float, load: float | None = None, budget: float | None = None) -> dict:
    load = a("reinsurer_load") if load is None else load
    budget = a("reinsurance_budget") if budget is None else budget
    rows = []
    for att in (1.00, 1.10, 1.25, 1.50, 1.75):
        r = stop_loss(lrs, att, cap_lr)
        r["cost_pct"] = round(r["expected_recovery_pct"] * load, 2)
        r["inside_budget"] = r["cost_pct"] <= 100 * budget
        r["retained_worst_lr"] = round(float(min(lrs.max(), att)), 3)
        rows.append(r)
    inside = [r for r in rows if r["inside_budget"]]
    chosen = min(inside, key=lambda r: r["attach"]) if inside else rows[-1]
    decided = next(r for r in rows if r["attach"] == DECIDED_ATTACH)
    return {"load": load, "budget_pct": 100 * budget, "table": rows, "rule_suggests_attach": chosen["attach"], "rule_suggests": chosen,
            "chosen_attach": DECIDED_ATTACH, "chosen": decided, "hard_cap_lr": round(cap_lr, 3),
            "note": f"Decided attachment {DECIDED_ATTACH:.0%} (CONTEXT.md). The rule 'lowest attachment inside the 5% budget' now suggests {chosen['attach']:.0%}."}


# ---------------------------------------------------------------- market
MARKET = {
    "in_scope_workers": {"low": 110_700, "mid": 185_400, "high": 261_800},
    "workers_per_firm": 15,
    "income_share_of_wic": 0.12,
    "year3_workers": 14_900,
    "year3_firms": 745,
}


def market(premium_year: float, m: dict | None = None) -> dict:
    m = m or MARKET
    w = m["in_scope_workers"]
    return {
        "in_scope_workers": w,
        "firms_mid": int(round(w["mid"] / m["workers_per_firm"], -2)),
        "total_premium": {k: round(v * premium_year) for k, v in w.items()},
        "income_wic_slice": round(w["mid"] * premium_year * m["income_share_of_wic"]),
        "year3_obtainable_premium": round(m["year3_workers"] * premium_year),
        "year3_firms": m["year3_firms"],
        "year3_workers": m["year3_workers"],
        "basis": "185,400 in-scope workers = 75% construction x 60% SME x 70% outdoor of MOM work permit holders + 10,800 landscape + 20,000 outdoor cleaners (assumptions). Income share 12% (assumption). Year 3 = 40% attach on Income book + 6,000 via associations.",
    }


# ---------------------------------------------------------------- run
def run(expected_insured_h: float | None = None) -> dict:
    bt = json.loads((PROCESSED / "backtest.json").read_text())
    b = bt["base"]
    haze_load = a("haze_load_h")
    exp_h = expected_insured_h if expected_insured_h is not None else round(b["expected_insured_h"] + haze_load, 2)
    std = plan_price("Standard", 8.0, exp_h)
    lite = plan_price("Lite", 5.0, exp_h)
    rider_y = a("site_match_rider_week") * WEEKS_PER_YEAR
    sm_path = PROCESSED / "sitematch.json"
    rider_basis = ASSUMPTIONS["site_match_rider_week"][1]
    if sm_path.exists():
        sm = json.loads(sm_path.read_text())
        if "rider_price_year" in sm.get("headline", {}):
            rider_y = float(sm["headline"]["rider_price_year"])
            rider_basis = sm["headline"].get("rider_basis", "Site Match simulation (P8)")

    # book annual payouts per worker (S$8) from the back-test, plus haze load spread evenly as expected value only
    annual_h = np.array(b["annual_insured_h"])
    payout_y = annual_h * 8.0
    lrs = payout_y / std.year
    cap_lr = CAP_HOURS_YEAR * 8.0 / std.year
    haze_stress = (annual_h.max() + 20.0) * 8.0 / std.year  # worst back-test year plus a 2015-like 20 h haze year
    w = int(a("policy_workers"))
    firm = {
        "workers": w,
        "premium_before_gst": round(w * std.year, 2),
        "premium_with_gst": round(w * std.year * (1 + GST), 2),
        "premium_after_launch_credit_with_gst": round(w * std.year * (1 - LAUNCH_CREDIT) * (1 + GST), 2),
        "expected_payout": round(w * float(payout_y.mean() + haze_load * 8.0), 2),
        "payout_1in10": round(w * float(np.quantile(payout_y, 0.9)), 2),
        "worst_backtest_year_payout": round(w * float(payout_y.max()), 2),
        "worst_backtest_year": b["worst_year"],
        "worst_capped": round(w * CAP_HOURS_YEAR * 8.0, 2),
        "labour_bill_year": round(w * a("monthly_labour_cost_sgd") * 12, 2),
    }
    firm["premium_share_of_labour_bill_pct"] = round(100 * firm["premium_before_gst"] / firm["labour_bill_year"], 2)
    counted = float(np.mean([s["heat_counted_h"] + s["rain_counted_h"] for s in bt["stations"]]))
    firm["counted_downtime_h_per_worker"] = round(counted, 1)
    firm["weather_downtime_cost_year"] = round(w * counted * a("idle_hour_cost_sgd"), 2)

    pilot_w = int(a("pilot_workers"))
    pilot = {
        "firms": int(a("pilot_firms")), "workers": pilot_w,
        "premium": round(pilot_w * std.year), "expected_claims": round(pilot_w * (float(payout_y.mean()) + haze_load * 8.0)),
        "claims_1in10": round(pilot_w * float(np.quantile(payout_y, 0.9))), "worst_backtest_year_claims": round(pilot_w * float(payout_y.max())),
        "hard_cap": round(pilot_w * CAP_HOURS_YEAR * 8.0),
    }
    re = reinsurance(lrs, cap_lr)
    exp = expense_model(w * std.year)
    mk = market(std.year)
    loss_ratio_expected = (float(payout_y.mean()) + haze_load * 8.0) / std.year

    out = {
        "expected_insured_h": exp_h,
        "expected_insured_h_basis": f"back-test {b['expected_insured_h']} h + haze load {haze_load} h (assumption)",
        "target_loss_ratio": TARGET_LR,
        "plans": [asdict(std), asdict(lite)],
        "site_match_rider": {"year": round(rider_y, 2), "week": round(rider_y / WEEKS_PER_YEAR, 2), "cap_hours_year": 10, "basis": rider_basis},
        "gst": GST, "launch_credit": LAUNCH_CREDIT, "launch_credit_ends": LAUNCH_CREDIT_ENDS,
        "split": SPLIT,
        "firm_20": firm,
        "loss_ratios": {"expected": round(loss_ratio_expected, 3), "one_in_ten": round(float(np.quantile(lrs, 0.9)), 3), "worst_backtest": round(float(lrs.max()), 3),
                         "worst_plus_haze_stress": round(float(haze_stress), 3), "hard_cap": round(cap_lr, 3), "by_year": [round(float(x), 3) for x in lrs], "years": b["years"]},
        "expense": exp,
        "reinsurance": re,
        "pilot": pilot,
        "market": mk,
        "assumptions": {k: {"value": v[0], "basis": v[1]} for k, v in ASSUMPTIONS.items()},
    }
    out["headline"] = {
        "Expected insured hours (pricing)": f"{exp_h} a worker a year ({out['expected_insured_h_basis']})",
        "Standard premium": f"S${std.year:.2f} a year, S${std.week:.2f} a week, before GST (S${std.year_gst:.2f} with GST)",
        "Lite premium": f"S${lite.year:.2f} a year, S${lite.week:.2f} a week, before GST",
        "Site Match rider": f"S${rider_y:.2f} a year, S${rider_y / 52:.2f} a week ({rider_basis})",
        "Expected payout a worker": f"S${payout_y.mean() + haze_load * 8:.2f} a year (loss ratio {loss_ratio_expected:.0%})",
        "1-in-10 payout a worker": f"S${np.quantile(payout_y, 0.9):.2f} ({np.quantile(lrs, 0.9):.0%} loss ratio)",
        "Worst back-test year": f"{b['worst_year']}: S${payout_y.max():.2f} ({lrs.max():.0%}); plus a 2015-like haze year {haze_stress:.0%}",
        "Hard cap": f"S$480 a worker ({cap_lr:.0%} loss ratio)",
        "20-worker firm": f"premium S${firm['premium_before_gst']:,.0f} (S${firm['premium_with_gst']:,.0f} with GST; S${firm['premium_after_launch_credit_with_gst']:,.0f} with GST after 30% launch credit); expected payout S${firm['expected_payout']:,.0f}; worst capped S${firm['worst_capped']:,.0f}; premium {firm['premium_share_of_labour_bill_pct']}% of labour bill; weather downtime costs about S${firm['weather_downtime_cost_year']:,.0f} a year",
        "Break-even": f"{exp['breakeven_policies']} policies of 20 workers at S$300k fixed cost; expense ratio {exp['expense_ratio_at_breakeven']:.0%} at break-even; 20% at {exp['policies_for_20pct_expense_ratio']:,} policies",
        "Pilot (300 firms, 6,000 workers)": f"premium S${pilot['premium']:,}; expected claims S${pilot['expected_claims']:,}; worst back-test year S${pilot['worst_backtest_year_claims']:,}; hard cap S${pilot['hard_cap']:,}",
        "Stop-loss (decided 150%)": f"attach {re['chosen_attach']:.0%}: expected recovery {re['chosen']['expected_recovery_pct']}% of premium, cost {re['chosen']['cost_pct']}% at {re['load']}x load, hit {re['chosen']['years_hit']} of {re['chosen']['years']} years",
        "Stop-loss (rule suggests)": f"lowest attachment inside 5% budget: {re['rule_suggests_attach']:.0%} (cost {re['rule_suggests']['cost_pct']}%, hit {re['rule_suggests']['years_hit']} of {re['rule_suggests']['years']} years). Needs a decision.",
        "Total market (premium)": f"S${mk['total_premium']['mid'] / 1e6:.1f}M (S${mk['total_premium']['low'] / 1e6:.1f}M to S${mk['total_premium']['high'] / 1e6:.1f}M); Income WIC slice S${mk['income_wic_slice'] / 1e6:.1f}M; year-3 obtainable S${mk['year3_obtainable_premium'] / 1e6:.2f}M",
    }
    (PROCESSED / "pricing.json").write_text(json.dumps(out, indent=1))
    WEB_DATA.mkdir(parents=True, exist_ok=True)
    (WEB_DATA / "pricing.json").write_text(json.dumps(out))
    write_doc(out)
    return out


def write_doc(o: dict) -> None:
    re = o["reinsurance"]
    lines = [
        "# Pricing, unit economics and reinsurance",
        "",
        "Generated by `python -m rehat.pricing` from `data/processed/backtest.json`.",
        "",
        "## Headline",
        "",
        "| Item | Value |",
        "|---|---|",
        *[f"| {k} | {v} |" for k, v in o["headline"].items()],
        "",
        "## Rule",
        "",
        "Premium a worker a year = expected insured hours x benefit / 0.65 target loss ratio. Price depends only on plan, benefit and headcount. GST 9% on top. Year-one launch credit 30%, ends 31 Dec 2027.",
        "",
        "## Stop-loss table (book loss ratio by year from the back-test)",
        "",
        "| Attachment | Expected recovery % of premium | Cost % at load | Years hit | Inside 5% budget | Retained worst LR |",
        "|---|---|---|---|---|---|",
        *[f"| {r['attach']:.0%} | {r['expected_recovery_pct']} | {r['cost_pct']} | {r['years_hit']} of {r['years']} | {'yes' if r['inside_budget'] else 'no'} | {r['retained_worst_lr']:.0%} |" for r in re["table"]],
        "",
        f"{re['note']} The back-test has only {re['table'][0]['years']} years and no pre-2025 haze, so the tail is thin; the 2015-like haze stress gives {o['loss_ratios']['worst_plus_haze_stress']:.0%}. Hard cap {o['loss_ratios']['hard_cap']:.0%}.",
        "",
        "## Assumptions",
        "",
        "| Name | Value | Basis |",
        "|---|---|---|",
        *[f"| {k} | {v['value']} | {v['basis']} |" for k, v in o["assumptions"].items()],
    ]
    (DOCS / "pricing.md").write_text("\n".join(lines) + "\n")


if __name__ == "__main__":
    print(json.dumps(run()["headline"], indent=1))
