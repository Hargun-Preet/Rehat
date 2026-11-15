"""Rehat product rules as pure functions.

Each function quotes the CONTEXT.md section 4 term it implements. No model output enters here.
States: TRIGGERED, NOT_TRIGGERED, PENDING. Missing data is NEVER "no event".
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta
from typing import Iterable, Literal, Sequence

State = Literal["TRIGGERED", "NOT_TRIGGERED", "PENDING"]
TRIGGERED: State = "TRIGGERED"
NOT_TRIGGERED: State = "NOT_TRIGGERED"
PENDING: State = "PENDING"

# ---------------------------------------------------------------- plan terms (CONTEXT.md section 4)
BENEFIT = {"Lite": 5.0, "Standard": 8.0}
ALLOWANCE_MULTIPLE = 1.25
MONTHLY_CAP_H = 20.0
YEARLY_CAP_H = 60.0
HAZE_YEARLY_LIMIT_H = 20.0
SITE_MATCH_YEARLY_CAP_H = 10.0
WINDOW_START_H = 8
WINDOW_END_H = 18
DEFAULT_MEAL_HOUR = 12
WAITING_DAYS_MIDTERM = 14
FALLBACK_REVIEW_AFTER_DAYS = 2   # "pending hours wait up to 48 h for a backup station"
FALLBACK_SETTLE_AFTER_DAYS = 14  # "after 14 days settle at published regional advisory level"
RAIN_MIN_VALID_5MIN = 9          # decision: 9 of 12 five-minute totals, mirrors heat's 3 of 4


def _valid(x: float | None) -> bool:
    return x is not None and not (isinstance(x, float) and math.isnan(x))


# ---------------------------------------------------------------- heat
def heat_rest_minutes(hourly_mean_wbgt: float) -> int:
    """Heat meter: "31.5 to 31.9: 5 min (near-miss tier). 32.0 to 32.9: 10 min. 33.0+: 15 min".

    Compared on the unrounded hourly mean, so 31.99 is in the 5-minute tier and 32.0 in the 10-minute tier.
    """
    v = hourly_mean_wbgt
    if v >= 33.0:
        return 15
    if v >= 32.0:
        return 10
    if v >= 31.5:
        return 5
    return 0


def hourly_wbgt_state(four_readings: Sequence[float | None]) -> tuple[float | None, State]:
    """Heat meter: "Hourly mean of the four 15-min WBGT readings (needs 3 of 4 valid, else pending)"."""
    vals = [float(x) for x in four_readings if _valid(x)]
    if len(vals) < 3:
        return None, PENDING
    mean = sum(vals) / len(vals)
    return mean, (TRIGGERED if heat_rest_minutes(mean) > 0 else NOT_TRIGGERED)


# ---------------------------------------------------------------- rain
def rain_hours(clock_hour_mm: float) -> float:
    """Rain meter: "Clock-hour total at the named rain gauge. 2.5 to 9.9 mm: 0.5 h. 10 mm+: 1 h"."""
    if clock_hour_mm >= 10.0:
        return 1.0
    if clock_hour_mm >= 2.5:
        return 0.5
    return 0.0


def hourly_rain_state(five_min_mm: Sequence[float | None]) -> tuple[float | None, State]:
    """Clock-hour rain total from twelve 5-minute totals.

    Needs 9 of 12 valid totals (decision, mirrors heat's 3 of 4). If fewer are valid but the partial sum
    already reaches 10 mm, the top tier is certain and the hour is TRIGGERED. Otherwise PENDING.
    """
    vals = [float(x) for x in five_min_mm if _valid(x)]
    total = sum(vals)
    if len(vals) < RAIN_MIN_VALID_5MIN:
        if total >= 10.0:
            return total, TRIGGERED
        return None, PENDING
    return total, (TRIGGERED if rain_hours(total) > 0 else NOT_TRIGGERED)


# ---------------------------------------------------------------- haze
def haze_tier_hours(psi_24h: float) -> int:
    """Haze meter tiers: "101 to 200: 1 h ... 201 to 300: 3 h. 300+: 6 h". 300 itself is in the 201 to 300 tier."""
    if psi_24h > 300:
        return 6
    if psi_24h > 200:
        return 3
    if psi_24h > 100:
        return 1
    return 0


@dataclass
class HazeDay:
    day: date
    psi_noon: float | None
    hours: float
    state: State
    streak: int | None
    note: str


def haze_hours(
    daily_noon_psi_series: Iterable[tuple[date, float | None]],
    used_this_year_h: float = 0.0,
    yearly_limit_h: float = HAZE_YEARLY_LIMIT_H,
) -> list[HazeDay]:
    """Haze meter: "NEA 24-hour PSI for the region at 12:00. 101 to 200: 1 h, from the 3rd consecutive day.
    201 to 300: 3 h. 300+: 6 h. Haze limit 20 h a year. No allowance for haze".

    Consecutive = calendar days with noon PSI above 100 (PSI is published every day). Hours are paid only on
    working days (Mon to Sat). A missing day makes the streak unknown: a 101-200 day that would be the 3rd day
    only if the missing day was hazy is PENDING, never NOT_TRIGGERED.
    """
    out: list[HazeDay] = []
    lo = hi = 0  # streak assuming missing days were clear (lo) or hazy (hi)
    used = used_this_year_h
    for d, psi in sorted(daily_noon_psi_series, key=lambda x: x[0]):
        working = d.weekday() < 6
        if not _valid(psi):
            hi += 1
            lo = 0
            out.append(HazeDay(d, None, 0.0, PENDING if working else NOT_TRIGGERED, None, "PSI reading missing"))
            continue
        assert psi is not None
        if psi > 100:
            lo += 1
            hi += 1
        else:
            lo = hi = 0
        tier = haze_tier_hours(psi)
        if not working:
            out.append(HazeDay(d, psi, 0.0, NOT_TRIGGERED, lo, "Sunday, outside the insured window"))
            continue
        if tier == 0:
            out.append(HazeDay(d, psi, 0.0, NOT_TRIGGERED, lo, "PSI 100 or below"))
            continue
        if tier == 1 and lo < 3:
            if hi >= 3:
                out.append(HazeDay(d, psi, 0.0, PENDING, lo, "3rd hazy day depends on a missing reading"))
            else:
                out.append(HazeDay(d, psi, 0.0, NOT_TRIGGERED, lo, f"day {lo} of PSI 101 to 200; pays from day 3"))
            continue
        room = max(0.0, yearly_limit_h - used)
        h = min(float(tier), room)
        used += h
        note = f"PSI {psi:.0f}: {tier} h" + ("" if h == tier else f", cut to {h:g} h by the 20 h yearly haze limit")
        out.append(HazeDay(d, psi, h, TRIGGERED, lo, note))
    return out


# ---------------------------------------------------------------- window
def in_window(ts: datetime, meal_hour: int | None = DEFAULT_MEAL_HOUR) -> bool:
    """Window: "Mon to Sat, 08:00 to 18:00, minus the declared unpaid meal hour (default 12:00 to 13:00)".

    `ts` is the start of a clock hour (or any time inside it).
    """
    if ts.weekday() == 6:
        return False
    if not (WINDOW_START_H <= ts.hour < WINDOW_END_H):
        return False
    if meal_hour is not None and ts.hour == meal_hour:
        return False
    return True


# ---------------------------------------------------------------- fallback ladder
@dataclass
class FallbackResult:
    value: float | None
    source: str
    state: State
    pays: bool
    note: str


def fallback(
    primary: float | None,
    backup: float | None,
    regional_median: float | None,
    model_estimate: float | None,
    days_since: float,
    regional_advisory: float | None = None,
    classify=lambda v: heat_rest_minutes(v) > 0,
) -> FallbackResult:
    """Fallback ladder: "Primary (3 of 4 readings) > backup station > regional median > labelled model estimate >
    after 14 days settle at published regional advisory level".

    Inputs are already-valid hourly values or None. The model estimate never pays on its own: after 48 h it is
    proposed with a label and sent for review, and the hour stays PENDING. After 14 days the hour settles at the
    published regional advisory level. If none of that exists, the hour stays PENDING.
    """

    def judged(v: float, source: str, note: str) -> FallbackResult:
        return FallbackResult(v, source, TRIGGERED if classify(v) else NOT_TRIGGERED, True, note)

    if _valid(primary):
        return judged(float(primary), "primary", "Named station")  # type: ignore[arg-type]
    if _valid(backup):
        return judged(float(backup), "backup", "Named backup station (primary missing)")  # type: ignore[arg-type]
    if _valid(regional_median):
        return judged(float(regional_median), "regional_median", "Median of stations in the region")  # type: ignore[arg-type]
    if days_since >= FALLBACK_SETTLE_AFTER_DAYS and _valid(regional_advisory):
        return judged(float(regional_advisory), "regional_advisory", "Settled at NEA regional advisory level after 14 days")  # type: ignore[arg-type]
    if days_since >= FALLBACK_REVIEW_AFTER_DAYS and _valid(model_estimate):
        return FallbackResult(float(model_estimate), "model_estimate", PENDING, False, "Model estimate proposed, sent for human review. Not paid on its own.")  # type: ignore[arg-type]
    return FallbackResult(None, "none", PENDING, False, "No reading yet. Waiting for data.")


# ---------------------------------------------------------------- allowance and caps
def allowance(normal_hours: float, multiple: float = ALLOWANCE_MULTIPLE) -> float:
    """Allowance: "Heat and rain each: station's normal for that calendar month x 1.25"."""
    return normal_hours * multiple


def insured_hours(counted: float, allowance_h: float) -> float:
    """Allowance: "Only hours above it are insured"."""
    return max(0.0, counted - allowance_h)


def apply_caps(month_hours: float, year_to_date: float, monthly: float = MONTHLY_CAP_H, yearly: float = YEARLY_CAP_H) -> float:
    """Caps: "20 insured hours a month, 60 a year". `year_to_date` is insured hours already paid this policy year."""
    return max(0.0, min(month_hours, monthly, yearly - year_to_date))


# ---------------------------------------------------------------- exclusions
@dataclass
class FirmStatus:
    wic_active: bool = True
    is_sme: bool = True
    sector: str = "construction"  # construction | landscaping | cleaning | shipyard | process_plant
    mom_heat_action_months: set[str] = field(default_factory=set)  # "YYYY-MM"
    cover_start: date | None = None
    added_midterm: bool = False


EXCLUDED_SECTORS = {"shipyard", "process_plant"}


@dataclass
class Exclusion:
    code: str
    applies_to: str  # "all" | "heat" | "dates_before"
    reason: str
    until: date | None = None


def exclusions(firm: FirmStatus, month: str) -> list[Exclusion]:
    """Exclusions: "Indoor workers; hours outside window; workers not on the WIC declaration; lapsed WIC; shipyards,
    process plants, firms above SME limit; the heat payout for any month with an MOM heat enforcement action;
    actual losses above the benefit". Plus "14-day wait if added mid-term".

    Indoor workers and undeclared workers are excluded by construction (headcount = declared outdoor workers).
    Hours outside the window are excluded by `in_window`.
    """
    out: list[Exclusion] = []
    if not firm.wic_active:
        out.append(Exclusion("WIC_LAPSED", "all", "Your Work Injury Compensation policy was not active, so Rehat cannot pay."))
    if firm.sector in EXCLUDED_SECTORS:
        out.append(Exclusion("SECTOR", "all", f"Firms in the {firm.sector.replace('_', ' ')} sector are not covered."))
    if not firm.is_sme:
        out.append(Exclusion("NOT_SME", "all", "Firms above the SME limit are not covered."))
    if month in firm.mom_heat_action_months:
        out.append(Exclusion("MOM_HEAT_ACTION", "heat", "MOM took heat-stress enforcement action this month, so the heat payout is forfeited."))
    if firm.added_midterm and firm.cover_start is not None:
        wait_end = firm.cover_start + timedelta(days=WAITING_DAYS_MIDTERM)
        out.append(Exclusion("WAITING_PERIOD", "dates_before", f"Added mid-term: hours before {wait_end:%d %b %Y} are in the 14-day wait.", wait_end))
    return out


# ---------------------------------------------------------------- settlement date
# Singapore public holidays (MOM). 2025 and 2026 from MOM's published lists as recalled; unverified, check
# https://www.mom.gov.sg/employment-practices/public-holidays before the demo. 2027 is provisional.
SG_PUBLIC_HOLIDAYS: set[date] = {
    date(2025, 1, 1), date(2025, 1, 29), date(2025, 1, 30), date(2025, 3, 31), date(2025, 4, 18), date(2025, 5, 1),
    date(2025, 5, 3), date(2025, 5, 12), date(2025, 6, 7), date(2025, 8, 9), date(2025, 10, 20), date(2025, 12, 25),
    date(2026, 1, 1), date(2026, 2, 17), date(2026, 2, 18), date(2026, 3, 21), date(2026, 4, 3), date(2026, 5, 1),
    date(2026, 5, 27), date(2026, 6, 1), date(2026, 8, 10), date(2026, 11, 9), date(2026, 12, 25),
    date(2027, 1, 1), date(2027, 2, 8), date(2027, 2, 9), date(2027, 3, 10), date(2027, 3, 26), date(2027, 5, 1),
    date(2027, 5, 17), date(2027, 5, 20), date(2027, 8, 9), date(2027, 10, 28), date(2027, 12, 25),
}


def settlement_date(month: str, nth_working_day: int = 5) -> date:
    """Payment: "PayNow to the company UEN by the 5th working day of next month". Working day = Mon to Fri, not a
    Singapore public holiday."""
    y, m = (int(x) for x in month.split("-"))
    d = date(y + (m == 12), 1 if m == 12 else m + 1, 1)
    count = 0
    while True:
        if d.weekday() < 5 and d not in SG_PUBLIC_HOLIDAYS:
            count += 1
            if count == nth_working_day:
                return d
        d += timedelta(days=1)


def payout_amount(insured_h: float, benefit_per_hour: float, workers: int) -> float:
    """Payout = insured hours x benefit x declared outdoor workers, rounded to the nearest dollar (decision)."""
    return float(round(insured_h * benefit_per_hour * workers))
