"use client";

import "leaflet/dist/leaflet.css";

import { CircleMarker, MapContainer, Tooltip } from "react-leaflet";

export type MapPoint = {
  id: string;
  lat: number;
  lon: number;
  label: string;
  detail?: string;
  kind: "site" | "primary" | "backup" | "rain" | "station" | "triggered" | "not" | "pending";
  value?: string;
};

const style: Record<MapPoint["kind"], { color: string; fill: string; r: number; dash?: string }> = {
  site: { color: "#00467a", fill: "#00467a", r: 9 },
  primary: { color: "#b35300", fill: "#f57100", r: 10 },
  backup: { color: "#b35300", fill: "#ffbf87", r: 8 },
  rain: { color: "#0072c1", fill: "#a2d8ff", r: 7 },
  station: { color: "#5b5d5e", fill: "#d4d4d4", r: 6 },
  triggered: { color: "#b35300", fill: "#f57100", r: 9 },
  not: { color: "#5b6b7a", fill: "#eef1f4", r: 8 },
  pending: { color: "#a16207", fill: "#fef6e0", r: 8, dash: "3 3" },
};

/** Offline-first station plot. All marker coordinates are bundled with the app. */
export default function MapInner({ points, height = 360, zoom = 11, center }: { points: MapPoint[]; height?: number; zoom?: number; center?: [number, number] }) {
  const c: [number, number] = center ?? [1.3521, 103.8198];
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-[#eef1f4]" style={{ height }}>
      <MapContainer center={c} zoom={zoom} scrollWheelZoom={false} style={{ height: "100%", width: "100%", background: "#eef1f4" }} attributionControl={false}>
        {points.map((p) => {
          const s = style[p.kind];
          return (
            <CircleMarker key={p.id + p.kind} center={[p.lat, p.lon]} radius={s.r} pathOptions={{ color: s.color, fillColor: s.fill, fillOpacity: 0.95, weight: 2, dashArray: s.dash }}>
              <Tooltip direction="top" offset={[0, -6]} opacity={1} permanent={p.kind === "site" || p.kind === "primary"}>
                <span className="text-xs">
                  <strong>{p.label}</strong>
                  {p.value ? ` ${p.value}` : ""}
                  {p.detail ? <><br />{p.detail}</> : null}
                </span>
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
