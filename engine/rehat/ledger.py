"""Firm-month ledger: counted hours by peril, allowance, insured hours, caps, payout, receipt.

Everything here is deterministic arithmetic on NEA readings, plan terms and the WIC headcount (AGENTS.md).
"""
from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field
from datetime import date, datetime, timedelta
from functools import lru_cache
from typing import Any

import numpy as np
import pandas as pd

from rehat import product, rules, store
from rehat.normals import normal
from rehat.paths import SEED
from rehat.stations import region_of_station, station_by_id, wbgt_stations, rain_gauges, psi_region_for


@dataclass
class Site:
    address: str
    lat: float
    lon: float


@dataclass
class Firm:
    uen: str
    name: str
    outdoor_workers: int
    wage_band: str
    sites: list[Site]
    primary_station: str
    backup_station: str
    rain_gauge: str
    rain_backup: str
    psi_region: str
    plan: str = "Standard"
    meal_hour: int | None = rules.DEFAULT_MEAL_HOUR
    sector: str = "construction"
    wic_policy_no: str = ""
    wic_active: bool = True
    is_sme: bool = True
    cover_start: str = "2025-01-01"
    added_midterm: bool = False
    mom_heat_action_months: list[str] = field(default_factory=list)
    trade: str = ""

    @staticmethod
    def from_dict(d: dict[str, Any]) -> "Firm":
        d = dict(d)
        d["sites"] = [Site(**s) for s in d.get("sites", [])]
        known = set(Firm.__dataclass_fields__)
        return Firm(**{k: v for k, v in d.items() if k in known})

    def status(self) -> rules.FirmStatus:
        return rules.FirmStatus(
            wic_active=self.wic_active,
            is_sme=self.is_sme,
            sector=self.sector,
            mom_heat_action_months=set(self.mom_heat_action_months),
            cover_start=date.fromisoformat(self.cover_start),
            added_midterm=self.added_midterm,
        )

    @property
    def benefit(self) -> float:
        """Return the v2 plan benefit. The deductible is the one plan lever."""
        # Resolve the plan first so a bad fixture fails clearly instead of
        # falling back to a retired commercial term.
        _ = self.product_plan
        return product.get_product().product.benefit_per_worker_hour

    @property
    def product_plan(self) -> product.Plan:
        """Return the v2 plan selected for a firm."""
        plan_id = self.plan.strip().lower()
        return product.get_product().plan_by_id(plan_id)

    @property
    def plan_id(self) -> str:
        """Stable v2 plan id."""
        return self.product_plan.id

    @property
    def allowance_multiple(self) -> float:
        """The selected plan's monthly-allowance multiple.

        Plan data always resolves through ``product.json``.
        """
        return self.product_plan.allowance_multiple

    @property
    def deductible_label(self) -> str:
        """Plain-language deductible description for a receipt."""
        return self.product_plan.deductible_label


@lru_cache
def demo_book() -> tuple[Firm, ...]:
    raw = json.loads((SEED / "firms.json").read_text())
    return tuple(Firm.from_dict(f) for f in raw)


def firm_by_uen(uen: str) -> Firm:
    for f in demo_book():
        if f.uen == uen:
            return f
    raise KeyError(uen)


# ---------------------------------------------------------------- hourly helpers
def _month_bounds(month: str) -> tuple[pd.Timestamp, pd.Timestamp]:
    start = pd.Timestamp(f"{month}-01")
    return start, start + pd.offsets.MonthBegin(1)


def _region_peers(station_id: str, pool: str) -> list[str]:
    st = station_by_id(station_id)
    region = region_of_station(st)
    stations = wbgt_stations() if pool == "wbgt" else rain_gauges()
    return [s.station_id for s in stations if s.station_id != station_id and region_of_station(s) == region]


