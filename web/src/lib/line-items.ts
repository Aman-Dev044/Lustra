import type { LineItem } from "./types";

const refId = (v: unknown) => (v && typeof v === "object" ? ((v as { _id?: string })._id ?? null) : ((v as string | null | undefined) ?? null));

/** The API returns `service`/`assignee` populated but only accepts ids on write — flatten before sending. */
export function serializeLineItems(items: LineItem[]) {
  return items.map((i) => ({ ...i, service: refId(i.service), assignee: refId(i.assignee) }));
}
