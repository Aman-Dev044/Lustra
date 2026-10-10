"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { Ban, Copy, ExternalLink, Plus, Search, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api";
import { invalidate, useApi, useDebounced } from "@/lib/hooks/use-api";
import type { Certificate, Customer, Job, Paginated, User, Vehicle } from "@/lib/types";
import { customerName, vehicleLabel } from "@/lib/domain";
import { cn, formatDate, toDateInput } from "@/lib/utils";
import { Badge, Button, ConfirmDialog, EmptyState, Field, Glass, Input, LogoMark, Modal, Segmented, Select, Skeleton, Textarea } from "@/components/spatial";
import { PageHeader, Pagination, Table, Td, Th, Toolbar } from "@/components/app/ui";
import { CustomerPicker, VehiclePicker } from "@/components/app/pickers";
import { useAuth } from "@/components/app/auth-provider";

const statusTone = { active: "success", expired: "warning", void: "danger" } as const;

const coverageOptions = [
  "Full body",
  "Full front (bumper, hood, fenders, mirrors)",
  "Partial front",
  "Track pack",
  "Exterior paint & wheels",
  "Exterior paint, glass & wheels",
  "All windows",
  "Windshield",
  "Interior surfaces",
  "Hull & topsides",
];

const productSuggestions = [
  "Ceramic Coating · 9H Lifetime",
  "Ceramic Coating · 5 Year",
  "Ceramic Coating · 1 Year",
  "Paint Protection Film · Gloss",
  "Paint Protection Film · Stealth (Matte)",
  "Ceramic Window Tint",
  "Color Change Wrap",
  "Marine Ceramic Coating",
];

export default function CertificatesPage() {
  return (
    <Suspense fallback={null}>
      <Certificates />
    </Suspense>
  );
}

