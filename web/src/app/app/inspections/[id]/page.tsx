"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Copy, ImagePlus, Lock, PenLine, Play, Send, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api";
import { invalidate, useApi } from "@/lib/hooks/use-api";
import type { Inspection, InspectionView, Job } from "@/lib/types";
import { customerName, vehicleLabel } from "@/lib/domain";
import { cn, formatDateTime } from "@/lib/utils";
import { Badge, Button, EmptyState, Field, Glass, Input, Modal, Skeleton, Textarea } from "@/components/spatial";
import { PageHeader } from "@/components/app/ui";
import { useAuth } from "@/components/app/auth-provider";
import { DamageMap, damageKinds, severityMeta, viewOptions, type Marker } from "@/components/app/damage-map";

const statusMeta = {
  draft: { label: "Draft", tone: "neutral" },
  awaiting_signature: { label: "Awaiting signature", tone: "warning" },
  signed: { label: "Signed", tone: "success" },
} as const;

export default function InspectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, loading, error, mutate } = useApi<Inspection>(`/inspections/${id}`);

  if (error && !data) {
    return <EmptyState title="Inspection not found" description={error.message} action={<Button href="/app/inspections">Back to inspections</Button>} />;
  }
  if (loading || !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 w-80" />
        <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
          <Skeleton className="h-[420px]" />
          <Skeleton className="h-[420px]" />
        </div>
      </div>
    );
  }
  return <InspectionEditor inspection={data} onUpdated={(i) => mutate(i)} />;
}

