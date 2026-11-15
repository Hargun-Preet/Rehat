"use client";

import { Radio, WifiOff } from "lucide-react";
import { useMemo, useState } from "react";

import { Ellipsis, PageHeader, Section, SourceNote, StateBadge } from "@/components/brand";
import { StationMap, type MapPoint } from "@/components/rehat/StationMap";
import { Switch } from "@/components/ui/switch";
import { ENGINE_URL } from "@/lib/useJSON";
import { dayName } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { HourState } from "@/lib/types";

type Hour = { hour: number; wbgt: number | null; state: HourState; rest: number | null };
type Station = { station_id: string; name: string; lat: number; lon: number; region: string; latest: { ts: string; wbgt: number } | null; hours: Hour[] };
export type LiveData = { snapshot_day: string; latest_ts: string; stations: Station[]; psi: { ts: string | null; regions: Record<string, number> }; mode: string; source: string };
type LiveApi = { day: string; stations: { station_id: string; name: string; lat: number; lon: number; wbgt: number; ts: string; rest_if_hour_mean: number }[]; psi: { ts?: string; regions?: Record<string, number> } };

const psiBand = (v: number) => (v > 300 ? "Hazardous" : v > 200 ? "Very unhealthy" : v > 100 ? "Unhealthy" : v > 50 ? "Moderate" : "Good");

