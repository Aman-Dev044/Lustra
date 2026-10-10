import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthProvider } from "@/components/app/auth-provider";
import { RealtimeProvider } from "@/components/app/realtime-provider";
import { AppShell } from "@/components/app/app-shell";
import { DynamicMarker } from "@/components/dynamic-marker";

export const metadata: Metadata = {
  title: { default: "Dashboard", template: "%s · Lustra" },
  robots: { index: false, follow: false },
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense fallback={null}>
        <DynamicMarker />
      </Suspense>
      <AuthProvider>
        <RealtimeProvider>
          <AppShell>{children}</AppShell>
        </RealtimeProvider>
      </AuthProvider>
    </>
  );
}
