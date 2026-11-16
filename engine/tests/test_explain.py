import pytest

from rehat import explain, product

RECEIPT = {
    "firm": {"name": "Lim Landscaping Pte Ltd", "outdoor_workers": 20, "benefit_sgd": 8.0, "plan": "standard"},
    "month": "2026-05",
    "stations": {"primary": {"name": "Bishan Stadium"}},
    "perils": {"heat": {"counted_h": 1.69, "allowance_h": 1.25, "insured_h": 0.44, "pending_hours": 0},
               "rain": {"counted_h": 9.0, "allowance_h": 6.25, "insured_h": 2.75, "pending_hours": 0},
               "haze": {"counted_h": 0.0, "pending_days": 0}},
    "insured_before_caps_h": 3.19, "insured_after_caps_h": 3.19, "payout_sgd": 510.0, "settlement_date": "2026-06-08",
    "exclusions": [],
}


@pytest.mark.parametrize("lang", list(explain.LANGS))
def test_template_in_every_language_has_the_receipt_numbers(lang: str) -> None:
    t = explain.template(RECEIPT, lang)
    for n in ("1.69", "1.25", "9.00", "6.25", "0.00", "3.19", "510", "8 June 2026"):
        assert n in t, (lang, n)


def test_english_template_is_two_plain_sentences() -> None:
    assert explain.template(RECEIPT, "en") == (
        "Lim Landscaping Pte Ltd had 1.69 heat-rest hours, 9.00 heavy-rain hours and 0.00 haze hours for each worker in 2026-05 at Bishan Stadium. "
        "After its 1.25-hour heat and 6.25-hour rain deductibles, 3.19 insured hours mean Rehat will pay S$510 to its UEN by PayNow on 8 June 2026."
    )


def test_llm_with_changed_number_is_refused() -> None:
    def bad(text: str, lang: str) -> str:
        return text.replace("510", "520")

    out = explain.explain(RECEIPT, "en", rephrase=bad)
    assert out["source"] == "template" and out["rejected_llm"]
    assert "S$510" in out["text"] and "520" not in out["text"]


def test_llm_with_dropped_number_is_refused() -> None:
    out = explain.explain(RECEIPT, "en", rephrase=lambda t, l: "You get some money soon.")
    assert out["source"] == "template"


def test_llm_with_added_number_is_refused() -> None:
    out = explain.explain(RECEIPT, "en", rephrase=lambda t, l: t + " Call 6788 1777.")
    assert out["source"] == "template"


def test_llm_rephrase_with_same_numbers_is_used() -> None:
    def good(text: str, lang: str) -> str:
        return text.replace(" had ", " recorded ", 1).replace("will pay", "pays")

    out = explain.explain(RECEIPT, "en", rephrase=good)
    assert out["source"] == "llm"
    assert "recorded" in out["text"]


def test_non_english_receipt_is_withheld_pending_native_review() -> None:
    out = explain.explain(RECEIPT, "ms", rephrase=None)
    assert out["source"] == "withheld_pending_native_review"
    assert out["translation_status"] == "pending_native_review"
    assert explain.REVIEW_NOTE in out["text"]


def test_why_not_paid_from_receipt_only() -> None:
    r = dict(RECEIPT, payout_sgd=0.0, insured_after_caps_h=0.0, insured_before_caps_h=0.0,
             perils={**RECEIPT["perils"], "heat": {**RECEIPT["perils"]["heat"], "insured_h": 0.0, "pending_hours": 3},
                     "rain": {**RECEIPT["perils"]["rain"], "insured_h": 0.0}})
    a = explain.why_not_paid(r, "en")
    assert "plan deductible" in a and "pending" in a


def test_paid_receipt_states_when_the_payment_is_due() -> None:
    assert explain.why_not_paid(RECEIPT, "en") == "Your payment of S$510 is due by PayNow on 8 June 2026."


def test_worker_notice_uses_canonical_english_and_gates_other_languages() -> None:
    assert set(explain.WORKER_NOTICE) == {"en", "bn", "ta", "zh", "my", "ms"}
    assert explain.WORKER_NOTICE["en"] == product.get_product().copy_text("worker_notice_en")
    for lang in set(explain.WORKER_NOTICE) - {"en"}:
        assert explain.WORKER_NOTICE[lang] == explain.REVIEW_NOTE
        assert explain.WORKER_NOTICE_STATUS[lang] == "pending_native_review"
