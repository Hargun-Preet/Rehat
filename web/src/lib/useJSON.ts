"use client";

import { useEffect, useState } from "react";

export type LoadState<T> = { data: T | null; error: string | null; loading: boolean };

/** Client-side: fetch precomputed JSON from /data (offline), or from the engine API when live mode is on. */
export function useJSON<T>(file: string | null, liveUrl?: string, live = false): LoadState<T> {
  const [state, setState] = useState<LoadState<T>>({ data: null, error: null, loading: !!file });
  useEffect(() => {
    if (!file) return;
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    const url = live && liveUrl ? liveUrl : `/data/${file}`;
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`Could not load ${url} (${r.status})`);
        return r.json();
      })
      .then((d: T) => {
        if (!cancelled) setState({ data: d, error: null, loading: false });
      })
      .catch((e: Error) => {
        if (!cancelled) setState({ data: null, error: e.message, loading: false });
      });
    return () => {
      cancelled = true;
    };
  }, [file, liveUrl, live]);
  return state;
}

export const ENGINE_URL = process.env.NEXT_PUBLIC_ENGINE_URL ?? "http://localhost:8000";
