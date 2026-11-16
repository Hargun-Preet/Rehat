import Link from "next/link";
import { ArrowRight, BellRing, Building2, FileCheck2, HardHat, MapPinned, ReceiptText, ShieldCheck, WalletCards } from "lucide-react";

import { AssumptionTag, IconTile, PageHeader, Section } from "@/components/brand";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { sgd } from "@/lib/format";
import { productPlan, productQuote } from "@/lib/product";
import { loadProduct } from "@/lib/product.server";

export default async function EmployerAccount() {
  const product = await loadProduct();
  const plan = productPlan(product);
  const quote = productQuote(product, plan);
  const firm = product.demo_firm;

  return (
    <>
      <PageHeader eyebrow="Employer account" title={`Good morning, ${firm.owner_display}`} icon={Building2}>
        Manage your work injury policy and weather downtime cover for {firm.name}.
      </PageHeader>

      <Section>
        <div className="grid gap-4 md:grid-cols-2">
          <PolicyCard
            Icon={HardHat}
            iconTone="blue"
            title="Work injury policy"
            status="Active"
            lines={[
              ["Policy", firm.wic_policy_no],
              ["Outdoor crew", `${firm.outdoor_workers} workers`],
              ["Work area", firm.site_area],
              ["Renewal", "30 days"],
            ]}
          />
          <PolicyCard
            Icon={ShieldCheck}
            iconTone="orange"
            title="Rehat weather downtime cover"
            status="Ready to review"
            lines={[
              ["Selected plan", plan.name],
              ["Deductible", plan.deductible_label],
              ["Named data", "NEA stations and regional PSI"],
              ["Payment", "PayNow to your company UEN"],
            ]}
          />
        </div>
      </Section>

      <Section>
        <div className="overflow-hidden rounded-2xl border-2 border-income-orange bg-surface shadow-[var(--shadow-raised)]">
          <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-center">
            <div>
              <p className="eyebrow">Your renewal quote</p>
              <h2 className="mt-2 text-2xl font-bold text-ink">Add Rehat to this policy.</h2>
              <p className="mt-3 max-w-2xl text-muted-foreground">
                When independent heat, rain or haze readings run above a normal month, Rehat pays the published benefit to your company UEN. There is no claim form to send.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <SmallPill Icon={MapPinned} text="Named-station rule" />
                <SmallPill Icon={ReceiptText} text="Monthly evidence receipt" />
                <SmallPill Icon={BellRing} text="Heat alerts included" />
              </div>
            </div>
            <div className="rounded-2xl border border-income-orange-200 bg-income-orange-100/70 p-5">
              <div className="flex items-center gap-2"><IconTile icon={WalletCards} tone="orange" size="sm" /><p className="text-sm font-semibold text-ink">{firm.outdoor_workers} outdoor workers</p></div>
              <p className="mt-4 text-xs font-medium text-muted-foreground">Total for the year, including GST</p>
              <p className="num mt-1 font-heading text-3xl font-bold text-ink">{sgd(quote.total, 0)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{plan.name} · {sgd(plan.per_worker_week, 2)} a worker a week before GST</p>
              <dl className="mt-4 space-y-2 rounded-xl bg-surface/80 p-3 text-xs">
                <QuoteLine label="Annual premium before GST" value={sgd(quote.beforeGst, 0)} />
                <QuoteLine label="GST" value={sgd(quote.gst, 0)} />
                <QuoteLine label="Annual total" value={sgd(quote.total, 0)} strong />
              </dl>
              <p className="mt-3 text-xs text-muted-foreground">Priced from the product back-test.<AssumptionTag basis="Illustrative back-test calibration. Final terms are shown before submission." label="back-test" /></p>
              <Button asChild className="mt-4 w-full"><Link href="/onboard">Review the quote <ArrowRight className="ml-1 h-4 w-4" /></Link></Button>
            </div>
          </div>
        </div>
      </Section>

      <Section>
        <div className="flex items-end justify-between gap-4"><div><p className="eyebrow">Once cover starts</p><h2 className="mt-2 text-xl font-bold">Everything your team needs in one place.</h2></div><Link href="/employer" className="hidden items-center gap-1 text-sm font-semibold text-income-blue hover:text-income-blue-600 sm:inline-flex">Open workspace <ArrowRight className="h-4 w-4" /></Link></div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <Feature Icon={BellRing} title="Plan the workday" text="Use a named-station heat alert to prepare your schedule and worker notice." />
          <Feature Icon={FileCheck2} title="Keep a compliance log" text="Record required breaks without making the log a condition of payment." />
          <Feature Icon={ReceiptText} title="Inspect each month" text="Open a clear receipt for counted hours, allowance, pending data and payment." />
        </div>
      </Section>
    </>
  );
}

function PolicyCard({ Icon, iconTone, title, status, lines }: { Icon: typeof HardHat; iconTone: "blue" | "orange"; title: string; status: string; lines: [string, string][] }) {
  return (
    <section className="product-card p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><IconTile icon={Icon} tone={iconTone} size="sm" /><h2 className="font-heading text-lg font-bold text-ink">{title}</h2></div><Badge className={iconTone === "blue" ? "bg-state-ok-bg text-state-ok" : "bg-income-orange-100 text-income-orange-700"}>{status}</Badge></div>
      <dl className="mt-5 grid gap-3 sm:grid-cols-2">
        {lines.map(([label, value]) => <div key={label} className="surface-inset p-3"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 text-sm font-medium text-ink">{value}</dd></div>)}
      </dl>
    </section>
  );
}

function QuoteLine({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return <div className={strong ? "flex justify-between gap-3 border-t border-line-soft pt-2 font-semibold text-ink" : "flex justify-between gap-3 text-muted-foreground"}><dt>{label}</dt><dd className="num font-medium text-ink">{value}</dd></div>;
}

function SmallPill({ Icon, text }: { Icon: typeof BellRing; text: string }) {
  return <span className="inline-flex items-center gap-1.5 rounded-full bg-income-blue-50 px-3 py-1.5 text-xs font-medium text-income-blue"><Icon className="h-3.5 w-3.5" />{text}</span>;
}

function Feature({ Icon, title, text }: { Icon: typeof BellRing; title: string; text: string }) {
  return <div className="product-card p-5"><IconTile icon={Icon} tone="blue" /><h3 className="mt-4 font-semibold text-ink">{title}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p></div>;
}