def hourly_wbgt(month: str) -> pd.DataFrame:
    """Hourly mean and valid count per station for the month (index ts hour, columns MultiIndex (stat, station))."""
    a, b = _month_bounds(month)
    w = store.wbgt()
    if w.empty:
        return pd.DataFrame()
    w = w[(w.ts_sgt >= a) & (w.ts_sgt < b)].copy()
    if w.empty:
        return pd.DataFrame()
    w["hour"] = w.ts_sgt.dt.floor("h")
    g = w.groupby(["hour", "station_id"]).wbgt.agg(["mean", "count"]).unstack("station_id")
    return g


def hourly_rain(month: str) -> pd.DataFrame:
    a, b = _month_bounds(month)
    r = store.rain()
    if r.empty:
        return pd.DataFrame()
    r = r[(r.ts_sgt >= a) & (r.ts_sgt < b)].copy()
    if r.empty:
        return pd.DataFrame()
    # 5-minute totals are stamped at the end of the interval; shift by 1 s so 09:00 belongs to the 08:00 hour.
    r["hour"] = (r.ts_sgt - pd.Timedelta(seconds=1)).dt.floor("h")
    g = r.groupby(["hour", "station_id"]).mm.agg(["sum", "count"]).unstack("station_id")
    return g


def _get(g: pd.DataFrame, stat: str, station: str, hour: pd.Timestamp) -> float | None:
    try:
        v = g.loc[hour, (stat, station)]
    except KeyError:
        return None
    return None if pd.isna(v) else float(v)


def _valid_mean(g: pd.DataFrame, station: str, hour: pd.Timestamp, need: int, stat: str) -> float | None:
    c = _get(g, "count", station, hour)
    if c is None or c < need:
        return None
    return _get(g, stat, station, hour)


def window_hours(month: str, meal_hour: int | None, include_meal: bool = False) -> list[pd.Timestamp]:
    a, b = _month_bounds(month)
    out = []
    d = a
    while d < b:
        for h in range(rules.WINDOW_START_H, rules.WINDOW_END_H):
            ts = d + pd.Timedelta(hours=h)
            if rules.in_window(ts.to_pydatetime(), meal_hour) or (include_meal and d.weekday() != 6 and h == meal_hour):
                out.append(ts)
        d += pd.Timedelta(days=1)
    return out


# ---------------------------------------------------------------- ledger
@dataclass
class HourLine:
    ts: str
    peril: str
    reading: float | None
    unit: str
    source: str
    state: str
    counted_h: float
    detail: str


