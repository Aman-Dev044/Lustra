"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { unwrap } from "./portal-widgets";
import type { PublicShop } from "./public-shell";

/** Loads a token-addressed public document (quote, invoice, inspection) plus its shop branding. */
export function usePublicDoc<T>(path: string, key: string) {
  const [entity, setEntity] = useState<T | null>(null);
  const [shop, setShop] = useState<PublicShop | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "notfound" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    api
      .get<unknown>(path)
      .then((r) => {
        if (cancelled) return;
        const u = unwrap<T>(r, key);
        setEntity(u.entity);
        setShop(u.shop ?? null);
        setState("ready");
      })
      .catch((e) => !cancelled && setState(e instanceof ApiError && e.status === 404 ? "notfound" : "error"));
    return () => {
      cancelled = true;
    };
  }, [path, key]);

  return { entity, setEntity, shop, state };
}
