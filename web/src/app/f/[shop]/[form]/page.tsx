"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "motion/react";
import { Check, FileX2 } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError, errorMessage } from "@/lib/api";
import type { LeadForm, Service } from "@/lib/types";
import { Skeleton } from "@/components/spatial";
import { PublicShell, PublicState, type PublicShop } from "@/components/app/public-shell";
import { LeadFormRenderer, type Answers } from "@/components/app/lead-form-renderer";

type Data = { shop: PublicShop; form: LeadForm; services: Service[] };

export default function PublicLeadFormPage() {
  const { shop: shopSlug, form: formSlug } = useParams<{ shop: string; form: string }>();
  const [data, setData] = useState<Data | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "notfound" | "error">("loading");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Data>(`/public/forms/${shopSlug}/${formSlug}`)
      .then((d) => {
        setData(d);
        setState("ready");
      })
      .catch((e) => setState(e instanceof ApiError && e.status === 404 ? "notfound" : "error"));
  }, [shopSlug, formSlug]);

  async function submit(answers: Answers) {
    if (!data) return;
    setSubmitting(true);
    try {
      const r = await api.post<{ ok: boolean; message?: string }>(`/public/forms/${shopSlug}/${formSlug}`, { answers });
      setDone(r.message || data.form.successMessage || "Thanks! We'll be in touch shortly.");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  if (state === "loading")
    return (
      <PublicShell>
        <Skeleton className="mx-auto h-[560px] max-w-xl" />
      </PublicShell>
    );
  if (!data || !data.form?.active)
    return (
      <PublicShell shop={data?.shop}>
        <PublicState
          icon={<FileX2 className="size-6" />}
          title={state === "error" ? "We couldn't load this form" : "This form isn't available"}
          description={state === "error" ? "Please refresh in a moment." : "It may have been moved or paused by the shop."}
        />
      </PublicShell>
    );

  const brand = data.shop.brandColor || "#7c5cff";

  return (
    <PublicShell shop={data.shop}>
      <div className="mx-auto max-w-xl">
        {done ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 220, damping: 18 }}
            className="glass-2 rim mt-6 rounded-[32px] p-10 text-center"
          >
            <span className="mx-auto flex size-16 items-center justify-center rounded-full" style={{ background: `linear-gradient(135deg, ${brand}, #22d3ee)`, boxShadow: `0 20px 50px -14px ${brand}` }}>
              <Check className="size-8 text-white" strokeWidth={3} />
            </span>
            <h1 className="mt-5 text-2xl font-semibold tracking-tight">Request received</h1>
            <p className="mt-2 text-sm text-ink-3">{done}</p>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-2 rim rounded-[32px] p-6 sm:p-8">
            <LeadFormRenderer form={data.form} services={data.services} brand={brand} onSubmit={submit} submitting={submitting} />
          </motion.div>
        )}
      </div>
    </PublicShell>
  );
}
