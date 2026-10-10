"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { api, ApiError } from "@/lib/api";

/* A tiny stale-while-revalidate store: cached by path+query, invalidated by path prefix (e.g. after a socket event).
   All loading state lives in the store, so components only subscribe — they never set state inside effects. */

type Query = Record<string, string | number | boolean | undefined | null>;
type Entry = { data?: unknown; error?: ApiError | Error; at: number };

const cache = new Map<string, Entry>();
const inflight = new Set<string>();
const listeners = new Set<() => void>();
let version = 0;

function notify() {
  version++;
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

const keyOf = (path: string, query?: Query) => `${path}?${JSON.stringify(query ?? {})}`;

async function load(key: string, path: string, query?: Query) {
  if (inflight.has(key)) return;
  inflight.add(key);
  notify();
  try {
    const data = await api.get<unknown>(path, query);
    cache.set(key, { data, at: Date.now() });
  } catch (e) {
    cache.set(key, { ...(cache.get(key) ?? {}), error: e as Error, at: Date.now() });
  } finally {
    inflight.delete(key);
    notify();
  }
}

/** Mark every cached query whose path starts with one of `prefixes` as stale; mounted hooks refetch. */
export function invalidate(...prefixes: string[]) {
  for (const [key, entry] of cache) {
    if (prefixes.some((p) => key.startsWith(p))) cache.set(key, { ...entry, at: 0 });
  }
  notify();
}

const STALE_MS = 15_000;

export function useApi<T>(path: string | null, query?: Query, opts: { keepPrevious?: boolean } = { keepPrevious: true }) {
  const key = path ? keyOf(path, query) : null;
  const storeVersion = useSyncExternalStore(subscribe, () => version, () => 0);
  const entry = key ? cache.get(key) : undefined;
  const current = entry?.data as T | undefined;

  // Keep showing the last result while a new key (filter/page change) loads — "adjust state during render".
  const [previous, setPrevious] = useState<T | undefined>(undefined);
  if (current !== undefined && current !== previous) setPrevious(current);

  useEffect(() => {
    if (!key || !path) return;
    const e = cache.get(key);
    if (!e || Date.now() - e.at > STALE_MS) void load(key, path, query);
    // `query` is captured through `key`, which serializes it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, storeVersion]);

  const refresh = useCallback(async () => {
    if (!key || !path) return;
    cache.set(key, { ...(cache.get(key) ?? {}), at: 0 });
    await load(key, path, query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const mutate = useCallback(
    (updater: T | ((prev: T | undefined) => T | undefined)) => {
      if (!key) return;
      const prev = cache.get(key)?.data as T | undefined;
      const next = typeof updater === "function" ? (updater as (p: T | undefined) => T | undefined)(prev) : updater;
      if (next === undefined) return;
      cache.set(key, { data: next, at: Date.now() });
      notify();
    },
    [key],
  );

  const isLoading = !!key && inflight.has(key);
  return {
    data: current ?? (opts.keepPrevious ? previous : undefined),
    error: entry?.error as ApiError | undefined,
    loading: !!key && current === undefined && (isLoading || !entry),
    refreshing: isLoading,
    refresh,
    mutate,
  };
}

/** Debounce a fast-changing value (search boxes). */
export function useDebounced<T>(value: T, ms = 250) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}
