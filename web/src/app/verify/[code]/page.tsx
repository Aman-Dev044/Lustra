"use client";

import { useParams } from "next/navigation";
import { motion } from "motion/react";
import { QRCodeSVG } from "qrcode.react";
import { BadgeCheck, Ban, Clock, SearchX, ShieldCheck } from "lucide-react";
import type { Certificate } from "@/lib/types";

/** Public registry view — PII is reduced server-side (owner initial, last 6 of VIN). */
type PublicCertificate = Pick<Certificate, "code" | "product" | "coverage" | "installedAt" | "expiresAt" | "status"> & {
  vehicle?: { year?: number; make?: string; model?: string; color?: string; vinLast6?: string };
  owner?: string;
  installer?: string | { name?: string } | null;
  shop?: { name: string };
};
import { vehicleLabel } from "@/lib/domain";
import { formatDate } from "@/lib/utils";
import { LogoMark, Skeleton } from "@/components/spatial";
import { PublicShell, PublicState } from "@/components/app/public-shell";
import { usePublicDoc } from "@/components/app/use-public";

const states = {
  active: { label: "Verified · Active coverage", color: "#34d399", icon: BadgeCheck, body: "This certificate is authentic and the warranty is currently in force." },
  expired: { label: "Authentic · Coverage expired", color: "#fbbf24", icon: Clock, body: "This certificate is authentic, but the warranty term has ended." },
  void: { label: "Void", color: "#fb7185", icon: Ban, body: "This certificate has been voided by the issuing shop and is no longer valid." },
} as const;

export default function VerifyPage() {
  const { code } = useParams<{ code: string }>();
  const { entity: cert, shop, state } = usePublicDoc<PublicCertificate>(`/public/certificates/${encodeURIComponent(code)}`, "certificate");
  const url = typeof window !== "undefined" ? window.location.href : "";

  if (state === "loading")
    return (
      <PublicShell>
        <Skeleton className="mx-auto h-[480px] max-w-2xl" />
      </PublicShell>
    );
  if (!cert || !cert.code)
    return (
      <PublicShell>
        <PublicState
          icon={<SearchX className="size-6" />}
          title="We couldn't verify this certificate"
          description={`No certificate matches “${decodeURIComponent(code)}”. Check the code on the original document, or contact the installer.`}
        />
      </PublicShell>
    );

  const effective: keyof typeof states =
    cert.status === "void" ? "void" : cert.status === "expired" || (cert.expiresAt && new Date(cert.expiresAt) < new Date()) ? "expired" : "active";
  const s = states[effective];
  const shopName = shop?.name ?? cert.shop?.name ?? "Certified installer";
  const installer = typeof cert.installer === "string" ? cert.installer : cert.installer?.name;

  return (
    <PublicShell shop={shop ?? undefined}>
      <div className="mx-auto max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto mb-5 flex w-fit items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium"
          style={{ borderColor: `${s.color}55`, background: `${s.color}18`, color: s.color }}
          role="status"
        >
          <s.icon className="size-4" /> {s.label}
        </motion.div>

        <motion.article
          initial={{ opacity: 0, scale: 0.94, rotateX: 18 }}
          animate={{ opacity: 1, scale: 1, rotateX: 0 }}
          transition={{ type: "spring", stiffness: 180, damping: 20 }}
          style={{ perspective: 1000 }}
          className="rim relative overflow-hidden rounded-[32px] border border-ink/15 bg-[linear-gradient(135deg,#141a3a_0%,#0b0e1c_55%,#0c2430_100%)] p-7 shadow-[var(--shadow-lift)] sm:p-10"
        >
          <div className="pointer-events-none absolute -top-28 -right-28 size-80 rounded-full blur-3xl" style={{ background: `${s.color}30` }} />
          <div className="pointer-events-none absolute -bottom-28 -left-20 size-72 rounded-full bg-iris/25 blur-3xl" />
          {effective !== "active" && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
              <span className="rotate-[-18deg] rounded-2xl border-4 px-6 py-2 text-5xl font-black tracking-widest uppercase opacity-15" style={{ borderColor: s.color, color: s.color }}>
                {effective}
              </span>
            </div>
          )}
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-[10px] font-semibold tracking-[0.3em] text-aqua-soft uppercase">
                <ShieldCheck className="size-3.5" /> Certificate of Protection
              </p>
              <h1 className="text-spectral mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{cert.product}</h1>
              <p className="mt-1 text-sm text-ink-3">{cert.coverage}</p>
            </div>
          </div>

          <dl className="relative mt-8 grid grid-cols-2 gap-x-6 gap-y-5 text-sm sm:grid-cols-3">
            {[
              ["Vehicle", vehicleLabel(cert.vehicle)],
              ["Color", cert.vehicle?.color || "—"],
              ["VIN", cert.vehicle?.vinLast6 ? `•••••••••••${cert.vehicle.vinLast6}` : "—"],
              ["Registered owner", cert.owner || "—"],
              ["Installed", formatDate(cert.installedAt)],
              ["Valid through", cert.expiresAt ? formatDate(cert.expiresAt) : "Lifetime"],
              ["Installed by", installer ? `${installer} · ${shopName}` : shopName],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-[10px] tracking-[0.18em] text-ink-4 uppercase">{k}</dt>
                <dd className="mt-1 text-ink">{v}</dd>
              </div>
            ))}
          </dl>

          <div className="relative mt-8 flex flex-col items-center gap-5 border-t border-ink/10 pt-6 sm:flex-row sm:justify-between">
            <div>
              <p className="text-[10px] tracking-[0.18em] text-ink-4 uppercase">Certificate code</p>
              <p className="mt-1 font-mono text-xl tracking-[0.2em] text-ink">{cert.code}</p>
              <p className="mt-3 max-w-xs text-xs text-ink-3">{s.body}</p>
            </div>
            <div className="rounded-2xl bg-white p-3">
              <QRCodeSVG value={url || cert.code} size={120} bgColor="#ffffff" fgColor="#0b0e1c" level="M" />
            </div>
          </div>
        </motion.article>

        <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-ink-4">
          <LogoMark size={14} /> Verified in real time against the Lustra certificate registry
        </p>
      </div>
    </PublicShell>
  );
}
