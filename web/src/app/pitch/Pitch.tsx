"use client";

import { ChevronLeft, ChevronRight, ExternalLink, Maximize, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Ellipsis, FOOTER_TEXT } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Source = "published" | "back-test" | "simulation" | "assumption" | "plan";

export type Step = {
  at: string;
  title: string;
  href: string;
  alt?: { label: string; href: string };
  points: { text: string; source?: Source }[];
  kpi: { v: string; l: string; source?: Source };
};

function PitchSourceTag({ source }: { source: Source }) {
  return <span className="mt-1 shrink-0 text-[9px] font-semibold uppercase leading-none tracking-wide text-muted-foreground">{source}</span>;
}

export default function Pitch({ steps }: { steps: Step[] }) {
  const [i, setI] = useState(0);
  const [src, setSrc] = useState(steps[0].href);
  const go = useCallback((n: number) => {
    const k = Math.max(0, Math.min(steps.length - 1, n));
    setI(k);
    setSrc(steps[k].href);
  }, [steps]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") {
        e.preventDefault();
        go(i + 1);
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        go(i - 1);
      } else if (e.key === "f") {
        if (document.fullscreenElement) void document.exitFullscreen();
        else void document.documentElement.requestFullscreen();
      } else if (e.key === "Escape") {
        window.location.assign("/");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [i, go]);

  const s = steps[i];
  return (
    <div className="fixed inset-0 z-[2000] flex flex-col bg-paper" role="dialog" aria-label="Guided pitch">
      <div className="flex items-center justify-between border-b border-line bg-surface px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="font-heading font-bold">
            Rehat <span className="text-income-orange-700">pitch</span>
          </span>
          <Ellipsis size="sm" />
          <ol className="ml-4 hidden gap-1 md:flex" aria-label="Steps">
            {steps.map((x, k) => (
              <li key={x.title}>
                <button type="button" onClick={() => go(k)} aria-current={k === i ? "step" : undefined} className={cn("num rounded-full px-2.5 py-1 text-xs", k === i ? "bg-income-orange-700 text-white" : k < i ? "bg-income-orange-100" : "bg-paper")}>
                  {x.at}
                </button>
              </li>
            ))}
          </ol>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="hidden sm:inline">Arrow keys to move, F for full screen, Esc to leave</span>
          <Button size="sm" variant="outline" onClick={() => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen())} aria-label="Full screen">
            <Maximize className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => window.location.assign("/")} aria-label="Leave pitch">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="grid min-h-0 flex-1 grid-rows-[minmax(16rem,42vh)_minmax(0,1fr)] gap-0 lg:grid-cols-[380px_1fr] lg:grid-rows-1">
        <div className="order-2 flex min-h-0 flex-col justify-between overflow-auto border-t border-line bg-surface p-5 lg:order-1 lg:border-r lg:border-t-0 lg:p-8">
          <div>
            <p className="num text-sm font-semibold text-income-orange-700">
              {s.at} · {i + 1} of {steps.length}
            </p>
            <h1 className="mt-2 text-2xl font-bold sm:text-3xl" aria-live="polite">{s.title}</h1>
            <ul className="mt-5 space-y-2.5 text-sm leading-relaxed sm:mt-6 sm:space-y-3 sm:text-base">
              {s.points.map((point) => (
                <li key={point.text} className="flex gap-3">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-income-orange" />
                  <span className="min-w-0 flex-1">{point.text}</span>
                  {point.source ? <PitchSourceTag source={point.source} /> : null}
                </li>
              ))}
            </ul>
            <div className="mt-6 rounded-2xl bg-income-orange-100/60 p-4 sm:mt-8 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <p className="num font-heading text-2xl font-bold text-ink sm:text-4xl">{s.kpi.v}</p>
                {s.kpi.source ? <PitchSourceTag source={s.kpi.source} /> : null}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{s.kpi.l}</p>
            </div>
            <div className="mt-5 flex flex-wrap gap-2 sm:mt-6">
              <Button variant="secondary" size="sm" onClick={() => setSrc(s.href)}>
                Show: {s.href.split("?")[0]}
              </Button>
              {s.alt ? (
                <Button variant="outline" size="sm" onClick={() => setSrc(s.alt!.href)}>
                  {s.alt.label}
                </Button>
              ) : null}
              <a href={src} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-income-blue-600 underline">
                Open <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
          <div className="mt-6 flex justify-between sm:mt-8">
            <Button variant="outline" onClick={() => go(i - 1)} disabled={i === 0}>
              <ChevronLeft className="mr-1 h-4 w-4" /> Back
            </Button>
            <Button onClick={() => go(i + 1)} disabled={i === steps.length - 1}>
              Next <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="order-1 min-h-0 bg-paper p-3 lg:order-2 lg:p-4">
          <iframe key={src} src={src} title={s.title} className="h-full min-h-[16rem] w-full rounded-2xl border border-line bg-surface" />
        </div>
      </div>
      <p className="border-t border-line bg-surface px-6 py-2 text-xs text-muted-foreground">{FOOTER_TEXT}</p>
    </div>
  );
}
