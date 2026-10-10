/* Display metadata for domain enums — labels, tones and colors used consistently across the app. */
import type { Tone } from "@/components/spatial";
import type { InvoiceStatus, JobStage, Priority, QuoteStatus, ServiceCategory } from "./types";

export const stageMeta: Record<JobStage, { label: string; tone: Tone; color: string }> = {
  lead: { label: "Lead", tone: "neutral", color: "#94a3b8" },
  quoted: { label: "Quoted", tone: "info", color: "#60a5fa" },
  scheduled: { label: "Scheduled", tone: "iris", color: "#a594ff" },
  in_progress: { label: "In progress", tone: "aqua", color: "#22d3ee" },
  quality_check: { label: "Quality check", tone: "warning", color: "#fbbf24" },
  completed: { label: "Completed", tone: "success", color: "#34d399" },
  cancelled: { label: "Cancelled", tone: "danger", color: "#fb7185" },
};

export const boardStages: JobStage[] = ["lead", "quoted", "scheduled", "in_progress", "quality_check", "completed"];

export const priorityMeta: Record<Priority, { label: string; tone: Tone }> = {
  low: { label: "Low", tone: "neutral" },
  normal: { label: "Normal", tone: "info" },
  high: { label: "High", tone: "warning" },
  rush: { label: "Rush", tone: "danger" },
};

export const quoteStatusMeta: Record<QuoteStatus, { label: string; tone: Tone }> = {
  draft: { label: "Draft", tone: "neutral" },
  sent: { label: "Sent", tone: "info" },
  viewed: { label: "Viewed", tone: "iris" },
  approved: { label: "Approved", tone: "success" },
  declined: { label: "Declined", tone: "danger" },
  expired: { label: "Expired", tone: "warning" },
};

export const invoiceStatusMeta: Record<InvoiceStatus, { label: string; tone: Tone }> = {
  draft: { label: "Draft", tone: "neutral" },
  sent: { label: "Sent", tone: "info" },
  partial: { label: "Partially paid", tone: "warning" },
  paid: { label: "Paid", tone: "success" },
  void: { label: "Void", tone: "neutral" },
  overdue: { label: "Overdue", tone: "danger" },
};

export const categoryMeta: Record<ServiceCategory, { label: string; color: string }> = {
  detailing: { label: "Detailing", color: "#22d3ee" },
  ceramic: { label: "Ceramic", color: "#a594ff" },
  ppf: { label: "PPF", color: "#7c5cff" },
  tint: { label: "Tint", color: "#60a5fa" },
  wrap: { label: "Wrap", color: "#f472b6" },
  correction: { label: "Paint correction", color: "#fb923c" },
  interior: { label: "Interior", color: "#34d399" },
  marine: { label: "Marine", color: "#38bdf8" },
  lawn: { label: "Lawn", color: "#a3e635" },
  maintenance: { label: "Maintenance", color: "#fbbf24" },
  other: { label: "Other", color: "#94a3b8" },
};

export const vehicleLabel = (v?: { year?: number; make?: string; model?: string } | null) =>
  v ? [v.year, v.make, v.model].filter(Boolean).join(" ") || "Vehicle" : "No vehicle";

export const customerName = (c?: { firstName?: string; lastName?: string; fullName?: string } | null) =>
  c ? c.fullName || [c.firstName, c.lastName].filter(Boolean).join(" ") || "Customer" : "—";
