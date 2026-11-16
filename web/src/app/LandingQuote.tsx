"use client";

import { ArrowRight, Calculator, Minus, Plus, Sparkles } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { AssumptionTag } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { sgd } from "@/lib/format";
import type { ProductPlan, ProductSpec } from "@/lib/product";
import { cn } from "@/lib/utils";

type QuoteProps = Pick<ProductSpec, "plans" | "product" | "demo_firm" | "unit_economics_standard_per_worker" | "copy">;

export function LandingQuote({ plans, product, demo_firm: demoFirm, unit_economics_standard_per_worker: economics, copy }: QuoteProps) {
  const defaultPlan = plans.find((plan) => plan.default) ?? plans[0];
  const [planId, setPlanId] = useState(defaultPlan?.id ?? "");
  const [workers, setWorkers] = useState(demoFirm.outdoor_workers);
  const plan = plans.find((item) => item.id === planId) ?? defaultPlan;

  const totals = useMemo(
    () => calculate(plan, workers, product.gst_rate, demoFirm.outdoor_workers, economics.firm_loss_normal_year_20_workers.value),
    [demoFirm.outdoor_workers, economics.firm_loss_normal_year_20_workers.value, plan, product.gst_rate, workers],
  );
  if (!plan) return null;

  const updateWorkers = (next: number) => setWorkers(Math.min(200, Math.max(1, Math.round(next) || 1)));

  return (
    <aside className="product-card overflow-hidden border-income-blue-100 bg-surface/95 shadow-[var(--shadow-raised)]">
      <div className="border-b border-line-soft bg-income-blue-50 px-5 py-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-income-blue">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-surface text-income-orange-700 shadow-sm"><Calculator className="h-4 w-4" /></span>
          What a hard year can cost
        </p>
        <p className="mt-1 text-xs text-muted-foreground">Compare a plan for an outdoor crew like yours.</p>
      </div>

      <div className="space-y-5 p-5">
        <fieldset>
          <legend className="text-xs font-medium text-muted-foreground">Choose a deductible</legend>
          <div className="mt-2 grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Choose a deductible">
            {plans.map((item) => {
              const selected = item.id === plan.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setPlanId(item.id)}
                  className={cn(
                    "rounded-xl border px-2 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-income-orange",
                    selected ? "border-income-orange bg-income-orange-100 text-ink" : "border-line-soft bg-paper text-muted-foreground hover:border-income-orange-200",
                  )}
                >
                  <span className="block text-xs font-semibold">{item.name}</span>
                  <span className="mt-0.5 block truncate text-[11px]">{item.allowance_multiple}× normal</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="rounded-xl border border-line-soft bg-paper p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Outdoor workers</p>
              <p className="text-xs text-muted-foreground">Declared on the work injury policy</p>
            </div>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => updateWorkers(workers - 1)} aria-label="Remove one worker" className="grid h-8 w-8 place-items-center rounded-lg border border-line bg-surface text-income-blue hover:bg-income-blue-50"><Minus className="h-3.5 w-3.5" /></button>
              <label className="sr-only" htmlFor="crew-count">Outdoor workers</label>
              <input id="crew-count" value={workers} inputMode="numeric" onChange={(event) => updateWorkers(Number(event.target.value))} className="num h-8 w-12 rounded-lg border border-line bg-surface text-center text-sm font-semibold text-ink outline-none focus:ring-2 focus:ring-income-orange" />
              <button type="button" onClick={() => updateWorkers(workers + 1)} aria-label="Add one worker" className="grid h-8 w-8 place-items-center rounded-lg border border-line bg-surface text-income-blue hover:bg-income-blue-50"><Plus className="h-3.5 w-3.5" /></button>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-income-orange-100/70 p-4">
          <p className="text-xs font-medium text-income-orange-700">Protected in a hard year</p>
          <p className="num mt-1 font-heading text-3xl font-bold text-ink">{sgd(totals.worstYearPayout, 0)}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            The yearly limit for this crew. A normal year can carry about {sgd(totals.normalYearDowntime, 0)} in paid weather downtime.
            <AssumptionTag label={economics.firm_loss_normal_year_20_workers.source} basis={`Illustrative normal-year downtime for the ${demoFirm.outdoor_workers}-worker Standard example.`} />
          </p>
          <p className="mt-2 text-xs leading-relaxed text-ink">{copy.hook}</p>
        </div>

        <dl className="space-y-2 text-sm">
          <QuoteRow label="Average year payout, not guaranteed" value={sgd(totals.averagePayout, 0)} source={plan.source} />
          <QuoteRow label="Annual premium before GST" value={sgd(totals.beforeGst, 0)} />
          <QuoteRow label="GST" value={sgd(totals.gst, 0)} />
          <QuoteRow label="Total for the year" value={sgd(totals.total, 0)} strong />
        </dl>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {sgd(plan.per_worker_week, 2)} a worker a week before GST. Price uses the plan and outdoor headcount.
          <AssumptionTag basis={`Illustrative ${plan.source} calibration. Final terms are shown before you submit.`} label={plan.source} />
        </p>
        <Button asChild className="w-full">
          <Link href={`/onboard?plan=${encodeURIComponent(plan.id)}`}>See this quote <ArrowRight className="ml-1 h-4 w-4" /></Link>
        </Button>
        <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground"><Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-income-orange-700" />You can change the deductible before you continue.</p>
      </div>
    </aside>
  );
}

function calculate(plan: ProductPlan, workers: number, gstRate: number, exampleWorkers: number, normalYearDowntimeExample: number) {
  const beforeGst = plan.per_worker_year * workers;
  return {
    beforeGst,
    gst: beforeGst * gstRate,
    total: beforeGst * (1 + gstRate),
    averagePayout: (plan.example_20_workers.average_payout_year / exampleWorkers) * workers,
    worstYearPayout: (plan.example_20_workers.worst_year_payout / exampleWorkers) * workers,
    normalYearDowntime: (normalYearDowntimeExample / exampleWorkers) * workers,
  };
}

function QuoteRow({ label, value, source, strong = false }: { label: string; value: string; source?: "back-test" | "simulation"; strong?: boolean }) {
  return (
    <div className={cn("flex items-center justify-between gap-3", strong && "border-t border-line pt-2 font-semibold text-ink")}>
      <dt className={cn("text-muted-foreground", strong && "text-ink")}>{label}{source ? <AssumptionTag label={source} basis={source === "back-test" ? "Observed 26-year Standard pricing back-test." : "Product simulation."} /> : null}</dt>
      <dd className="num font-medium text-ink">{value}</dd>
    </div>
  );
}
