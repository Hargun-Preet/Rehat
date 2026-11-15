"use client";

import Link from "next/link";
import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Ellipsis, PageHeader, Section, SourceNote, StateBadge } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { sgd } from "@/lib/format";
import { cn } from "@/lib/utils";

export type ReplayData = {
  date: string;
  times: string[];
  stations: { station_id: string; name: string }[];
  readings: Record<string, number[]>;
  meal_hour: number;
  peak: { station: string; time: string; wbgt: number };
  source: string;
  firm: {
    name: string;
    workers: number;
    station: string;
    benefit: number;
    rest_minutes_today: number;
    october: {
      perils: { heat: { counted_h: number; allowance_h: number; insured_h: number }; rain: { counted_h: number; allowance_h: number; insured_h: number; pending_hours: number } };
      insured_after_caps_h: number;
      payout_sgd: number;
      settlement_date: string;
      receipt_lines: string[];
    };
  };
};

const rest = (v: number) => (v >= 33 ? 15 : v >= 32 ? 10 : v >= 31.5 ? 5 : 0);
const tone = (v: number) => (v >= 33 ? "bg-[#b35300] text-white" : v >= 32 ? "bg-income-orange text-white" : v >= 31.5 ? "bg-income-orange-200 text-ink" : "bg-paper text-ink");

/** Rest owed so far: completed clock hours (hourly mean of four readings), meal hour excluded. */
function restSoFar(vals: number[], times: string[], idx: number, meal: number) {
  let total = 0;
  const done: { hour: number; mean: number; minutes: number; meal: boolean }[] = [];
  for (let h = 8; h < 18; h++) {
    const ix = times.map((t, i) => (Number(t.slice(0, 2)) === h ? i : -1)).filter((i) => i >= 0);
    const complete = ix.length > 0 && ix[ix.length - 1] <= idx && (ix.length === 4 || idx === times.length - 1);
    if (!complete) continue;
    const xs = ix.map((i) => vals[i]);
    const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
    const m = rest(mean);
    const isMeal = h === meal;
    if (!isMeal) total += m;
    done.push({ hour: h, mean, minutes: m, meal: isMeal });
  }
  return { total, done };
}

function CountUp({ value, format }: { value: number; format: (v: number) => string }) {
  const mv = useMotionValue(0);
  const text = useTransform(mv, (v) => format(v));
  useEffect(() => {
    const c = animate(mv, value, { duration: 0.6, ease: "easeOut" });
    return () => c.stop();
  }, [value, mv]);
  return <motion.span className="num">{text}</motion.span>;
}

