"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Camera, Plus, ScanSearch, Search } from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api";
import { invalidate, useApi, useDebounced } from "@/lib/hooks/use-api";
import type { Customer, Inspection, Job, Paginated, Vehicle } from "@/lib/types";
import { customerName, vehicleLabel } from "@/lib/domain";
import { relativeTime } from "@/lib/utils";
import { Badge, Button, EmptyState, Field, Glass, Input, Modal, Segmented, Skeleton } from "@/components/spatial";
import { PageHeader, Pagination, RowLink, Table, Td, Th, Toolbar } from "@/components/app/ui";
import { CustomerPicker, VehiclePicker } from "@/components/app/pickers";

const statusMeta = {
  draft: { label: "Draft", tone: "neutral" },
  awaiting_signature: { label: "Awaiting signature", tone: "warning" },
  signed: { label: "Signed", tone: "success" },
} as const;

export default function InspectionsPage() {
  return (
    <Suspense fallback={null}>
      <Inspections />
    </Suspense>
  );
}

function Inspections() {
  const params = useSearchParams();
  const router = useRouter();
  const [q, setQ] = useState("");
  const dq = useDebounced(q);
  const [status, setStatus] = useState<"all" | Inspection["status"]>("all");
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(params.get("new") === "1");
  const { data, loading } = useApi<Paginated<Inspection>>("/inspections", {
    q: dq,
    status: status === "all" ? undefined : status,
    page,
    pageSize: 25,
  });

  return (
    <>
      <PageHeader
        title="Inspections"
        description="Document condition before and after every job — pinned, photographed and signed."
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus className="size-4" /> New inspection
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
            placeholder="Search customer or vehicle…"
            aria-label="Search inspections"
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
            { value: "draft", label: "Draft" },
            { value: "awaiting_signature", label: "Awaiting" },
            { value: "signed", label: "Signed" },
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
            icon={<ScanSearch className="size-7" />}
            title="No inspections yet"
            description="Run a pre-job walkaround to protect your shop from pre-existing damage claims."
            action={
              <Button onClick={() => setCreating(true)}>
                <Plus className="size-4" /> Start an inspection
              </Button>
            }
          />
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>Vehicle</Th>
                  <Th>Customer</Th>
                  <Th>Type</Th>
                  <Th>Damage</Th>
                  <Th>Media</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Created</Th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((ins) => (
                  <RowLink key={ins._id} href={`/app/inspections/${ins._id}`}>
                    <Td className="font-medium text-ink">{vehicleLabel(ins.vehicle)}</Td>
                    <Td>{customerName(ins.customer)}</Td>
                    <Td>
                      <Badge tone={ins.type === "pre" ? "iris" : "aqua"}>{ins.type === "pre" ? "Pre-service" : "Post-service"}</Badge>
                    </Td>
                    <Td className="tabular-nums">{ins.markers?.length ?? 0} pins</Td>
                    <Td>
                      <span className="inline-flex items-center gap-1.5 tabular-nums">
                        <Camera className="size-3.5 text-ink-4" aria-hidden /> {ins.media?.length ?? 0}
                      </span>
                    </Td>
                    <Td>
                      <Badge tone={statusMeta[ins.status].tone} dot>
                        {statusMeta[ins.status].label}
                      </Badge>
                    </Td>
                    <Td className="text-right text-xs text-ink-3">{relativeTime(ins.createdAt)}</Td>
                  </RowLink>
                ))}
              </tbody>
            </Table>
            <Pagination page={page} pageSize={data.pageSize} total={data.total} onPage={setPage} />
          </>
        )}
      </Glass>

      <CreateInspectionModal
        open={creating}
        jobId={params.get("job")}
        onClose={() => {
          setCreating(false);
          if (params.get("new")) router.replace("/app/inspections");
        }}
        onCreated={(ins) => router.push(`/app/inspections/${ins._id}`)}
      />
    </>
  );
}

function CreateInspectionModal({
  open,
  jobId,
  onClose,
  onCreated,
}: {
  open: boolean;
  jobId: string | null;
  onClose: () => void;
  onCreated: (i: Inspection) => void;
}) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [type, setType] = useState<"pre" | "post">("pre");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !jobId) return;
    api
      .get<Job>(`/jobs/${jobId}`)
      .then((j) => {
        setJob(j);
        setCustomer(j.customer);
        setVehicle(j.vehicle ?? null);
        setType(j.stage === "completed" || j.stage === "quality_check" ? "post" : "pre");
      })
      .catch((e) => toast.error(errorMessage(e)));
  }, [open, jobId]);

  async function create() {
    if (!customer || !vehicle) return;
    setSaving(true);
    try {
      const ins = await api.post<Inspection>("/inspections", {
        customer: customer._id,
        vehicle: vehicle._id,
        job: job?._id,
        type,
        notes: notes || undefined,
      });
      invalidate("/inspections");
      toast.success("Inspection started");
      onCreated(ins);
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
      title="New inspection"
      description={job ? `For job #${job.number} · ${job.title}` : "Choose who and what you're inspecting."}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={create} loading={saving} disabled={!customer || !vehicle}>
            Start inspection
          </Button>
        </>
      }
    >
      <div className="space-y-4">
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
        <Field label="Inspection type">
          <Segmented
            value={type}
            onChange={setType}
            options={[
              { value: "pre", label: "Pre-service walkaround" },
              { value: "post", label: "Post-service delivery" },
            ]}
          />
        </Field>
        <Field label="Notes (optional)">
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Mileage, weather, lighting conditions…" />
        </Field>
      </div>
    </Modal>
  );
}