function InspectionEditor({ inspection, onUpdated }: { inspection: Inspection; onUpdated: (i: Inspection) => void }) {
  const { can } = useAuth();
  const [markers, setMarkers] = useState<Marker[]>(inspection.markers ?? []);
  const [selected, setSelected] = useState<number | null>(null);
  const [view, setView] = useState<InspectionView>("top");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [notes, setNotes] = useState(inspection.notes ?? "");
  const [requesting, setRequesting] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const signed = inspection.status === "signed";
  const job = typeof inspection.job === "object" ? (inspection.job as Job | null) : null;

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  async function persist(patch: Partial<Inspection>) {
    setSaveState("saving");
    try {
      const updated = await api.patch<Inspection>(`/inspections/${inspection._id}`, patch);
      onUpdated(updated);
      setSaveState("saved");
      invalidate("/inspections");
    } catch (e) {
      setSaveState("idle");
      toast.error(errorMessage(e));
    }
  }

  function changeMarkers(next: Marker[]) {
    setMarkers(next);
    if (timer.current) clearTimeout(timer.current);
    setSaveState("saving");
    timer.current = setTimeout(() => void persist({ markers: next }), 600);
  }

  function updateSelected(patch: Partial<Marker>) {
    if (selected === null) return;
    changeMarkers(markers.map((m, i) => (i === selected ? { ...m, ...patch } : m)));
  }

  async function requestSignature() {
    setRequesting(true);
    try {
      const updated = await api.post<Inspection>(`/inspections/${inspection._id}/request-signature`);
      onUpdated(updated);
      toast.success("Signature request sent to the customer");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setRequesting(false);
    }
  }

  const link = typeof window !== "undefined" ? `${window.location.origin}/portal/inspection/${inspection.publicToken}` : "";
  const sel = selected !== null ? markers[selected] : undefined;

  return (
    <>
      <PageHeader
        back={{ href: "/app/inspections", label: "Inspections" }}
        eyebrow={inspection.type === "pre" ? "Pre-service walkaround" : "Post-service delivery"}
        title={vehicleLabel(inspection.vehicle)}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            {customerName(inspection.customer)}
            {job && (
              <Link href={`/app/jobs/${job._id}`} className="text-aqua-soft hover:text-white">
                · Job #{job.number}
              </Link>
            )}
            <Badge tone={statusMeta[inspection.status].tone} dot>
              {statusMeta[inspection.status].label}
            </Badge>
            <span className="text-xs text-ink-4">{saveState === "saving" ? "Saving…" : saveState === "saved" ? "All changes saved" : ""}</span>
          </span>
        }
        actions={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                void navigator.clipboard.writeText(link);
                toast.success("Customer link copied");
              }}
            >
              <Copy className="size-4" /> Copy customer link
            </Button>
            {!signed && (
              <Button size="sm" onClick={requestSignature} loading={requesting}>
                <Send className="size-4" /> Request signature
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Glass className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Damage map</h2>
            <span className="text-xs text-ink-4">{signed ? "Locked — signed by customer" : "Tap the vehicle to drop a pin · drag to move"}</span>
          </div>
          <DamageMap
            markers={markers}
            onChange={signed ? undefined : changeMarkers}
            readOnly={signed}
            selected={selected}
            onSelect={setSelected}
            view={view}
            onViewChange={setView}
          />
        </Glass>

        <div className="space-y-4">
          <Glass className="p-5">
            <h2 className="mb-3 text-sm font-semibold">{sel ? "Edit marker" : "Markers"}</h2>
            {sel ? (
              <div className="space-y-4">
                <div>
                  <p className="mb-1.5 text-xs font-medium text-ink-2">Type</p>
                  <div className="flex flex-wrap gap-1.5">
                    {damageKinds.map((k) => (
                      <button
                        key={k.value}
                        disabled={signed}
                        onClick={() => updateSelected({ kind: k.value })}
                        className={cn(
                          "rounded-full border px-3 py-1 text-xs transition",
                          sel.kind === k.value ? "border-aqua/50 bg-aqua/15 text-aqua-soft" : "border-white/10 text-ink-3 hover:text-ink",
                        )}
                      >
                        {k.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-1.5 text-xs font-medium text-ink-2">Severity</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {([1, 2, 3] as const).map((s) => (
                      <button
                        key={s}
                        disabled={signed}
                        onClick={() => updateSelected({ severity: s })}
                        className={cn(
                          "flex items-center justify-center gap-1.5 rounded-xl border py-2 text-xs transition",
                          sel.severity === s ? "border-white/30 bg-white/[0.1] text-ink" : "border-white/10 text-ink-3 hover:text-ink",
                        )}
                      >
                        <span className="size-2.5 rounded-full" style={{ background: severityMeta[s].color }} />
                        {severityMeta[s].label}
                      </button>
                    ))}
                  </div>
                </div>
                <Field label="Note">
                  <Textarea
                    value={sel.note ?? ""}
                    disabled={signed}
                    onChange={(e) => updateSelected({ note: e.target.value })}
                    placeholder="e.g. 3-inch key scratch through clear coat"
                    className="min-h-20"
                  />
                </Field>
                <div className="flex justify-between">
                  <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
                    Done
                  </Button>
                  {!signed && (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => {
                        changeMarkers(markers.filter((_, i) => i !== selected));
                        setSelected(null);
                      }}
                    >
                      <Trash2 className="size-4" /> Remove
                    </Button>
                  )}
                </div>
              </div>
            ) : markers.length === 0 ? (
              <p className="py-6 text-center text-sm text-ink-4">No damage recorded. Clean bill of health so far.</p>
            ) : (
              <ul className="max-h-80 space-y-1 overflow-y-auto">
                {markers.map((m, i) => (
                  <li key={m._id ?? i}>
                    <button
                      onClick={() => {
                        setView(m.view);
                        setSelected(i);
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition hover:bg-white/[0.06]"
                    >
                      <span className="size-2.5 shrink-0 rounded-full" style={{ background: severityMeta[m.severity].color }} />
                      <span className="flex-1">
                        <span className="text-ink">{damageKinds.find((k) => k.value === m.kind)?.label}</span>
                        <span className="ml-2 text-xs text-ink-4">{viewOptions.find((v) => v.value === m.view)?.label}</span>
                        {m.note && <span className="block truncate text-xs text-ink-3">{m.note}</span>}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Glass>

          <SignatureCard inspection={inspection} />

          <Glass className="p-5">
            <Field label="Inspection notes">
              <Textarea
                value={notes}
                disabled={signed}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={() => notes !== (inspection.notes ?? "") && void persist({ notes })}
                placeholder="Overall condition, odometer, items left in the vehicle…"
              />
            </Field>
          </Glass>
        </div>
      </div>

      <MediaSection inspection={inspection} onUpdated={onUpdated} canVideo={can("video_inspections")} />
    </>
  );
}

function SignatureCard({ inspection }: { inspection: Inspection }) {
  if (inspection.status === "signed" && inspection.signature) {
    return (
      <Glass className="border-success/30 p-5">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 size-5 text-success" />
          <div>
            <p className="text-sm font-semibold text-ink">Signed by customer</p>
            <p className="mt-1 font-serif text-2xl text-ink italic">{inspection.signature.name}</p>
            <p className="mt-1 text-xs text-ink-4">{formatDateTime(inspection.signature.signedAt)}</p>
          </div>
        </div>
      </Glass>
    );
  }
  return (
    <Glass className="p-5">
      <div className="flex items-start gap-3">
        <PenLine className="mt-0.5 size-5 text-ink-3" />
        <div>
          <p className="text-sm font-semibold text-ink">
            {inspection.status === "awaiting_signature" ? "Waiting on customer signature" : "Not signed yet"}
          </p>
          <p className="mt-1 text-xs text-ink-3">
            Customers review every pin and photo from their phone, then sign to acknowledge pre-existing condition.
          </p>
        </div>
      </div>
    </Glass>
  );
}

function MediaSection({ inspection, onUpdated, canVideo }: { inspection: Inspection; onUpdated: (i: Inspection) => void; canVideo: boolean }) {
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState("");
  const [lightbox, setLightbox] = useState<Inspection["media"][number] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [removing, setRemoving] = useState(false);

  async function removeMedia(mediaId: string) {
    setRemoving(true);
    try {
      const r = await api.delete<Inspection | null>(`/inspections/${inspection._id}/media/${mediaId}`);
      onUpdated(r && Array.isArray(r.media) ? r : { ...inspection, media: inspection.media.filter((m) => m._id !== mediaId) });
      setLightbox(null);
      toast.success("Media removed");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setRemoving(false);
    }
  }

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    try {
      let latest: Inspection | null = null;
      for (const file of Array.from(files)) {
        if (file.type.startsWith("video/") && !canVideo) {
          toast.error("HD video inspections are on the Enterprise plan");
          continue;
        }
        const form = new FormData();
        form.append("file", file);
        if (caption) form.append("caption", caption);
        latest = await api.upload<Inspection>(`/inspections/${inspection._id}/media`, form);
      }
      if (latest) {
        onUpdated(latest);
        toast.success("Media uploaded");
      }
      setCaption("");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <Glass className="mt-4 p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold">Photos & video</h2>
          <p className="text-xs text-ink-4">
            {canVideo ? "HD photos and walkaround video up to 50 MB each." : "HD photos. "}
            {!canVideo && (
              <Link href="/app/settings?tab=billing" className="inline-flex items-center gap-1 text-aqua-soft">
                <Lock className="size-3" /> Video on Enterprise
              </Link>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Caption (optional)" className="h-10 sm:w-56" />
          <input
            ref={fileRef}
            type="file"
            multiple
            hidden
            accept={canVideo ? "image/*,video/*" : "image/*"}
            onChange={(e) => void upload(e.target.files)}
          />
          <Button size="sm" className="h-10" onClick={() => fileRef.current?.click()} loading={uploading}>
            <Upload className="size-4" /> Upload
          </Button>
        </div>
      </div>
      {inspection.media.length === 0 ? (
        <button
          onClick={() => fileRef.current?.click()}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 py-12 text-sm text-ink-3 transition hover:border-aqua/40 hover:text-ink"
        >
          <ImagePlus className="size-7" />
          Drop in your walkaround photos
        </button>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {inspection.media.map((m) => (
            <button
              key={m._id}
              onClick={() => setLightbox(m)}
              className="group relative aspect-[4/3] overflow-hidden rounded-2xl border border-white/10 bg-black/30"
            >
              {m.kind === "video" ? (
                <>
                  <video src={m.url} className="size-full object-cover" muted preload="metadata" />
                  <span className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <Play className="size-8 fill-white text-white" />
                  </span>
                </>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.url} alt={m.caption || "Inspection photo"} className="size-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" />
              )}
              {m.caption && (
                <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/80 to-transparent px-2.5 pt-6 pb-2 text-left text-[11px] text-white">
                  {m.caption}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
      <Modal
        open={!!lightbox}
        onClose={() => setLightbox(null)}
        title={lightbox?.caption || "Inspection media"}
        size="xl"
        footer={
          inspection.status !== "signed" &&
          lightbox && (
            <Button variant="danger" size="sm" loading={removing} onClick={() => void removeMedia(lightbox._id)}>
              <Trash2 className="size-4" /> Delete
            </Button>
          )
        }
      >
        {lightbox &&
          (lightbox.kind === "video" ? (
            <video src={lightbox.url} controls autoPlay className="max-h-[70vh] w-full rounded-2xl" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={lightbox.url} alt={lightbox.caption || "Inspection photo"} className="max-h-[70vh] w-full rounded-2xl object-contain" />
          ))}
      </Modal>
    </Glass>
  );
}
