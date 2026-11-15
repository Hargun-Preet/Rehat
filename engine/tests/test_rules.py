from datetime import date, datetime

import pytest

from rehat import rules
from rehat.rules import NOT_TRIGGERED, PENDING, TRIGGERED


# ---------------------------------------------------------------- heat tiers
@pytest.mark.parametrize(
    "wbgt,minutes",
    [(31.49, 0), (31.5, 5), (31.99, 5), (32.0, 10), (32.99, 10), (33.0, 15), (35.0, 15), (25.0, 0)],
)
def test_heat_tier_boundaries(wbgt: float, minutes: int) -> None:
    assert rules.heat_rest_minutes(wbgt) == minutes


def test_hourly_wbgt_four_readings() -> None:
    v, s = rules.hourly_wbgt_state([32.0, 32.2, 32.4, 32.6])
    assert v == pytest.approx(32.3) and s == TRIGGERED


def test_hourly_wbgt_three_of_four_is_enough() -> None:
    v, s = rules.hourly_wbgt_state([30.0, None, 30.2, 30.4])
    assert v == pytest.approx(30.2) and s == NOT_TRIGGERED


def test_pending_with_two_of_four() -> None:
    assert rules.hourly_wbgt_state([33.0, None, float("nan"), 33.5]) == (None, PENDING)


def test_pending_with_no_readings() -> None:
    assert rules.hourly_wbgt_state([None, None, None, None]) == (None, PENDING)


# ---------------------------------------------------------------- rain tiers
@pytest.mark.parametrize("mm,h", [(0, 0), (2.49, 0), (2.5, 0.5), (9.9, 0.5), (9.99, 0.5), (10.0, 1.0), (40.0, 1.0)])
def test_rain_tiers(mm: float, h: float) -> None:
    assert rules.rain_hours(mm) == h


def test_rain_hour_pending_when_few_readings() -> None:
    assert rules.hourly_rain_state([1.0] * 8 + [None] * 4) == (None, PENDING)


def test_rain_hour_partial_but_certain_top_tier() -> None:
    total, state = rules.hourly_rain_state([2.0] * 6 + [None] * 6)
    assert total == 12.0 and state == TRIGGERED


# ---------------------------------------------------------------- window
def test_window_weekday_inside() -> None:
    assert rules.in_window(datetime(2025, 10, 31, 10))  # Friday


def test_window_meal_hour_excluded() -> None:
    assert not rules.in_window(datetime(2025, 10, 31, 12))
    assert rules.in_window(datetime(2025, 10, 31, 12), meal_hour=13)
    assert not rules.in_window(datetime(2025, 10, 31, 13), meal_hour=13)


def test_window_sunday_excluded() -> None:
    assert not rules.in_window(datetime(2025, 11, 2, 10))  # Sunday


def test_window_saturday_included() -> None:
    assert rules.in_window(datetime(2025, 11, 1, 10))


def test_window_edges() -> None:
    assert rules.in_window(datetime(2025, 10, 31, 8))
    assert rules.in_window(datetime(2025, 10, 31, 17))
    assert not rules.in_window(datetime(2025, 10, 31, 7))
    assert not rules.in_window(datetime(2025, 10, 31, 18))


# ---------------------------------------------------------------- fallback ladder
def test_fallback_primary() -> None:
    r = rules.fallback(32.5, 31.0, 30.0, 33.0, 0)
    assert (r.source, r.state, r.pays) == ("primary", TRIGGERED, True)


def test_fallback_backup() -> None:
    r = rules.fallback(None, 31.0, 33.0, 33.0, 0)
    assert (r.source, r.state, r.value) == ("backup", NOT_TRIGGERED, 31.0)


def test_fallback_regional_median() -> None:
    r = rules.fallback(None, None, 33.1, 30.0, 0)
    assert (r.source, r.state) == ("regional_median", TRIGGERED)


def test_fallback_model_estimate_waits_48h() -> None:
    r = rules.fallback(None, None, None, 33.0, 1.0)
    assert (r.source, r.state, r.pays) == ("none", PENDING, False)


def test_fallback_model_estimate_never_pays_alone() -> None:
    r = rules.fallback(None, None, None, 33.0, 3.0)
    assert (r.source, r.state, r.pays) == ("model_estimate", PENDING, False)


def test_fallback_settles_at_advisory_after_14_days() -> None:
    r = rules.fallback(None, None, None, 33.0, 14.0, regional_advisory=32.2)
    assert (r.source, r.state, r.pays, r.value) == ("regional_advisory", TRIGGERED, True, 32.2)


