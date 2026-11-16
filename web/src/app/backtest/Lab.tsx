"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from "recharts";

import { AssumptionTag, PageHeader, Section, SourceNote } from "@/components/brand";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { pct, sgd } from "@/lib/format";
import { productPlan, type ProductSpec } from "@/lib/product";
import type { Backtest } from "@/lib/types";

export type Grid = {
  dims: { rule: string[]; delta: number[]; nearmiss: number[]; allow: number[]; mcap: number[]; ycap: number[] };
  cells: Record<string, { h: number; z: number; zf: number; m: number; y: number[] }>;
};
export type Validation = {
  report: { train_period: string[]; test_period: string[]; overall_window_corrected: { mae: number; band_agreement: number; mae_31_34: number; band_agreement_31_34: number; n: number } };
  scatter: { obs: number; rebuilt: number }[];
};

const ORANGE = "#f57100";
const BLUE = "#00467a";
const MUTED = "#8b8d8e";
const RULES: Record<string, string> = { nearest: "Nearest station", second: "Second nearest", median3: "Median of three" };

export default function Lab({ bt, grid, product, val }: { bt: Backtest; grid: Grid; product: ProductSpec; val: Validation }) {
  const defaultPlan = productPlan(product);
  const [shift, setShift] = useState(0);
  const [err, setErr] = useState(0);
  const [nearmiss, setNearmiss] = useState(true);
  const [planId, setPlanId] = useState(defaultPlan.id);
  const [rule, setRule] = useState("nearest");
  const plan = productPlan(product, planId);
  const benefit = product.product.benefit_per_worker_hour;
  const publishedCalibration = product.unit_economics_standard_per_worker;
  const mcap = product.limits.insured_hours_per_month;
  const ycap = product.limits.insured_hours_per_year;
  const allow = plan.allowance_multiple;
  const nearMissTier = product.triggers.heat.tiers[0];
  const targetLossRatio = product.premium_split.find((part) => part.id === "claims")!.share;
  const delta = Math.round((err - shift) * 2) / 2;
  const key = `${rule}|${delta}|${nearmiss ? 1 : 0}|${allow}|${mcap}|${ycap}`;
  const cell = grid.cells[key] ?? grid.cells[`nearest|0|1|${defaultPlan.allowance_multiple}|${mcap}|${ycap}`];
  const years = bt.base.years;
  const premFor = plan.per_worker_year;
  const series = useMemo(() => cell.y.map((h, i) => ({ year: years[i], payout: +(h * benefit).toFixed(2), lr: (h * benefit) / premFor })), [cell, years, benefit, premFor]);
  const lrs = series.map((s) => s.lr).sort((a, b) => a - b);
  const q = (p: number) => lrs[Math.min(lrs.length - 1, Math.max(0, Math.ceil(p * lrs.length) - 1))];
  const lr10 = q(0.9);
  const meanPay = series.reduce((a, s) => a + s.payout, 0) / series.length;
  const isBase = key === `nearest|0|1|${defaultPlan.allowance_multiple}|${mcap}|${ycap}`;
  const hist = useMemo(() => {
    const bins = [0, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 5];
    return bins.slice(0, -1).map((b, i) => ({ bin: `${Math.round(b * 100)}-${Math.round(bins[i + 1] * 100)}%`, n: lrs.filter((x) => x >= b && x < bins[i + 1]).length, lo: b }));
  }, [lrs]);

  return (
    <>
      <PageHeader eyebrow="Labs / pricing and back-test" title={`${plan.name}: ${sgd(plan.per_worker_week, 2)} a worker a week before GST`}>
        Test the published deductible against the historical record. This lab reads precomputed engine results only. Changing a control here never changes a policy, a price or a payout.
      </PageHeader>
      <Section>
        <div className="grid gap-6 lg:grid-cols-4">
          <div className="space-y-5 rounded-2xl border border-line bg-surface p-5 lg:col-span-1">
            <div className="space-y-2">
              <p className="text-sm font-medium">Choose a deductible</p>
              <Tabs value={planId} onValueChange={setPlanId}>
                <TabsList className="grid h-auto w-full grid-cols-3">
                  {product.plans.map((item) => (
                    <TabsTrigger key={item.id} value={item.id} className="px-2 py-2 text-xs">
                      {item.name}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {plan.deductible_label}. {plan.months_that_pay} months pay. {sgd(plan.per_worker_week, 2)} a worker a week before GST.
              </p>
              <SourceNote className="mt-1">{plan.source} plan terms in the product schedule.</SourceNote>
            </div>
            <Ctl
              label={`Heat thresholds ${shift >= 0 ? "+" : ""}${shift} C`}
              sub={`Tiers at ${product.triggers.heat.tiers.map((tier) => `${(tier.from + shift).toFixed(1)} C`).join(" / ")}`}
            >
              <Slider min={-0.5} max={0.5} step={0.5} value={[shift]} onValueChange={(v) => setShift(v[0])} aria-label="Threshold shift" />
            </Ctl>
            <Ctl label={`Reading error ${err >= 0 ? "+" : ""}${err} C`} sub="Station reads higher or lower than truth">
              <Slider min={-0.5} max={0.5} step={0.5} value={[err]} onValueChange={(v) => setErr(v[0])} aria-label="Estimation error" />
            </Ctl>
            <label className="flex items-center justify-between text-sm">
              Near-miss tier ({nearMissTier.from} to {nearMissTier.to}: {nearMissTier.rest_minutes} min) <Switch checked={nearmiss} onCheckedChange={setNearmiss} aria-label="Near-miss tier" />
            </label>
            <div className="rounded-xl bg-paper p-3 text-xs leading-relaxed text-muted-foreground">
              <p><span className="font-semibold text-ink">Fixed on every plan:</span> {sgd(benefit)} an insured hour.</p>
              <p className="mt-1">Limits: {mcap} insured hours a month and {ycap} a year.</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm">Station rule</p>
              <Tabs value={rule} onValueChange={setRule}>
                <TabsList className="flex w-full">
                  {grid.dims.rule.map((r) => (
                    <TabsTrigger key={r} value={r} className="flex-1 text-xs">
                      {RULES[r].split(" ")[0]}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
              <p className="text-xs text-muted-foreground">{RULES[rule]}</p>
            </div>
            <button
              type="button"
              className="text-sm text-income-blue-600 underline disabled:text-muted-foreground disabled:no-underline"
              disabled={isBase}
              onClick={() => { setShift(0); setErr(0); setNearmiss(true); setPlanId(defaultPlan.id); setRule("nearest"); }}
            >
              {isBase ? "Showing the default product terms" : "Reset to the default product terms"}
            </button>
          </div>

          <div className="space-y-6 lg:col-span-3">
            <div className="rounded-2xl border border-income-blue-100 bg-income-blue-50 p-4 text-sm leading-relaxed text-ink">
              <p className="font-semibold text-income-blue">Published Standard calibration</p>
              <p className="mt-1 text-muted-foreground">
                The schedule uses {publishedCalibration.expected_insured_hours_year.value.toFixed(2)} insured hours and {sgd(publishedCalibration.expected_payout_year.value, 2)} expected payout a worker a year, including its stated haze load. The charts below use the generated 500-firm geographic mix as a portfolio diagnostic, so they can differ without changing a customer price or payout.
                <AssumptionTag basis="The pricing calibration retains a 1.0-hour haze load because earlier PSI history is incomplete. The 500-firm mix is a separate portfolio diagnostic." label="calibration basis" />
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Kpi label="Expected insured hours" v={`${cell.h.toFixed(2)} h`} sub="a worker a year · 500-firm portfolio diagnostic" />
              <Kpi label="Years with no payout" v={`${cell.z} of ${years.length}`} sub={`book; average firm ${cell.zf}`} />
              <Kpi label="Months paying something" v={`${cell.m}%`} sub="share of firm-months" />
              <Kpi label="1-in-10 loss ratio" v={pct(lr10)} sub={`at ${sgd(premFor, 2)} a worker a year`} tag={`${plan.source} price from the selected published plan. Loss ratio = payout / premium.`} />
            </div>
            <Card title="Payout a worker by year" sub={`Mean ${sgd(meanPay, 2)}. Historical haze coverage is incomplete, so older haze years are understated.`}>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={series} margin={{ left: 0, right: 8, top: 8 }}>
                  <CartesianGrid vertical={false} stroke="#efebe4" />
                  <XAxis dataKey="year" tick={{ fontSize: 11 }} interval={2} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `S$${v}`} width={52} />
                  <Tooltip formatter={(v: number) => sgd(v, 2)} />
                  <ReferenceLine y={premFor * targetLossRatio} stroke={BLUE} strokeDasharray="4 4" label={{ value: `${pct(targetLossRatio)} of premium`, fontSize: 10, fill: BLUE, position: "insideTopRight" }} />
                  <Bar dataKey="payout" radius={[4, 4, 0, 0]}>
                    {series.map((s) => (
                      <Cell key={s.year} fill={s.lr > 1 ? "#b35300" : ORANGE} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
            <div className="grid gap-6 xl:grid-cols-2">
              <Card title="Loss ratio distribution" sub={`1-in-10: ${pct(lr10)}. Years above 100% are dark.`}>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={hist}>
                    <CartesianGrid vertical={false} stroke="#efebe4" />
                    <XAxis dataKey="bin" tick={{ fontSize: 10 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={28} />
                    <Tooltip />
                    <Bar dataKey="n" name="years" radius={[4, 4, 0, 0]}>
                      {hist.map((h) => (
                        <Cell key={h.bin} fill={h.lo >= 1 ? "#b35300" : ORANGE} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>
              <Card title="What moves the payout most" sub="Change in expected payout a worker from the product as filed">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={bt.tornado} layout="vertical" margin={{ left: 8 }}>
                    <CartesianGrid horizontal={false} stroke="#efebe4" />
                    <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v > 0 ? "+" : ""}${v}`} />
                    <YAxis type="category" dataKey="case" width={170} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v: number) => `${v > 0 ? "+" : ""}S$${v}`} />
                    <ReferenceLine x={0} stroke={MUTED} />
                    <Bar dataKey="d_payout" name="change">
                      {bt.tornado.map((t) => (
                        <Cell key={t.case} fill={t.d_payout >= 0 ? ORANGE : BLUE} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </div>
            <div className="grid gap-6 xl:grid-cols-2">
              <Card title="Basis risk by station" sub={`Share of work hours where the named station is below 31.5 C while a nearest neighbour is above. Overall ${bt.basis_risk.overall_pct}%.`}>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={bt.basis_risk.by_station.slice(0, 15)} layout="vertical" margin={{ left: 8 }}>
                    <CartesianGrid horizontal={false} stroke="#efebe4" />
                    <XAxis type="number" tick={{ fontSize: 11 }} unit="%" />
                    <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v: number) => `${v}%`} />
                    <Bar dataKey="basis_risk_pct" name="basis risk" fill={BLUE} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
              <Card
                title="WBGT rebuild vs NEA near the threshold"
                sub={`Held-out ${val.report.test_period[0].slice(0, 10)} to ${val.report.test_period[1].slice(0, 10)}. MAE ${val.report.overall_window_corrected.mae} C; band agreement ${pct(val.report.overall_window_corrected.band_agreement)} overall, ${pct(val.report.overall_window_corrected.band_agreement_31_34)} when NEA reads 31 to 34 C. Payouts never use the rebuild.`}
              >
                <ResponsiveContainer width="100%" height={260}>
                  <ScatterChart margin={{ left: 0, right: 8, top: 8 }}>
                    <CartesianGrid stroke="#efebe4" />
                    <XAxis type="number" dataKey="obs" name="NEA" domain={[29.5, 35.5]} tick={{ fontSize: 11 }} unit=" C" />
                    <YAxis type="number" dataKey="rebuilt" name="Rebuilt" domain={[28, 36]} tick={{ fontSize: 11 }} width={40} />
                    <ZAxis range={[14, 14]} />
                    <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                    <ReferenceLine segment={[{ x: 29.5, y: 29.5 }, { x: 35.5, y: 35.5 }]} stroke={MUTED} strokeDasharray="4 4" />
                    <ReferenceLine x={32} stroke={ORANGE} strokeDasharray="2 4" />
                    <ReferenceLine y={32} stroke={ORANGE} strokeDasharray="2 4" />
                    <Scatter data={val.scatter} fill={BLUE} fillOpacity={0.45} />
                  </ScatterChart>
                </ResponsiveContainer>
              </Card>
            </div>
            <SourceNote>Engine back-test (docs/backtest.md) and WBGT validation (docs/wbgt-validation.md). Rain window share {bt.rain_window_share} ({bt.rain_window_share_basis}). Published plan terms come from product.json.</SourceNote>
          </div>
        </div>
      </Section>
    </>
  );
}

function Ctl({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="num text-sm">{label}</p>
      {children}
      {sub ? <p className="text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

function Kpi({ label, v, sub, tag }: { label: string; v: string; sub: string; tag?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="num mt-1 font-heading text-2xl font-bold">
        {v}
        {tag ? <AssumptionTag basis={tag} label="basis" /> : null}
      </p>
      <p className="text-xs text-muted-foreground">{sub}</p>
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