export default function Replay({ d }: { d: ReplayData }) {
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const last = d.times.length - 1;

  useEffect(() => {
    if (!playing) return;
    timer.current = setInterval(() => setIdx((i) => (i >= last ? i : i + 1)), 450);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [playing, last]);
  useEffect(() => {
    if (idx >= last) setPlaying(false);
  }, [idx, last]);

  const per = useMemo(
    () => Object.fromEntries(d.stations.map((s) => [s.station_id, restSoFar(d.readings[s.station_id], d.times, idx, d.meal_hour)])),
    [d, idx],
  );
  const firm = d.firm;
  const mine = per[firm.station];
  const value = (mine.total / 60) * firm.benefit * firm.workers;
  const maxRest = 65;
  const finished = idx >= last;
  const oct = firm.october;
  const network = d.stations.map((s) => per[s.station_id].total);
  const mean = network.reduce((a, b) => a + b, 0) / network.length;

  return (
    <>
      <PageHeader eyebrow="Record day replay" title="Friday 31 October 2025, a record heat-stress day">
        Real NEA readings every 15 minutes at 15 stations. Watch mandated rest build up hour by hour. Peak: 35.0 C at Sentosa at 12:15, inside the meal hour.
      </PageHeader>
      <Section>
        <div className="sticky top-16 z-20 mb-6 rounded-2xl border border-line bg-surface/95 p-4 backdrop-blur">
          <div className="flex flex-wrap items-center gap-4">
            <Button size="sm" onClick={() => (finished ? (setIdx(0), setPlaying(true)) : setPlaying(!playing))} aria-label={playing ? "Pause" : "Play"}>
              {playing ? <Pause className="h-4 w-4" /> : finished ? <RotateCcw className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              <span className="ml-1">{playing ? "Pause" : finished ? "Replay" : "Play"}</span>
            </Button>
            <p className="num w-16 font-heading text-2xl font-bold" aria-live="polite">
              {d.times[idx]}
            </p>
            <div className="min-w-[200px] flex-1">
              <Slider value={[idx]} min={0} max={last} step={1} onValueChange={(v) => { setPlaying(false); setIdx(v[0]); }} aria-label="Time of day" />
              <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
                <span>08:00</span>
                <span>12:00 meal hour</span>
                <span>17:30</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Network mean rest so far: <span className="num font-semibold text-ink">{Math.round(mean)} min</span> a worker
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:col-span-2">
            {d.stations.map((s) => {
              const v = d.readings[s.station_id][idx];
              const r = per[s.station_id];
              const isFirm = s.station_id === firm.station;
              return (
                <div key={s.station_id} className={cn("rounded-2xl border bg-surface p-3", isFirm ? "border-2 border-income-orange" : "border-line")}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium leading-tight">{s.name}</p>
                    <span className={cn("num rounded-lg px-2 py-0.5 text-sm font-semibold", tone(v))}>{v.toFixed(1)}</span>
                  </div>
                  <p className="mt-2 text-[11px] text-muted-foreground">Rest owed so far</p>
                  <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-paper" role="meter" aria-valuemin={0} aria-valuemax={maxRest} aria-valuenow={r.total} aria-label={`${s.name} rest minutes`}>
                    <motion.div className="h-full rounded-full bg-income-orange" animate={{ width: `${Math.min(100, (r.total / maxRest) * 100)}%` }} transition={{ duration: 0.4 }} />
                  </div>
                  <p className="num mt-1 text-xs">
                    <span className="font-semibold">{r.total} min</span>
                    {isFirm ? <span className="ml-1 text-income-orange-700">· {firm.name.split(" ")[0]}</span> : null}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border-2 border-income-orange bg-surface p-5 shadow-[var(--shadow-raised)]">
              <p className="text-sm text-muted-foreground">
                {firm.name}, {firm.workers} outdoor workers, named station Jurong West
              </p>
              <p className="mt-3 text-xs text-muted-foreground">Paid rest owed today, a worker</p>
              <p className="font-heading text-4xl font-bold">
                <CountUp value={mine.total} format={(v) => `${Math.round(v)} min`} />
              </p>
              <p className="mt-2 text-xs text-muted-foreground">Wages for that rest across the crew, at S${firm.benefit} an hour</p>
              <p className="font-heading text-2xl font-bold text-income-orange-700">
                <CountUp value={value} format={(v) => sgd(v, 2)} />
              </p>
              <ul className="mt-3 space-y-1 text-xs">
                {mine.done.map((h) => (
                  <li key={h.hour} className="num flex justify-between">
                    <span>
                      {String(h.hour).padStart(2, "0")}:00 hour mean {h.mean.toFixed(2)} C
                    </span>
                    <span className={cn(h.meal && "text-muted-foreground line-through")}>{h.minutes} min{h.meal ? " meal" : ""}</span>
                  </li>
                ))}
                {!mine.done.length ? (
                  <li className="flex items-center gap-2 text-muted-foreground">
                    <Ellipsis size="sm" variant="loader" /> waiting for the first full hour
                  </li>
                ) : null}
              </ul>
            </div>

            {finished ? (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-line bg-surface p-5">
                <p className="text-sm font-semibold">How this day reaches the October receipt</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Today&apos;s {mine.total} minutes join every other counted hour in October at Jurong West. Rehat pays only the hours above the station&apos;s normal October plus 25%.
                </p>
                <table className="mt-3 w-full text-sm">
                  <tbody>
                    <tr className="border-b border-line-soft">
                      <td className="py-1">Heat counted in October</td>
                      <td className="num py-1 text-right">{oct.perils.heat.counted_h.toFixed(2)} h</td>
                    </tr>
                    <tr className="border-b border-line-soft">
                      <td className="py-1">Normal plus 25%</td>
                      <td className="num py-1 text-right">{oct.perils.heat.allowance_h.toFixed(2)} h</td>
                    </tr>
                    <tr className="border-b border-line-soft">
                      <td className="py-1">Rain</td>
                      <td className="py-1 text-right">
                        {oct.perils.rain.pending_hours ? <StateBadge state="PENDING" /> : <span className="num">{oct.perils.rain.counted_h.toFixed(2)} h</span>}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1 font-semibold">October payout</td>
                      <td className="num py-1 text-right font-semibold">{sgd(oct.payout_sgd)}</td>
                    </tr>
                  </tbody>
                </table>
                <p className="mt-2 text-xs text-muted-foreground">
                  {oct.payout_sgd > 0
                    ? `Paid by PayNow by ${oct.settlement_date}.`
                    : "One record day is not a bad month. If October stays within normal at your station, nothing is paid, and the receipt says why."}
                </p>
                <Button asChild variant="secondary" size="sm" className="mt-3">
                  <Link href="/employer/receipt">Open the receipt</Link>
                </Button>
              </motion.div>
            ) : null}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-paper ring-1 ring-line" /> below 31.5</span>
          <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-income-orange-200" /> 31.5 to 31.9: 5 min</span>
          <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-income-orange" /> 32 to 32.9: 10 min</span>
          <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-[#b35300]" /> 33 and above: 15 min</span>
          <span>Badges show the current 15-minute reading; rest is set on each completed hour&apos;s mean.</span>
        </div>
        <SourceNote>{d.source}</SourceNote>
      </Section>
    </>
  );
}
