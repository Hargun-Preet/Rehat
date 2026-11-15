"use client";

import dynamic from "next/dynamic";

import { Ellipsis } from "@/components/brand";

import type { MapPoint } from "./MapInner";

export type { MapPoint };

const MapInner = dynamic(() => import("./MapInner"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[360px] items-center justify-center rounded-2xl border border-line bg-surface">
      <Ellipsis variant="loader" label="Loading map" />
    </div>
  ),
});

export function StationMap(props: { points: MapPoint[]; height?: number; zoom?: number; center?: [number, number] }) {
  return <MapInner {...props} />;
}
