"""Receipt explainer: plain language in six languages, with numbers locked.

Template first. If an LLM is configured, it may rephrase, but every number in its output must equal the numbers in the
template (same multiset). Any mismatch returns the template. "Why wasn't I paid?" is answered from the receipt only.
Translations are drafts for native-speaker review.
"""
from __future__ import annotations

import os
import re
from collections import Counter
from typing import Any, Callable

import requests

LANGS = {"en": "English", "bn": "Bengali", "ta": "Tamil", "zh": "Mandarin", "my": "Burmese", "ms": "Malay"}
REVIEW_NOTE = "Translations pending native-speaker review."

TEMPLATES: dict[str, list[str]] = {
    "en": [
        "{firm}, {month}. Heat station: {station}.",
        "Heat rest owed: {heat} h a worker. Your normal month plus 25%: {heat_allow} h. Paid: {heat_ins} h.",
        "Heavy rain: {rain} h a worker. Normal month plus 25%: {rain_allow} h. Paid: {rain_ins} h.",
        "Haze: {haze} h.",
        "Total {total} h x S${benefit} x {workers} workers = S${payout}. PayNow to your UEN by {date}.",
    ],
    "ms": [
        "{firm}, {month}. Stesen haba: {station}.",
        "Rehat haba yang wajib: {heat} jam setiap pekerja. Bulan biasa anda tambah 25%: {heat_allow} jam. Dibayar: {heat_ins} jam.",
        "Hujan lebat: {rain} jam setiap pekerja. Bulan biasa tambah 25%: {rain_allow} jam. Dibayar: {rain_ins} jam.",
        "Jerebu: {haze} jam.",
        "Jumlah {total} jam x S${benefit} x {workers} pekerja = S${payout}. PayNow ke UEN anda sebelum {date}.",
    ],
    "zh": [
        "{firm}，{month}。高温监测站：{station}。",
        "应给的高温休息：每名工人 {heat} 小时。正常月份加 25%：{heat_allow} 小时。赔付：{heat_ins} 小时。",
        "大雨：每名工人 {rain} 小时。正常月份加 25%：{rain_allow} 小时。赔付：{rain_ins} 小时。",
        "烟霾：{haze} 小时。",
        "合计 {total} 小时 x S${benefit} x {workers} 名工人 = S${payout}。将于 {date} 前通过 PayNow 付至贵公司 UEN。",
    ],
    "ta": [
        "{firm}, {month}. வெப்ப நிலையம்: {station}.",
        "கட்டாய வெப்ப ஓய்வு: ஒரு தொழிலாளருக்கு {heat} மணி. வழக்கமான மாதம் கூடுதல் 25%: {heat_allow} மணி. செலுத்தப்பட்டது: {heat_ins} மணி.",
        "கனமழை: ஒரு தொழிலாளருக்கு {rain} மணி. வழக்கமான மாதம் கூடுதல் 25%: {rain_allow} மணி. செலுத்தப்பட்டது: {rain_ins} மணி.",
        "புகைமூட்டம்: {haze} மணி.",
        "மொத்தம் {total} மணி x S${benefit} x {workers} தொழிலாளர்கள் = S${payout}. {date} க்குள் உங்கள் UEN-க்கு PayNow மூலம்.",
    ],
    "bn": [
        "{firm}, {month}। তাপ স্টেশন: {station}।",
        "বাধ্যতামূলক তাপ বিশ্রাম: প্রতি শ্রমিক {heat} ঘণ্টা। স্বাভাবিক মাসের চেয়ে 25% বেশি: {heat_allow} ঘণ্টা। পরিশোধ: {heat_ins} ঘণ্টা।",
        "ভারী বৃষ্টি: প্রতি শ্রমিক {rain} ঘণ্টা। স্বাভাবিক মাসের চেয়ে 25% বেশি: {rain_allow} ঘণ্টা। পরিশোধ: {rain_ins} ঘণ্টা।",
        "ধোঁয়াশা: {haze} ঘণ্টা।",
        "মোট {total} ঘণ্টা x S${benefit} x {workers} জন শ্রমিক = S${payout}। {date} এর মধ্যে আপনার UEN-এ PayNow।",
    ],
    "my": [
        "{firm}, {month}။ အပူချိန်စခန်း - {station}။",
        "ပေးရမည့် အပူအနားယူချိန် - အလုပ်သမားတစ်ဦးလျှင် {heat} နာရီ။ ပုံမှန်လ + 25% - {heat_allow} နာရီ။ ပေးချေ - {heat_ins} နာရီ။",
        "မိုးသည်းထန် - အလုပ်သမားတစ်ဦးလျှင် {rain} နာရီ။ ပုံမှန်လ + 25% - {rain_allow} နာရီ။ ပေးချေ - {rain_ins} နာရီ။",
        "မြူခိုး - {haze} နာရီ။",
        "စုစုပေါင်း {total} နာရီ x S${benefit} x အလုပ်သမား {workers} ဦး = S${payout}။ {date} မတိုင်မီ သင့် UEN သို့ PayNow ဖြင့်။",
    ],
}