def test_fallback_no_data_is_pending_never_not_triggered() -> None:
    r = rules.fallback(None, None, None, None, 40.0)
    assert r.state == PENDING


# ---------------------------------------------------------------- allowance and caps
def test_allowance() -> None:
    assert rules.allowance(1.0) == 1.25
    assert rules.allowance(5.0) == 6.25
    assert rules.allowance(4.0, multiple=1.5) == 6.0


def test_insured_hours_above_allowance_only() -> None:
    assert rules.insured_hours(1.69, 1.25) == pytest.approx(0.44)
    assert rules.insured_hours(1.0, 1.25) == 0.0


def test_monthly_cap() -> None:
    assert rules.apply_caps(25.0, 0.0) == 20.0


def test_yearly_cap() -> None:
    assert rules.apply_caps(15.0, 50.0) == 10.0
    assert rules.apply_caps(5.0, 60.0) == 0.0


def test_caps_untouched_when_below() -> None:
    assert rules.apply_caps(3.19, 10.0) == 3.19


# ---------------------------------------------------------------- haze
def _haze(psis: list[float | None], start: date = date(2025, 9, 1)) -> list[rules.HazeDay]:  # 1 Sep 2025 is a Monday
    from datetime import timedelta

    return rules.haze_hours([(start + timedelta(days=i), p) for i, p in enumerate(psis)])


def test_haze_day_1_2_3() -> None:
    out = _haze([150, 150, 150])
    assert [d.hours for d in out] == [0, 0, 1]
    assert [d.state for d in out] == [NOT_TRIGGERED, NOT_TRIGGERED, TRIGGERED]


def test_haze_streak_resets() -> None:
    assert [d.hours for d in _haze([150, 150, 90, 150, 150, 150])] == [0, 0, 0, 0, 0, 1]


def test_haze_high_tiers_pay_from_day_1() -> None:
    assert [d.hours for d in _haze([250, 301, 300])] == [3, 6, 3]


def test_haze_missing_reading_makes_3rd_day_pending() -> None:
    out = _haze([150, None, 150])
    assert out[1].state == PENDING
    assert out[2].state == PENDING  # would be day 3 only if the missing day was hazy


def test_haze_yearly_limit() -> None:
    out = rules.haze_hours([(date(2025, 9, 1), 350)], used_this_year_h=17.0)
    assert out[0].hours == 3.0


def test_haze_sunday_not_paid() -> None:
    out = _haze([350], start=date(2025, 9, 7))  # Sunday
    assert out[0].hours == 0 and out[0].state == NOT_TRIGGERED


# ---------------------------------------------------------------- exclusions
def test_mom_heat_action_forfeits_heat() -> None:
    ex = rules.exclusions(rules.FirmStatus(mom_heat_action_months={"2025-10"}), "2025-10")
    assert [e.code for e in ex] == ["MOM_HEAT_ACTION"] and ex[0].applies_to == "heat"


def test_lapsed_wic_excludes_all() -> None:
    ex = rules.exclusions(rules.FirmStatus(wic_active=False), "2025-10")
    assert ex[0].code == "WIC_LAPSED" and ex[0].applies_to == "all"


@pytest.mark.parametrize("sector", ["shipyard", "process_plant"])
def test_excluded_sectors(sector: str) -> None:
    assert rules.exclusions(rules.FirmStatus(sector=sector), "2025-10")[0].code == "SECTOR"


def test_waiting_period_midterm() -> None:
    ex = rules.exclusions(rules.FirmStatus(cover_start=date(2025, 10, 10), added_midterm=True), "2025-10")
    assert ex[0].code == "WAITING_PERIOD" and ex[0].until == date(2025, 10, 24)


# ---------------------------------------------------------------- settlement
def test_settlement_5th_working_day() -> None:
    assert rules.settlement_date("2025-10") == date(2025, 11, 7)  # Mon 3 Nov is day 1
    assert rules.settlement_date("2026-05") == date(2026, 6, 8)  # Mon 1 Jun 2026 is Vesak (observed)


# ---------------------------------------------------------------- worked month (CONTEXT.md section 5)
def test_worked_month_may_2026_bishan_pays_510() -> None:
    heat = rules.insured_hours(1.69, rules.allowance(1.0))
    rain = rules.insured_hours(9.0, rules.allowance(5.0))
    assert heat == pytest.approx(0.44) and rain == pytest.approx(2.75)
    total = rules.apply_caps(heat + rain, 0.0)
    assert total == pytest.approx(3.19)
    assert rules.payout_amount(total, rules.BENEFIT["Standard"], 20) == 510.0
