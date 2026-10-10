"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { FileImage, FileText, Lock, Paperclip, Trash2, Upload } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { invalidate, useApi } from "@/lib/hooks/use-api";
import type { DocumentFile, Paginated } from "@/lib/types";
import { cn, formatDate, titleCase } from "@/lib/utils";
import { Badge, Button, Select, Skeleton } from "@/components/spatial";
import { useAuth } from "./auth-provider";

const CATEGORIES: DocumentFile["category"][] = ["waiver", "contract", "photo", "receipt", "warranty", "other"];

const formatSize = (bytes: number) =>
  bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

/** Waivers, contracts, receipts and photos attached to a job and/or customer. */
export function DocumentsPanel({ jobId, customerId, bare }: { jobId?: string; customerId?: string; bare?: boolean }) {
  const { can, isManager } = useAuth();
  const enabled = can("documents");
  const { data, loading } = useApi<Paginated<DocumentFile>>(enabled ? "/documents" : null, {
    job: jobId,
    customer: jobId ? undefined : customerId,
    pageSize: 50,
  });
  const [category, setCategory] = useState<DocumentFile["category"]>("waiver");
  const [uploading, setUploading] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  if (!enabled) {
    return (
      <div className={cn("flex items-center gap-3 rounded-2xl border border-dashed border-white/10 px-4 py-3 text-xs text-ink-3", !bare && "glass")}>
        <Lock className="size-4 shrink-0 text-ink-4" />
        <span className="flex-1">Store signed waivers, contracts and receipts with every job — included on Pro.</span>
        <Link href="/app/settings?tab=billing" className="font-medium text-aqua-soft hover:text-white">
          Upgrade
        </Link>
      </div>
    );
  }

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.append("file", file);
        form.append("name", file.name);
        form.append("category", category);
        if (jobId) form.append("job", jobId);
        if (customerId) form.append("customer", customerId);
        await api.upload<DocumentFile>("/documents", form);
      }
      invalidate("/documents");
      toast.success(files.length === 1 ? "Document uploaded" : `${files.length} documents uploaded`);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setUploading(false);
      if (input.current) input.current.value = "";
    }
  }

  async function remove(doc: DocumentFile) {
    try {
      await api.delete(`/documents/${doc._id}`);
      invalidate("/documents");
      toast.success(`${doc.name} deleted`);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  const docs = data?.items ?? [];

  return (
    <div className={cn(!bare && "glass rounded-[var(--radius-card)] p-5")}>
      {!bare && (
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Paperclip className="size-4 text-ink-3" /> Documents
        </h2>
      )}
      <div
        className="mb-3 flex flex-wrap items-center gap-2 rounded-2xl border border-dashed border-white/12 bg-white/[0.02] p-3"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          void upload(e.dataTransfer.files);
        }}
      >
        <Select value={category} onChange={(e) => setCategory(e.target.value as DocumentFile["category"])} className="h-9 w-auto text-xs" aria-label="Document category">
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {titleCase(c)}
            </option>
          ))}
        </Select>
        <input ref={input} type="file" multiple className="sr-only" id={`doc-upload-${jobId ?? customerId}`} onChange={(e) => upload(e.target.files)} />
        <Button size="sm" variant="secondary" loading={uploading} onClick={() => input.current?.click()}>
          {!uploading && <Upload className="size-4" />} Upload
        </Button>
        <span className="text-[11px] text-ink-4">or drop files here · PDF, images up to 50 MB</span>
      </div>
      {loading && !data ? (
        <Skeleton className="h-16" />
      ) : docs.length === 0 ? (
        <p className="py-4 text-center text-sm text-ink-4">No documents yet.</p>
      ) : (
        <ul className="space-y-1.5">
          {docs.map((d) => {
            const Icon = d.mime?.startsWith("image/") ? FileImage : FileText;
            return (
              <li key={d._id} className="group flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-white/[0.04]">
                <span className="glass flex size-9 shrink-0 items-center justify-center rounded-lg text-aqua-soft">
                  <Icon className="size-4" />
                </span>
                <a href={d.url} target="_blank" rel="noopener" className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-ink hover:text-aqua-soft">{d.name}</span>
                  <span className="text-[11px] text-ink-4">
                    {formatSize(d.size)} · {formatDate(d.createdAt)}
                  </span>
                </a>
                <Badge>{titleCase(d.category)}</Badge>
                {isManager && (
                  <button
                    onClick={() => remove(d)}
                    className="rounded-full p-1.5 text-ink-4 opacity-0 transition group-hover:opacity-100 hover:bg-danger/10 hover:text-danger focus:opacity-100"
                    aria-label={`Delete ${d.name}`}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