WHY_NOT: dict[str, dict[str, str]] = {
    "en": {"normal": "Your station's month stayed within its normal range plus 25%, so there was nothing above the allowance to pay.",
           "pending": "Some hours are still pending because readings are missing. They are not counted as no event and will be settled when data arrives.",
           "cap": "You reached the cap of 20 insured hours this month or 60 this year.",
           "excluded": "This month is excluded: {reason}",
           "paid": "You were paid S${payout} this month."},
    "ms": {"normal": "Bulan di stesen anda kekal dalam julat biasa tambah 25%, jadi tiada jam melebihi elaun untuk dibayar.",
           "pending": "Sesetengah jam masih menunggu kerana bacaan tiada. Ia tidak dikira sebagai tiada kejadian dan akan diselesaikan apabila data tiba.",
           "cap": "Anda telah mencapai had 20 jam sebulan atau 60 jam setahun.",
           "excluded": "Bulan ini dikecualikan: {reason}",
           "paid": "Anda dibayar S${payout} bulan ini."},
    "zh": {"normal": "贵公司监测站本月仍在正常范围加 25% 之内，因此没有超出额度的小时可以赔付。",
           "pending": "部分小时因缺少读数仍在待定中。这不算作没有发生，数据到达后会结算。",
           "cap": "本月已达 20 小时上限，或本年已达 60 小时上限。",
           "excluded": "本月不在保障范围内：{reason}",
           "paid": "本月已赔付 S${payout}。"},
    "ta": {"normal": "உங்கள் நிலையத்தின் இந்த மாதம் வழக்கமான அளவு கூடுதல் 25%-க்குள் இருந்தது, எனவே செலுத்த எதுவும் இல்லை.",
           "pending": "சில மணிநேரங்கள் அளவீடுகள் இல்லாததால் நிலுவையில் உள்ளன. தரவு வந்ததும் தீர்க்கப்படும்.",
           "cap": "இந்த மாதம் 20 மணி அல்லது இந்த ஆண்டு 60 மணி வரம்பை அடைந்துவிட்டீர்கள்.",
           "excluded": "இந்த மாதம் விலக்கப்பட்டுள்ளது: {reason}",
           "paid": "இந்த மாதம் S${payout} செலுத்தப்பட்டது."},
    "bn": {"normal": "আপনার স্টেশনের এই মাস স্বাভাবিক সীমা ও 25% এর মধ্যে ছিল, তাই পরিশোধের মতো কিছু নেই।",
           "pending": "কিছু ঘণ্টা রিডিং না থাকায় এখনো অপেক্ষমাণ। তথ্য এলে নিষ্পত্তি হবে।",
           "cap": "এই মাসে 20 ঘণ্টা বা এই বছরে 60 ঘণ্টার সীমা পূর্ণ হয়েছে।",
           "excluded": "এই মাস বাদ: {reason}",
           "paid": "এই মাসে S${payout} পরিশোধ করা হয়েছে।"},
    "my": {"normal": "သင့်စခန်း၏ ဤလသည် ပုံမှန် + 25% အတွင်းသာ ရှိသဖြင့် ပေးချေရန် မရှိပါ။",
           "pending": "ဖတ်ချက်များ မရှိသေးသဖြင့် နာရီအချို့ ဆိုင်းငံ့ထားသည်။ ဒေတာရောက်လျှင် ဖြေရှင်းမည်။",
           "cap": "ဤလ 20 နာရီ သို့မဟုတ် ဤနှစ် 60 နာရီ ကန့်သတ်ချက်သို့ ရောက်ပြီ။",
           "excluded": "ဤလ မပါဝင်ပါ - {reason}",
           "paid": "ဤလ S${payout} ပေးချေပြီး။"},
}

