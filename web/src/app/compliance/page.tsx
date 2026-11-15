import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import { PageHeader, Section } from "@/components/brand";
import { loadJSON } from "@/lib/data";

type Row = { requirement: string; source: string; what: string; screen: string; code: string };

export default async function CompliancePage() {
  const { rows } = await loadJSON<{ rows: Row[] }>("compliance.json");
  return (
    <>
      <PageHeader eyebrow="Compliance map" title="Every rule, and where Rehat meets it">
        The brief&apos;s must-haves and each law or guideline in CONTEXT.md section 7, mapped to the screen and the code rule that satisfies it. No change in the law is needed.
      </PageHeader>
      <Section>
        <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
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
