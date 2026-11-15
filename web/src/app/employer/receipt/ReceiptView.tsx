"use client";

import { CalendarCheck, CircleHelp, ExternalLink, Lock, MessageCircleQuestion } from "lucide-react";
import { useMemo, useState } from "react";

import { AssumptionTag, Ellipsis, PageHeader, Section, SourceNote, StateBadge } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { dayName, monthName, num, sgd } from "@/lib/format";
import type { HourLine, Receipt } from "@/lib/types";
import { useJSON } from "@/lib/useJSON";
import { cn } from "@/lib/utils";

export type ReceiptIndex = { uen: string; firm: string; month: string; payout: number; insured_h: number; pending: number };

const LANGS: [string, string][] = [["en", "English"], ["ms", "Malay"], ["zh", "Mandarin"], ["ta", "Tamil"], ["bn", "Bengali"], ["my", "Burmese"]];

function pickDefault(index: ReceiptIndex[]) {
  const paid = index.filter((r) => r.payout > 0).sort((a, b) => b.month.localeCompare(a.month));
  return paid[0] ?? index[index.length - 1];
}

export default function ReceiptView({ index }: { index: ReceiptIndex[] }) {
  const def = pickDefault(index);
  const [uen, setUen] = useState(def.uen);
  const [month, setMonth] = useState(def.month);
  const firms = useMemo(() => Array.from(new Map(index.map((r) => [r.uen, r.firm])).entries()), [index]);
  const months = index.filter((r) => r.uen === uen);
  const { data: r, loading, error } = useJSON<Receipt>(`receipt_${uen}_${month}.json`);

  return (
    <>
      <PageHeader eyebrow="Monthly receipt" title="What we counted, and why">
        Every counted hour, the reading, the station, your allowance, the caps and what did not count. No claim form.
      </PageHeader>
      <Section>
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <Tabs value={uen} onValueChange={(v) => { setUen(v); const m = index.filter((x) => x.uen === v); setMonth((m.find((x) => x.month === month) ?? m[m.length - 1]).month); }}>
            <TabsList>
              {firms.map(([u, n]) => (
                <TabsTrigger key={u} value={u}>
                  {n}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <label className="flex items-center gap-2 text-sm">
            Month
            <select className="rounded-lg border border-line bg-surface px-3 py-1.5" value={month} onChange={(e) => setMonth(e.target.value)} aria-label="Month">
              {months.map((m) => (
                <option key={m.month} value={m.month}>
                  {monthName(m.month)} {m.payout > 0 ? `· ${sgd(m.payout)}` : m.pending ? "· pending hours" : ""}
                </option>
              ))}
            </select>
          </label>
        </div>

        {loading ? (
          <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-10">
            <Ellipsis variant="loader" /> Loading receipt
          </div>
        ) : error || !r ? (
          <p className="rounded-2xl bg-state-review-bg p-6 text-state-review">Could not load this receipt. {error}</p>
        ) : (
          <ReceiptBody r={r} />
        )}
      </Section>
    </>
  );
}

function ReceiptBody({ r }: { r: Receipt }) {
  const [lang, setLang] = useState("en");
  const [q, setQ] = useState<"explain" | "why">("explain");
  const h = r.perils.heat;
  const rn = r.perils.rain;
  const z = r.perils.haze;
  const pending = h.pending_hours + rn.pending_hours + z.pending_days;
  const capped = r.insured_after_caps_h < r.insured_before_caps_h;
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <div className="rounded-2xl border border-line bg-surface p-6 shadow-[var(--shadow-card)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">
                {r.firm.name} · {r.firm.uen} · {r.firm.plan}, S${r.firm.benefit_sgd} a worker an hour · {r.firm.outdoor_workers} workers
              </p>
              <h2 className="mt-1 text-2xl font-bold">{monthName(r.month)}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Heat: {r.stations.primary.name} ({r.stations.primary.station_id}) · Rain: {r.stations.rain_gauge.name} ({r.stations.rain_gauge.station_id}) · Haze: {r.stations.psi_region} PSI
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Payout</p>
              <p className="num font-heading text-4xl font-bold text-income-orange-700">{sgd(r.payout_sgd)}</p>
              <p className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                <CalendarCheck className="h-3.5 w-3.5" /> PayNow to your UEN by {dayName(r.settlement_date)}
              </p>
              {r.payout_sgd > 0 ? (
                <p className="mt-1 flex items-center justify-end gap-2 text-xs text-income-orange-700">
                  <Ellipsis size="sm" variant="loader" /> payout on its way
                </p>
              ) : null}
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <Peril title="Heat rest" counted={h.counted_h} normal={h.normal_h} allow={h.allowance_h} insured={h.insured_h} pending={h.pending_hours} assumption={h.normal_is_assumption} basis={h.normal_basis} forfeited={h.forfeited} />
            <Peril title="Heavy rain" counted={rn.counted_h} normal={rn.normal_h} allow={rn.allowance_h} insured={rn.insured_h} pending={rn.pending_hours} assumption={rn.normal_is_assumption} basis={rn.normal_basis} />
            <div className="rounded-xl bg-paper p-4">
              <p className="text-sm font-semibold">Haze</p>
              <p className="num mt-2 text-2xl font-bold">{num(z.counted_h)} h</p>
              <p className="text-xs text-muted-foreground">No allowance for haze. 20 h a year limit.</p>
              {z.pending_days ? <StateBadge state="PENDING" className="mt-2" /> : null}
            </div>
          </div>

          <table className="mt-6 w-full text-sm">
            <tbody>
              <Row k="Insured hours before caps" v={`${num(r.insured_before_caps_h)} h`} />
              <Row k={`Caps: ${r.monthly_cap_h} h a month, ${r.yearly_cap_h} h a year (${num(r.ytd_insured_before_h)} h used before this month)`} v={capped ? `cut to ${num(r.insured_after_caps_h)} h` : "not reached"} />
              <Row k={`${num(r.insured_after_caps_h)} h x S$${r.firm.benefit_sgd} x ${r.firm.outdoor_workers} workers`} v={sgd(r.payout_sgd)} strong />
            </tbody>
          </table>
          {pending ? (
            <p className="mt-3 rounded-xl border border-dashed border-state-pending/60 bg-state-pending-bg p-3 text-sm text-state-pending">
              {pending} hours or days are pending because readings are missing. They are not treated as no event and will be settled in a later run when the data arrives.
            </p>
          ) : null}
        </div>

        <HourMap hours={r.hours} month={r.month} />

        <div className="rounded-2xl border border-line bg-surface p-6">
          <h3 className="text-lg font-bold">What did not count, and why</h3>
          <ul className="mt-3 divide-y divide-line-soft text-sm">
            {r.not_counted.slice(0, 30).map((n, i) => (
              <li key={i} className="flex flex-col gap-0.5 py-2 sm:flex-row sm:justify-between sm:gap-6">
                <span className="font-medium">{n.what}</span>
                <span className="text-muted-foreground sm:max-w-[60%] sm:text-right">{n.why}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm">
            Think a reading is wrong? Reply to this receipt and we check the data.{" "}
            <a className="inline-flex items-center gap-1 text-income-blue-600 underline" href="https://www.fidrec.com.sg/" target="_blank" rel="noreferrer">
              You can also go to FIDReC <ExternalLink className="h-3 w-3" />
            </a>
          </p>
        </div>
      </div>

      <aside className="space-y-4">
        <div className="sticky top-20 rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow-card)]">
          <p className="flex items-center gap-2 font-semibold">
            <MessageCircleQuestion className="h-5 w-5 text-income-orange" /> Ask about this receipt
          </p>
          <div className="mt-3 flex flex-wrap gap-1">
            {LANGS.map(([k, n]) => (
              <button key={k} type="button" onClick={() => setLang(k)} aria-pressed={lang === k} className={cn("rounded-full px-2.5 py-1 text-xs", lang === k ? "bg-income-orange text-white" : "bg-paper hover:bg-income-orange-100")}>
                {n}
              </button>
            ))}
          </div>
          <div className="mt-3 flex flex-col gap-2">
            <Button variant={q === "explain" ? "default" : "outline"} size="sm" onClick={() => setQ("explain")}>
              Explain my receipt
            </Button>
            <Button variant={q === "why" ? "default" : "outline"} size="sm" onClick={() => setQ("why")}>
              <CircleHelp className="mr-1 h-4 w-4" /> Why wasn&apos;t I paid more?
            </Button>
          </div>
          <div className="mt-4 rounded-xl bg-paper p-4 text-sm leading-relaxed" lang={lang} aria-live="polite">
            {q === "explain" ? r.explain[lang]?.text : r.why_not_paid[lang] || r.explain[lang]?.text}
          </div>
          <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
            <Lock className="h-3 w-3" /> Numbers locked to the receipt. Any reworded answer that changes a number is thrown away.
          </p>
          {lang !== "en" ? <p className="mt-1 text-xs text-state-pending">Translations pending native-speaker review.</p> : null}
        </div>
      </aside>
    </div>
  );
}

function Peril({ title, counted, normal, allow, insured, pending, assumption, basis, forfeited }: { title: string; counted: number; normal: number; allow: number; insured: number; pending: number; assumption: boolean; basis: string; forfeited?: boolean }) {
  return (
    <div className="rounded-xl bg-paper p-4">
      <p className="text-sm font-semibold">{title}</p>
      <p className="num mt-2 text-2xl font-bold">{num(counted)} h</p>
      <p className="text-xs text-muted-foreground">counted a worker</p>
      <div className="mt-2 space-y-0.5 text-xs">
        <p className="num">
          Normal {num(normal)} h
          {assumption ? <AssumptionTag basis={basis} /> : <AssumptionTag basis={basis} label="station normal" />}
        </p>
        <p className="num">Normal plus 25%: {num(allow)} h</p>
        <p className="num font-semibold text-income-orange-700">Insured: {forfeited ? "forfeited" : `${num(insured)} h`}</p>
      </div>
      {pending ? <StateBadge state="PENDING" className="mt-2" /> : null}
    </div>
  );
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <tr className="border-b border-line-soft last:border-0">
      <td className={cn("py-2", strong && "font-semibold")}>{k}</td>
      <td className={cn("num py-2 text-right", strong && "text-lg font-bold")}>{v}</td>
    </tr>
  );
}

const cellTone = (l?: HourLine) => {
  if (!l) return "bg-transparent";
  if (l.state === "PENDING") return "bg-state-pending-bg ring-1 ring-inset ring-state-pending/50";
  if (l.state === "TRIGGERED") return l.counted_h >= 0.25 || (l.peril === "rain" && l.counted_h >= 1) ? "bg-[#b35300]" : l.counted_h >= 0.16 ? "bg-income-orange" : "bg-income-orange-200";
  return "bg-line-soft";
};

function HourMap({ hours, month }: { hours: HourLine[]; month: string }) {
  const [peril, setPeril] = useState<"heat" | "rain">("heat");
  const lines = hours.filter((h) => h.peril === peril);
  const byDay = new Map<string, Map<number, HourLine>>();
  for (const l of lines) {
    const d = l.ts.slice(0, 10);
    const hr = Number(l.ts.slice(11, 13));
    if (!byDay.has(d)) byDay.set(d, new Map());
    byDay.get(d)!.set(hr, l);
  }
  const days = Array.from(byDay.keys()).sort();
  const hrs = [8, 9, 10, 11, 13, 14, 15, 16, 17];
  return (
    <div className="rounded-2xl border border-line bg-surface p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-bold">Hour by hour, {monthName(month)}</h3>
        <Tabs value={peril} onValueChange={(v) => setPeril(v as "heat" | "rain")}>
          <TabsList>
            <TabsTrigger value="heat">Heat</TabsTrigger>
            <TabsTrigger value="rain">Rain</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="text-[11px]">
          <thead>
            <tr>
              <th className="pr-2 text-left font-normal text-muted-foreground">Day</th>
              {hrs.map((h) => (
                <th key={h} className="num w-8 font-normal text-muted-foreground">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {days.map((d) => (
              <tr key={d}>
                <td className="num whitespace-nowrap pr-2 text-muted-foreground">{new Date(d + "T00:00:00").toLocaleDateString("en-SG", { weekday: "short", day: "numeric" })}</td>
                {hrs.map((h) => {
                  const l = byDay.get(d)!.get(h);
                  const label = l ? `${d} ${h}:00 ${l.state.replace("_", " ").toLowerCase()}${l.reading != null ? `, ${l.reading} ${l.unit}` : ""}${l.counted_h ? `, ${Math.round(l.counted_h * 60)} min counted` : ""}. ${l.detail}` : "";
                  return (
                    <td key={h} className="p-0.5">
                      <div className={cn("h-5 w-7 rounded", cellTone(l))} title={label} aria-label={label} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><span className="h-3 w-4 rounded bg-line-soft" /> not triggered</span>
        <span className="flex items-center gap-1"><span className="h-3 w-4 rounded bg-income-orange-200" /> {peril === "heat" ? "5 min" : "0.5 h"}</span>
        <span className="flex items-center gap-1"><span className="h-3 w-4 rounded bg-income-orange" /> 10 min</span>
        <span className="flex items-center gap-1"><span className="h-3 w-4 rounded bg-[#b35300]" /> {peril === "heat" ? "15 min" : "1 h"}</span>
        <span className="flex items-center gap-1"><span className="h-3 w-4 rounded bg-state-pending-bg ring-1 ring-state-pending/50" /> pending</span>
        <span>12:00 meal hour and Sundays are not insured. Hover a cell for the reading and source.</span>
      </div>
      <SourceNote>NEA via data.gov.sg; fallback ladder: named station, backup, regional median, then pending.</SourceNote>
    </div>
  );
}
