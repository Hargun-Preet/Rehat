"use client";

import { BadgeCheck, Banknote, CalendarClock, Flag, ShieldHalf, Users } from "lucide-react";
import { useState } from "react";
import { Area, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { AssumptionTag, PageHeader, Section, SourceNote, StateBadge } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { dayName, monthName, pct, sgd } from "@/lib/format";
import type { Pricing } from "@/lib/types";
import { ENGINE_URL } from "@/lib/useJSON";
import { cn } from "@/lib/utils";

type FanPt = { day: number; p10: number; p50: number; p90: number; p99: number; accrued: number };
type Fc = { asof: string; month: string; settlement_date: string; p10: number; p50: number; p90: number; p99: number; buffer_p99_minus_p50: number; days_known: number; forecast_days_used: number; insured_if_month_ended_today: number };
export type Liquidity = {
  asof: string;
  book: { firms: number; workers: number };
  current: Fc;
  fan_last_month: { month: string; actual: number; settlement_date: string; series: FanPt[] };
  fan_current_month: { month: string; series: FanPt[] };
  recent_months: { month: string; actual: number; settlement_date: string }[];
  season: { states: { state: string; years: number[]; n: number; annual_lr_mean: number; annual_lr_p90: number; month_cash_mean: number; month_cash_p90: number }[]; latest_state: string; latest_year: number; note: string; month: number };
  annual: { loss_ratio_by_year: Record<string, number>; expected_lr: number; one_in_ten_lr: number; worst_lr: number; haze_stress_lr: number; hard_cap_lr: number; attach: number; rule_suggests_attach: number; book_premium: number; book_hard_cap: number };
  validation: { overall_p90_coverage: number; overall_p99_coverage: number; overall_mae_p50: number; period: string[]; by_asof_day: { asof_day: number; months: number; p90_coverage: number }[] };
  alerts: { station_name: string; date: string; from: string; to: string; employer: string }[];
};
type Claim = { claim_id: string; firm: string; day: string; status: string; checks: { code: string; passed: boolean; text: string }[]; topup_minutes_per_worker: number; benefit: number; workers: number; audit: { at: string; by: string; event: string; detail: string }[] };
export type SM = { samples: { file: string; label: string; claim: Claim }[] };
export type Fairness = { price_inputs: string[]; never_used: string[]; by_region: { region: string; expected_insured_h: number; pct_months_paying: number; firms: number }[]; by_size: { size: string; expected_insured_h: number; pct_months_paying: number; firms: number }[] };
export type Anomaly = { flagged: number; firms: number; precision: number; recall: number; flags: { uen: string; name: string; sector: string; outdoor: number; total_employees: number; reasons: string[] }[]; note: string };

const ORANGE = "#f57100";
const BLUE = "#00467a";

export default function Console({ lq, pr, sm, fair, an }: { lq: Liquidity; pr: Pricing; sm: SM; fair: Fairness; an: Anomaly }) {
  const c = lq.current;
  const re = pr.reinsurance;
  const ytdMonths = lq.recent_months.filter((m) => m.month.startsWith(String(lq.asof.slice(0, 4))));
  const ytdPaid = ytdMonths.reduce((a, m) => a + m.actual, 0);
  const ytdLr = ytdPaid / (lq.annual.book_premium * (ytdMonths.length / 12));
  const [state, setState] = useState(lq.season.latest_state);
  const season = lq.season.states.find((s) => s.state === state) ?? lq.season.states[0];
  const lrYears = Object.entries(lq.annual.loss_ratio_by_year).map(([y, v]) => ({ year: y, lr: Math.round(v * 100) }));
  const fan = lq.fan_last_month.series.map((p) => ({ ...p, band: [p.p10, p.p90] as [number, number] }));
  const cur = lq.fan_current_month.series.map((p) => ({ ...p, band: [p.p10, p.p90] as [number, number] }));

  return (
    <>
      <PageHeader eyebrow="Insurer console (Income ops and finance)" title="Cash, reinsurance and claims">
        Forecasts plan Income&apos;s cash and reinsurance only. They never change a customer&apos;s payout or price.
      </PageHeader>
      <Section>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border-2 border-income-orange bg-surface p-6 shadow-[var(--shadow-raised)] lg:col-span-2">
            <p className="flex items-center gap-2 text-sm font-semibold text-income-orange-700">
              <CalendarClock className="h-4 w-4" /> Cash needed on {dayName(c.settlement_date)} for {monthName(c.month)}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Big label="P50" v={sgd(c.p50)} />
              <Big label="P90" v={sgd(c.p90)} strong />
              <Big label="P99" v={sgd(c.p99)} />
              <Big label="Hold as buffer (P99 - P50)" v={sgd(c.buffer_p99_minus_p50)} />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              As of {dayName(c.asof)}: {c.days_known} days known, next {c.forecast_days_used} days from the forecast, rest of the month from {lq.season.states.reduce((a, s) => a + s.n, 0)} past years of {monthName(c.month).split(" ")[0]}. Insured if the month ended today: {sgd(c.insured_if_month_ended_today)}.
            </p>
          </div>
          <div className="rounded-2xl border border-line bg-surface p-6">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <ShieldHalf className="h-4 w-4 text-income-blue" /> Reinsurance
            </p>
            <p className="mt-2 font-heading text-2xl font-bold">Stop-loss at {pct(re.chosen_attach)}</p>
            <p className="text-sm text-muted-foreground">Aggregate, from year 2, up to the {pct(re.hard_cap_lr)} hard cap. Decided.</p>
            <p className="mt-3 rounded-xl bg-paper p-3 text-xs text-muted-foreground">
              Kept at {pct(re.chosen_attach)} on 15 Nov 2026. No back-test year reaches it, so it guards against years worse than history. A {pct(re.rule_suggests_attach)} attachment would also fit the 5% budget; it was considered and not chosen.
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi Icon={Users} label="Book (demo)" v={`${lq.book.firms} firms`} sub={`${lq.book.workers.toLocaleString()} outdoor workers, premium ${sgd(lq.annual.book_premium)}`} />
          <Kpi Icon={Banknote} label={`Paid so far in ${lq.asof.slice(0, 4)}`} v={sgd(ytdPaid)} sub={`year-to-date loss ratio ${pct(ytdLr)} (${ytdMonths.length} months)`} />
          <Kpi Icon={BadgeCheck} label="Forecast check (P90 coverage)" v={pct(lq.validation.overall_p90_coverage)} sub={`actual payout at or under P90, ${lq.validation.period[0]} to ${lq.validation.period[1]}; target about 90%`} />
          <Kpi Icon={ShieldHalf} label="Hard cap on the book" v={sgd(lq.annual.book_hard_cap)} sub="60 h a year x benefit x workers" />
        </div>
      </Section>

      <Section>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card title={`How the band narrowed: ${monthName(lq.fan_last_month.month)}`} sub={`Forecast of the month's payout made on each day. Actual: ${sgd(lq.fan_last_month.actual)}, paid ${dayName(lq.fan_last_month.settlement_date)}.`}>
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={fan} margin={{ left: 4, right: 8, top: 8 }}>
                <CartesianGrid vertical={false} stroke="#efebe4" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} label={{ value: "day of month", position: "insideBottom", offset: -2, fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} width={40} />
                <Tooltip formatter={(v: number | number[]) => (Array.isArray(v) ? `${sgd(v[0])} to ${sgd(v[1])}` : sgd(v))} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area dataKey="band" name="P10 to P90" fill={ORANGE} fillOpacity={0.18} stroke="none" />
                <Line dataKey="p50" name="P50" stroke={ORANGE} dot={false} strokeWidth={2} />
                <Line dataKey="p99" name="P99" stroke={ORANGE} dot={false} strokeDasharray="4 3" />
                <Line dataKey="accrued" name="Insured so far" stroke={BLUE} dot={false} strokeWidth={2} />
                <ReferenceLine y={lq.fan_last_month.actual} stroke={BLUE} strokeDasharray="2 4" label={{ value: "actual", fontSize: 10, fill: BLUE, position: "insideTopLeft" }} />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>
          <Card title={`This month so far: ${monthName(lq.fan_current_month.month)}`} sub="Same forecast, run each day up to today.">
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={cur} margin={{ left: 4, right: 8, top: 8 }}>
                <CartesianGrid vertical={false} stroke="#efebe4" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} width={40} />
                <Tooltip formatter={(v: number | number[]) => (Array.isArray(v) ? `${sgd(v[0])} to ${sgd(v[1])}` : sgd(v))} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area dataKey="band" name="P10 to P90" fill={ORANGE} fillOpacity={0.18} stroke="none" />
                <Line dataKey="p50" name="P50" stroke={ORANGE} dot={false} strokeWidth={2} />
                <Line dataKey="p99" name="P99" stroke={ORANGE} dot={false} strokeDasharray="4 3" />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>
        </div>
      </Section>

      <Section>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="Annual loss ratio by back-test year" sub={`Stop-loss at ${pct(lq.annual.attach)}; hard cap ${pct(lq.annual.hard_cap_lr)}. Expected ${pct(lq.annual.expected_lr)}, 1-in-10 ${pct(lq.annual.one_in_ten_lr)}, 2015-like haze stress ${pct(lq.annual.haze_stress_lr)}.`}>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={lrYears} margin={{ left: 4, right: 8, top: 16 }}>
                <CartesianGrid vertical={false} stroke="#efebe4" />
                <XAxis dataKey="year" tick={{ fontSize: 10 }} interval={2} />
                <YAxis tick={{ fontSize: 11 }} unit="%" width={44} domain={[0, Math.max(160, Math.round(lq.annual.attach * 100) + 10)]} />
                <Tooltip formatter={(v: number) => `${v}%`} />
                <ReferenceLine y={Math.round(lq.annual.attach * 100)} stroke={BLUE} strokeDasharray="4 4" label={{ value: `stop-loss ${pct(lq.annual.attach)}`, fontSize: 10, fill: BLUE, position: "insideTopRight" }} />
                <ReferenceLine y={65} stroke="#8b8d8e" strokeDasharray="2 4" label={{ value: "target 65%", fontSize: 10, position: "insideTopLeft" }} />
                <Bar dataKey="lr" name="loss ratio" radius={[3, 3, 0, 0]}>
                  {lrYears.map((y) => (
                    <Cell key={y.year} fill={y.lr > 100 ? "#b35300" : ORANGE} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <table className="mt-3 w-full text-xs">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="text-left">Attach</th>
                  <th className="text-right">Expected recovery</th>
                  <th className="text-right">Cost at {re.load}x</th>
                  <th className="text-right">Years hit</th>
                  <th className="text-right">In 5% budget</th>
                </tr>
              </thead>
              <tbody>
                {re.table.map((r) => (
                  <tr key={r.attach} className={cn("border-t border-line-soft", r.attach === re.chosen_attach && "font-semibold")}>
                    <td className="num py-1">{pct(r.attach)}</td>
                    <td className="num text-right">{r.expected_recovery_pct}%</td>
                    <td className="num text-right">{r.cost_pct}%</td>
                    <td className="num text-right">
                      {r.years_hit} of {r.years}
                    </td>
                    <td className="text-right">{r.inside_budget ? "yes" : "no"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <Card title="Season view: plan reinsurance before the haze and monsoon seasons" sub={lq.season.note}>
            <Tabs value={state} onValueChange={setState}>
              <TabsList>
                {lq.season.states.map((s) => (
                  <TabsTrigger key={s.state} value={s.state}>
                    {s.state === "El Nino" ? "El Niño" : s.state === "La Nina" ? "La Niña" : "Neutral"}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Big label="Annual loss ratio, mean" v={pct(season.annual_lr_mean)} />
              <Big label="Annual loss ratio, P90" v={pct(season.annual_lr_p90)} />
              <Big label={`${monthName(`2000-${String(lq.season.month).padStart(2, "0")}`).split(" ")[0]} cash, mean`} v={sgd(season.month_cash_mean)} />
              <Big label={`${monthName(`2000-${String(lq.season.month).padStart(2, "0")}`).split(" ")[0]} cash, P90`} v={sgd(season.month_cash_p90)} />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              {season.n} years: {season.years.join(", ")}. Latest classified year {lq.season.latest_year}: {lq.season.latest_state}.
            </p>
          </Card>
        </div>
      </Section>

      <Section>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ClaimsQueue claims={sm.samples.map((s) => s.claim).filter((c) => c.status === "REVIEW")} />
          </div>
          <div className="space-y-6">
            <Card title="Fairness" sub="Price inputs, and what is never used">
              <ul className="space-y-1 text-sm">
                {fair.price_inputs.map((p) => (
                  <li key={p} className="flex items-center gap-2">
                    <BadgeCheck className="h-4 w-4 text-state-ok" /> {p}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs font-semibold text-muted-foreground">Never used</p>
              <p className="text-xs text-muted-foreground">{fair.never_used.join(" · ")}</p>
              <p className="mt-3 text-xs font-semibold text-muted-foreground">Expected insured hours a worker, by region</p>
              <MiniBars rows={fair.by_region.map((r) => ({ k: r.region, v: r.expected_insured_h, n: r.firms }))} />
              <p className="mt-3 text-xs font-semibold text-muted-foreground">By firm size (outdoor workers)</p>
              <MiniBars rows={fair.by_size.map((r) => ({ k: r.size, v: r.expected_insured_h, n: r.firms }))} />
              <p className="mt-2 text-xs text-muted-foreground">Payout differs by station weather, not by who the workers are. Same price everywhere.</p>
            </Card>
            <Card title="Declaration flags" sub={`${an.flagged} of ${an.firms} firms flagged for a person to check. ${an.note}`}>
              <ul className="space-y-2 text-xs">
                {an.flags.slice(0, 5).map((f) => (
                  <li key={f.uen} className="rounded-lg bg-paper p-2">
                    <p className="flex items-center gap-1 font-medium">
                      <Flag className="h-3 w-3 text-state-pending" /> {f.name}
                    </p>
                    <p className="text-muted-foreground">{f.reasons[0]}</p>
                  </li>
                ))}
              </ul>
              <AssumptionTag basis="Firm size and paid-up capital are fictional stand-ins for an ACRA lookup; 8 anomalies were seeded to test the flags." label="test data" />
            </Card>
          </div>
        </div>
        <SourceNote>Rehat engine: liquidity Monte Carlo (docs/liquidity-validation.md), pricing and stop-loss (docs/pricing.md), Site Match (docs/model-cards/site-match.md).</SourceNote>
      </Section>
    </>
  );
}

function ClaimsQueue({ claims }: { claims: Claim[] }) {
  const [items, setItems] = useState(claims.map((c) => ({ ...c, decision: null as null | "approve" | "decline", reason: "" })));
  const decide = async (id: string, decision: "approve" | "decline") => {
    const reason = decision === "approve" ? "Site conditions explain the log (reviewer note)" : "Log does not match site conditions (reviewer note)";
    const at = new Date().toISOString().slice(0, 19);
    setItems((xs) => xs.map((x) => (x.claim_id === id ? { ...x, decision, reason, audit: [...x.audit, { at, by: "Reviewer (Income claims)", event: `HUMAN_${decision.toUpperCase()}`, detail: reason }] } : x)));
    try {
      await fetch(`${ENGINE_URL}/sitematch/decide`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ claim_id: id, decision, reviewer: "Reviewer (Income claims)", reason }) });
    } catch {
      /* offline demo: decision kept on this page */
    }
  };
  return (
    <Card title="Site Match review queue" sub="The checker never rejects. A person decides, with a reason, and it goes in the audit log.">
      <ul className="divide-y divide-line-soft">
        {items.map((c) => (
          <li key={c.claim_id} className="py-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium">
                  {c.claim_id} · {c.firm} · {c.day}
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {c.checks.filter((x) => !x.passed).map((x) => (
                    <span key={x.code} className="rounded-full border border-state-review/30 bg-state-review-bg px-2 py-0.5 text-[11px] text-state-review">
                      {x.text}
                    </span>
                  ))}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Top-up if approved: {c.topup_minutes_per_worker} min a worker, {sgd(Math.round((c.topup_minutes_per_worker / 60) * c.benefit * c.workers))}</p>
              </div>
              {c.decision === "approve" ? (
                <StateBadge state="APPROVED" />
              ) : c.decision === "decline" ? (
                <span className="rounded-full border border-line bg-paper px-2 py-0.5 text-xs font-medium text-ink">Declined by a person</span>
              ) : (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => decide(c.claim_id, "approve")}>
                    Approve
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => decide(c.claim_id, "decline")}>
                    Decline
                  </Button>
                </div>
              )}
            </div>
            <details className="mt-2 text-xs text-muted-foreground">
              <summary className="cursor-pointer">Audit log ({c.audit.length})</summary>
              <ul className="mt-1 space-y-0.5">
                {c.audit.map((a, i) => (
                  <li key={i} className="num">
                    {a.at} · {a.by} · {a.event}: {a.detail}
                  </li>
                ))}
              </ul>
            </details>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function MiniBars({ rows }: { rows: { k: string; v: number; n: number }[] }) {
  const max = Math.max(...rows.map((r) => r.v), 1);
  return (
    <ul className="mt-1 space-y-1">
      {rows.map((r) => (
        <li key={r.k} className="grid grid-cols-[80px_1fr_70px] items-center gap-2 text-xs">
          <span className="capitalize">{r.k}</span>
          <span className="h-2 rounded-full bg-paper">
            <span className="block h-2 rounded-full bg-income-blue" style={{ width: `${(r.v / max) * 100}%` }} />
          </span>
          <span className="num text-right text-muted-foreground">
            {r.v.toFixed(1)} h · {r.n}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Kpi({ Icon, label, v, sub }: { Icon: typeof Users; label: string; v: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </p>
      <p className="num mt-1 font-heading text-2xl font-bold">{v}</p>
      <p className="text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}

function Big({ label, v, strong }: { label: string; v: string; strong?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("num font-heading text-2xl font-bold", strong && "text-income-orange-700 sm:text-3xl")}>{v}</p>
    </div>
  );
}

function Card({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-5">
      <p className="font-semibold">{title}</p>
      {sub ? <p className="mb-3 text-xs text-muted-foreground">{sub}</p> : null}
      {children}
    </div>
  );
}