export default function Live({ snapshot }: { snapshot: LiveData }) {
  const [live, setLive] = useState(false);
  const [liveData, setLiveData] = useState<LiveApi | null>(null);
  const [liveErr, setLiveErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const hoursWithData = snapshot.stations[0]?.hours.filter((h) => snapshot.stations.some((s) => s.hours.find((x) => x.hour === h.hour)?.wbgt != null)).map((h) => h.hour) ?? [];
  const [hour, setHour] = useState<number>(hoursWithData.includes(14) ? 14 : hoursWithData[hoursWithData.length - 1] ?? 12);

  const toggle = async (on: boolean) => {
    setLive(on);
    setLiveErr(null);
    if (!on) return;
    setLoading(true);
    try {
      const r = await fetch(`${ENGINE_URL}/live`);
      if (!r.ok) throw new Error(String(r.status));
      const d: LiveApi = await r.json();
      if (!d.stations.length) throw new Error("no readings yet today");
      setLiveData(d);
    } catch (e) {
      setLiveErr(`Live data not available (${(e as Error).message}). Showing the offline snapshot.`);
      setLive(false);
    } finally {
      setLoading(false);
    }
  };

  const rows = useMemo(() => {
    if (live && liveData) {
      return liveData.stations.map((s) => ({
        id: s.station_id, name: s.name, lat: s.lat, lon: s.lon, wbgt: s.wbgt as number | null,
        state: (s.rest_if_hour_mean > 0 ? "TRIGGERED" : "NOT_TRIGGERED") as HourState, rest: s.rest_if_hour_mean, source: "latest 15-minute reading",
      }));
    }
    return snapshot.stations.map((s) => {
      const h = s.hours.find((x) => x.hour === hour)!;
      return { id: s.station_id, name: s.name, lat: s.lat, lon: s.lon, wbgt: h?.wbgt ?? null, state: h?.state ?? "PENDING", rest: h?.rest ?? null,
               source: h?.state === "PENDING" ? "fewer than 3 of 4 readings" : "hourly mean of 15-minute readings" };
    });
  }, [live, liveData, snapshot, hour]);

  const points: MapPoint[] = rows.map((r) => ({
    id: r.id, lat: r.lat, lon: r.lon, label: r.name, value: r.wbgt != null ? `${r.wbgt.toFixed(1)} C` : "pending",
    kind: r.state === "TRIGGERED" ? "triggered" : r.state === "PENDING" ? "pending" : "not",
    detail: r.state === "PENDING" ? "Missing readings: pending, never read as no event" : r.rest ? `${r.rest} min rest an hour` : "No rest required",
  }));
  const counts = rows.reduce((a, r) => ({ ...a, [r.state]: (a[r.state] ?? 0) + 1 }), {} as Record<string, number>);
  const psi = live && liveData?.psi.regions ? liveData.psi.regions : snapshot.psi.regions;

  return (
    <>
      <PageHeader eyebrow="Live map" title="NEA heat-stress stations right now">
        Each station&apos;s hour is triggered, not triggered or pending. Missing readings are pending, never read as no event.
      </PageHeader>
      <Section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 rounded-full border border-line bg-surface px-4 py-2 text-sm">
            {live ? <Radio className="h-4 w-4 text-income-orange" /> : <WifiOff className="h-4 w-4 text-muted-foreground" />}
            <span>{live ? `Live: ${liveData?.day}` : `Offline snapshot: ${dayName(snapshot.snapshot_day)}`}</span>
            <Switch checked={live} onCheckedChange={toggle} aria-label="Live mode" disabled={loading} />
            {loading ? <Ellipsis variant="loader" size="sm" /> : null}
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            {Object.entries(psi ?? {}).filter(([r]) => r !== "national").map(([r, v]) => (
              <span key={r} className={cn("rounded-full border px-3 py-1", v > 100 ? "border-state-triggered/50 bg-state-triggered-bg text-state-triggered" : "border-line bg-surface")}>
                PSI {r}: <span className="num font-semibold">{v}</span> ({psiBand(v)})
              </span>
            ))}
          </div>
        </div>
        {liveErr ? <p className="mb-3 rounded-xl bg-state-pending-bg p-3 text-sm text-state-pending">{liveErr}</p> : null}
        {!live ? (
          <div className="mb-4 flex flex-wrap items-center gap-1" role="group" aria-label="Hour">
            {snapshot.stations[0]?.hours.map((h) => (
              <button
                key={h.hour}
                type="button"
                onClick={() => setHour(h.hour)}
                aria-pressed={hour === h.hour}
                className={cn("num rounded-full px-3 py-1 text-sm", hour === h.hour ? "bg-income-orange-700 text-white" : "bg-surface hover:bg-income-orange-100", h.hour === 12 && "italic")}
              >
                {String(h.hour).padStart(2, "0")}:00
              </button>
            ))}
            <span className="ml-2 text-xs text-muted-foreground">12:00 is the default unpaid meal hour</span>
          </div>
        ) : null}
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <StationMap points={points} height={480} zoom={11} />
            <div className="mt-3 flex flex-wrap gap-2">
              <StateBadge state="TRIGGERED" /> <span className="num text-sm">{counts.TRIGGERED ?? 0}</span>
              <StateBadge state="NOT_TRIGGERED" /> <span className="num text-sm">{counts.NOT_TRIGGERED ?? 0}</span>
              <StateBadge state="PENDING" /> <span className="num text-sm">{counts.PENDING ?? 0}</span>
            </div>
          </div>
          <div className="max-h-[540px] overflow-auto rounded-2xl border border-line bg-surface lg:col-span-2">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-surface text-left text-xs text-muted-foreground">
                <tr>
                  <th className="p-3">Station</th>
                  <th className="p-3 text-right">WBGT</th>
                  <th className="p-3">State</th>
                </tr>
              </thead>
              <tbody>
                {[...rows].sort((a, b) => (b.wbgt ?? -1) - (a.wbgt ?? -1)).map((r) => (
                  <tr key={r.id} className="border-t border-line-soft">
                    <td className="p-3">
                      <p className="font-medium">{r.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.id} · source: {r.source}
                      </p>
                    </td>
                    <td className="num p-3 text-right font-semibold">{r.wbgt != null ? r.wbgt.toFixed(1) : "pending"}</td>
                    <td className="p-3">
                      <StateBadge state={r.state} />
                      {r.rest ? <p className="mt-1 text-xs text-muted-foreground">{r.rest} min rest an hour</p> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <SourceNote>{snapshot.source}. Snapshot taken from the latest pulled day; live mode asks the Rehat engine, which calls data.gov.sg.</SourceNote>
      </Section>
    </>
  );
}
