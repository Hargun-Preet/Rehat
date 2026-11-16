"""Receipt explainer: plain English with locked numbers.

Template first. If an LLM is configured, it may rephrase, but every number in
its output must equal the numbers in the template (same multiset). Any
mismatch returns the template. "Why wasn't I paid?" is answered from the
receipt only. English is the only notice published until a native speaker has
reviewed each translation.
"""
from __future__ import annotations

import os
import re
from collections import Counter
from typing import Any, Callable

import requests

from rehat import product

LANGS = {"en": "English", "bn": "Bengali", "ta": "Tamil", "zh": "Mandarin", "my": "Burmese", "ms": "Malay"}
REVIEW_NOTE = product.get_product().copy_text("translation_badge")


def _worker_notices() -> dict[str, str]:
    """Return only reviewed worker-notice content.

    The product file owns the English wording. Other languages deliberately
    contain a review gate, rather than an unreviewed promise about a worker's
    rest or pay.
    """
    english = product.get_product().copy_text("worker_notice_en")
    return {lang: english if lang == "en" else REVIEW_NOTE for lang in LANGS}


WORKER_NOTICE = _worker_notices()
WORKER_NOTICE_STATUS = {lang: "available" if lang == "en" else "pending_native_review" for lang in LANGS}

WHY_NOT_EN = {
    "normal": "Your station's month stayed within the plan allowance, so there was nothing above the deductible to pay.",
    "pending": "Some hours are still pending because readings are missing. They are not counted as no event and will be settled when data arrives.",
    "cap": "You reached the cap of 20 insured hours this month or 60 this year.",
    "excluded": "This month is excluded: {reason}",
    "paid": "You were paid S${payout} this month.",
}

NUM = re.compile(r"\d+(?:[.,]\d+)*")


def numbers_in(text: str) -> Counter:
    return Counter(n.replace(",", "") for n in NUM.findall(text))


def _fields(receipt: dict[str, Any]) -> dict[str, str]:
    p = receipt["perils"]
    firm = receipt["firm"]
    plan_id = str(firm.get("plan", "")).lower()
    try:
        deductible = product.get_product().plan_by_id(plan_id).deductible_label
    except KeyError:
        # Historic receipts remain numerically reproducible. Their exported
        # customer copy is still neutral rather than repeating a retired term.
        deductible = str(firm.get("deductible_label") or "monthly allowance")
    return {
        "firm": firm["name"],
        "month": receipt["month"],
        "station": receipt["stations"]["primary"]["name"],
        "heat": f"{p['heat']['counted_h']:.2f}", "heat_allow": f"{p['heat']['allowance_h']:.2f}", "heat_ins": f"{p['heat']['insured_h']:.2f}",
        "rain": f"{p['rain']['counted_h']:.2f}", "rain_allow": f"{p['rain']['allowance_h']:.2f}", "rain_ins": f"{p['rain']['insured_h']:.2f}",
        "haze": f"{p['haze']['counted_h']:.2f}",
        "total": f"{receipt['insured_after_caps_h']:.2f}",
        "benefit": f"{firm['benefit_sgd']:g}",
        "workers": str(firm["outdoor_workers"]),
        "payout": f"{receipt['payout_sgd']:,.0f}",
        "date": receipt["settlement_date"],
        "deductible": deductible,
    }


def template(receipt: dict[str, Any], lang: str = "en") -> str:
    """Return reviewed English receipt text, or a clear native-review gate."""
    if lang not in LANGS:
        raise KeyError(f"Unknown language: {lang}")
    f = _fields(receipt)
    english = " ".join([
        "{firm}, {month}. Heat station: {station}.",
        "Heat rest owed: {heat} h a worker. Your {deductible}: {heat_allow} h. Insured: {heat_ins} h.",
        "Heavy rain: {rain} h a worker. Your {deductible}: {rain_allow} h. Insured: {rain_ins} h.",
        "Haze: {haze} h.",
        "Total {total} h x S${benefit} x {workers} workers = S${payout}. PayNow to your UEN by {date}.",
    ]).format(**f)
    if lang == "en":
        return english
    return f"{REVIEW_NOTE} {LANGS[lang]} receipt explanation is unavailable until review. English explanation: {english}"


def numbers_match(candidate: str, reference: str) -> bool:
    return numbers_in(candidate) == numbers_in(reference)


def openai_rephrase(text: str, lang: str) -> str | None:
    """Optional LLM rephrase. Model name is configurable (OPENAI_MODEL); unverified default."""
    key = os.getenv("OPENAI_API_KEY")
    if not key:
        return None
    try:
        r = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {key}"},
            json={"model": os.getenv("OPENAI_MODEL", "gpt-4o-mini"), "temperature": 0.2, "messages": [
                {"role": "system", "content": f"Rewrite this insurance receipt in plain, friendly {LANGS[lang]} for a small business owner. Keep every number exactly as written. Do not add numbers. No dashes."},
                {"role": "user", "content": text}]},
            timeout=20,
        )
        return r.json()["choices"][0]["message"]["content"]
    except Exception:  # noqa: BLE001
        return None


def explain(receipt: dict[str, Any], lang: str = "en", rephrase: Callable[[str, str], str | None] | None = openai_rephrase) -> dict[str, Any]:
    """Return the explanation and where it came from. Numbers are locked to the receipt."""
    base = template(receipt, lang)
    if lang != "en":
        return {
            "text": base,
            "source": "withheld_pending_native_review",
            "numbers_checked": True,
            "note": REVIEW_NOTE,
            "translation_status": "pending_native_review",
        }
    if rephrase is not None:
        cand = rephrase(base, lang)
        if cand:
            if numbers_match(cand, base):
                return {"text": cand, "source": "llm", "numbers_checked": True, "note": REVIEW_NOTE if lang != "en" else ""}
            return {"text": base, "source": "template", "numbers_checked": True, "rejected_llm": True,
                    "reason": "The rephrased text changed a number, so the template is shown.", "note": REVIEW_NOTE if lang != "en" else ""}
    return {"text": base, "source": "template", "numbers_checked": True, "note": REVIEW_NOTE if lang != "en" else ""}


def why_not_paid(receipt: dict[str, Any], lang: str = "en") -> str:
    """Answer 'why wasn't I paid this month?' from the receipt only."""
    if lang not in LANGS:
        raise KeyError(f"Unknown language: {lang}")
    w = WHY_NOT_EN
    out = []
    ex = [e for e in receipt.get("exclusions", []) if e["applies_to"] == "all"]
    if ex:
        out.append(w["excluded"].format(reason=ex[0]["reason"]))
    p = receipt["perils"]
    if receipt["payout_sgd"] > 0:
        out.append(w["paid"].format(payout=f"{receipt['payout_sgd']:,.0f}"))
    elif not ex and all(p[k]["insured_h"] == 0 for k in ("heat", "rain")) and p["haze"]["counted_h"] == 0:
        out.append(w["normal"])
    if p["heat"].get("pending_hours") or p["rain"].get("pending_hours") or p["haze"].get("pending_days"):
        out.append(w["pending"])
    if receipt["insured_after_caps_h"] < receipt["insured_before_caps_h"]:
        out.append(w["cap"])
    answer = " ".join(out)
    if lang == "en":
        return answer
    return f"{REVIEW_NOTE} English explanation: {answer}"
