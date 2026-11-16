import Link from "next/link";
import { ArrowRight, BellRing, CalendarClock, ClipboardCheck, CloudRain, FileCheck2, MapPinned, ReceiptText, ShieldCheck, Sun, UsersRound } from "lucide-react";

import { AssumptionTag, IconTile, PageHeader, Section, StateBadge } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { loadJSON } from "@/lib/data";
import { monthName, sgd } from "@/lib/format";
import { loadProduct } from "@/lib/product.server";

type ReceiptIndex = { uen: string; firm: string; month: string; payout: number; insured_h: number; pending: number };
type Receipt = {
  month: string;
  payout_sgd: number;
  settlement_date: string;
  firm: { name: string; outdoor_workers: number };
  stations: { primary: { name: string }; backup: { name: string }; rain_gauge: { name: string }; psi_region: string };
  perils: {
    heat: { counted_h: number; allowance_h: number; insured_h: number; pending_hours: number };
    rain: { counted_h: number; allowance_h: number; insured_h: number; pending_hours: number };
    haze: { insured_h: number; pending_days: number };
  };
  insured_after_caps_h: number;
  hours: { ts: string; peril: string; reading: number | null; state: "TRIGGERED" | "NOT_TRIGGERED" | "PENDING" }[];
};

export default async function EmployerDashboard() {
  const product = await loadProduct();
  const index = await loadJSON<ReceiptIndex[]>("receipts_index.json");
  const current = index.find((item) => item.firm === product.demo_firm.name && item.month === product.demo_clock.month);
  const receipt = current ? await loadJSON<Receipt>(`receipt_${current.uen}_${current.month}.json`) : null;
  const todayHeat = receipt?.hours.filter((hour) => hour.peril === "heat" && hour.ts.startsWith(product.demo_clock.today)).at(-1);
  const pending = (receipt?.perils.heat.pending_hours ?? 0) + (receipt?.perils.rain.pending_hours ?? 0) + (receipt?.perils.haze.pending_days ?? 0);

  return (
    <>
      <PageHeader eyebrow="Employer workspace" title={`${product.demo_firm.name}`} icon={ShieldCheck}>
        Your weather status, monthly deductible and evidence are ready in one view.
      </PageHeader>

      <Section>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="space-y-5">
            <section className="overflow-hidden rounded-2xl border border-income-blue-100 bg-surface shadow-[var(--shadow-card)]">
              <div className="flex flex-col gap-5 bg-income-blue-50 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3"><IconTile icon={Sun} tone="blue" size="lg" /><div><p className="text-sm font-semibold text-income-blue">Today&apos;s heat reading</p><h2 className="mt-1 text-xl font-bold text-ink">{todayHeat?.state === "TRIGGERED" ? "Heat breaks are due now" : "No heat break is due right now"}</h2><p className="mt-1 text-sm text-muted-foreground">{receipt?.stations.primary.name ?? "Named heat station"} · {formatDemoDate(product.demo_clock.today)}</p></div></div>
                <div className="rounded-xl border border-income-blue-100 bg-surface px-4 py-3 text-left sm:text-right"><p className="text-xs text-muted-foreground">Latest scheduled hour</p><p className="num mt-1 font-heading text-3xl font-bold text-ink">{todayHeat?.reading == null ? "Pending" : `${todayHeat.reading.toFixed(1)}°`}</p><p className="text-xs text-muted-foreground">WBGT at the named station</p></div>
              </div>
              <div className="grid gap-3 p-5 sm:grid-cols-3">
                <StatusTile icon={MapPinned} label="Named heat station" value={receipt?.stations.primary.name ?? "Not set"} note="Independent NEA reading" />
                <StatusTile icon={CloudRain} label="Rain gauge" value={receipt?.stations.rain_gauge.name ?? "Not set"} note="Clock-hour rainfall" />
                <StatusTile icon={BellRing} label="Worker notice" value="Ready to share" note="Plain-language safety notice" />
              </div>
            </section>

            <section className="product-card p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4"><div className="flex items-start gap-3"><IconTile icon={CalendarClock} tone="orange" /><div><p className="text-sm font-semibold text-income-orange-700">This month against your deductible</p><h2 className="mt-1 text-xl font-bold text-ink">{receipt ? monthName(receipt.month) : "Current month"}</h2><p className="mt-1 text-sm text-muted-foreground">Counted hours first absorb the monthly allowance. Only the amount above it becomes eligible.</p></div></div>{pending ? <StateBadge state="PENDING" /> : <StateBadge state="APPROVED" />}</div>
              {receipt ? <div className="mt-6 grid gap-4 md:grid-cols-2"><DeductibleRow icon={Sun} label="Heat" counted={receipt.perils.heat.counted_h} allowance={receipt.perils.heat.allowance_h} insured={receipt.perils.heat.insured_h} /><DeductibleRow icon={CloudRain} label="Heavy rain" counted={receipt.perils.rain.counted_h} allowance={receipt.perils.rain.allowance_h} insured={receipt.perils.rain.insured_h} /></div> : <p className="mt-5 rounded-xl bg-paper p-4 text-sm text-muted-foreground">This month&apos;s receipt is still preparing.</p>}
              <div className="mt-5 grid gap-3 rounded-xl bg-paper p-4 sm:grid-cols-3"><Metric label="Eligible hours" value={receipt ? `${receipt.insured_after_caps_h.toFixed(2)} h` : "Pending"} /><Metric label="Monthly payment" value={receipt ? sgd(receipt.payout_sgd, 0) : "Pending"} /><Metric label="Settlement" value={receipt ? formatShortDate(receipt.settlement_date) : "Pending"} /></div>
              <p className="mt-4 text-sm text-muted-foreground">{pending ? "Some readings are still pending. They are not treated as zero while the fallback ladder runs." : "No readings are pending. Open the receipt to inspect each source and calculation."}</p>
            </section>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <WorkspaceAction href="/employer/receipt" icon={ReceiptText} title="Open monthly receipt" text="Inspect the full calculation and source data." tone="orange" />
              <WorkspaceAction href="/employer/log" icon={ClipboardCheck} title="Open compliance log" text="Review hourly heat readings and rest alerts." tone="blue" />
              <WorkspaceAction href="/worker" icon={UsersRound} title="Share worker notice" text="Give the crew a clear station-based heat notice." tone="blue" />
              <WorkspaceAction href="/onboard" icon={FileCheck2} title="Review your cover" text="See the plan, deductible and renewal terms." tone="green" />
            </div>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <section className="product-card p-5"><p className="flex items-center gap-2 text-sm font-semibold text-income-blue"><MapPinned className="h-4 w-4" /> Your operating setup</p><dl className="mt-4 space-y-3 text-sm"><PolicyLine label="Site area" value={product.demo_firm.site_area} /><PolicyLine label="Heat station" value={receipt?.stations.primary.name ?? "Not set"} /><PolicyLine label="Backup station" value={receipt?.stations.backup.name ?? "Not set"} /><PolicyLine label="Rain gauge" value={receipt?.stations.rain_gauge.name ?? "Not set"} /><PolicyLine label="Haze region" value={receipt ? `${receipt.stations.psi_region} region` : "Not set"} /></dl></section>
            <section className="rounded-2xl border border-income-orange-200 bg-income-orange-100/60 p-5"><p className="text-sm font-semibold text-income-orange-700">How the price stays fair</p><p className="mt-2 text-sm leading-relaxed text-ink">Price uses the selected plan and declared outdoor headcount. It never uses worker nationality, age, health or gender.</p><p className="mt-3 text-xs text-muted-foreground">Independent weather data determines the eligible hours, not a claim decision.<AssumptionTag basis="Published product terms and back-test calibration." label="product terms" /></p></section>
            <Button asChild className="w-full"><Link href="/onboard">Review renewal <ArrowRight className="ml-1 h-4 w-4" /></Link></Button>
          </aside>
        </div>
      </Section>
    </>
  );
}

