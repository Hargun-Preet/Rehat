"use client";

import dynamic from "next/dynamic";
import { Component, type ReactNode } from "react";
import { MapPinned } from "lucide-react";

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

type StationMapProps = {
  points: MapPoint[];
  height?: number;
  zoom?: number;
  center?: [number, number];
};

type MapErrorBoundaryProps = {
  children: ReactNode;
  height: number;
};

type MapErrorBoundaryState = {
  hasError: boolean;
};

/**
 * Keeps a browser-only Leaflet import failure inside the map area. This is
 * particularly important in onboarding: station data remains usable even if a
 * stale dev chunk or an offline browser cannot load Leaflet.
 */
class MapErrorBoundary extends Component<MapErrorBoundaryProps, MapErrorBoundaryState> {
  state: MapErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): MapErrorBoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return <MapFallback height={this.props.height} />;
    }

    return this.props.children;
  }
}

function MapFallback({ height }: { height: number }) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-surface px-6 text-center"
      role="status"
      style={{ height }}
    >
      <MapPinned aria-hidden="true" className="mb-3 h-6 w-6 text-income-blue" />
      <p className="text-sm font-semibold text-ink">Map unavailable</p>
      <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">
        The named station details are still available. You can continue without the map.
      </p>
    </div>
  );
}

export function StationMap({ height = 360, ...props }: StationMapProps) {
  return (
    <MapErrorBoundary height={height}>
      <MapInner {...props} height={height} />
    </MapErrorBoundary>
  );
}
