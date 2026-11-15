"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from "recharts";

import { AssumptionTag, PageHeader, Section, SourceNote } from "@/components/brand";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { pct, sgd } from "@/lib/format";
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

export default function Lab({ bt, grid, premium, val }: { bt: Backtest; grid: Grid; premium: number; val: Validation }) {
  const [shift, setShift] = useState(0);
  const [err, setErr] = useState(0);
  const [nearmiss, setNearmiss] = useState(true);
  const [allow, setAllow] = useState(1.25);
  const [benefit, setBenefit] = useState(8);
  const [mcap, setMcap] = useState(20);
  const [ycap, setYcap] = useState(60);
  const [rule, setRule] = useState("nearest");
  const delta = Math.round((err - shift) * 2) / 2;
  const key = `${rule}|${delta}|${nearmiss ? 1 : 0}|${allow}|${mcap}|${ycap}`;
  const cell = grid.cells[key];
  const years = bt.base.years;
  const premFor = (premium * benefit) / 8;
  const series = useMemo(() => cell.y.map((h, i) => ({ year: years[i], payout: +(h * benefit).toFixed(2), lr: (h * benefit) / premFor })), [cell, years, benefit, premFor]);
  const lrs = series.map((s) => s.lr).sort((a, b) => a - b);
  const q = (p: number) => lrs[Math.min(lrs.length - 1, Math.max(0, Math.ceil(p * lrs.length) - 1))];
  const lr10 = q(0.9);
  const meanPay = series.reduce((a, s) => a + s.payout, 0) / series.length;
  const isBase = key === "nearest|0|1|1.25|20|60" && benefit === 8;
  const hist = useMemo(() => {
    const bins = [0, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 5];
    return bins.slice(0, -1).map((b, i) => ({ bin: `${Math.round(b * 100)}-${Math.round(bins[i + 1] * 100)}%`, n: lrs.filter((x) => x >= b && x < bins[i + 1]).length, lo: b }));
  }, [lrs]);

  return (
    <>
      <PageHeader eyebrow="Back-test lab" title="Move the rules, see the book">
        The exact product rules run on {years[0]} to {years[years.length - 1]}: NEA WBGT where observed and a corrected ERA5 rebuild before that, MSS daily rain, NEA PSI where pulled. Every slider setting was precomputed by the engine.
      </PageHeader>
      <Section>
        <div className="grid gap-6 lg:grid-cols-4">
          <div className="space-y-5 rounded-2xl border border-line bg-surface p-5 lg:col-span-1">
            <Ctl label={`Heat thresholds ${shift >= 0 ? "+" : ""}${shift} C`} sub={`Tiers at ${(31.5 + shift).toFixed(1)} / ${(32 + shift).toFixed(1)} / ${(33 + shift).toFixed(1)}`}>
              <Slider min={-0.5} max={0.5} step={0.5} value={[shift]} onValueChange={(v) => setShift(v[0])} aria-label="Threshold shift" />
            </Ctl>
            <Ctl label={`Reading error ${err >= 0 ? "+" : ""}${err} C`} sub="Station reads higher or lower than truth">
              <Slider min={-0.5} max={0.5} step={0.5} value={[err]} onValueChange={(v) => setErr(v[0])} aria-label="Estimation error" />
            </Ctl>
            <label className="flex items-center justify-between text-sm">
              Near-miss tier (31.5 to 31.9: 5 min) <Switch checked={nearmiss} onCheckedChange={setNearmiss} aria-label="Near-miss tier" />
            </label>
            <Ctl label={`Allowance: normal x ${allow}`}>
              <Slider min={1} max={1.5} step={0.25} value={[allow]} onValueChange={(v) => setAllow(v[0])} aria-label="Allowance multiple" />
            </Ctl>
            <Ctl label={`Benefit S$${benefit} an hour`}>
              <Slider min={5} max={10} step={1} value={[benefit]} onValueChange={(v) => setBenefit(v[0])} aria-label="Benefit" />
            </Ctl>
            <Ctl label={`Monthly cap ${mcap} h`}>
              <Slider min={10} max={30} step={10} value={[mcap]} onValueChange={(v) => setMcap(v[0])} aria-label="Monthly cap" />
            </Ctl>
            <Ctl label={`Yearly cap ${ycap} h`}>
              <Slider min={40} max={80} step={20} value={[ycap]} onValueChange={(v) => setYcap(v[0])} aria-label="Yearly cap" />
            </Ctl>
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
              onClick={() => { setShift(0); setErr(0); setNearmiss(true); setAllow(1.25); setBenefit(8); setMcap(20); setYcap(60); setRule("nearest"); }}
            >
              {isBase ? "Showing the product as filed" : "Reset to the product"}
            </button>
          </div>

          <div className="space-y-6 lg:col-span-3">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Kpi label="Expected insured hours" v={`${cell.h.toFixed(2)} h`} sub="a worker a year" />
              <Kpi label="Years with no payout" v={`${cell.z} of ${years.length}`} sub={`book; average firm ${cell.zf}`} />
              <Kpi label="Months paying something" v={`${cell.m}%`} sub="share of firm-months" />
              <Kpi label="1-in-10 loss ratio" v={pct(lr10)} sub={`at ${sgd(premFor, 2)} a worker a year`} tag="Premium for this benefit at the current pricing. Loss ratio = payout / premium." />
            </div>
            <Card title="Payout a worker by year" sub={`Mean ${sgd(meanPay, 2)}. Haze before 2025 is not in the data, so haze years are understated.`}>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={series} margin={{ left: 0, right: 8, top: 8 }}>
                  <CartesianGrid vertical={false} stroke="#efebe4" />
                  <XAxis dataKey="year" tick={{ fontSize: 11 }} interval={2} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `S$${v}`} width={52} />
                  <Tooltip formatter={(v: number) => sgd(v, 2)} />
                  <ReferenceLine y={premFor * 0.65} stroke={BLUE} strokeDasharray="4 4" label={{ value: "65% of premium", fontSize: 10, fill: BLUE, position: "insideTopRight" }} />
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
            <SourceNote>Engine back-test (docs/backtest.md) and WBGT validation (docs/wbgt-validation.md). Rain window share {bt.rain_window_share} ({bt.rain_window_share_basis}).</SourceNote>
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
