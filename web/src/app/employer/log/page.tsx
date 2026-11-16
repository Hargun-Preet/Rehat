import Link from "next/link";
import { ArrowRight, BellRing, ClipboardCheck, FileClock, MapPinned, MessageSquareText, Sun } from "lucide-react";

import { IconTile, PageHeader, Section, SourceNote, StateBadge } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { loadJSONOr } from "@/lib/data";
import { dayName, monthName } from "@/lib/format";
import { loadProduct } from "@/lib/product.server";
import type { HourLine, Receipt } from "@/lib/types";

import { ExportComplianceLog } from "./ExportComplianceLog";

type ReceiptIndex = { uen: string; firm: string; month: string };

export default async function EmployerLogPage() {
  const product = await loadProduct();
  const index = await loadJSONOr<ReceiptIndex[]>("receipts_index.json", []);
  const current = index.find((item) => item.firm === product.demo_firm.name && item.month === product.demo_clock.month);
  const receipt = current
    ? await loadJSONOr<Receipt | null>(`receipt_${current.uen}_${current.month}.json`, null)
    : null;

  if (!receipt) {
    return (
      <>
        <PageHeader eyebrow="Employer workspace / compliance log" title="Your hourly log is preparing">
          We will show the named-station heat record here as soon as its evidence is available. Missing evidence is never shown as zero.
        </PageHeader>
        <Section>
          <div className="rounded-2xl border border-dashed border-state-pending/60 bg-state-pending-bg p-6 text-sm text-state-pending" role="status">
            <StateBadge state="PENDING" label="Waiting for readings" />
            <p className="mt-3">The log cannot be prepared yet. Check the monthly receipt later for the settled record.</p>
          </div>
        </Section>
      </>
    );
  }

  const heatHours = receipt.hours.filter((hour) => hour.peril === "heat");
  const heatHoursToDate = heatHours.filter((hour) => hour.ts.slice(0, 10) <= product.demo_clock.today);
  const todayHours = heatHoursToDate.filter((hour) => hour.ts.startsWith(product.demo_clock.today));
  const latest = todayHours.at(-1) ?? heatHours.at(-1) ?? null;
  const recentAlerts = heatHoursToDate.filter((hour) => hour.state === "TRIGGERED").slice(-3).reverse();
  const recentChecks = todayHours.slice(-3).reverse();
  const pendingHours = heatHoursToDate.filter((hour) => hour.state === "PENDING").length;
  const pendingPlain = product.glossary.find((item) => item.term === "Pending")?.plain;
  const currentSummary = latest ? statusLabel(latest, product.triggers.heat.tiers) : "Waiting for reading";
  const title = latest?.reading == null
    ? "The latest heat reading is still pending."
    : `${latest.reading.toFixed(1)}°C at ${hourTime(latest.ts)}. ${currentSummary}.`;

  return (
    <>
      <PageHeader eyebrow="Employer workspace / compliance log" title={title} icon={ClipboardCheck}>
        Hourly heat reading (WBGT) records for {receipt.stations.primary.name}. They show the rest alert due for the crew, not a payment decision.
      </PageHeader>
      <Section>
        <div data-compliance-log className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="min-w-0 space-y-5">
            <section className="overflow-hidden rounded-2xl border border-income-blue-100 bg-surface shadow-[var(--shadow-card)]">
              <div className="flex flex-col gap-4 bg-income-blue-50 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <IconTile icon={Sun} tone="blue" size="lg" />
                  <div>
                    <p className="text-sm font-semibold text-income-blue">Latest scheduled check</p>
                    <h2 className="mt-1 text-xl font-bold text-ink">{latest?.reading == null ? "Waiting for the named-station reading" : `${latest.reading.toFixed(1)}°C at ${hourTime(latest.ts)}`}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{receipt.stations.primary.name} · {latest ? dayName(latest.ts) : "Current demo day"}</p>
                  </div>
                </div>
                <div className="flex flex-col items-start gap-2 sm:items-end">
                  <StateBadge state={latest?.state ?? "PENDING"} label={currentSummary} />
                  <p className="text-xs text-muted-foreground">{sourceLabel(latest, receipt)}</p>
                </div>
              </div>
              <div className="grid gap-3 p-5 sm:grid-cols-3">
                <SummaryTile icon={MapPinned} label="Named station" value={receipt.stations.primary.name} note="NEA reading used for this log" />
                <SummaryTile icon={BellRing} label="Heat alerts so far" value={String(heatHoursToDate.filter((hour) => hour.state === "TRIGGERED").length)} note="Automatic records from the heat tier" />
                <SummaryTile icon={MessageSquareText} label="Worker notice" value="Ready to share" note="No worker account is needed" />
              </div>
              <SourceNote className="px-5 pb-5">published NEA named-station readings in the offline {monthName(receipt.month)} demo record</SourceNote>
            </section>

            {pendingHours ? (
              <section className="rounded-2xl border border-dashed border-state-pending/60 bg-state-pending-bg p-5" role="status">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3"><IconTile icon={FileClock} tone="orange" size="sm" /><div><h2 className="font-semibold text-ink">Some hourly evidence is pending</h2><p className="mt-1 text-sm text-muted-foreground">{pendingPlain}</p></div></div>
                  <StateBadge state="PENDING" label={`${pendingHours} waiting`} />
                </div>
              </section>
            ) : (
              <section className="rounded-2xl border border-line bg-paper p-5">
                <div className="flex items-start gap-3"><IconTile icon={FileClock} tone="slate" size="sm" /><div><h2 className="font-semibold text-ink">How pending data is handled</h2><p className="mt-1 text-sm leading-relaxed text-muted-foreground">{pendingPlain}</p></div></div>
              </section>
            )}

            <LogSection
              icon={BellRing}
              title="Recent heat alerts"
              description="These automatic alerts are the clearest record of when rest was due. The supervisor can share the worker notice from here."
              hours={recentAlerts}
              receipt={receipt}
              tiers={product.triggers.heat.tiers}
              empty="No heat alerts have been recorded for this month yet."
            />

            <LogSection
              icon={Sun}
              title="Today&apos;s latest checks"
              description="Every scheduled hour is kept, including hours where no rest alert was due."
              hours={recentChecks}
              receipt={receipt}
              tiers={product.triggers.heat.tiers}
              empty="No scheduled checks are available for the demo day yet."
            />
          </div>

          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <section className="product-card p-5">
              <div className="flex items-start gap-3"><IconTile icon={ClipboardCheck} tone="orange" /><div><h2 className="font-semibold text-ink">Break log status</h2><p className="mt-1 text-sm text-muted-foreground">No supervisor break entries are recorded in this offline demo.</p></div></div>
              <StateBadge state="NOT_TRIGGERED" label="Optional record" className="mt-4" />
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">The break log is optional. It never changes an insured hour or a payment.</p>
            </section>
            <section className="product-card p-5">
              <p className="text-sm font-semibold text-income-blue">The safety rule</p>
              <p className="mt-2 text-sm leading-relaxed text-ink">{product.copy.rule_statement}</p>
              <SourceNote>published product terms</SourceNote>
            </section>
            <ExportComplianceLog />
            <Button asChild className="w-full">
              <Link href="/worker">Open worker notice <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
            <Link href={`/employer/receipt?month=${receipt.month}`} className="flex items-center justify-center gap-1 text-sm font-medium text-income-blue underline underline-offset-4 hover:text-income-blue-600">
              Open the monthly receipt <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </aside>
        </div>
      </Section>
    </>
  );
}

