"use client";

import { Radio, RefreshCw, Sun, WifiOff } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Ellipsis, IconTile, SourceNote, StateBadge } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ENGINE_URL } from "@/lib/useJSON";
import type { HourState } from "@/lib/types";

type LiveStation = {
  station_id: string;
  name?: string;
  wbgt?: number | null;
  ts?: string;
  state?: HourState;
  rest_if_hour_mean?: number | null;
  rest_minutes?: number | null;
  source?: string;
  fetched_at?: string;
};

type LiveResponse = {
  day?: string;
  stations?: LiveStation[];
  source?: string;
  fetched_at?: string;
  fetched_at_sgt?: string;
};

type Reading = {
  day: string;
  reading: number | null;
  ts?: string;
  state?: HourState;
  restMinutes?: number | null;
  source?: string;
  fetchedAt?: string;
};

export type OfflineWeatherFallback = {
  stationId: string;
  stationName: string;
  date: string;
  reading: number | null;
  state: HourState;
};

type Props = {
  /** Complete receipt evidence used only when live data cannot be reached. */
  fallback: OfflineWeatherFallback;
};

/**
 * The home screen's live safety-reading panel. It never changes the receipt,
 * deductible, insured hours or payment, which remain based on complete hourly evidence.
 */
export function LiveWeatherStatus({ fallback }: Props) {
  const [mode, setMode] = useState<"live" | "offline">("live");
  const [liveReading, setLiveReading] = useState<Reading | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initialRequestMade = useRef(false);
  const singaporeToday = currentSingaporeDay();

  const refreshLive = useCallback(async () => {
    setLoading(true);
    setError(null);

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8_000);

    try {
      const response = await fetch(`${ENGINE_URL}/live`, { signal: controller.signal });
      if (!response.ok) throw new Error(`The live service returned ${response.status}.`);

      const payload = (await response.json()) as LiveResponse;
      if (!isDay(payload.day)) throw new Error("The live service did not return today’s date.");

      const station = payload.stations?.find((item) => item.station_id === fallback.stationId);
      const reading = finiteReading(station?.wbgt);
      setLiveReading({
        day: payload.day,
        reading,
        ts: station?.ts,
        state: validState(station?.state) ?? (station ? undefined : "PENDING"),
        restMinutes: finiteReading(station?.rest_minutes ?? station?.rest_if_hour_mean),
        source: station?.source ?? payload.source,
        fetchedAt: station?.fetched_at ?? payload.fetched_at_sgt ?? payload.fetched_at,
      });
      setMode("live");
    } catch (caught) {
      const message = caught instanceof DOMException && caught.name === "AbortError"
        ? "The live service took too long."
        : caught instanceof Error
          ? caught.message
          : "The live service could not be reached.";
      setLiveReading(null);
      setMode("offline");
      setError(`${message} Live data is unavailable. The offline demo reading is listed separately below.`);
    } finally {
      window.clearTimeout(timeout);
      setLoading(false);
    }
  }, [fallback.stationId]);

  useEffect(() => {
    if (initialRequestMade.current) return;
    initialRequestMade.current = true;
    void refreshLive();
  }, [refreshLive]);

  const useLive = mode === "live";
  const shown = {
    day: liveReading?.day ?? singaporeToday,
    reading: useLive ? liveReading?.reading ?? null : null,
    ts: useLive ? liveReading?.ts : undefined,
  };
  const hasReading = shown.reading != null;
  const headline = useLive
    ? hasReading
      ? "Live station reading is ready"
      : "Live station reading is pending"
    : "Live station reading is unavailable";
  const sourceLabel = useLive ? "Live data" : "Live unavailable";
  const completeHourState = useLive ? liveReading?.state : undefined;
  const source = liveReading?.source ?? "Live NEA data through the Rehat engine";

  const setLive = (on: boolean) => {
    if (on) {
      setMode("live");
      void refreshLive();
      return;
    }
    setMode("offline");
    setError(null);
    setLoading(false);
  };

  return (
    <div className="flex flex-col gap-5 bg-income-blue-50 p-5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <IconTile icon={useLive ? Sun : WifiOff} tone="blue" size="lg" />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-income-blue">Live heat reading</p>
            <span className="inline-flex items-center gap-1 rounded-full bg-surface px-2 py-0.5 text-xs font-semibold text-income-blue">
              {useLive ? <Radio className="h-3.5 w-3.5 text-income-orange" aria-hidden /> : <WifiOff className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />}
              {sourceLabel}
            </span>
            {loading ? <Ellipsis variant="loader" size="sm" label="Refreshing live reading" /> : null}
          </div>
          <h2 className="mt-1 text-xl font-bold text-ink">{headline}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{fallback.stationName} · {formatSingaporeDate(shown.day)}</p>
          {useLive ? <p className="mt-1 text-xs text-muted-foreground">The latest NEA reading may still be incomplete for the hour.</p> : <p className="mt-1 text-xs text-muted-foreground">Use Refresh to ask for a current reading again.</p>}
          {completeHourState ? <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><span>Completed-hour status from the engine</span><StateBadge state={completeHourState} />{completeHourState === "TRIGGERED" && liveReading?.restMinutes != null ? <span>{liveReading.restMinutes} min rest in the completed hour</span> : null}</div> : null}
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-start gap-3 sm:items-end">
        <div className="rounded-xl border border-income-blue-100 bg-surface px-4 py-3 text-left sm:text-right">
          <p className="text-xs text-muted-foreground">Latest NEA heat reading (WBGT)</p>
          <p className="num mt-1 font-heading text-3xl font-bold text-ink">{shown.reading != null ? `${shown.reading.toFixed(1)}°` : "Pending"}</p>
          <p className="text-xs text-muted-foreground">{useLive && shown.ts ? `Read ${formatSingaporeTime(shown.ts)}` : useLive && liveReading?.fetchedAt ? `Updated ${formatSingaporeTime(liveReading.fetchedAt)}` : useLive ? "Awaiting the named station" : "No current reading available"}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Live</span>
          <Switch checked={useLive} onCheckedChange={setLive} aria-label="Use live heat readings" disabled={loading} />
          <Button type="button" variant="outline" size="xs" onClick={() => void refreshLive()} disabled={loading} aria-label="Refresh live heat reading">
            <RefreshCw className={loading ? "animate-spin" : ""} aria-hidden />
            Refresh
          </Button>
        </div>
      </div>

      <div className="basis-full sm:hidden" />
      <SourceNote className="basis-full sm:-mt-2">{useLive ? `${source}. This live safety view does not change the completed monthly receipt, insured hours or payment.` : "The current live reading is unavailable. The payment example remains based on complete hourly evidence."}</SourceNote>
      {!useLive ? <div className="basis-full flex flex-wrap items-center gap-2 rounded-lg border border-income-blue-100 bg-surface px-3 py-2 text-xs text-muted-foreground"><span><span className="font-semibold text-ink">Offline demo reading:</span> {fallback.reading == null ? "Pending" : `${fallback.reading.toFixed(1)}°`} recorded {formatSingaporeDate(fallback.date)}</span><StateBadge state={fallback.state} /></div> : null}
      {error ? <p className="basis-full rounded-lg bg-state-pending-bg px-3 py-2 text-xs text-state-pending" role="status">{error}</p> : null}
    </div>
  );
}

function finiteReading(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function isDay(value: string | undefined): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function validState(value: HourState | undefined) {
  return value === "TRIGGERED" || value === "NOT_TRIGGERED" || value === "PENDING" ? value : undefined;
}

function currentSingaporeDay() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Singapore",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function formatSingaporeDate(day: string) {
  return new Intl.DateTimeFormat("en-SG", {
    timeZone: "Asia/Singapore",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${day}T12:00:00+08:00`));
}

function formatSingaporeTime(timestamp: string) {
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) return "at the latest update";
  return new Intl.DateTimeFormat("en-SG", {
    timeZone: "Asia/Singapore",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
}
