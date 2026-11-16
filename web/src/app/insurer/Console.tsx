"use client";

import Link from "next/link";
import { Banknote, CalendarClock, CircleDollarSign, ShieldHalf, Users } from "lucide-react";
import { useState } from "react";
import { Area, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { AssumptionTag, PageHeader, Section, SourceNote } from "@/components/brand";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { dayName, monthName, pct, sgd } from "@/lib/format";
import { productPlan, type ProductSpec } from "@/lib/product";
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
const ORANGE = "#f57100";
const BLUE = "#00467a";

export default function Console({ lq, product }: { lq: Liquidity; product: ProductSpec }) {
  const standard = productPlan(product);
  const claimsShare = product.premium_split.find((part) => part.id === "claims")!.share;
  const observedLossRatio = standard.example_20_workers.average_payout_year / standard.example_20_workers.premium_year;
  const reinsurance = product.reinsurance;
  const hazeStress = reinsurance.haze_stress_scenario;
  const [state, setState] = useState(lq.season.latest_state);
  const season = lq.season.states.find((s) => s.state === state) ?? lq.season.states[0];
  const lrYears = Object.entries(lq.annual.loss_ratio_by_year).map(([y, v]) => ({ year: y, lr: Math.round(v * 100) }));
  const fan = lq.fan_last_month.series.map((p) => ({ ...p, band: [p.p10, p.p90] as [number, number] }));
  const cur = lq.fan_current_month.series.map((p) => ({ ...p, band: [p.p10, p.p90] as [number, number] }));

  return (
    <>
      <PageHeader eyebrow="Income / portfolio console" title={`${sgd(product.pilot.capped_worst_case)} is the pilot’s stated maximum payout`}>
        The pilot plan covers {product.pilot.firms.toLocaleString()} firms from {product.pilot.start}. Forecasts plan cash and reinsurance only. They never change a customer&apos;s payout or price.
      </PageHeader>
      <Section>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border-2 border-income-orange bg-surface p-6 shadow-[var(--shadow-raised)] lg:col-span-2">
            <p className="flex items-center gap-2 text-sm font-semibold text-income-orange-700">
              <CalendarClock className="h-4 w-4" /> Pilot plan from {product.pilot.start}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Big label="Premium plan" v={sgd(product.pilot.premium)} />
              <Big label="Expected profit" v={sgd(product.pilot.expected_profit)} strong />
              <Big label="Workers" v={product.pilot.workers.toLocaleString()} />
              <Big label="One-in-100 claims" v={sgd(product.pilot.one_in_100_year_claims.value)} />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Plan source: product schedule. The maximum is known on day one because the annual benefit is capped.
            </p>
          </div>
          <div className="rounded-2xl border border-line bg-surface p-6">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <ShieldHalf className="h-4 w-4 text-income-blue" /> Reinsurance
            </p>
            <p className="mt-2 font-heading text-2xl font-bold">Stop-loss at {pct(reinsurance.attachment_loss_ratio)}</p>
            <p className="text-sm text-muted-foreground">Aggregate cover starts in year {reinsurance.starts_year}, inside a {pct(reinsurance.budget_share)} plan budget.</p>
            <p className="mt-3 rounded-xl bg-paper p-3 text-xs text-muted-foreground">
              A {pct(hazeStress.loss_ratio)} {hazeStress.label} is why this layer exists. It is a capital and cash safeguard, not a change to what a customer receives.
              <AssumptionTag basis={hazeStress.basis} label="capital stress" />
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi Icon={Users} label="Pilot firms" v={product.pilot.firms.toLocaleString()} sub={`${product.pilot.workers.toLocaleString()} outdoor workers · plan`} />
          <Kpi Icon={CircleDollarSign} label="Standard plan" v={sgd(standard.per_worker_week, 2)} sub={`a worker a week before GST · ${standard.source}`} />
          <Kpi Icon={Banknote} label="Claims target" v={pct(claimsShare)} sub={`${pct(observedLossRatio)} observed in the 26-year Standard result`} />
          <Kpi Icon={ShieldHalf} label="Forecast validation" v={pct(lq.validation.overall_p90_coverage)} sub={`P90 coverage in the offline validation archive`} />
        </div>
      </Section>

      <Section>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card title={`Forecast validation archive: ${monthName(lq.fan_last_month.month)}`} sub={`A historical cash forecast made each day of the month. Actual: ${sgd(lq.fan_last_month.actual)}, settled ${dayName(lq.fan_last_month.settlement_date)}. This validates the forecast process; it does not set a policy amount.`}>
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
          <Card title={`Forecast path: ${monthName(lq.fan_current_month.month)}`} sub="The same offline method, shown day by day. Customer cover stays on the published station readings and plan terms.">
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
          <Card title="Annual loss ratio by back-test year" sub={`Published target ${pct(claimsShare)}. The plan’s stop-loss attaches at ${pct(reinsurance.attachment_loss_ratio)}; haze stress is why the reserve exists.`}>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={lrYears} margin={{ left: 4, right: 8, top: 16 }}>
                <CartesianGrid vertical={false} stroke="#efebe4" />
                <XAxis dataKey="year" tick={{ fontSize: 10 }} interval={2} />
                <YAxis tick={{ fontSize: 11 }} unit="%" width={44} domain={[0, Math.max(160, Math.round(reinsurance.attachment_loss_ratio * 100) + 10)]} />
                <Tooltip formatter={(v: number) => `${v}%`} />
                <ReferenceLine y={Math.round(reinsurance.attachment_loss_ratio * 100)} stroke={BLUE} strokeDasharray="4 4" label={{ value: `stop-loss ${pct(reinsurance.attachment_loss_ratio)}`, fontSize: 10, fill: BLUE, position: "insideTopRight" }} />
                <ReferenceLine y={Math.round(claimsShare * 100)} stroke="#8b8d8e" strokeDasharray="2 4" label={{ value: `target ${pct(claimsShare)}`, fontSize: 10, position: "insideTopLeft" }} />
                <Bar dataKey="lr" name="loss ratio" radius={[3, 3, 0, 0]}>
                  {lrYears.map((y) => (
                    <Cell key={y.year} fill={y.lr > 100 ? "#b35300" : ORANGE} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
              {product.premium_split.map((part) => (
                <div key={part.id} className="rounded-xl bg-paper p-3">
                  <p className="text-muted-foreground">{part.label}</p>
                  <p className="num mt-1 font-heading text-lg font-bold">{pct(part.share)}</p>
                  {part.note ? <p className="mt-1 text-[11px] text-muted-foreground">{part.note}</p> : null}
                </div>
              ))}
            </div>
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
          <Card title="Published pricing boundary" sub="The plan terms decide the amount. Forecasts and checks do not.">
            <ul className="divide-y divide-line-soft text-sm">
              {product.plans.map((plan) => (
                <li key={plan.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <span>
                    <span className="block font-semibold">{plan.name}</span>
                    <span className="block text-xs text-muted-foreground">{plan.deductible_label}</span>
                  </span>
                  <span className="num text-right font-semibold">{sgd(plan.per_worker_week, 2)}<span className="block text-[11px] font-normal text-muted-foreground">a worker / week</span></span>
                </li>
              ))}
            </ul>
            <p className="mt-4 rounded-xl bg-paper p-3 text-xs leading-relaxed text-muted-foreground">Price uses the selected plan and declared outdoor headcount. It never uses nationality, age, health, gender or worker personal data.</p>
          </Card>
          <Card title="Human review boundary" sub="A checker explains a reason. It does not reject a claim.">
            <p className="text-sm leading-relaxed text-muted-foreground">Site Match is an optional Labs pilot rider, not part of core cover. A log outside its published band is sent to a person with the reason shown.</p>
            <Link href="/employer/site-match" className="mt-4 inline-flex font-semibold text-income-blue underline underline-offset-2">Open the Site Match pilot</Link>
          </Card>
          <Card title="Data boundary" sub="Only the fields needed to run the cover are collected.">
            <p className="text-sm leading-relaxed text-muted-foreground">{product.pdpa_fields_collected.join(", ")}. Workers scan a notice and do not need an account.</p>
            <p className="mt-4 rounded-xl bg-paper p-3 text-xs leading-relaxed text-muted-foreground">Missing station data stays pending. It is never converted into a zero result.</p>
          </Card>
        </div>
        <SourceNote>Product terms from product.json. Forecast calibration from the offline engine archive in docs/liquidity-validation.md.</SourceNote>
      </Section>
    </>
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
