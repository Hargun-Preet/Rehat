"""Write docs/judge-pack.md from the engine outputs, so every number matches the app and CONTEXT.md."""
from __future__ import annotations

import json
from datetime import datetime

from rehat.paths import DOCS, PROCESSED, WEB_DATA


def _j(name: str) -> dict:
    return json.loads((PROCESSED / f"{name}.json").read_text())


def _pct(x: float) -> str:
    return f"{x:.0%}"


def _sgd(x: float, d: int = 0) -> str:
    return f"S${x:,.{d}f}"


def build() -> str:
    pr, bt, lq, sm, gf, an = _j("pricing"), _j("backtest"), _j("liquidity"), _j("sitematch"), _j("gapfill"), _j("anomaly")
    wv = json.loads((PROCESSED / "wbgt_validation.json").read_text())
    comp = json.loads((WEB_DATA / "compliance.json").read_text())["rows"]
    std = next(p for p in pr["plans"] if p["plan"] == "Standard")
    lite = next(p for p in pr["plans"] if p["plan"] == "Lite")
    b = bt["base"]
    f20 = pr["firm_20"]
    re = pr["reinsurance"]
    ev = sm["evaluation"]
    wc = wv["overall_window_corrected"]
    ridge = next(r for r in gf["summary"] if r["method"] == "ridge")
    cur = lq["current"]
    years = f"{b['years'][0]} to {b['years'][-1]}"
    L: list[str] = [
        "# Rehat judge pack",
        "",
        f"Concept prototype for Income Insurance, Singapore-India Hackathon 2026. Not an Income product. Fictional data. Generated {datetime.now():%d %b %Y %H:%M} by `python -m rehat.judgepack` from the same engine outputs the app shows.",
        "",
        "**Rehat** is weather downtime cover for small Singapore firms with outdoor crews, sold as a tick box at the Work Injury Compensation (WIC) renewal they already do with Income. MOM's rules make heat rest paid time and idle days paid for work permit holders, so heat, heavy rain and haze cost wages without any damage. When NEA's readings at the firm's named station are worse than that station's normal month, Rehat pays S$8 a worker for each extra hour by PayNow before payroll. No claim form.",
        "",
        "## The eight strong-outcome items",
        "",
        "### 1. Concept and design",
        f"A parametric section on WIC with three meters (heat WBGT tiers that mirror MOM, clock-hour rain at a named gauge, 24-hour PSI for haze), a monthly allowance of each station's normal plus 25%, caps of 20 h a month and 60 h a year, and a fallback ladder where missing data is pending, never no event. A Site Match rider lets firms on hotter sites submit their site heat log for a checked top-up. Screens: [/](/), [/onboard](/onboard), [/employer/receipt](/employer/receipt).",
        "",
        "### 2. Target group",
        f"Small and medium firms with outdoor manual crews: construction subcontractors, landscapers, outdoor cleaners. About 185,400 in-scope workers (110,700 to 261,800; assumptions) in about {pr['market']['firms_mid']:,} firms. Chosen because the payer (the employer), the channel (WIC, which Income sells) and the trigger (MOM's heat rule) already exist. Hawkers, riders and households were assessed and moved to the roadmap with reasons (CONTEXT.md section 3).",
        "",
        "### 3. Simple pricing logic and unit economics",
        f"Premium = expected insured hours x benefit / 0.65. Expected insured hours {pr['expected_insured_h']} a worker a year ({pr['expected_insured_h_basis']}). Standard {_sgd(std['year'], 2)} a year, {_sgd(std['week'], 2)} a week before GST ({_sgd(std['year_gst'], 2)} with 9% GST); Lite {_sgd(lite['year'], 2)} a year. A 20-worker firm pays {_sgd(f20['premium_before_gst'])} a year ({_sgd(f20['premium_with_gst'])} with GST; {_sgd(f20['premium_after_launch_credit_with_gst'])} after the 30% year-one credit), about {f20['premium_share_of_labour_bill_pct']}% of its labour bill, against an expected payout of {_sgd(f20['expected_payout'])} and weather downtime costing it about {_sgd(f20['weather_downtime_cost_year'])} a year. Break-even {pr['expense']['breakeven_policies']} policies of 20 workers at S$300k fixed cost (assumption). Price depends only on plan, benefit and headcount. Screens: [/onboard](/onboard), [/backtest](/backtest).",
        "",
        "### 4. Clear claim parameters and exclusions",
        "Heat: hourly mean of four 15-minute WBGT readings (3 of 4 needed): 31.5 to 31.9 = 5 min, 32.0 to 32.9 = 10 min, 33.0+ = 15 min. Rain: 2.5 to 9.9 mm in a clock hour = 0.5 h, 10 mm+ = 1 h. Haze: noon 24-hour PSI 101 to 200 = 1 h from the 3rd consecutive day, 201 to 300 = 3 h, above 300 = 6 h, 20 h a year. Window Mon to Sat 08:00 to 18:00 minus the meal hour. Exclusions: indoor or undeclared workers, lapsed WIC, shipyards and process plants, firms above SME size, the heat payout in any month with an MOM heat enforcement action, a 14-day wait if added mid-term. The may-not-pay sentence is shown before purchase. Every rule has a test (`engine/tests/test_rules.py`).",
        "",
        "### 5. Expected impact on financial protection and affordability",
        f"Back-test {years}: {b['zero_payout_years_book']} of {len(b['years'])} years with no payout for the book; {b['pct_months_paying']}% of firm-months pay something; expected payout {_sgd(b['expected_payout'], 2)} a worker a year; 1-in-10 year {_sgd(b['payout_1in10'], 2)}. The payout arrives by the 5th working day, before payroll. It also makes MOM's rest rule cheaper to obey: rest that is paid for gets taken. Screens: [/replay](/replay), [/backtest](/backtest).",
        "",
        "### 6. Market competitiveness",
        f"No product in Singapore pays for weather downtime without damage. Rehat rides an existing compulsory purchase (WIC), so acquisition cost is a tick box. Total market about {_sgd(pr['market']['total_premium']['mid'] / 1e6, 1)}M premium a year ({_sgd(pr['market']['total_premium']['low'] / 1e6, 1)}M to {_sgd(pr['market']['total_premium']['high'] / 1e6, 1)}M); Income's WIC slice {_sgd(pr['market']['income_wic_slice'] / 1e6, 1)}M; year-3 obtainable {_sgd(pr['market']['year3_obtainable_premium'] / 1e6, 2)}M. Income has run parametric cover before (Droplet, 2018).",
        "",
        "### 7. Distribution proposal",
        "Offered at WIC renewal in Income's business account and by brokers who place WIC, plus trade associations and NTUC's U SME network. 60-second onboarding pulls headcount from the WIC policy. Workers get notices by QR in their language through the Migrant Workers' Centre network. Roadmap: riders via platform WIC (Platform Workers Act), hawkers via Stallholder Insurance. Screens: [/income](/income), [/onboard](/onboard), [/worker](/worker).",
        "",
        "### 8. How AI and data are integrated",
        f"Data: NEA WBGT, rain and PSI from data.gov.sg, MSS daily records, ERA5 reanalysis, NOAA ONI, all cached with URL and time. AI and models stay upstream of the payout and are auditable: (a) Site Match checker on {ev['logs']} simulated logs over {ev['station_days']} real station-days flags {_pct(ev['flag_rate']['honest'])} of honest logs and catches {_pct(ev['flag_rate']['inflated'])} of inflated and {_pct(ev['flag_rate']['flat'])} of flat logs; it never rejects. (b) Liquidity forecast: P90 covered the actual month {_pct(lq['validation']['overall_p90_coverage'])} of the time over {lq['validation']['period'][0]} to {lq['validation']['period'][1]}. (c) Receipt explainer in six languages with numbers locked. (d) Gap-fill proposes values for pending hours for human review only. (e) Declaration flags ({an['flagged']} of {an['firms']} demo firms). Model cards in `docs/model-cards/`.",
        "",
        "## Must-haves",
        "",
        "| Must-have | How |",
        "|---|---|",
        *[f"| {r['requirement']} | {r['what']} ({r['screen']}) |" for r in comp[:5]],
        "",
        "## Legal map",
        "",
        "Full table in [/compliance](/compliance) and `web/public/data/compliance.json`.",
        "",
        "| Rule | Source | Product |",
        "|---|---|---|",
        *[f"| {r['requirement']} | {r['source']} | {r['what']} |" for r in comp[5:]],
        "",
        "## Model cards",
        "",
        "- [WBGT rebuild](model-cards/wbgt-rebuild.md)",
        "- [Site Match checker](model-cards/site-match.md)",
        "- [Liquidity forecast](model-cards/liquidity-forecast.md)",
        "- [Receipt explainer](model-cards/explainer.md)",
        "- [Gap-fill](model-cards/gapfill.md)",
        "- [Station suggestion](model-cards/station-suggestion.md)",
        "- [Declaration flags](model-cards/declaration-anomaly.md)",
        "",
        "## Limits, stated plainly",
        "",
        f"- Heat history before Feb 2025 is a rebuild from ERA5. Held-out band agreement when NEA reads 31 to 34 C is {_pct(wc['band_agreement_31_34'])} (MAE {wc['mae']} C overall). Good enough for frequencies, not for single hours; payouts never use it.",
        f"- Rain history comes from MSS daily records through an estimator (window share {bt['rain_window_share']}, {bt['rain_window_share_basis']}).",
        "- Haze before 2025 is not in the back-test; pricing adds a 1.0 h haze load (assumption) and a 2015-like stress test.",
        f"- Basis risk: the named station is below 31.5 C while a nearest neighbour is above in {bt['basis_risk']['overall_pct']}% of work hours. The may-not-pay sentence says so before purchase; Site Match narrows it for big sites.",
        f"- Gap-fill near the thresholds agrees on the rest band only {_pct(ridge['band_agreement_31_34'])} of the time, so it never pays alone.",
        f"- The Site Match rider price ({_sgd(pr['site_match_rider']['year'], 2)} a year) rests on two assumptions (site uplift and filing rate) and must be tested on real contractor logs.",
        f"- Stop-loss at {_pct(re['chosen_attach'])} (team decision, 2026-11-15): the back-test never reaches it, so it is cheap catastrophe protection for years worse than history, such as a severe haze year. The lowest attachment inside the 5% budget would be {_pct(re['rule_suggests_attach'])}; it was considered and not chosen.",
        "- Translations are drafts for native-speaker review.",
        "",
        "## What the pilot must prove (300 firms, 6,000 workers, from April 2027)",
        "",
        f"1. Attach rate at WIC renewal and the share of firms that understand the cover (teach-back right first time). 2. Payout timing: every month settled by the 5th working day, pending hours resolved within 14 days. 3. Real loss ratio against the {_pct(pr['loss_ratios']['expected'])} expected. 4. Site Match on real contractor logs: honest approval rate and fraud catch. 5. Whether rest is actually taken (worker survey through the Migrant Workers' Centre). 6. Cash forecast coverage on live months. Pilot premium {_sgd(pr['pilot']['premium'])}, expected claims {_sgd(pr['pilot']['expected_claims'])}, hard cap {_sgd(pr['pilot']['hard_cap'])}; Income retains all in year one.",
        "",
        "## Ten hardest questions",
        "",
        "1. **Isn't this a bet on the weather?** No. MOM's rules make heat rest paid time and idle days paid, so the firm has a real wage loss. The benefit (S$8) sits below the idle-hour cost (about S$10.20, assumption), only declared outdoor workers count, and one policy per UEN.",
        f"2. **My site is hotter than the station. Why would I buy?** The sentence before purchase says you can lose time and get nothing. Basis risk is {bt['basis_risk']['overall_pct']}% of work hours on NEA data. Big sites already keep WBGT logs, and Site Match turns them into a checked top-up.",
        "3. **Can firms game it by stopping work?** No. The payout depends only on NEA readings, not on whether work stopped. Headcount is capped at the WIC declaration, which also raises the WIC premium.",
        "4. **Will employers pocket the money and not give rest?** Workers get the rule in their language, wages may not be cut, and the heat payout is forfeited in any month with an MOM heat enforcement action.",
        "5. **What if a station goes down?** The hour is pending, never no event. Backup station, regional median, then after 14 days the published regional advisory level. A model estimate is only proposed for human review.",
        f"6. **Is the price right with so little WBGT history?** It is a back-test of {len(b['years'])} years using NEA where it exists and a validated rebuild before that, plus a haze load. The price is reviewed every year as normals reset. The pilot is sized so Income can retain the risk.",
        f"7. **What does Income's finance team need on day one?** The cash call for each settlement: next one {cur['settlement_date']}, P50 {_sgd(cur['p50'])}, P90 {_sgd(cur['p90'])}, P99 {_sgd(cur['p99'])}. P90 coverage {_pct(lq['validation']['overall_p90_coverage'])} on past months.",
        f"8. **How bad can a year get?** Worst back-test year {b['worst_year']} at {_pct(pr['loss_ratios']['worst_backtest'])} loss ratio; a 2015-like haze year added on top gives {_pct(pr['loss_ratios']['worst_plus_haze_stress'])}. The hard cap is 60 h a worker ({_pct(pr['loss_ratios']['hard_cap'])}).",
        "9. **Where is the AI, and can it hurt a customer?** Upstream only. The payout is fixed arithmetic. AI reads site logs (and sends doubts to a person), explains receipts (numbers locked), proposes gap values (reviewed), flags declarations (flag only) and forecasts cash (never touches payouts). Every check gives a reason.",
        "10. **Does this need a change in the law or new hardware?** No. It sits on WIC, uses NEA's public stations and existing MOM rules, and is filed by Income as the licensed insurer.",
        "",
        "Concept prototype for Income Insurance, Singapore-India Hackathon 2026. Not an Income product. Fictional data.",
    ]
    return "\n".join(L) + "\n"


def run() -> None:
    (DOCS / "judge-pack.md").write_text(build())
    print(f"wrote {DOCS / 'judge-pack.md'}")


if __name__ == "__main__":
    run()
