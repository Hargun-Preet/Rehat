"use client";

import Link from "next/link";
import { CheckCircle2, FileSpreadsheet, FlaskConical, Search, UserRound, XCircle } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";

import { Ellipsis, PageHeader, Section, SourceNote, StateBadge } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/ui/file-upload";
import { ENGINE_URL } from "@/lib/useJSON";
import { sgd } from "@/lib/format";
import type { ProductSpec } from "@/lib/product";
import { cn } from "@/lib/utils";

type Check = { code: string; passed: boolean; value: number | string | null; rule: string; text: string };
type Claim = {
  claim_id: string;
  firm: string;
  day: string;
  station: string;
  workers: number;
  benefit: number;
  status: "APPROVED" | "REVIEW";
  checks: Check[];
  hours: { hour: string; site: number; station: number; site_rest: number; station_rest: number; top_up: number; meal_hour: boolean }[];
  topup_minutes_per_worker: number;
  topup_hours_per_worker: number;
  topup_sgd: number;
  notes: string[];
  audit: { at: string; by: string; event: string; detail: string }[];
};
export type SiteMatchData = {
  samples: { file: string; kind: string; label: string; claim: Claim }[];
  evaluation: { logs: number; station_days: number; days: string[]; flag_rate: Record<string, number>; approved_with_topup_rate: Record<string, number> };
};

function parseCsv(text: string) {
  const rows = text.trim().split(/\r?\n/).slice(1).map((l) => l.split(","));
  return rows.filter((r) => r.length >= 2).map((r) => ({ time: r[0].trim(), wbgt: r[1].trim() }));
}

