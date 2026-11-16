"use client";

import { MapPinned, Radio, ShieldCheck, WifiOff } from "lucide-react";
import { useMemo, useState } from "react";

import { Ellipsis, PageHeader, Section, SourceNote, StateBadge } from "@/components/brand";
import { StationMap, type MapPoint } from "@/components/rehat/StationMap";
import { Switch } from "@/components/ui/switch";
import { ENGINE_URL } from "@/lib/useJSON";
import { dayName } from "@/lib/format";
import type { ProductSpec } from "@/lib/product";
import { cn } from "@/lib/utils";
import type { HourState } from "@/lib/types";

type Hour = { hour: number; wbgt: number | null; state: HourState; rest: number | null };
type Station = { station_id: string; name: string; lat: number; lon: number; region: string; latest: { ts: string; wbgt: number } | null; hours: Hour[] };
export type LiveData = { snapshot_day: string; latest_ts: string; stations: Station[]; psi: { ts: string | null; regions: Record<string, number> }; mode: string; source: string };
type LiveApi = {
  day: string;
  availability?: "available" | "pending";
  message?: string | null;
  stations: {
    station_id: string;
    name: string;
    lat: number;
    lon: number;
    wbgt: number | null;
    ts: string;
    state?: HourState;
    rest_if_hour_mean: number | null;
    rest_minutes?: number | null;
  }[];
  psi: { ts?: string; regions?: Record<string, number> };
};

const psiBand = (v: number) => (v > 300 ? "Hazardous" : v > 200 ? "Very unhealthy" : v > 100 ? "Unhealthy" : v > 50 ? "Moderate" : "Good");

export default function Live({ snapshot, product }: { snapshot: LiveData; product: ProductSpec }) {
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
      setLiveData(d);
      if (!d.stations.length || d.availability === "pending") {
        setLiveErr(d.message ?? "Live NEA readings are pending. Missing readings are not read as no event.");
      }
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
        state: s.state ?? (s.wbgt == null ? "PENDING" : s.rest_if_hour_mean && s.rest_if_hour_mean > 0 ? "TRIGGERED" : "NOT_TRIGGERED"),
        rest: s.rest_minutes ?? s.rest_if_hour_mean,
        source: "hourly result supplied by the engine",
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
  const activeCount = counts.TRIGGERED ?? 0;
  const pendingCount = counts.PENDING ?? 0;

  return (
    <>
      <PageHeader eyebrow="Labs / live station map" title={`${activeCount} stations show a heat break at the selected hour`} icon={MapPinned}>
        {product.copy.rule_statement} {live && (!liveData?.stations.length || liveData.availability === "pending") ? "Today’s live station readings are pending and will not be read as no event." : pendingCount ? `${pendingCount} station ${pendingCount === 1 ? "is" : "are"} pending and will not be read as no event.` : "All selected station readings are available."}
      </PageHeader>
      <Section>
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-income-blue-100 bg-income-blue-50 p-4 text-sm">
          <span className="flex max-w-2xl items-start gap-2 text-income-blue">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span><span className="font-semibold">Evidence only.</span> The map shows station readings and their data state. It does not change a customer&apos;s payout.</span>
          </span>
          <span className="rounded-full bg-surface px-3 py-1 text-xs font-semibold text-income-blue">{product.triggers.heat.meter}</span>
        </div>
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
              <StateBadge state="TRIGGERED" /> <span className="num text-sm">{activeCount}</span>
              <StateBadge state="NOT_TRIGGERED" /> <span className="num text-sm">{counts.NOT_TRIGGERED ?? 0}</span>
              <StateBadge state="PENDING" /> <span className="num text-sm">{pendingCount}</span>
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
        <SourceNote>{snapshot.source}. The offline snapshot is bundled with the app; live mode asks the Rehat engine, which calls data.gov.sg. Missing readings remain pending under the published fallback ladder.</SourceNote>
      </Section>
    </>
  );
}
