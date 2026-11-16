import Link from "next/link";
import { CheckCircle2, FileCheck2, ShieldCheck } from "lucide-react";

import { PageHeader, Section } from "@/components/brand";
import { loadJSON } from "@/lib/data";
import { loadProduct } from "@/lib/product.server";

type Row = { requirement: string; source: string; what: string; screen: string; code: string };

export default async function CompliancePage() {
  const [{ rows: rawRows }, product] = await Promise.all([loadJSON<{ rows: Row[] }>("compliance.json"), loadProduct()]);
  const rows = rawRows
    .filter((row) => ![
      "Offered by or with Income as the licensed insurer",
      "Four measures mandatory from 1 Dec 2026: heat-stress training, cool water, cooling supplies, suitable clothing",
    ].includes(row.requirement))
    .map((row) => {
      if (row.requirement.startsWith("Heat-stress rest")) {
        return { ...row, requirement: product.copy.rule_statement, what: `The heat tiers use ${product.triggers.heat.meter.toLowerCase()}. Fewer than ${product.triggers.heat.min_valid_readings} valid readings stays pending.` };
      }
      if (row.requirement === "Fair, explainable AI") {
        return { ...row, what: "The product terms set the amount. Checks explain their reason and a person reviews anything outside the published band." };
      }
      if (row.requirement === "Insurable interest") {
        return { ...row, what: `The published benefit is below the stated idle-hour cost. Cover is limited to declared outdoor workers and one policy per UEN.` };
      }
      if (row.what.includes("Site Match")) {
        return { ...row, what: row.what.replaceAll("Site Match", "Site Match pilot rider") };
      }
      return row;
    });
  return (
    <>
      <PageHeader eyebrow="Labs / rules and controls" title={`${rows.length} product controls are ready for review`} icon={ShieldCheck}>
        This is a traceability map for legal and operations review. It shows where each product control appears, without deciding a customer result.
      </PageHeader>
      <Section>
        <div className="grid gap-4 lg:grid-cols-3">
          <article className="rounded-2xl border border-line bg-surface p-5">
            <FileCheck2 className="h-5 w-5 text-income-orange-700" aria-hidden />
            <h2 className="mt-4 font-semibold">Terms set the amount</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{product.plans.map((plan) => plan.name).join(", ")} are the available deductibles. The same published benefit and limits apply to every plan.</p>
          </article>
          <article className="rounded-2xl border border-line bg-surface p-5">
            <ShieldCheck className="h-5 w-5 text-income-blue" aria-hidden />
            <h2 className="mt-4 font-semibold">Missing evidence stays pending</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{product.fallback_ladder[0]} through {product.fallback_ladder[product.fallback_ladder.length - 1].toLowerCase()}</p>
          </article>
          <article className="rounded-2xl border border-line bg-surface p-5">
            <CheckCircle2 className="h-5 w-5 text-state-ok" aria-hidden />
            <h2 className="mt-4 font-semibold">Sale has a check-back</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">The purchase flow records the warranty and asks: “{product.copy.teach_back_question}”</p>
          </article>
        </div>

        <div className="mt-6 space-y-3 md:hidden">
          {rows.map((row) => <ControlCard key={row.requirement} row={row} />)}
        </div>
        <div className="mt-6 hidden overflow-x-auto rounded-2xl border border-line bg-surface md:block">
          <table className="w-full text-sm">
            <thead className="bg-paper text-left text-xs text-muted-foreground">
              <tr>
                <th className="p-3">Requirement</th>
                <th className="p-3">Source</th>
                <th className="p-3">What Rehat does</th>
                <th className="p-3">Screen</th>
                <th className="p-3">Code rule</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.requirement} className="border-t border-line-soft align-top">
                  <td className="p-3 font-medium">
                    <span className="flex gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-state-ok" aria-hidden /> {r.requirement}
                    </span>
                  </td>
                  <td className="p-3 text-muted-foreground">{r.source}</td>
                  <td className="p-3">{r.what}</td>
                  <td className="p-3">
                    {r.screen.split(", ").map((s) => {
                      const href = s.split(" ")[0];
                      return href.startsWith("/") ? (
                        <Link key={s} href={href} className="mr-2 block text-income-blue-600 underline underline-offset-2">
                          {s}
                        </Link>
                      ) : (
                        <span key={s} className="mr-2 block">
                          {s}
                        </span>
                      );
                    })}
                  </td>
                  <td className="p-3 font-mono text-xs text-muted-foreground">{r.code}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </>
  );
}

function ControlCard({ row }: { row: Row }) {
  return (
    <article className="rounded-2xl border border-line bg-surface p-4 text-sm">
      <p className="flex gap-2 font-semibold"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-state-ok" aria-hidden />{row.requirement}</p>
      <p className="mt-3 text-xs text-muted-foreground">{row.source}</p>
      <p className="mt-2 leading-relaxed text-muted-foreground">{row.what}</p>
      <p className="mt-3 text-xs font-semibold text-muted-foreground">Where to see it</p>
      <div className="mt-1 flex flex-wrap gap-2">
        {row.screen.split(", ").map((screen) => {
          const href = screen.split(" ")[0];
          return href.startsWith("/") ? <Link key={screen} href={href} className="text-income-blue-600 underline underline-offset-2">{screen}</Link> : <span key={screen}>{screen}</span>;
        })}
      </div>
    </article>
  );
}