export default function SiteMatch({ data, product }: { data: SiteMatchData; product: ProductSpec }) {
  const [file, setFile] = useState<string | null>(null);
  const [csv, setCsv] = useState<string | null>(null);
  const [claim, setClaim] = useState<Claim | null>(null);
  const [revealed, setRevealed] = useState(0);
  const [confirmed, setConfirmed] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const pick = async (name: string) => {
    setMsg(null);
    setConfirmed(false);
    setClaim(null);
    setFile(name);
    const t = await fetch(`/data/site_logs/${name}`).then((r) => r.text());
    setCsv(t);
  };
  const onUpload = async (files: File[]) => {
    const f = files[files.length - 1];
    if (!f) return;
    setMsg(null);
    setConfirmed(false);
    setClaim(null);
    if (!f.name.toLowerCase().endsWith(".csv")) {
      setMsg("Upload the CSV export from the site heat meter. This pilot does not read photos or PDFs.");
      return;
    }
    setFile(f.name);
    setCsv(await f.text());
  };

  const submit = async () => {
    setConfirmed(true);
    setRevealed(0);
    const sample = data.samples.find((s) => s.file === file);
    if (sample) {
      setClaim(sample.claim);
      return;
    }
    try {
      const r = await fetch(`${ENGINE_URL}/sitematch/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uen: product.demo_firm.uen, day: product.demo_clock.replay_day, csv }),
      });
      if (!r.ok) throw new Error((await r.json()).detail ?? r.status);
      setClaim(await r.json());
    } catch (e) {
      setMsg(`The engine is offline, so only the 10 sample logs can be checked here. (${(e as Error).message})`);
      setConfirmed(false);
    }
  };

  useEffect(() => {
    const log = new URLSearchParams(window.location.search).get("log");
    if (log && data.samples.some((s) => s.file === log)) void pick(log);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!claim) return;
    const t = setInterval(() => setRevealed((n) => (n >= claim.checks.length ? n : n + 1)), 450);
    return () => clearInterval(t);
  }, [claim]);
  const done = claim && revealed >= claim.checks.length;
  const rows = csv ? parseCsv(csv) : [];
  const ev = data.evaluation;

  return (
    <>
      <PageHeader eyebrow="Labs / Site Match pilot rider" title={`Up to ${product.site_match_pilot_rider.top_up_cap_hours_year} extra hours in the pilot`} icon={FlaskConical}>
        This optional pilot rider is separate from Rehat&apos;s core cover. It can suggest a top-up from an independent main-contractor log; it never changes the core payment and never rejects automatically.
      </PageHeader>
      <Section>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-income-orange-200 bg-income-orange-100/60 p-4 text-sm">
          <span><span className="font-semibold">Pilot rider.</span> Up to {product.site_match_pilot_rider.top_up_cap_hours_year} extra hours a worker a year. {sgd(product.site_match_pilot_rider.price_per_worker_week.value, 2)} a worker a week is an assumption for the pilot.</span>
          <Link href="/labs" className="font-semibold text-income-blue underline underline-offset-2">Back to Labs</Link>
        </div>
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="space-y-4 lg:col-span-2">
            <div className="rounded-2xl border border-line bg-surface p-5">
              <p className="text-sm font-semibold">{product.demo_firm.name} · {product.demo_clock.replay_day} · {product.demo_firm.site_area} station</p>
              <div className="mt-3">
                <FileUpload onChange={onUpload} />
              </div>
              <p className="mt-3 text-xs text-muted-foreground">Or pick a sample log:</p>
              <div className="mt-2 grid gap-1.5">
                {data.samples.map((s) => (
                  <button
                    key={s.file}
                    type="button"
                    onClick={() => pick(s.file)}
                    aria-pressed={file === s.file}
                    className={cn("flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm", file === s.file ? "border-income-orange bg-income-orange-100/60" : "border-line hover:bg-paper")}
                  >
                    <FileSpreadsheet className="h-4 w-4 shrink-0 text-income-blue" /> <span className="capitalize">{s.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4 lg:col-span-3">
            {msg ? <p className="rounded-xl bg-state-pending-bg p-3 text-sm text-state-pending">{msg}</p> : null}
            {!csv ? (
              <div className="flex h-full min-h-[260px] items-center justify-center rounded-2xl border border-dashed border-line bg-surface p-10 text-sm text-muted-foreground">
                Choose a log to see what we read from it.
              </div>
            ) : (
              <div className="rounded-2xl border border-line bg-surface p-5">
                <p className="font-semibold">What we read from {file}</p>
                <p className="text-xs text-muted-foreground">Please check this table before you submit.</p>
                <div className="mt-3 max-h-56 overflow-auto rounded-lg border border-line-soft">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-paper text-xs text-muted-foreground">
                      <tr>
                        <th className="p-2 text-left">Time</th>
                        <th className="p-2 text-right">WBGT (C)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, i) => (
                        <tr key={i} className="border-t border-line-soft">
                          <td className="num p-2">{r.time}</td>
                          <td className="num p-2 text-right">{r.wbgt}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!confirmed ? (
                  <Button className="mt-4" onClick={submit}>
                    Run the pilot check
                  </Button>
                ) : null}
              </div>
            )}

            {claim ? (
              <div className="rounded-2xl border border-line bg-surface p-5">
                <p className="mb-3 flex items-center gap-2 font-semibold">
                  {done ? null : <Ellipsis variant="loader" size="sm" />} Checking against the station network
                </p>
                <ul className="space-y-2">
                  {claim.checks.slice(0, revealed).map((c) => (
                    <motion.li key={c.code} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} className="flex items-start gap-2 text-sm">
                      {c.passed ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-state-ok" aria-label="passed" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-state-review" aria-label="did not pass" />}
                      <span>
                        <span className="font-medium">{c.text}</span>
                        <span className="block text-xs text-muted-foreground">Rule: {c.rule}</span>
                      </span>
                    </motion.li>
                  ))}
                </ul>
                {done ? (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={cn("mt-5 rounded-2xl p-5", claim.status === "APPROVED" ? "bg-state-ok-bg" : "bg-state-review-bg")}>
                    <StateBadge state={claim.status} />
                    {claim.status === "APPROVED" ? (
                      <>
                        <p className="num mt-2 font-heading text-3xl font-bold text-ink">
                          +{claim.topup_minutes_per_worker} min a worker = {sgd(claim.topup_sgd)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Extra rest your site log needed over the station, x {sgd(product.product.benefit_per_worker_hour)} x {claim.workers} workers. Counts toward the {product.site_match_pilot_rider.top_up_cap_hours_year} h a year Site Match cap. Paid with the monthly receipt.
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="mt-2 font-semibold text-ink">Sent to a person at Income for review.</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {claim.checks.filter((c) => !c.passed).map((c) => (
                            <span key={c.code} className="rounded-full border border-state-review/40 bg-surface px-3 py-1 text-xs text-state-review">
                              {c.text}
                            </span>
                          ))}
                        </div>
                        <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                          <UserRound className="h-3.5 w-3.5" /> The checker never rejects. A reviewer approves or declines, with a reason, and you see it.
                        </p>
                      </>
                    )}
                    {claim.notes?.length ? <p className="mt-2 text-xs text-muted-foreground">{claim.notes.join(" ")}</p> : null}
                  </motion.div>
                ) : null}
                {done && claim.hours.length ? (
                  <details className="mt-4 text-sm">
                    <summary className="cursor-pointer text-income-blue-600">Hour by hour: site vs station</summary>
                    <table className="mt-2 w-full text-xs">
                      <thead className="text-muted-foreground">
                        <tr>
                          <th className="p-1 text-left">Hour</th>
                          <th className="p-1 text-right">Site</th>
                          <th className="p-1 text-right">Station</th>
                          <th className="p-1 text-right">Site rest</th>
                          <th className="p-1 text-right">Station rest</th>
                          <th className="p-1 text-right">Top-up</th>
                        </tr>
                      </thead>
                      <tbody>
                        {claim.hours.map((h) => (
                          <tr key={h.hour} className={cn("border-t border-line-soft", h.meal_hour && "text-muted-foreground")}>
                            <td className="num p-1">{h.hour}{h.meal_hour ? " meal" : ""}</td>
                            <td className="num p-1 text-right">{h.site.toFixed(2)}</td>
                            <td className="num p-1 text-right">{h.station.toFixed(2)}</td>
                            <td className="num p-1 text-right">{h.site_rest}</td>
                            <td className="num p-1 text-right">{h.station_rest}</td>
                            <td className="num p-1 text-right font-semibold">{h.top_up}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </details>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </Section>
      <Section>
        <div className="rounded-2xl border border-line bg-surface p-5">
          <p className="flex items-center gap-2 font-semibold">
            <Search className="h-4 w-4 text-income-orange" /> What the pilot checker caught
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            This is a limited test, not a production decision model: {ev.logs} simulated logs on {ev.station_days} real NEA station-days ({ev.days.length} days, including {product.demo_clock.replay_day}). Anything outside the published band still goes to a person.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-5">
            {Object.entries(ev.flag_rate).map(([k, v]) => (
              <div key={k} className="rounded-xl bg-paper p-3">
                <p className="text-xs capitalize text-muted-foreground">{k.replace("_", " ")}</p>
                <p className="num font-heading text-xl font-bold">{Math.round(v * 100)}%</p>
                <p className="text-[11px] text-muted-foreground">{k === "honest" ? "sent to review" : "caught"}</p>
                {k !== "honest" ? <p className="num text-[11px] text-muted-foreground">{Math.round((ev.approved_with_topup_rate[k] ?? 0) * 100)}% could still receive a top-up</p> : null}
              </div>
            ))}
          </div>
          <SourceNote>Engine evaluation; details in docs/model-cards/site-match.md. Pilot rider terms come from product.json.</SourceNote>
        </div>
      </Section>
    </>
  );
}