function Certificates() {
  const params = useSearchParams();
  const router = useRouter();
  const [q, setQ] = useState("");
  const dq = useDebounced(q);
  const [status, setStatus] = useState<"all" | Certificate["status"]>("all");
  const [page, setPage] = useState(1);
  const [issuing, setIssuing] = useState(params.get("new") === "1");
  const [preview, setPreview] = useState<Certificate | null>(null);
  const { data, loading } = useApi<Paginated<Certificate>>("/certificates", {
    q: dq,
    status: status === "all" ? undefined : status,
    page,
    pageSize: 25,
  });

  return (
    <>
      <PageHeader
        title="Warranty certificates"
        description="Issue branded coating, PPF and tint certificates that customers (and future buyers) can verify by QR."
        actions={
          <Button onClick={() => setIssuing(true)}>
            <Plus className="size-4" /> Issue certificate
          </Button>
        }
      />
      <Toolbar>
        <div className="glass-inset flex h-10 w-full items-center gap-2 rounded-full px-4 sm:w-72">
          <Search className="size-4 text-ink-4" aria-hidden />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Search code, product, customer…"
            aria-label="Search certificates"
            className="h-full flex-1 bg-transparent text-sm focus:outline-none"
          />
        </div>
        <Segmented
          size="sm"
          value={status}
          onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
          options={[
            { value: "all", label: "All" },
            { value: "active", label: "Active" },
            { value: "expired", label: "Expired" },
            { value: "void", label: "Void" },
          ]}
        />
      </Toolbar>

      <Glass className="overflow-hidden">
        {loading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : !data?.items.length ? (
          <EmptyState
            icon={<ShieldCheck className="size-7" />}
            title="No certificates issued yet"
            description="Every coating and film install deserves a certificate — it sells your next job and boosts resale value."
            action={
              <Button onClick={() => setIssuing(true)}>
                <Plus className="size-4" /> Issue your first certificate
              </Button>
            }
          />
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>Code</Th>
                  <Th>Product</Th>
                  <Th>Customer</Th>
                  <Th>Vehicle</Th>
                  <Th>Installed</Th>
                  <Th>Expires</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((c) => (
                  <tr key={c._id} onClick={() => setPreview(c)} className="cursor-pointer transition-colors hover:bg-white/[0.04]">
                    <Td className="font-mono text-xs text-aqua-soft">{c.code}</Td>
                    <Td className="font-medium text-ink">{c.product}</Td>
                    <Td>{customerName(c.customer)}</Td>
                    <Td>{vehicleLabel(c.vehicle)}</Td>
                    <Td>{formatDate(c.installedAt)}</Td>
                    <Td>{c.expiresAt ? formatDate(c.expiresAt) : "Lifetime"}</Td>
                    <Td>
                      <Badge tone={statusTone[c.status]} dot>
                        {c.status}
                      </Badge>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <Pagination page={page} pageSize={data.pageSize} total={data.total} onPage={setPage} />
          </>
        )}
      </Glass>

      <IssueModal
        open={issuing}
        jobId={params.get("job")}
        onClose={() => {
          setIssuing(false);
          if (params.get("new")) router.replace("/app/certificates");
        }}
        onIssued={(c) => {
          setIssuing(false);
          setPreview(c);
          if (params.get("new")) router.replace("/app/certificates");
        }}
      />
      <PreviewModal certificate={preview} onClose={() => setPreview(null)} onChanged={setPreview} />
    </>
  );
}

const PRESETS = [
  { label: "1 yr", years: 1 },
  { label: "3 yr", years: 3 },
  { label: "5 yr", years: 5 },
  { label: "7 yr", years: 7 },
  { label: "10 yr", years: 10 },
  { label: "Lifetime", years: 0 },
];

function addYears(date: string, years: number) {
  const d = new Date(date);
  d.setFullYear(d.getFullYear() + years);
  return toDateInput(d);
}

function IssueModal({
  open,
  jobId,
  onClose,
  onIssued,
}: {
  open: boolean;
  jobId: string | null;
  onClose: () => void;
  onIssued: (c: Certificate) => void;
}) {
  const { user } = useAuth();
  const { data: team } = useApi<User[]>(open ? "/team" : null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [form, setForm] = useState({
    product: productSuggestions[0]!,
    coverage: coverageOptions[4]!,
    installedAt: toDateInput(new Date()),
    years: 5,
    installer: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open && !form.installer) setForm({ ...form, installer: user._id });
  }

  useEffect(() => {
    if (!open || !jobId) return;
    api
      .get<Job>(`/jobs/${jobId}`)
      .then((j) => {
        setJob(j);
        setCustomer(j.customer);
        setVehicle(j.vehicle ?? null);
        const item = j.lineItems.find((li) => ["ceramic", "ppf", "tint", "wrap"].includes(li.category ?? ""));
        if (item) setForm((f) => ({ ...f, product: item.name }));
      })
      .catch((e) => toast.error(errorMessage(e)));
  }, [open, jobId]);

  async function issue() {
    if (!customer || !vehicle) return;
    setSaving(true);
    try {
      const cert = await api.post<Certificate>("/certificates", {
        customer: customer._id,
        vehicle: vehicle._id,
        job: job?._id,
        product: form.product,
        coverage: form.coverage,
        installedAt: new Date(form.installedAt).toISOString(),
        expiresAt: form.years ? new Date(addYears(form.installedAt, form.years)).toISOString() : undefined,
        installer: form.installer || undefined,
        notes: form.notes || undefined,
      });
      invalidate("/certificates");
      toast.success(`Certificate ${cert.code} issued`);
      onIssued(cert);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Issue warranty certificate"
      description={job ? `From job #${job.number}` : "Certificates get a unique code and a public QR verification page."}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={issue} loading={saving} disabled={!customer || !vehicle || !form.product}>
            <ShieldCheck className="size-4" /> Issue certificate
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Customer">
          <CustomerPicker
            value={customer}
            onChange={(c) => {
              setCustomer(c);
              setVehicle(null);
            }}
          />
        </Field>
        <Field label="Vehicle">
          <VehiclePicker customerId={customer?._id ?? null} value={vehicle} onChange={setVehicle} />
        </Field>
        <Field label="Product" className="sm:col-span-2">
          <Input list="cert-products" value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })} />
          <datalist id="cert-products">
            {productSuggestions.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
        </Field>
        <Field label="Coverage" className="sm:col-span-2">
          <Input list="cert-coverage" value={form.coverage} onChange={(e) => setForm({ ...form, coverage: e.target.value })} />
          <datalist id="cert-coverage">
            {coverageOptions.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
        </Field>
        <Field label="Installed on">
          <Input type="date" value={form.installedAt} onChange={(e) => setForm({ ...form, installedAt: e.target.value })} />
        </Field>
        <Field label="Installer">
          <Select value={form.installer} onChange={(e) => setForm({ ...form, installer: e.target.value })}>
            {(team ?? []).filter((u) => u.active).map((u) => (
              <option key={u._id} value={u._id}>
                {u.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Warranty term" className="sm:col-span-2" hint={form.years ? `Expires ${formatDate(addYears(form.installedAt, form.years))}` : "Never expires"}>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => setForm({ ...form, years: p.years })}
                className={cn(
                  "rounded-full border px-4 py-1.5 text-sm transition",
                  form.years === p.years ? "border-aqua/50 bg-aqua/15 text-aqua-soft" : "border-white/10 text-ink-3 hover:text-ink",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Notes" className="sm:col-span-2">
          <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Layers applied, maintenance schedule, film serial/lot numbers…" />
        </Field>
      </div>
    </Modal>
  );
}

function PreviewModal({ certificate, onClose, onChanged }: { certificate: Certificate | null; onClose: () => void; onChanged: (c: Certificate) => void }) {
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const url = certificate && typeof window !== "undefined" ? `${window.location.origin}/verify/${certificate.code}` : "";

  async function voidCert() {
    if (!certificate) return;
    setBusy(true);
    try {
      const c = await api.patch<Certificate>(`/certificates/${certificate._id}`, { status: "void" });
      invalidate("/certificates");
      onChanged({ ...certificate, ...c, customer: certificate.customer, vehicle: certificate.vehicle });
      toast.success("Certificate voided");
      setConfirm(false);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={!!certificate}
      onClose={onClose}
      size="lg"
      title="Certificate"
      footer={
        certificate && (
          <>
            {certificate.status !== "void" && (
              <Button variant="danger" size="sm" onClick={() => setConfirm(true)}>
                <Ban className="size-4" /> Void
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                void navigator.clipboard.writeText(url);
                toast.success("Verification link copied");
              }}
            >
              <Copy className="size-4" /> Copy verify link
            </Button>
            <Button size="sm" href={`/verify/${certificate.code}`}>
              <ExternalLink className="size-4" /> Open public page
            </Button>
          </>
        )
      }
    >
      {certificate && <CertificateCard certificate={certificate} url={url} />}
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={voidCert}
        loading={busy}
        danger
        title="Void this certificate?"
        description="The public verification page will show it as void. This can't be undone."
        confirmLabel="Void certificate"
      />
    </Modal>
  );
}

function CertificateCard({ certificate, url }: { certificate: Certificate; url: string }) {
  const { shop } = useAuth();
  return (
    <div className="rim relative overflow-hidden rounded-[26px] border border-white/15 bg-[linear-gradient(135deg,#141a3a_0%,#0b0e1c_55%,#0c2430_100%)] p-7 shadow-[var(--shadow-lift)]">
      <div className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-iris/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-16 size-64 rounded-full bg-aqua/20 blur-3xl" />
      <div className="relative flex items-start justify-between gap-6">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.3em] text-aqua-soft uppercase">Certificate of Protection</p>
          <h3 className="text-spectral mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{certificate.product}</h3>
          <p className="mt-1 text-sm text-ink-3">{certificate.coverage}</p>
        </div>
        <Badge tone={statusTone[certificate.status]} dot className="uppercase">
          {certificate.status}
        </Badge>
      </div>
      <div className="relative mt-7 grid gap-5 sm:grid-cols-[1fr_auto]">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
          {[
            ["Issued to", customerName(certificate.customer)],
            ["Vehicle", vehicleLabel(certificate.vehicle)],
            ["Installed", formatDate(certificate.installedAt)],
            ["Valid through", certificate.expiresAt ? formatDate(certificate.expiresAt) : "Lifetime"],
            ["Installer", certificate.installer?.name ?? shop.name],
            ["VIN", certificate.vehicle?.vin ? `…${certificate.vehicle.vin.slice(-6)}` : "—"],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="text-[10px] tracking-[0.18em] text-ink-4 uppercase">{k}</dt>
              <dd className="mt-0.5 text-ink">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="flex flex-col items-center gap-2">
          <div className="rounded-2xl bg-white p-2.5">
            <QRCodeSVG value={url || certificate.code} size={112} bgColor="#ffffff" fgColor="#0b0e1c" level="M" />
          </div>
          <span className="font-mono text-xs tracking-widest text-ink-2">{certificate.code}</span>
        </div>
      </div>
      <div className="relative mt-6 flex items-center justify-between border-t border-white/10 pt-4 text-xs text-ink-4">
        <span>{shop.name}</span>
        <span className="inline-flex items-center gap-1.5">
          <LogoMark size={14} /> Verified by Lustra
        </span>
      </div>
    </div>
  );
}
