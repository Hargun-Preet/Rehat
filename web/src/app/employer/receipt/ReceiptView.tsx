"use client";

import { CalendarCheck, CircleHelp, Clock3, ExternalLink, Info, Lock, MapPin, MessageCircleQuestion } from "lucide-react";
import { useState } from "react";

import { AssumptionTag, Ellipsis, PageHeader, Section, SourceNote, StateBadge } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { dayName, monthName, num, sgd } from "@/lib/format";
import type { ProductSpec } from "@/lib/product";
import type { HourLine, Receipt } from "@/lib/types";
import { useJSON } from "@/lib/useJSON";
import { cn } from "@/lib/utils";

export type ReceiptIndex = { uen: string; firm: string; month: string; payout: number; insured_h: number; pending: number };

const LANGS: [string, string][] = [["en", "English"], ["ms", "Malay"], ["zh", "Mandarin"], ["ta", "Tamil"], ["bn", "Bengali"], ["my", "Burmese"]];

type DemoFirm = ProductSpec["demo_firm"];
type ReceiptViewProps = {
  index: ReceiptIndex[];
  defaultMonth: string;
  firm: DemoFirm;
  benefit: number;
  planName: string;
  deductibleLabel: string;
  translationBadge: string;
};

function pickDefault(index: ReceiptIndex[], preferredMonth: string) {
  const preferred = index.find((receipt) => receipt.month === preferredMonth);
  if (preferred) return preferred;
  const paid = index.filter((r) => r.payout > 0).sort((a, b) => b.month.localeCompare(a.month));
  return paid[0] ?? index[index.length - 1];
}

export default function ReceiptView(props: ReceiptViewProps) {
  const { index, firm } = props;
  if (!index.length) {
    return (
      <>
        <PageHeader eyebrow="Monthly receipt" title="No receipt is ready yet">
          We will show the first monthly receipt for {firm.name} here when the named-station evidence is available.
        </PageHeader>
        <Section>
          <div className="rounded-2xl border border-dashed border-line bg-surface p-6 text-sm text-muted-foreground" role="status">
            Receipt evidence is not available yet. Nothing has been treated as zero.
          </div>
        </Section>
      </>
    );
  }

  return <ReceiptContent {...props} />;
}

function ReceiptContent({ index, defaultMonth, firm, benefit, planName, deductibleLabel, translationBadge }: ReceiptViewProps) {
  const def = pickDefault(index, defaultMonth);
  const uen = def.uen;
  const [month, setMonth] = useState(def.month);
  const months = index.filter((r) => r.uen === uen);
  const { data: r, loading, error } = useJSON<Receipt>(`receipt_${uen}_${month}.json`);

  return (
    <>
      <PageHeader eyebrow="Monthly receipt" title="What we counted, and why">
        Every counted hour, the reading, the station, your allowance, the caps and what did not count. No claim form.
      </PageHeader>
      <Section>
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <p className="text-sm font-semibold text-ink">{firm.name}</p>
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
          <ReceiptBody r={r} firm={firm} benefit={benefit} planName={planName} deductibleLabel={deductibleLabel} translationBadge={translationBadge} />
        )}
      </Section>
    </>
  );
}

