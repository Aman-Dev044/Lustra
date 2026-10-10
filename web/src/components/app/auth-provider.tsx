"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import type { Shop, User } from "@/lib/types";
import { hasFeature, type Feature } from "@/lib/plans";
import { Spinner } from "@/components/spatial";

interface AuthState {
  user: User;
  shop: Shop;
  setShop: (shop: Shop) => void;
  setUser: (user: User) => void;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  can: (feature: Feature) => boolean;
  isManager: boolean;
}

const AuthContext = createContext<AuthState | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<{ user: User; shop: Shop } | null>(null);
  const [attempt, setAttempt] = useState(0);

  const load = useCallback(async () => {
    const me = await api.get<{ user: User; shop: Shop }>("/auth/me");
    setState(me);
  }, []);

  useEffect(() => {
    let retry: ReturnType<typeof setTimeout> | undefined;
    api
      .get<{ user: User; shop: Shop }>("/auth/me")
      .then(setState)
      .catch(async (e) => {
        if (e instanceof ApiError && e.status === 401) {
          // Clear a stale/expired cookie first so the proxy doesn't bounce /login straight back to /app.
          await api.post("/auth/logout").catch(() => undefined);
          router.replace(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
        } else {
          retry = setTimeout(() => setAttempt((a) => a + 1), 3000);
        }
      });
    return () => clearTimeout(retry);
  }, [attempt, router]);

  const logout = useCallback(async () => {
    await api.post("/auth/logout").catch(() => undefined);
    router.replace("/login");
  }, [router]);

  if (!state) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4">
        <div className="relative">
          <div className="absolute inset-0 animate-pulse-ring rounded-full bg-iris/40" />
          <div className="glass-2 relative flex size-14 items-center justify-center rounded-2xl">
            <Spinner className="text-aqua-soft" />
          </div>
        </div>
        <p className="text-sm text-ink-3">Opening your workspace…</p>
      </div>
    );
  }

  const value: AuthState = {
    user: state.user,
    shop: state.shop,
    setShop: (shop) => setState((s) => (s ? { ...s, shop } : s)),
    setUser: (user) => setState((s) => (s ? { ...s, user } : s)),
    refresh: load,
    logout,
    can: (feature) => hasFeature(state.shop.plan, feature),
    isManager: state.user.role !== "technician",
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
