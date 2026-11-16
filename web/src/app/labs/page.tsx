import type { LucideIcon } from "lucide-react";
import { ArrowRight, FileCheck2, FlaskConical, MapPinned, Presentation, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { IconTile, PageHeader, Section } from "@/components/brand";

type Lab = {
  href: string;
  title: string;
  description: string;
  detail: string;
  icon: LucideIcon;
  label?: string;
};

const labs: Lab[] = [
  {
    href: "/employer/site-match",
    title: "Site Match",
    description: "Pilot rider",
    detail: "Review an independent site heat log when a qualifying site may be hotter than its named station.",
    icon: FileCheck2,
    label: "Pilot rider",
  },
  {
    href: "/backtest",
    title: "Pricing and back-test",
    description: "Stress the product terms",
    detail: "Explore the historical test, plan trade-offs and the limits behind the cover.",
    icon: FlaskConical,
  },
  {
    href: "/live",
    title: "Live station map",
    description: "See the data state",
    detail: "View station readings, data sources and any pending evidence without changing a customer result.",
    icon: MapPinned,
  },
  {
    href: "/compliance",
    title: "Rules and controls",
    description: "Trace each safeguard",
    detail: "See how the product terms, data controls and human review steps fit together.",
    icon: ShieldCheck,
  },
];

export default function LabsPage() {
  return (
    <>
      <PageHeader eyebrow="Labs" title="Technical detail, separate from your cover" icon={FlaskConical}>
        Explore the evidence and pilots behind Rehat. These tools do not change a policy payout.
      </PageHeader>
      <Section className="pb-12">
        <div className="grid gap-4 md:grid-cols-2">
          {labs.map((lab) => {
            const Icon = lab.icon;
            return (
              <Link key={lab.href} href={lab.href} className="group rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-income-orange focus-visible:ring-offset-4">
                <article className="product-card h-full p-5 transition-[border-color,box-shadow,transform] duration-200 motion-reduce:transition-none md:group-hover:-translate-y-0.5 md:group-hover:border-income-orange-200 md:group-hover:shadow-[var(--shadow-raised)]">
                  <div className="flex items-start justify-between gap-4">
                    <IconTile icon={Icon} tone="blue" />
                    {lab.label ? <span className="rounded-full bg-income-orange-100 px-2.5 py-1 text-xs font-semibold text-income-orange-700">{lab.label}</span> : null}
                  </div>
                  <p className="mt-5 text-sm font-medium text-income-blue">{lab.description}</p>
                  <h2 className="mt-1 text-xl font-bold text-ink">{lab.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{lab.detail}</p>
                  <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-income-blue transition-transform duration-200 motion-reduce:transition-none md:group-hover:translate-x-0.5">
                    Open lab <ArrowRight className="h-4 w-4" aria-hidden />
                  </span>
                </article>
              </Link>
            );
          })}
        </div>
        <Link href="/pitch" className="mt-6 flex items-center justify-between gap-4 rounded-2xl border border-income-blue-100 bg-income-blue-50 p-5 transition-colors hover:bg-income-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-income-orange focus-visible:ring-offset-4">
          <span className="flex items-start gap-3">
            <IconTile icon={Presentation} tone="blue" size="sm" />
            <span>
              <span className="block font-semibold text-ink">Guided walkthrough</span>
              <span className="mt-1 block text-sm text-muted-foreground">Step through the full Rehat story in the current pitch order.</span>
            </span>
          </span>
          <ArrowRight className="h-5 w-5 shrink-0 text-income-blue" aria-hidden />
        </Link>
      </Section>
    </>
  );
}
