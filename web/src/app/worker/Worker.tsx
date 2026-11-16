"use client";

import { Droplets, ShieldCheck, Sun, Wifi } from "lucide-react";
import { useState } from "react";

import { PageHeader, Section } from "@/components/brand";
import type { ProductSpec } from "@/lib/product";
import type { HourLine } from "@/lib/types";
import { cn } from "@/lib/utils";

export type WorkerData = { notices: Record<string, string>; langs: Record<string, string>; note: string };

const ORDER = ["bn", "ta", "zh", "my", "ms", "en"];

/** A fixed visual placeholder for the site-issued worker QR. */
function SiteQR() {
  const n = 21;
  const cells: boolean[] = [];
  let seed = 7;
  for (let i = 0; i < n * n; i++) {
    seed = (seed * 9301 + 49297) % 233280;
    cells.push(seed / 233280 > 0.5);
  }
  const finder = (x: number, y: number) => {
    const inBox = (ox: number, oy: number) => x >= ox && x < ox + 7 && y >= oy && y < oy + 7;
    const ring = (ox: number, oy: number) => inBox(ox, oy) && (x === ox || x === ox + 6 || y === oy || y === oy + 6 || (x >= ox + 2 && x <= ox + 4 && y >= oy + 2 && y <= oy + 4));
    if (inBox(0, 0)) return ring(0, 0);
    if (inBox(n - 7, 0)) return ring(n - 7, 0);
    if (inBox(0, n - 7)) return ring(0, n - 7);
    return null;
  };
  return (
    <svg viewBox={`0 0 ${n} ${n}`} className="h-32 w-32" role="img" aria-label="Site QR code for the worker notice">
      <rect width={n} height={n} fill="white" />
      {cells.map((c, i) => {
        const x = i % n;
        const y = Math.floor(i / n);
        const f = finder(x, y);
        const on = f === null ? c : f;
        return on ? <rect key={i} x={x} y={y} width={1} height={1} fill="#262727" /> : null;
      })}
    </svg>
  );
}

