"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { AnimatePresence, motion } from "motion/react";
import { CornerDownLeft, FilePlus2, Plus, Receipt, Search, UserPlus, Wrench } from "lucide-react";
import { api } from "@/lib/api";
import { useDebounced } from "@/lib/hooks/use-api";
import type { SearchResults } from "@/lib/types";
import { customerName, stageMeta, vehicleLabel } from "@/lib/domain";
import { formatMoney } from "@/lib/utils";
import { Badge, Kbd } from "@/components/spatial";
import { appNav } from "./nav";

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const debounced = useDebounced(q, 180);
  const [results, setResults] = useState<SearchResults | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  const searching = debounced.trim().length >= 2;
  useEffect(() => {
    if (!searching) return;
    let cancelled = false;
    api
      .get<SearchResults>("/search", { q: debounced })
      .then((r) => !cancelled && setResults(r))
      .catch(() => !cancelled && setResults(null));
    return () => {
      cancelled = true;
    };
  }, [debounced, searching]);
  const shown = searching ? results : null;

  const go = (href: string) => {
    onOpenChange(false);
    setQ("");
    router.push(href);
  };

  const itemCls =
    "flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-ink-2 data-[selected=true]:bg-ink/[0.09] data-[selected=true]:text-ink";
  const groupCls =
    "[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:tracking-[0.14em] [&_[cmdk-group-heading]]:text-ink-4 [&_[cmdk-group-heading]]:uppercase";

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[90] flex items-start justify-center px-4 pt-[12vh]">
          <motion.div
            className="absolute inset-0 bg-[#b8c2d3]/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: -10, filter: "blur(8px)" }}
            animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 0.96, y: -6 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className="glass-sheet rim relative w-full max-w-2xl overflow-hidden rounded-[26px]"
          >
            <Command label="Command palette" shouldFilter={!shown} loop>
              <div className="flex items-center gap-3 border-b border-ink/[0.07] px-5">
                <Search className="size-4 text-ink-3" aria-hidden />
                <Command.Input
                  autoFocus
                  value={q}
                  onValueChange={setQ}
                  placeholder="Search customers, vehicles, jobs, invoices — or jump anywhere…"
                  className="h-14 flex-1 bg-transparent text-[15px] text-ink placeholder:text-ink-4 focus:outline-none"
                />
                <Kbd>Esc</Kbd>
              </div>
              <Command.List className="max-h-[60vh] overflow-y-auto p-2">
                <Command.Empty className="px-4 py-10 text-center text-sm text-ink-3">No matches. Try a name, VIN, plate or job #.</Command.Empty>

                {shown && (
                  <>
                    {shown.customers.length > 0 && (
                      <Command.Group heading="Customers" className={groupCls}>
                        {shown.customers.map((c) => (
                          <Command.Item key={c._id} value={`c-${c._id}`} onSelect={() => go(`/app/customers/${c._id}`)} className={itemCls}>
                            <span className="flex-1">{customerName(c)}</span>
                            <span className="text-xs text-ink-4">{c.phone || c.email}</span>
                          </Command.Item>
                        ))}
                      </Command.Group>
                    )}
                    {shown.vehicles.length > 0 && (
                      <Command.Group heading="Vehicles" className={groupCls}>
                        {shown.vehicles.map((v) => (
                          <Command.Item
                            key={v._id}
                            value={`v-${v._id}`}
                            onSelect={() => go(`/app/customers/${typeof v.customer === "string" ? v.customer : v.customer._id}`)}
                            className={itemCls}
                          >
                            <span className="flex-1">{vehicleLabel(v)}</span>
                            <span className="font-mono text-xs text-ink-4">{v.plate || v.vin?.slice(-8)}</span>
                          </Command.Item>
                        ))}
                      </Command.Group>
                    )}
                    {shown.jobs.length > 0 && (
                      <Command.Group heading="Jobs" className={groupCls}>
                        {shown.jobs.map((j) => (
                          <Command.Item key={j._id} value={`j-${j._id}`} onSelect={() => go(`/app/jobs/${j._id}`)} className={itemCls}>
                            <span className="font-mono text-xs text-ink-4">#{j.number}</span>
                            <span className="flex-1 truncate">{j.title}</span>
                            <Badge tone={stageMeta[j.stage].tone}>{stageMeta[j.stage].label}</Badge>
                          </Command.Item>
                        ))}
                      </Command.Group>
                    )}
                    {shown.invoices.length > 0 && (
                      <Command.Group heading="Invoices" className={groupCls}>
                        {shown.invoices.map((i) => (
                          <Command.Item key={i._id} value={`i-${i._id}`} onSelect={() => go(`/app/invoices/${i._id}`)} className={itemCls}>
                            <span className="font-mono text-xs text-ink-4">INV-{i.number}</span>
                            <span className="flex-1">{customerName(i.customer)}</span>
                            <span className="text-xs text-ink-3">{formatMoney(i.totals.total)}</span>
                          </Command.Item>
                        ))}
                      </Command.Group>
                    )}
                    {shown.quotes.length > 0 && (
                      <Command.Group heading="Quotes" className={groupCls}>
                        {shown.quotes.map((x) => (
                          <Command.Item key={x._id} value={`q-${x._id}`} onSelect={() => go(`/app/quotes/${x._id}`)} className={itemCls}>
                            <span className="font-mono text-xs text-ink-4">Q-{x.number}</span>
                            <span className="flex-1 truncate">{x.title}</span>
                            <span className="text-xs text-ink-3">{formatMoney(x.totals.total)}</span>
                          </Command.Item>
                        ))}
                      </Command.Group>
                    )}
                  </>
                )}

                <Command.Group heading="Create" className={groupCls}>
                  {[
                    { label: "New job", href: "/app/jobs?new=1", icon: Wrench },
                    { label: "New quote with AI Copilot", href: "/app/quotes/new", icon: FilePlus2 },
                    { label: "New customer", href: "/app/customers?new=1", icon: UserPlus },
                    { label: "New invoice", href: "/app/invoices?new=1", icon: Receipt },
                  ].map((a) => (
                    <Command.Item key={a.href} value={a.label} onSelect={() => go(a.href)} className={itemCls}>
                      <a.icon className="size-4 text-aqua-soft" aria-hidden />
                      <span className="flex-1">{a.label}</span>
                      <Plus className="size-3.5 text-ink-4" aria-hidden />
                    </Command.Item>
                  ))}
                </Command.Group>

                <Command.Group heading="Go to" className={groupCls}>
                  {appNav.flatMap((g) => g.items).map((item) => (
                    <Command.Item key={item.href} value={`go ${item.label}`} onSelect={() => go(item.href)} className={itemCls}>
                      <item.icon className="size-4 text-ink-3" aria-hidden />
                      <span className="flex-1">{item.label}</span>
                      <CornerDownLeft className="size-3.5 text-ink-4" aria-hidden />
                    </Command.Item>
                  ))}
                </Command.Group>
              </Command.List>
            </Command>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
