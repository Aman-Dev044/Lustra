"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Download, ExternalLink, File, FileImage, FileSpreadsheet, FileText, FolderOpen, LayoutGrid, List, Search, Trash2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api";
import { invalidate, useApi, useDebounced } from "@/lib/hooks/use-api";
import type { Customer, DocumentFile, Paginated } from "@/lib/types";
import { customerName } from "@/lib/domain";
import { cn, formatDate, titleCase } from "@/lib/utils";
import { Badge, Button, ConfirmDialog, EmptyState, Field, Glass, Modal, Segmented, Select, Skeleton } from "@/components/spatial";
import { PageHeader, PlanGate, Table, Td, Th } from "@/components/app/ui";
import { CustomerPicker } from "@/components/app/pickers";

const categories: DocumentFile["category"][] = ["waiver", "contract", "photo", "receipt", "warranty", "other"];
const catTone = { waiver: "iris", contract: "info", photo: "aqua", receipt: "success", warranty: "plasma", other: "neutral" } as const;

const fmtSize = (b: number) => (b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1048576).toFixed(1)} MB`);
const isImage = (m: string) => m.startsWith("image/");
const isPdf = (m: string) => m === "application/pdf";
function FileIcon({ mime, className }: { mime: string; className?: string }) {
  const Icon = isImage(mime) ? FileImage : isPdf(mime) ? FileText : /sheet|csv|excel/.test(mime) ? FileSpreadsheet : File;
  return <Icon className={className} />;
}

export default function DocumentsPage() {
  return (
    <PlanGate feature="documents">
      <Documents />
    </PlanGate>
  );
}

function Documents() {
  const [q, setQ] = useState("");
  const dq = useDebounced(q);
  const [category, setCategory] = useState<"all" | DocumentFile["category"]>("all");
  const [view, setView] = useState<"grid" | "list">("grid");
  const { data, loading } = useApi<Paginated<DocumentFile>>("/documents", { q: dq, category: category === "all" ? undefined : category, pageSize: 200 });
  const docs = data?.items ?? [];
  const [uploadCategory, setUploadCategory] = useState<DocumentFile["category"]>("waiver");
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [uploading, setUploading] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<DocumentFile | null>(null);
  const [deleting, setDeleting] = useState<DocumentFile | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function upload(files: FileList | File[]) {
    const list = Array.from(files);
    if (!list.length) return;
    setUploading(list.length);
    let ok = 0;
    for (const file of list) {
      const form = new FormData();
      form.append("file", file);
      form.append("name", file.name);
      form.append("category", uploadCategory);
      if (customer) form.append("customer", customer._id);
      try {
        await api.upload("/documents", form);
        ok++;
      } catch (e) {
        toast.error(`${file.name}: ${errorMessage(e)}`);
      }
      setUploading((n) => n - 1);
    }
    if (ok) {
      toast.success(`${ok} document${ok > 1 ? "s" : ""} uploaded`);
      invalidate("/documents");
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  async function remove() {
    if (!deleting) return;
    try {
      await api.delete(`/documents/${deleting._id}`);
      invalidate("/documents");
      toast.success("Document deleted");
      setDeleting(null);
      setPreview(null);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <>
      <PageHeader title="Documents" description="Waivers, contracts, receipts and warranty paperwork — attached to customers and searchable in seconds." />

      <Glass className="mb-4 p-5">
        <div className="mb-4 grid gap-3 sm:grid-cols-[200px_1fr]">
          <Field label="Category for new uploads">
            <Select value={uploadCategory} onChange={(e) => setUploadCategory(e.target.value as DocumentFile["category"])}>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {titleCase(c)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Attach to customer (optional)">
            <div className="flex gap-2">
              <div className="flex-1">
                <CustomerPicker value={customer} onChange={setCustomer} placeholder="No customer" />
              </div>
              {customer && (
                <Button variant="ghost" className="h-11" onClick={() => setCustomer(null)}>
                  Clear
                </Button>
              )}
            </div>
          </Field>
        </div>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            void upload(e.dataTransfer.files);
          }}
          onClick={() => fileRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && fileRef.current?.click()}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed py-10 text-center transition",
            dragging ? "scale-[1.01] border-aqua bg-aqua/10" : "border-white/12 hover:border-white/25 hover:bg-white/[0.02]",
          )}
        >
          <UploadCloud className={cn("size-9 transition", dragging ? "text-aqua" : "text-ink-3")} />
          <p className="text-sm text-ink">{uploading ? `Uploading ${uploading} file${uploading > 1 ? "s" : ""}…` : "Drop files here or click to browse"}</p>
          <p className="text-xs text-ink-4">PDF, images, Word & spreadsheets · up to 50 MB each</p>
          <input ref={fileRef} type="file" multiple hidden onChange={(e) => e.target.files && void upload(e.target.files)} />
        </div>
      </Glass>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="glass-inset flex h-10 w-full items-center gap-2 rounded-full px-4 sm:w-64">
          <Search className="size-4 text-ink-4" aria-hidden />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search documents…" aria-label="Search documents" className="h-full flex-1 bg-transparent text-sm focus:outline-none" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(["all", ...categories] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              aria-pressed={category === c}
              className={cn("rounded-full border px-3 py-1.5 text-xs transition", category === c ? "border-aqua/50 bg-aqua/15 text-aqua-soft" : "border-white/10 text-ink-3 hover:text-ink")}
            >
              {c === "all" ? "All" : titleCase(c)}
            </button>
          ))}
        </div>
        <div className="ml-auto">
          <Segmented
            size="sm"
            value={view}
            onChange={setView}
            options={[
              { value: "grid", label: <LayoutGrid className="size-4" aria-label="Grid view" /> },
              { value: "list", label: <List className="size-4" aria-label="List view" /> },
            ]}
          />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[4/3]" />
          ))}
        </div>
      ) : docs.length === 0 ? (
        <Glass>
          <EmptyState icon={<FolderOpen className="size-7" />} title="No documents found" description="Upload signed waivers and contracts so they're one search away." />
        </Glass>
      ) : view === "grid" ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {docs.map((d) => (
            <button key={d._id} onClick={() => setPreview(d)} className="glass group overflow-hidden rounded-[var(--radius-card)] text-left transition hover:-translate-y-0.5">
              <div className="flex aspect-[4/3] items-center justify-center overflow-hidden bg-black/30">
                {isImage(d.mime) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={d.url} alt={d.name} className="size-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" />
                ) : (
                  <FileIcon mime={d.mime} className="size-12 text-ink-3" />
                )}
              </div>
              <div className="p-3">
                <p className="truncate text-sm text-ink">{d.name}</p>
                <div className="mt-1.5 flex items-center justify-between gap-2">
                  <Badge tone={catTone[d.category]}>{d.category}</Badge>
                  <span className="text-[11px] text-ink-4">{fmtSize(d.size)}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <Glass className="overflow-hidden">
          <Table>
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>Category</Th>
                <Th>Customer</Th>
                <Th>Size</Th>
                <Th>Uploaded</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {docs.map((d) => (
                <tr key={d._id} className="cursor-pointer hover:bg-white/[0.03]" onClick={() => setPreview(d)}>
                  <Td>
                    <span className="flex items-center gap-2.5 text-ink">
                      <FileIcon mime={d.mime} className="size-4 text-ink-3" />
                      {d.name}
                    </span>
                  </Td>
                  <Td>
                    <Badge tone={catTone[d.category]}>{d.category}</Badge>
                  </Td>
                  <Td>{d.customer && typeof d.customer === "object" ? customerName(d.customer) : "—"}</Td>
                  <Td className="tabular-nums">{fmtSize(d.size)}</Td>
                  <Td>{formatDate(d.createdAt)}</Td>
                  <Td className="text-right">
                    <a href={d.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="rounded-full p-2 text-ink-4 hover:bg-white/10 hover:text-ink" aria-label={`Open ${d.name}`}>
                      <ExternalLink className="inline size-4" />
                    </a>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Glass>
      )}

      <Modal
        open={!!preview}
        onClose={() => setPreview(null)}
        title={preview?.name}
        description={
          preview && (
            <span>
              {titleCase(preview.category)} · {fmtSize(preview.size)} · {formatDate(preview.createdAt)}
              {preview.customer && typeof preview.customer === "object" && (
                <>
                  {" · "}
                  <Link href={`/app/customers/${preview.customer._id}`} className="text-aqua-soft">
                    {customerName(preview.customer)}
                  </Link>
                </>
              )}
            </span>
          )
        }
        size="xl"
        footer={
          preview && (
            <>
              <Button variant="danger" size="sm" onClick={() => setDeleting(preview)}>
                <Trash2 className="size-4" /> Delete
              </Button>
              <a href={preview.url} download={preview.name} className="inline-flex h-9 items-center gap-2 rounded-full border border-white/15 px-4 text-sm text-ink hover:bg-white/[0.06]">
                <Download className="size-4" /> Download
              </a>
              <Button size="sm" href={preview.url}>
                <ExternalLink className="size-4" /> Open
              </Button>
            </>
          )
        }
      >
        {preview &&
          (isImage(preview.mime) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview.url} alt={preview.name} className="max-h-[65vh] w-full rounded-2xl object-contain" />
          ) : isPdf(preview.mime) ? (
            <iframe src={preview.url} title={preview.name} className="h-[65vh] w-full rounded-2xl bg-white" />
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-ink-3">
              <FileIcon mime={preview.mime} className="size-16" />
              <p className="text-sm">No inline preview for this file type.</p>
            </div>
          ))}
      </Modal>
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
        danger
        title={`Delete ${deleting?.name ?? "document"}?`}
        description="This permanently removes the file."
        confirmLabel="Delete"
      />
    </>
  );
}
