"use client";
import { useEffect, useState } from "react";
import { DEFAULT_MARKETS, type Market } from "@/lib/markets";
import { startVisiblePolling } from "@/lib/visible-polling";
const CACHE_KEY = "stockflow-market-prices-v2";
type Snapshot = { assets: Market[]; updatedAt: string | null; stale?: boolean };
export function useMarketData(enabled = true) {
  const [snapshot, setSnapshot] = useState<Snapshot>({
    assets: DEFAULT_MARKETS,
    updatedAt: null,
  });
  const [status, setStatus] = useState("Indicative market prices");
  useEffect(() => {
    if (!enabled) return;
    let stopped = false;
    const controller = new AbortController();
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const cached = JSON.parse(raw) as Snapshot;
        if (
          Array.isArray(cached.assets) &&
          cached.assets.some((asset) => typeof asset.price === "number")
        ) {
          // eslint-disable-next-line react-hooks/set-state-in-effect -- Hydrate a browser cache after mounting.
          setSnapshot(cached);
        }
      }
    } catch {
      /* Cache is optional, including in private browsing. */
    }
    const stop = startVisiblePolling(async () => {
      try {
        const response = await fetch("/api/xstocks", {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Market refresh failed");
        const incoming = (await response.json()) as Snapshot;
        if (stopped) return;
        if (!Array.isArray(incoming.assets))
          throw new Error("Invalid market response");
        setSnapshot((current) => {
          const assets = DEFAULT_MARKETS.map((asset) => {
            const next = incoming.assets.find(
              (candidate) => candidate.ticker === asset.ticker,
            );
            const old = current.assets.find(
              (candidate) => candidate.ticker === asset.ticker,
            );
            return next &&
              typeof next.price === "number" &&
              Number.isFinite(next.price) &&
              next.price > 0
              ? { ...asset, ...next }
              : (old ?? asset);
          });
          const updatedAt = incoming.updatedAt ?? current.updatedAt;
          const result = { assets, updatedAt, stale: incoming.stale };
          try {
            localStorage.setItem(CACHE_KEY, JSON.stringify(result));
          } catch {
            /* Optional cache. */
          }
          return result;
        });
        setStatus(
          incoming.stale
            ? "Last available prices · refresh delayed"
            : incoming.assets.some((asset) => asset.price !== null)
              ? "Indicative prices · refresh every 2 minutes"
              : "Prices temporarily unavailable",
        );
      } catch {
        if (!stopped) setStatus("Last available prices · refresh delayed");
      }
    }, 120000);
    return () => {
      stopped = true;
      stop();
      controller.abort();
    };
  }, [enabled]);
  return { markets: snapshot.assets, updatedAt: snapshot.updatedAt, status };
}