function ReceiptBody({
  r,
  firm,
  benefit,
  planName,
  deductibleLabel,
  translationBadge,
}: {
  r: Receipt;
  firm: DemoFirm;
  benefit: number;
  planName: string;
  deductibleLabel: string;
  translationBadge: string;
}) {
  const [lang, setLang] = useState("en");
  const [q, setQ] = useState<"explain" | "why">("explain");
  const h = r.perils.heat;
  const rn = r.perils.rain;
  const z = r.perils.haze;
  const pending = h.pending_hours + rn.pending_hours + z.pending_days;
  const capped = r.insured_after_caps_h < r.insured_before_caps_h;
  const payoutIsPending = pending > 0 && r.payout_sgd === 0;
  const showEnglishSource = lang !== "en";
  const answer = pending
    ? "Evidence is still pending. The confirmed amount is shown above, but this is not a payment confirmation. We will publish the locked receipt explanation when the outstanding readings are settled."
    : q === "explain"
      ? r.explain.en?.text
      : r.why_not_paid.en || r.explain.en?.text;
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="min-w-0 space-y-6 lg:col-span-2">
        <div className="rounded-2xl border border-line bg-surface p-6 shadow-[var(--shadow-card)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">
                {firm.name} · {firm.trade} · {planName}, S${benefit} a worker an hour · {firm.outdoor_workers} outdoor workers
              </p>
              <h2 className="mt-1 text-2xl font-bold">{monthName(r.month)}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Heat: {r.stations.primary.name} ({r.stations.primary.station_id}) · Rain: {r.stations.rain_gauge.name} ({r.stations.rain_gauge.station_id}) · Haze: {r.stations.psi_region} PSI
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">{pending ? "Confirmed amount so far" : "Payout"}</p>
              {payoutIsPending ? (
                <StateBadge state="PENDING" className="mt-2" />
              ) : (
                <p className="num font-heading text-4xl font-bold text-income-orange-700">{sgd(r.payout_sgd)}</p>
              )}
              {pending ? (
                <p className="ml-auto mt-1 max-w-[16rem] text-xs leading-relaxed text-state-pending">
                  Pending readings are not included. This receipt does not mark a payout as sent until they are settled.
                </p>
              ) : (
                <p className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                  <CalendarCheck className="h-3.5 w-3.5" /> PayNow to your UEN by {dayName(r.settlement_date)}
                </p>
              )}
              {r.payout_sgd > 0 && !pending ? (
                <p className="mt-1 flex items-center justify-end gap-2 text-xs text-income-orange-700">
                  <Ellipsis size="sm" variant="loader" /> payout on its way
                </p>
              ) : null}
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <Peril title="Heat rest" counted={h.counted_h} normal={h.normal_h} allow={h.allowance_h} insured={h.insured_h} pending={h.pending_hours} assumption={h.normal_is_assumption} basis={h.normal_basis} deductibleLabel={deductibleLabel} forfeited={h.forfeited} />
            <Peril title="Heavy rain" counted={rn.counted_h} normal={rn.normal_h} allow={rn.allowance_h} insured={rn.insured_h} pending={rn.pending_hours} assumption={rn.normal_is_assumption} basis={rn.normal_basis} deductibleLabel={deductibleLabel} />
            <div className="rounded-xl bg-paper p-4">
              <p className="text-sm font-semibold">Haze</p>
              <p className="num mt-2 text-2xl font-bold">{z.pending_days ? "Pending" : `${num(z.counted_h)} h`}</p>
              <p className="text-xs text-muted-foreground">No allowance for haze. 20 h a year limit.</p>
              {z.pending_days ? <StateBadge state="PENDING" className="mt-2" /> : null}
            </div>
          </div>

          <table className="mt-6 w-full text-sm">
            <tbody>
              <Row k="Insured hours before caps" v={pending ? "Pending" : `${num(r.insured_before_caps_h)} h`} />
              <Row k={`Caps: ${r.monthly_cap_h} h a month, ${r.yearly_cap_h} h a year (${num(r.ytd_insured_before_h)} h used before this month)`} v={pending ? "Pending" : capped ? `cut to ${num(r.insured_after_caps_h)} h` : "not reached"} />
              <Row k={pending ? "Final benefit" : `${num(r.insured_after_caps_h)} h x S$${benefit} x ${firm.outdoor_workers} workers`} v={payoutIsPending ? "Pending" : sgd(r.payout_sgd)} strong />
            </tbody>
          </table>
          {pending ? (
            <div className="mt-3 rounded-xl border border-dashed border-state-pending/60 bg-state-pending-bg p-4 text-sm text-state-pending" role="status">
              <p className="flex items-center gap-2 font-semibold"><Clock3 className="h-4 w-4" /> {pending} hours or days still need evidence</p>
              <p className="mt-1 leading-relaxed">
                We check the named station first, then its backup station, then the published regional median. If that cannot settle the reading, it goes to human review. Pending is never treated as no event.
              </p>
              <p className="mt-1 text-xs leading-relaxed">We will issue a later receipt once it is settled. No payout is marked as sent while this receipt has pending evidence.</p>
            </div>
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
              <button key={k} type="button" onClick={() => setLang(k)} aria-pressed={lang === k} className={cn("rounded-full px-2.5 py-1 text-xs", lang === k ? "bg-income-orange-700 text-white" : "bg-paper hover:bg-income-orange-100")}>
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
          <div className="mt-4 rounded-xl bg-paper p-4 text-sm leading-relaxed" lang="en" aria-live="polite">
            {showEnglishSource ? <p className="mb-2 text-xs text-state-pending">{translationBadge}</p> : null}
            <p>{answer}</p>
          </div>
          <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
            <Lock className="h-3 w-3" /> Numbers locked to the receipt. Any reworded answer that changes a number is thrown away.
          </p>
        </div>
      </aside>
    </div>
  );
}

function Peril({ title, counted, normal, allow, insured, pending, assumption, basis, deductibleLabel, forfeited }: { title: string; counted: number; normal: number; allow: number; insured: number; pending: number; assumption: boolean; basis: string; deductibleLabel: string; forfeited?: boolean }) {
  return (
    <div className="rounded-xl bg-paper p-4">
      <p className="text-sm font-semibold">{title}</p>
      <p className="num mt-2 text-2xl font-bold">{pending ? "Pending" : `${num(counted)} h`}</p>
      <p className="text-xs text-muted-foreground">{pending ? "We are still checking the evidence." : "counted a worker"}</p>
      <div className="mt-2 space-y-0.5 text-xs">
        <p className="num">
          Normal {num(normal)} h
          {assumption ? <AssumptionTag basis={basis} /> : <AssumptionTag basis={basis} label="station normal" />}
        </p>
        <p className="num">{deductibleLabel}: {num(allow)} h</p>
        <p className="num font-semibold text-income-orange-700">Insured: {forfeited ? "forfeited" : pending ? "pending" : `${num(insured)} h`}</p>
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
  const [selected, setSelected] = useState<HourLine | null>(null);
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
        <Tabs value={peril} onValueChange={(v) => { setPeril(v as "heat" | "rain"); setSelected(null); }}>
          <TabsList>
            <TabsTrigger value="heat">Heat</TabsTrigger>
            <TabsTrigger value="rain">Rain</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Info className="h-3.5 w-3.5" /> Select a coloured cell to see its reading, source and counted time.
      </p>
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
                  const label = l ? hourCellLabel(l, d, h) : "No reading recorded for this hour.";
                  const isSelected = l?.ts === selected?.ts && l?.peril === selected?.peril;
                  return (
                    <td key={h} className="p-0.5">
                      {l ? (
                        <button
                          type="button"
                          onClick={() => setSelected(l)}
                          aria-label={`${label} Select for details.`}
                          aria-pressed={isSelected}
                          title={label}
                          className={cn(
                            "h-6 w-8 rounded transition-shadow hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-income-blue-600 focus-visible:ring-offset-1",
                            cellTone(l),
                            isSelected && "ring-2 ring-income-blue-600 ring-offset-1",
                          )}
                        />
                      ) : (
                        <span className="block h-6 w-8 rounded bg-transparent" aria-hidden="true" />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4" aria-live="polite">
        {selected ? (
          <div className="rounded-xl border border-income-blue-100 bg-income-blue-50 p-4 text-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{new Date(selected.ts).toLocaleString("en-SG", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false })}</p>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3.5 w-3.5" /> {selected.source}</p>
              </div>
              <StateBadge state={selected.state} />
            </div>
            <dl className="mt-3 grid gap-3 text-xs sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Reading</dt>
                <dd className="num mt-0.5 font-semibold">{selected.reading != null ? `${selected.reading} ${selected.unit}` : "Not published"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Counted time</dt>
                <dd className="num mt-0.5 font-semibold">{selected.state === "PENDING" ? "Pending" : `${Math.round(selected.counted_h * 60)} min`}</dd>
              </div>
            </dl>
            <p className="mt-3 leading-relaxed text-muted-foreground">{selected.detail}</p>
            {selected.state === "PENDING" ? (
              <p className="mt-3 flex gap-1.5 text-xs leading-relaxed text-state-pending"><Clock3 className="mt-0.5 h-3.5 w-3.5 shrink-0" /> We are checking the named station, backup station and regional median before a human reviews an unresolved reading.</p>
            ) : null}
          </div>
        ) : (
          <div className="rounded-xl bg-paper px-4 py-3 text-xs text-muted-foreground">No hour selected. Select a coloured cell for its evidence detail.</div>
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><span className="h-3 w-4 rounded bg-line-soft" /> not triggered</span>
        <span className="flex items-center gap-1"><span className="h-3 w-4 rounded bg-income-orange-200" /> {peril === "heat" ? "5 min" : "0.5 h"}</span>
        <span className="flex items-center gap-1"><span className="h-3 w-4 rounded bg-income-orange" /> 10 min</span>
        <span className="flex items-center gap-1"><span className="h-3 w-4 rounded bg-[#b35300]" /> {peril === "heat" ? "15 min" : "1 h"}</span>
        <span className="flex items-center gap-1"><span className="h-3 w-4 rounded bg-state-pending-bg ring-1 ring-state-pending/50" /> pending</span>
        <span>12:00 meal hour and Sundays are not insured. Select a cell for the reading and source.</span>
      </div>
      <SourceNote>NEA via data.gov.sg. We use the named station, then backup station, then regional median. Unresolved readings remain PENDING for human review, never no event.</SourceNote>
    </div>
  );
}

function hourCellLabel(line: HourLine, day: string, hour: number) {
  const reading = line.reading != null ? `Reading ${line.reading} ${line.unit}.` : "Reading not published.";
  const counted = line.state === "PENDING" ? "Evidence is pending. No counted time is confirmed yet." : `${Math.round(line.counted_h * 60)} minutes counted.`;
  return `${day}, ${hour}:00. ${line.state.replace("_", " ").toLowerCase()}. ${reading} ${counted} Source: ${line.source}. ${line.detail}`;
}
