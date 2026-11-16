"""Single source for headline numbers.

Reads the engine outputs (backtest, pricing, liquidity, sitematch JSON in data/processed), writes
`web/public/data/numbers.json` for the UI and rewrites the generated block in CONTEXT.md section 5, so the deck,
the app and CONTEXT.md show one version of each number.
"""
from __future__ import annotations

import json
import re
from datetime import datetime
from typing import Any

from rehat.paths import PROCESSED, ROOT, WEB_DATA

BEGIN = "<!-- BEGIN GENERATED NUMBERS (python -m rehat.numbers; do not edit by hand) -->"
END = "<!-- END GENERATED NUMBERS -->"


def _load(name: str) -> dict[str, Any] | None:
    p = PROCESSED / f"{name}.json"
    return json.loads(p.read_text()) if p.exists() else None


def collect() -> dict[str, Any]:
    out: dict[str, Any] = {"generated_at": datetime.now().isoformat(timespec="minutes")}
    bt = _load("backtest")
    if bt:
        b = bt["base"]
        # The generated pilot book is intentionally a geographic-mix
        # diagnostic. Keep customer/pitch headline numbers on the approved
        # Standard calibration, while retaining diagnostic fields separately.
        published = bt.get("published_calibration")
        if not isinstance(published, dict):
            published = b
        portfolio = bt.get("portfolio_diagnostic")
        if not isinstance(portfolio, dict):
            portfolio = {}
        out["backtest"] = {
            "scope": published.get("scope", "Published Standard pricing calibration."),
            "expected_insured_h": published["expected_insured_h"],
            "expected_payout_standard": published["expected_payout"],
            "loss_ratio_mean_at_standard_price": published.get("observed_loss_ratio", b["loss_ratio_mean"]),
            "loss_ratio_1in10_at_standard_price": published.get("one_in_ten_loss_ratio", b["loss_ratio_1in10"]),
            "payout_1in10": published.get("one_in_ten_payout", b["payout_1in10"]),
            "worst_year": b["worst_year"],
            "worst_payout": published.get("worst_payout", b["worst_payout"]),
            "zero_payout_years_book": b["zero_payout_years_book"],
            "zero_payout_years_avg_firm": b["zero_payout_years_avg_firm"],
            "years": len(b["years"]),
            "first_year": b["years"][0],
            "last_year": b["years"][-1],
            "pct_months_paying": b["pct_months_paying"],
            "basis_risk_pct": bt["basis_risk"]["overall_pct"],
            "rain_window_share": bt["rain_window_share"],
            "rain_window_share_basis": bt["rain_window_share_basis"],
            "changi_rain_days_10mm_mean": bt["changi_long_view"]["rain_days_10mm_mean"],
            "portfolio_diagnostic": {
                "scope": portfolio.get("scope", "Geographic-mix portfolio diagnostic."),
                "firms": portfolio.get("firms"),
                "expected_insured_h": b["expected_insured_h"],
                "expected_payout_standard": b["expected_payout"],
                "loss_ratio_mean_at_standard_price": b["loss_ratio_mean"],
            },
        }
    # The Site Match analysis is intentionally contained within Labs. It does
    # not belong in the core product's headline-number feed.
    for name in ("pricing", "liquidity"):
        d = _load(name)
        if d and "headline" in d:
            out[name] = d["headline"]
    return out


def _md(n: dict[str, Any]) -> str:
    lines = [BEGIN, "", f"Generated {n['generated_at']} from engine outputs. Source files: data/processed/*.json.", ""]
    if "backtest" in n:
        b = n["backtest"]
        lines += [
            f"**Published Standard calibration ({b['first_year']} to {b['last_year']}, 1 worker)**",
            "",
            "| Item | Value | Basis |",
            "|---|---|---|",
            f"| Expected insured hours | {b['expected_insured_h']} a worker a year | approved pricing calibration; see product.json basis |",
            f"| Expected payout | S${b['expected_payout_standard']} a worker a year | insured hours x S$8 |",
            f"| 1-in-10 payout | S${b['payout_1in10']} a worker | published Standard calibration |",
            f"| Worst back-test payout | S${b['worst_payout']} | published Standard calibration |",
            f"| Zero-payout years | {b['zero_payout_years_book']} of {b['years']} (book); {b['zero_payout_years_avg_firm']} for the average firm | |",
            f"| Months paying something | {b['pct_months_paying']}% | |",
            f"| Basis risk | {b['basis_risk_pct']}% of window hours | named station below 31.5 C while a nearest neighbour is at 31.5+ (NEA observed) |",
            f"| Rain hours in window share | {b['rain_window_share']} | {b['rain_window_share_basis']} |",
            f"| Changi rain days 10 mm+ | {b['changi_rain_days_10mm_mean']} a year (1983 to 2018) | MSS daily, matches proxy 61.4 |",
            "",
            "**Pilot geographic-mix diagnostic (capital and cash only, not a price calibration)**",
            "",
            "| Item | Value |",
            "|---|---|",
            f"| Scope | {b['portfolio_diagnostic']['scope']} |",
            f"| Generated pilot firms | {b['portfolio_diagnostic']['firms']} |",
            f"| Expected insured hours | {b['portfolio_diagnostic']['expected_insured_h']} a worker a year |",
            f"| Expected payout | S${b['portfolio_diagnostic']['expected_payout_standard']} a worker a year |",
            "",
        ]
    for name, title in (("pricing", "Pricing"), ("liquidity", "Liquidity")):
        if name in n:
            lines += [f"**{title}**", "", "| Item | Value |", "|---|---|"]
            lines += [f"| {k} | {v} |" for k, v in n[name].items()]
            lines.append("")
    lines.append(END)
    return "\n".join(lines)


def write() -> dict[str, Any]:
    n = collect()
    WEB_DATA.mkdir(parents=True, exist_ok=True)
    (WEB_DATA / "numbers.json").write_text(json.dumps(n, indent=1))
    ctx = ROOT / "CONTEXT.md"
    s = ctx.read_text()
    block = _md(n)
    if BEGIN in s:
        s = re.sub(re.escape(BEGIN) + r".*?" + re.escape(END), lambda _: block, s, flags=re.S)
    else:
        anchor = "## 6. Evidence and data"
        s = s.replace(anchor, block + "\n\n" + anchor)
    ctx.write_text(s)
    return n


if __name__ == "__main__":
    print(json.dumps(write(), indent=1)[:2000])
