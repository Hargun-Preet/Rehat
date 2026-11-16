"use client";

import Link from "next/link";
import { Banknote, CalendarClock, CircleDollarSign, ShieldHalf, Users } from "lucide-react";
import { Area, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { AssumptionTag, PageHeader, Section, SourceNote } from "@/components/brand";
import { dayName, monthName, pct, sgd } from "@/lib/format";
import { productPlan, type ProductSpec } from "@/lib/product";
import { cn } from "@/lib/utils";

type FanPt = { day: number; p10: number; p50: number; p90: number; p99: number; accrued: number };
type Fc = { asof: string; month: string; settlement_date: string; p10: number; p50: number; p90: number; p99: number; buffer_p99_minus_p50: number; days_known: number; forecast_days_used: number; insured_if_month_ended_today: number };
export type Liquidity = {
  asof: string;
  book: { firms: number; workers: number; scope?: string };
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
  const splitText = product.premium_split.map((part) => String(Math.round(part.share * 100))).join(" / ");
  const forecastCount = lq.validation.by_asof_day.reduce((total, row) => total + row.months, 0);
  const rainShareFact = product.facts.find((fact) => fact.id === "rain_share");
  if (!rainShareFact) throw new Error("Missing rain-share product fact.");
  const lrYears = Object.entries(lq.annual.loss_ratio_by_year).map(([y, v]) => ({ year: y, lr: Math.round(v * 100) }));
  const fan = lq.fan_last_month.series.map((p) => ({ ...p, band: [p.p10, p.p90] as [number, number] }));
  const cur = lq.fan_current_month.series.map((p) => ({ ...p, band: [p.p10, p.p90] as [number, number] }));

  return (
    <>
      <PageHeader eyebrow="Income / portfolio console" title={`${sgd(product.three_year_path.total_profit)} planned profit across three years`}>
        The plan allocates {splitText} of each premium dollar to claims, expenses, reinsurance and profit. Forecasts plan cash and reinsurance only. They never change a customer&apos;s payout or price.
      </PageHeader>
      <Section>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border-2 border-income-orange bg-surface p-6 shadow-[var(--shadow-raised)] lg:col-span-2">
            <p className="flex items-center gap-2 text-sm font-semibold text-income-orange-700">
              <CircleDollarSign className="h-4 w-4" /> Where each premium dollar goes
            </p>
            <p className="num mt-2 font-heading text-3xl font-bold text-ink">{splitText}</p>
            <p className="mt-1 text-sm text-muted-foreground">Claims / expenses / reinsurance / profit</p>
            <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {product.premium_split.map((part) => <Big key={part.id} label={part.label} v={pct(part.share)} />)}
            </div>
            <SourceNote>plan from product.json. Observed Standard claims returned {pct(observedLossRatio)} in the 26-year back-test.</SourceNote>
          </div>
          <div className="rounded-2xl border border-line bg-surface p-6">
            <p className="flex items-center gap-2 text-sm font-semibold text-income-blue">
              <CalendarClock className="h-4 w-4" /> Three-year plan
            </p>
            <Big label="Planned profit" v={sgd(product.three_year_path.total_profit)} strong />
            <p className="mt-2 text-sm text-muted-foreground">{product.three_year_path.note}</p>
            <SourceNote>plan</SourceNote>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Kpi Icon={Users} label="All covered crews, later" v={marketSgd(product.market.all_crews.premium)} sub="annual premium across construction, shipyard and process crews" source={product.market.all_crews.source} />
          <Kpi Icon={CircleDollarSign} label="Small firms in scope" v={marketSgd(product.market.small_firms.premium)} sub={`${product.market.small_firms.employers.toLocaleString()} employers at the midpoint`} source={product.market.small_firms.source} />
          <Kpi Icon={Banknote} label="1% of work injury cover" v={marketSgd(product.market.wic_line.one_percent)} sub="annual premium equivalent" source={product.market.wic_line.source} />
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-line bg-surface p-6">
            <p className="flex items-center gap-2 text-sm font-semibold text-income-blue"><Users className="h-4 w-4" /> Pilot plan and cash sample</p>
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Big label="Pilot firms" v={product.pilot.firms.toLocaleString()} />
              <Big label="Pilot workers" v={product.pilot.workers.toLocaleString()} />
              <Big label="Pilot premium" v={sgd(product.pilot.premium)} />
              <Big label="Year-one profit" v={sgd(product.pilot.expected_profit)} strong />
            </div>
            <p className="mt-4 rounded-xl bg-paper p-3 text-xs leading-relaxed text-muted-foreground">
              The offline cash diagnostic uses {lq.book.firms.toLocaleString()} fictional firms and {lq.book.workers.toLocaleString()} workers. {lq.book.scope ?? "It is not the planned pilot headcount."}
            </p>
            <SourceNote>pilot plan and offline simulation</SourceNote>
          </div>
          <div className="rounded-2xl border border-line bg-surface p-6">
            <p className="flex items-center gap-2 text-sm font-semibold"><ShieldHalf className="h-4 w-4 text-income-blue" /> Reinsurance and cap</p>
            <p className="mt-2 font-heading text-2xl font-bold">Stop-loss at {pct(reinsurance.attachment_loss_ratio)}</p>
            <p className="text-sm text-muted-foreground">Aggregate cover starts in year {reinsurance.starts_year}, inside a {pct(reinsurance.budget_share)} plan budget. The pilot cap is {sgd(product.pilot.capped_worst_case)}.</p>
            <p className="mt-3 rounded-xl bg-paper p-3 text-xs text-muted-foreground">
              A {pct(hazeStress.loss_ratio)} {hazeStress.label} is why this layer exists. It is a capital and cash safeguard, not a change to what a customer receives.
              <AssumptionTag basis={hazeStress.basis} label="capital stress" />
            </p>
          </div>
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
            <p className="mt-3 rounded-xl bg-paper p-3 text-xs leading-relaxed text-muted-foreground">
              Earlier low points coincide with thinner local rainfall coverage. Where a local station has no historical day, the back-test uses same-day Changi rainfall. Read this as a coverage-limited diagnostic, not an observed climate trend.
            </p>
            <SourceNote>back-test coverage correction</SourceNote>
          </Card>
          <Card title="Loss drivers and forecast check" sub="Loss years are very wet years and severe haze years. Season labels do not set a payout or a price.">
            <div className="grid grid-cols-2 gap-3">
              <Big label="P90 forecast coverage" v={pct(lq.validation.overall_p90_coverage)} />
              <Big label="Forecasts checked" v={forecastCount.toLocaleString()} />
              <Big label="P99 forecast coverage" v={pct(lq.validation.overall_p99_coverage)} />
              <Big label="Haze capital stress" v={pct(hazeStress.loss_ratio)} />
            </div>
            <p className="mt-4 rounded-xl bg-paper p-3 text-xs leading-relaxed text-muted-foreground">
              {rainShareFact.text}. The {hazeStress.label.toLowerCase()} is a capital-planning scenario. It never changes a customer&apos;s payout or price.
            </p>
            <SourceNote>forecast validation archive, simulation and published plan terms</SourceNote>
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

function Kpi({ Icon, label, v, sub, source }: { Icon: typeof Users; label: string; v: string; sub: string; source?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </p>
      <p className="num mt-1 font-heading text-2xl font-bold">{v}</p>
      <p className="text-xs text-muted-foreground">{sub}{source ? <span className="ml-1 font-medium text-income-blue">{source}</span> : null}</p>
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

function marketSgd(value: number) {
  const millions = value / 1_000_000;
  const digits = millions >= 10 ? 0 : 1;
  return `S$${millions.toLocaleString("en-SG", { maximumFractionDigits: digits, minimumFractionDigits: 0 })}M`;
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
