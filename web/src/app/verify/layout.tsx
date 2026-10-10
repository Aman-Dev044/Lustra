import type { Metadata } from "next";
import { Suspense } from "react";
import { DynamicMarker } from "@/components/dynamic-marker";

export const metadata: Metadata = {
  title: "Verify warranty certificate",
  robots: { index: false, follow: false },
};

export default function VerifyLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense fallback={null}>
        <DynamicMarker />
      </Suspense>
      <Suspense fallback={<div className="min-h-dvh bg-void" />}>{children}</Suspense>
    </>
  );
}