WORKER_NOTICE = {
    "en": "WBGT is 32 now. By MOM rule you get 10 min paid rest in shade every hour. Your pay is not cut.",
    "bn": "এখন WBGT 32। MOM নিয়ম অনুযায়ী প্রতি ঘণ্টায় ছায়ায় 10 মিনিট বেতনসহ বিশ্রাম পাবেন। আপনার বেতন কাটা হবে না।",
    "ta": "இப்போது WBGT 32. MOM விதிப்படி ஒவ்வொரு மணி நேரமும் நிழலில் 10 நிமிடம் ஊதியத்துடன் ஓய்வு உண்டு. உங்கள் ஊதியம் குறைக்கப்படாது.",
    "zh": "现在 WBGT 为 32。根据人力部规定，每小时您可在阴凉处带薪休息 10 分钟。您的工资不会被扣。",
    "my": "ယခု WBGT 32 ဖြစ်သည်။ MOM စည်းမျဉ်းအရ နာရီတိုင်း အရိပ်တွင် လစာပါ 10 မိနစ် အနားယူခွင့်ရှိသည်။ သင့်လစာ မဖြတ်ပါ။",
    "ms": "WBGT kini 32. Mengikut peraturan MOM, anda dapat rehat bergaji 10 minit di tempat teduh setiap jam. Gaji anda tidak dipotong.",
}

NUM = re.compile(r"\d+(?:[.,]\d+)*")


def numbers_in(text: str) -> Counter:
    return Counter(n.replace(",", "") for n in NUM.findall(text))


def _fields(receipt: dict[str, Any]) -> dict[str, str]:
    p = receipt["perils"]
    return {
        "firm": receipt["firm"]["name"],
        "month": receipt["month"],
        "station": receipt["stations"]["primary"]["name"],
        "heat": f"{p['heat']['counted_h']:.2f}", "heat_allow": f"{p['heat']['allowance_h']:.2f}", "heat_ins": f"{p['heat']['insured_h']:.2f}",
        "rain": f"{p['rain']['counted_h']:.2f}", "rain_allow": f"{p['rain']['allowance_h']:.2f}", "rain_ins": f"{p['rain']['insured_h']:.2f}",
        "haze": f"{p['haze']['counted_h']:.2f}",
        "total": f"{receipt['insured_after_caps_h']:.2f}",
        "benefit": f"{receipt['firm']['benefit_sgd']:g}",
        "workers": str(receipt["firm"]["outdoor_workers"]),
        "payout": f"{receipt['payout_sgd']:,.0f}",
        "date": receipt["settlement_date"],
    }


def template(receipt: dict[str, Any], lang: str = "en") -> str:
    f = _fields(receipt)
    return " ".join(line.format(**f) for line in TEMPLATES[lang])


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
    w = WHY_NOT[lang]
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
    return " ".join(out)
