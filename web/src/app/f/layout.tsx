import type { Metadata } from "next";
import { Suspense } from "react";
import { DynamicMarker } from "@/components/dynamic-marker";

export const metadata: Metadata = {
  title: "Request a quote",
  robots: { index: false, follow: false },
};

export default function LeadFormLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense fallback={null}>
        <DynamicMarker />
      </Suspense>
      <Suspense fallback={<div className="min-h-dvh bg-void" />}>{children}</Suspense>
    </>
  );
}