class FirmMonthLedger:
    def __init__(
        self,
        firm: Firm,
        month: str,
        ytd_insured_h: float = 0.0,
        haze_used_h: float = 0.0,
        asof: datetime | None = None,
    ) -> None:
        self.firm = firm
        self.month = month
        self.ytd_insured_h = ytd_insured_h
        self.haze_used_h = haze_used_h
        self.asof = asof or datetime.now()
        self.lines: list[HourLine] = []
        self.not_counted: list[dict[str, str]] = []
        self.audit: list[dict[str, str]] = []
        self._build()

    # ---- perils
    def _heat(self) -> None:
        f = self.firm
        g = hourly_wbgt(self.month)
        pulled = store.days_pulled("wbgt")
        peers = _region_peers(f.primary_station, "wbgt")
        for ts in window_hours(self.month, f.meal_hour, include_meal=True):
            is_meal = f.meal_hour is not None and ts.hour == f.meal_hour
            prim = _valid_mean(g, f.primary_station, ts, 3, "mean") if not g.empty else None
            back = _valid_mean(g, f.backup_station, ts, 3, "mean") if not g.empty else None
            peer_vals = [v for p in peers if (v := (_valid_mean(g, p, ts, 3, "mean") if not g.empty else None)) is not None]
            med = float(np.median(peer_vals)) if peer_vals else None
            days_since = (self.asof - ts.to_pydatetime()).total_seconds() / 86400
            res = rules.fallback(prim, back, med, None, days_since)
            mins = rules.heat_rest_minutes(res.value) if (res.value is not None and res.pays) else 0
            if is_meal:
                if mins > 0:
                    self.not_counted.append(
                        {"what": f"{ts:%a %d %b %H:00} heat, WBGT {res.value:.1f}", "why": "This is your declared unpaid meal hour, so it is not insured."}
                    )
                continue
            note = res.note
            if res.state == rules.PENDING and ts.strftime("%Y-%m-%d") not in pulled:
                note = "Readings for this day are not available from the data feed yet. Pending, not counted as no event."
            self.lines.append(
                HourLine(ts.isoformat(), "heat", None if res.value is None else round(res.value, 2), "WBGT C", res.source, res.state, mins / 60, note)
            )

    def _rain(self) -> None:
        f = self.firm
        g = hourly_rain(self.month)
        pulled = store.days_pulled("rain")
        peers = _region_peers(f.rain_gauge, "rain")
        for ts in window_hours(self.month, f.meal_hour):
            def val(st: str) -> tuple[float | None, rules.State]:
                if g.empty:
                    return None, rules.PENDING
                s, c = _get(g, "sum", st, ts), _get(g, "count", st, ts)
                if c is None:
                    return None, rules.PENDING
                if c < rules.RAIN_MIN_VALID_5MIN:
                    return (s, rules.TRIGGERED) if (s or 0) >= 10 else (None, rules.PENDING)
                return s, rules.TRIGGERED

            prim, _ = val(f.rain_gauge)
            back, _ = val(f.rain_backup)
            peer_vals = [v for p in peers if (v := val(p)[0]) is not None]
            med = float(np.median(peer_vals)) if peer_vals else None
            days_since = (self.asof - ts.to_pydatetime()).total_seconds() / 86400
            res = rules.fallback(prim, back, med, None, days_since, classify=lambda v: rules.rain_hours(v) > 0)
            h = rules.rain_hours(res.value) if (res.value is not None and res.pays) else 0.0
            note = res.note
            if res.state == rules.PENDING and ts.strftime("%Y-%m-%d") not in pulled:
                note = "Rain readings for this day are not available from the data feed yet. Pending, not counted as no event."
            self.lines.append(HourLine(ts.isoformat(), "rain", None if res.value is None else round(res.value, 1), "mm in the hour", res.source, res.state, h, note))

    def _haze(self) -> list[rules.HazeDay]:
        a, b = _month_bounds(self.month)
        p = store.psi()
        lead = a - pd.Timedelta(days=10)
        if p.empty:
            p = pd.DataFrame({"region": pd.Series(dtype=str), "ts_sgt": pd.Series(dtype="datetime64[ns]"), "psi_24h": pd.Series(dtype=float)})
        p = p[(p.region == self.firm.psi_region) & (p.ts_sgt >= lead) & (p.ts_sgt < b) & (p.ts_sgt.dt.hour == 12)]
        noon = {ts.date(): float(v) for ts, v in zip(p.ts_sgt, p.psi_24h)}
        days = [(lead + pd.Timedelta(days=i)).date() for i in range((b - lead).days)]
        series = [(d, noon.get(d)) for d in days]
        out = rules.haze_hours(series, used_this_year_h=self.haze_used_h)
        out = [h for h in out if h.day >= a.date()]
        for h in out:
            ts = datetime.combine(h.day, datetime.min.time()).replace(hour=12)
            self.lines.append(HourLine(ts.isoformat(), "haze", h.psi_noon, "24-h PSI at 12:00", "primary", h.state, h.hours, h.note))
        return out

    # ---- assembly
    def _build(self) -> None:
        f = self.firm
        st = f.status()
        self.exclusions = rules.exclusions(st, self.month)
        self._heat()
        self._rain()
        self._haze()
        wait_until = next((e.until for e in self.exclusions if e.applies_to == "dates_before"), None)
        if wait_until:
            for ln in self.lines:
                if datetime.fromisoformat(ln.ts).date() < wait_until and ln.counted_h > 0:
                    self.not_counted.append({"what": f"{ln.ts[:16]} {ln.peril}", "why": "Inside the 14-day wait after adding Rehat mid-term."})
                    ln.counted_h = 0.0
        all_excluded = any(e.applies_to == "all" for e in self.exclusions)
        heat_forfeit = any(e.code == "MOM_HEAT_ACTION" for e in self.exclusions)
        m = int(self.month[5:7])

        def tot(peril: str) -> float:
            return round(sum(ln.counted_h for ln in self.lines if ln.peril == peril and ln.state == rules.TRIGGERED), 4)

        def pend(peril: str) -> int:
            return sum(1 for ln in self.lines if ln.peril == peril and ln.state == rules.PENDING)

        perils: dict[str, dict[str, Any]] = {}
        for peril, station in (("heat", f.primary_station), ("rain", f.rain_gauge)):
            n, basis, is_assump = normal(station if peril == "heat" else f.primary_station, m, peril)
            allow = rules.allowance(n, f.allowance_multiple)
            counted = tot(peril)
            ins = rules.insured_hours(counted, allow)
            perils[peril] = {
                "counted_h": round(counted, 2),
                "normal_h": round(n, 2),
                "allowance_h": round(allow, 2),
                "insured_h": round(ins, 2),
                "normal_is_assumption": is_assump,
                "normal_basis": basis,
                "pending_hours": pend(peril),
            }
        if heat_forfeit:
            perils["heat"]["insured_h"] = 0.0
            perils["heat"]["forfeited"] = True
        haze_counted = tot("haze")
        perils["haze"] = {"counted_h": round(haze_counted, 2), "insured_h": round(haze_counted, 2), "pending_days": pend("haze"), "note": "No allowance for haze. 20 h a year limit."}
        before_caps = round(sum(p["insured_h"] for p in perils.values()), 2)
        after_caps = 0.0 if all_excluded else round(rules.apply_caps(before_caps, self.ytd_insured_h), 2)
        payout = 0.0 if all_excluded else rules.payout_amount(after_caps, f.benefit, f.outdoor_workers)
        self.perils = perils
        self.insured_before_caps_h = before_caps
        self.insured_after_caps_h = after_caps
        self.payout_sgd = payout
        self.settlement = rules.settlement_date(self.month)
        self.audit.append({"event": "LEDGER_BUILT", "at": self.asof.isoformat(timespec="seconds"), "by": "rules engine", "detail": f"{len(self.lines)} lines"})
        self._not_counted_summary()

    def _not_counted_summary(self) -> None:
        f = self.firm
        for peril in ("heat", "rain"):
            p = self.perils[peril]
            if p["counted_h"] > 0:
                used = min(p["counted_h"], p["allowance_h"])
                self.not_counted.append(
                    {"what": f"First {used:.2f} h of {peril}", "why": f"Within your {f.deductible_label.lower()} ({p['allowance_h']:.2f} h). Only hours above it are insured."}
                )
            if p["pending_hours"]:
                self.not_counted.append(
                    {"what": f"{p['pending_hours']} {peril} hours pending", "why": "Readings are missing. They are not treated as no event. They will be settled in a later run when data arrives."}
                )
        if self.perils["haze"]["pending_days"]:
            self.not_counted.append({"what": f"{self.perils['haze']['pending_days']} haze days pending", "why": "PSI reading missing. Settled when it arrives."})
        if self.perils["heat"].get("forfeited"):
            self.not_counted.append({"what": "All heat hours this month", "why": "MOM took heat-stress enforcement action this month, so the heat payout is forfeited."})
        if self.insured_after_caps_h < self.insured_before_caps_h:
            self.not_counted.append(
                {"what": f"{self.insured_before_caps_h - self.insured_after_caps_h:.2f} insured hours", "why": "Above the cap of 20 h a month or 60 h a year."}
            )
        for e in self.exclusions:
            if e.applies_to == "all":
                self.not_counted.append({"what": "Whole month", "why": e.reason})
        self.not_counted.append({"what": "Sundays and hours outside 08:00 to 18:00", "why": "Outside the insured window."})
        self.not_counted.append({"what": "Losses above S$%g a worker an hour" % f.benefit, "why": "Rehat pays a fixed benefit, not your actual loss."})

    # ---- output
    def receipt_lines(self) -> list[str]:
        f = self.firm
        pr, rg = station_by_id(f.primary_station), station_by_id(f.rain_gauge)
        h, r, z = self.perils["heat"], self.perils["rain"], self.perils["haze"]
        month_name = datetime.strptime(self.month, "%Y-%m").strftime("%B %Y")
        lines = [
            f"{f.name}, {month_name}. Heat station: {pr.name} ({pr.station_id}). Rain gauge: {rg.name} ({rg.station_id}). Haze: {f.psi_region} region PSI.",
            f"Heat rest owed: {h['counted_h']:.2f} h a worker. {f.deductible_label}: {h['allowance_h']:.2f} h. Insured: {h['insured_h']:.2f} h.",
            f"Heavy rain: {r['counted_h']:.2f} h a worker. {f.deductible_label}: {r['allowance_h']:.2f} h. Insured: {r['insured_h']:.2f} h.",
            f"Haze: {z['counted_h']:.2f} h. No allowance for haze.",
        ]
        if self.insured_after_caps_h != self.insured_before_caps_h:
            lines.append(f"Caps cut insured hours from {self.insured_before_caps_h:.2f} h to {self.insured_after_caps_h:.2f} h.")
        lines.append(
            f"{self.insured_after_caps_h:.2f} h x S${f.benefit:g} x {f.outdoor_workers} workers = S${self.payout_sgd:,.0f}, "
            f"by PayNow to your UEN by {self.settlement:%a %d %b %Y} (5th working day)."
        )
        if self.payout_sgd == 0:
            lines.append("Nothing is paid this month: it stayed within the normal range at your station, or the hours are still pending.")
        lines.append("To dispute a reading, reply to this receipt. Disputes are data checks. You can also go to FIDReC.")
        return lines

    def to_dict(self, include_hours: bool = True) -> dict[str, Any]:
        f = self.firm
        out: dict[str, Any] = {
            "firm": {"uen": f.uen, "name": f.name, "outdoor_workers": f.outdoor_workers, "wage_band": f.wage_band, "plan": f.plan_id, "deductible_label": f.deductible_label, "benefit_sgd": f.benefit, "sites": [asdict(s) for s in f.sites]},
            "month": self.month,
            "stations": {
                "primary": asdict(station_by_id(f.primary_station)),
                "backup": asdict(station_by_id(f.backup_station)),
                "rain_gauge": asdict(station_by_id(f.rain_gauge)),
                "rain_backup": asdict(station_by_id(f.rain_backup)),
                "psi_region": f.psi_region,
            },
            "perils": self.perils,
            "ytd_insured_before_h": self.ytd_insured_h,
            "insured_before_caps_h": self.insured_before_caps_h,
            "monthly_cap_h": rules.MONTHLY_CAP_H,
            "yearly_cap_h": rules.YEARLY_CAP_H,
            "insured_after_caps_h": self.insured_after_caps_h,
            "payout_sgd": self.payout_sgd,
            "settlement_date": self.settlement.isoformat(),
            "exclusions": [asdict(e) | {"until": e.until.isoformat() if e.until else None} for e in self.exclusions],
            "receipt_lines": self.receipt_lines(),
            "not_counted": self.not_counted,
            "audit": self.audit,
        }
        if include_hours:
            out["hours"] = [asdict(ln) for ln in self.lines]
        return out


def policy_year_ledgers(firm: Firm, months: list[str], asof: datetime | None = None) -> list[FirmMonthLedger]:
    """Run consecutive months, carrying year-to-date insured hours and haze hours used."""
    out, ytd, haze = [], 0.0, 0.0
    for m in months:
        led = FirmMonthLedger(firm, m, ytd_insured_h=ytd, haze_used_h=haze, asof=asof)
        ytd += led.insured_after_caps_h
        haze += led.perils["haze"]["counted_h"]
        out.append(led)
    return out