export default function Worker({ data, product, latestHeat, stationName }: { data: WorkerData; product: ProductSpec; latestHeat: HourLine | null; stationName: string }) {
  const [lang, setLang] = useState("en");
  const translationIsReady = lang === "en";
  const alertDue = latestHeat?.state === "TRIGGERED";
  const englishNotice = noticeForCurrentHeat(product, latestHeat, stationName);
  const latestTime = latestHeat?.ts.slice(11, 16) ?? "--:--";
  const title = latestHeat?.reading == null
    ? "Your latest heat reading is still pending"
    : alertDue
      ? "Your heat-rest notice"
      : `No heat break is due at ${latestHeat.reading.toFixed(1)}°`;
  const today = new Date(`${product.demo_clock.today}T00:00:00`).toLocaleDateString("en-SG", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  return (
    <>
      <PageHeader eyebrow="Worker notice" title={title}>
        {product.copy.rule_statement} The English notice is the source while translations await native-speaker review. No worker account or personal details are needed.
      </PageHeader>
      <Section>
        <div className="grid items-start gap-10 lg:grid-cols-2">
          <div className="mx-auto">
            <div className="relative h-[620px] w-[310px] rounded-[48px] border-[10px] border-ink bg-ink shadow-[var(--shadow-raised)]">
              <div className="absolute left-1/2 top-2 z-10 h-6 w-28 -translate-x-1/2 rounded-full bg-ink" />
              <div className="h-full w-full overflow-hidden rounded-[38px] bg-paper">
                <div className="flex items-center justify-between px-6 pb-2 pt-4 text-[11px] font-semibold">
                  <span className="num">{latestTime}</span>
                  <Wifi className="h-3.5 w-3.5" />
                </div>
                <div className="px-4 pt-6">
                  <p className="text-center text-[11px] text-muted-foreground">{today}</p>
                  <div className="font-worker mt-4 rounded-2xl bg-surface p-4 shadow-[var(--shadow-card)]" lang={translationIsReady ? lang : "en"}>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-income-orange-700 text-[11px] font-bold text-white">R</span>
                      <span className="font-semibold">Rehat heat notice</span>
                      <span className="ml-auto text-muted-foreground">now</span>
                    </div>
                    <p className="mt-3 text-[15px] leading-relaxed text-ink">{englishNotice}</p>
                    {!translationIsReady ? (
                      <p className="mt-2 rounded-lg bg-paper px-3 py-2 text-xs leading-relaxed text-muted-foreground" lang="en">
                        English source notice shown while the {data.langs[lang]} translation is under native-speaker review.
                      </p>
                    ) : null}
                    <div className="mt-3 flex gap-3 text-[11px] text-muted-foreground">
                      {alertDue ? <><span className="flex items-center gap-1"><Sun className="h-3.5 w-3.5 text-income-orange" /> Shade</span><span className="flex items-center gap-1"><Droplets className="h-3.5 w-3.5 text-income-blue-600" /> Water</span><span className="flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5 text-state-ok" /> Pay not cut</span></> : <span className="flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5 text-state-ok" /> No heat break due now</span>}
                    </div>
                  </div>
                  <div className="mt-3 rounded-2xl bg-surface/80 p-3 text-[12px] text-muted-foreground">
                    Station: {stationName}. Latest scheduled check: {latestTime}.
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-6">
            <div>
              <p className="mb-2 text-sm font-semibold">Language</p>
              <div className="flex flex-wrap gap-2" role="tablist" aria-label="Language">
                {ORDER.map((k) => (
                  <button
                    key={k}
                    type="button"
                    role="tab"
                    aria-selected={lang === k}
                    onClick={() => setLang(k)}
                    className={cn("rounded-full px-4 py-2 text-sm", lang === k ? "bg-income-orange-700 text-white" : "bg-surface hover:bg-income-orange-100")}
                  >
                    {data.langs[k]}
                  </button>
                ))}
              </div>
              <p className="mt-3 inline-flex rounded-full border border-dashed border-state-pending/60 bg-state-pending-bg px-3 py-1 text-xs text-state-pending">{data.note}</p>
            </div>
            <div className="flex items-center gap-6 rounded-2xl border border-line bg-surface p-5">
              <SiteQR />
              <div className="text-sm">
                <p className="font-semibold">Scan the site QR for notices</p>
                <p className="mt-1 text-muted-foreground">Choose your language. There is no worker sign-up and no personal details are collected.</p>
                <p className="mt-2 text-xs text-muted-foreground">The supervisor keeps the site QR where the crew can reach it.</p>
              </div>
            </div>
            <div className="rounded-2xl border border-line bg-surface p-5 text-sm">
              <p className="font-semibold">What this notice means</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
                <li>{englishNotice}</li>
                <li>If you do not get the break, use the site QR to tell the team.</li>
                <li>The notice is separate from the employer&apos;s monthly payment.</li>
              </ul>
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}

function noticeForCurrentHeat(product: ProductSpec, latestHeat: HourLine | null, stationName: string) {
  const reading = latestHeat?.reading;
  if (latestHeat?.state === "TRIGGERED" && reading != null) {
    const tier = product.triggers.heat.tiers.find((item) => reading >= item.from && (item.to == null || reading <= item.to));
    const restMinutes = tier?.rest_minutes;
    return `Heat reading is ${reading.toFixed(1)} at ${stationName}. You get ${restMinutes ?? "the required"} ${restMinutes ? "minutes of rest" : "rest"} in shade every hour. Your pay is not cut. No break? Scan to tell us.`;
  }
  if (latestHeat?.reading != null) return `Heat reading is ${latestHeat.reading.toFixed(1)} at ${stationName}. No heat break is due right now.`;
  return "The latest heat reading is still pending. We will send a notice when the named-station reading is ready.";
}