function StatusTile({ icon, label, value, note }: { icon: typeof Sun; label: string; value: string; note: string }) {
  return <div className="surface-inset p-4"><IconTile icon={icon} tone="slate" size="sm" /><p className="mt-3 text-xs text-muted-foreground">{label}</p><p className="mt-1 text-sm font-semibold text-ink">{value}</p><p className="mt-1 text-xs text-muted-foreground">{note}</p></div>;
}

function DeductibleRow({ icon: Icon, label, counted, allowance, insured }: { icon: typeof Sun; label: string; counted: number; allowance: number; insured: number }) {
  const total = Math.max(counted, allowance, 0.01);
  return <div className="rounded-xl border border-line-soft p-4"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><Icon className="h-4 w-4 text-income-orange-700" /><p className="font-semibold text-ink">{label}</p></div><p className="num text-sm font-bold text-ink">{insured.toFixed(2)} h eligible</p></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-paper"><div className="h-full bg-income-orange" style={{ width: `${Math.min(100, (counted / total) * 100)}%` }} /></div><dl className="mt-3 grid grid-cols-3 gap-2 text-xs"><Metric label="Counted" value={`${counted.toFixed(2)} h`} /><Metric label="Deductible" value={`${allowance.toFixed(2)} h`} /><Metric label="Eligible" value={`${insured.toFixed(2)} h`} /></dl></div>;
}

function WorkspaceAction({ href, icon, title, text, tone }: { href: string; icon: typeof ReceiptText; title: string; text: string; tone: "orange" | "blue" | "green" }) {
  return <Link href={href} className="product-card group p-5 transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-income-orange"><IconTile icon={icon} tone={tone} /><p className="mt-4 flex items-center justify-between gap-2 font-semibold text-ink">{title}<ArrowRight className="h-4 w-4 text-income-blue transition-transform group-hover:translate-x-0.5" /></p><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p></Link>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs text-muted-foreground">{label}</p><p className="num mt-1 font-heading text-base font-bold text-ink">{value}</p></div>;
}

function PolicyLine({ label, value }: { label: string; value: string }) {
  return <div className="flex items-start justify-between gap-4 border-b border-line-soft pb-3 last:border-0 last:pb-0"><dt className="text-muted-foreground">{label}</dt><dd className="max-w-[60%] text-right font-medium text-ink">{value}</dd></div>;
}

function formatDemoDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-SG", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function formatShortDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" });
}