function LogSection({
  icon,
  title,
  description,
  hours,
  receipt,
  tiers,
  empty,
}: {
  icon: typeof BellRing;
  title: string;
  description: string;
  hours: HourLine[];
  receipt: Receipt;
  tiers: { from: number; to: number | null; rest_minutes: number; label: string }[];
  empty: string;
}) {
  const Icon = icon;
  return (
    <section className="product-card overflow-hidden">
      <div className="flex items-start gap-3 border-b border-line-soft p-5">
        <IconTile icon={Icon} tone="orange" size="sm" />
        <div><h2 className="font-semibold text-ink">{title}</h2><p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p></div>
      </div>
      {hours.length ? <ul className="divide-y divide-line-soft">{hours.map((hour) => <HeatLogRow key={`${hour.ts}-${hour.source}`} hour={hour} receipt={receipt} tiers={tiers} />)}</ul> : <p className="p-5 text-sm text-muted-foreground">{empty}</p>}
      {hours.length ? <SourceNote className="px-5 pb-5">published NEA named-station readings and published plan heat tiers</SourceNote> : null}
    </section>
  );
}

function HeatLogRow({ hour, receipt, tiers }: { hour: HourLine; receipt: Receipt; tiers: { from: number; to: number | null; rest_minutes: number; label: string }[] }) {
  const minutes = restMinutes(hour.reading, tiers);
  const label = statusLabel(hour, tiers);
  const isAlert = hour.state === "TRIGGERED";
  const isPending = hour.state === "PENDING";
  return (
    <li className="p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="font-semibold text-ink">{dayName(hour.ts)} · {hourTime(hour.ts)}</p>
          <p className="mt-1 text-sm text-muted-foreground">{hour.reading == null ? "Reading is still pending" : `${hour.reading.toFixed(1)}°C heat reading`} · {sourceLabel(hour, receipt)}</p>
        </div>
        <StateBadge state={hour.state} label={label} />
      </div>
      <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        <p className="rounded-lg bg-paper px-3 py-2 text-muted-foreground">{isPending ? "We wait for evidence before deciding this hourly record." : isAlert ? minutes && minutes >= 10 ? `Heat-break notice ready: ${minutes} minutes of rest this hour.` : `Heat alert ready: ${minutes} minutes of rest this hour.` : "No heat-break notice was needed for this hour."}</p>
        <p className="rounded-lg bg-paper px-3 py-2 text-muted-foreground">{isAlert ? "Worker notice status: ready to share" : "Worker notice status: no alert needed"}</p>
      </div>
    </li>
  );
}

function SummaryTile({ icon, label, value, note }: { icon: typeof Sun; label: string; value: string; note: string }) {
  return <div className="surface-inset p-4"><IconTile icon={icon} tone="slate" size="sm" /><p className="mt-3 text-xs text-muted-foreground">{label}</p><p className="num mt-1 text-sm font-semibold text-ink">{value}</p><p className="mt-1 text-xs text-muted-foreground">{note}</p></div>;
}

function restMinutes(reading: number | null, tiers: { from: number; to: number | null; rest_minutes: number }[]) {
  if (reading == null) return null;
  return tiers.find((tier) => reading >= tier.from && (tier.to == null || reading <= tier.to))?.rest_minutes ?? null;
}

function statusLabel(hour: HourLine, tiers: { from: number; to: number | null; rest_minutes: number }[]) {
  if (hour.state === "PENDING") return "Waiting for reading";
  if (hour.state === "NOT_TRIGGERED") return "No break due";
  const minutes = restMinutes(hour.reading, tiers);
  return minutes && minutes >= 10 ? "Heat break due" : "Heat alert due";
}

function sourceLabel(hour: HourLine | null, receipt: Receipt) {
  if (!hour || hour.source === "primary") return receipt.stations.primary.name;
  if (hour.source === "backup") return `${receipt.stations.backup.name} (backup)`;
  return "Published regional reading";
}

function hourTime(iso: string) {
  return iso.slice(11, 16);
}
