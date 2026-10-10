"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import {
  Bell,
  ChevronsLeft,
  ChevronsRight,
  FilePlus2,
  LogOut,
  MoreHorizontal,
  Play,
  Plus,
  Receipt,
  Search,
  Square,
  UserPlus,
  UserRound,
  Wrench,
  Lock,
  ExternalLink,
} from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { invalidate, useApi } from "@/lib/hooks/use-api";
import type { AppNotification, TimeEntry } from "@/lib/types";
import { cn, formatDuration, relativeTime, titleCase } from "@/lib/utils";
import { Avatar, Badge, Button, Drawer, Kbd, LogoMark, Menu } from "@/components/spatial";
import { AuroraBackground } from "@/components/spatial/motion";
import { useAuth } from "./auth-provider";
import { useRealtime } from "./realtime-provider";
import { CommandPalette } from "./command-palette";
import { appNav, type AppNavItem } from "./nav";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // The shell only ever renders on the client (AuthProvider gates it), so reading storage here is hydration-safe.
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem("lustra:sidebar") === "1";
    } catch {
      return false;
    }
  });
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setMoreOpen(false);
  }

  const toggle = () => {
    setCollapsed((c) => {
      try {
        localStorage.setItem("lustra:sidebar", c ? "0" : "1");
      } catch {}
      return !c;
    });
  };

  return (
    <div className="relative min-h-dvh">
      <AuroraBackground intensity={0.6} />
      <Sidebar collapsed={collapsed} onToggle={toggle} />
      <div
        className={cn(
          "min-h-dvh pb-28 transition-[padding] duration-300 lg:pb-8",
          collapsed ? "lg:pl-[104px]" : "lg:pl-[276px]",
        )}
      >
        <Topbar onSearch={() => setPaletteOpen(true)} />
        <main id="main" className="px-3 pt-4 sm:px-6 lg:pr-6 lg:pl-2">
          {children}
        </main>
      </div>
      <MobileDock onMore={() => setMoreOpen(true)} />
      <Drawer open={moreOpen} onClose={() => setMoreOpen(false)} title="Navigate" width={420}>
        <NavGroups collapsed={false} />
      </Drawer>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}

function useNavAccess() {
  const { shop, can, isManager } = useAuth();
  return (item: AppNavItem) => {
    if (item.managerOnly && !isManager) return "hidden" as const;
    if (item.feature && !can(item.feature)) return "locked" as const;
    if (item.addOn === "visualizer" && !shop.addOns?.visualizer) return "locked" as const;
    return "ok" as const;
  };
}

function isActive(pathname: string, href: string) {
  return href === "/app" ? pathname === "/app" : pathname === href || pathname.startsWith(`${href}/`);
}

function NavGroups({ collapsed }: { collapsed: boolean }) {
  const pathname = usePathname();
  const access = useNavAccess();
  return (
    <nav aria-label="App" className="space-y-5">
      {appNav.map((group) => (
        <div key={group.group}>
          {!collapsed && (
            <p className="mb-1.5 px-3 text-[10px] font-semibold tracking-[0.16em] text-ink-4 uppercase">{group.group}</p>
          )}
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const state = access(item);
              if (state === "hidden") return null;
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-2xl px-3 py-2 text-sm transition-all",
                      collapsed && "justify-center px-0",
                      active ? "text-ink" : "text-ink-3 hover:bg-white/[0.05] hover:text-ink",
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="nav-active"
                        className="absolute inset-0 rounded-2xl border border-white/12 bg-white/[0.09] shadow-[inset_0_1px_0_rgb(255_255_255/0.14),0_8px_24px_-12px_rgb(124_92_255/0.6)]"
                        transition={{ type: "spring", stiffness: 420, damping: 36 }}
                      />
                    )}
                    <item.icon
                      className={cn("relative size-[18px] shrink-0", active ? "text-aqua-soft" : "")}
                      aria-hidden
                    />
                    {!collapsed && <span className="relative flex-1">{item.label}</span>}
                    {!collapsed && state === "locked" && <Lock className="relative size-3.5 text-ink-4" aria-label="Upgrade required" />}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const { shop, user } = useAuth();
  return (
    <aside
      className={cn(
        "glass fixed top-3 bottom-3 left-3 z-40 hidden flex-col rounded-[28px] transition-[width] duration-300 lg:flex",
        collapsed ? "w-[84px]" : "w-[256px]",
      )}
    >
      <div className={cn("flex items-center gap-3 px-5 pt-5 pb-4", collapsed && "justify-center px-0")}>
        <Link href="/app" aria-label="Dashboard">
          <LogoMark size={34} />
        </Link>
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">{shop.name}</p>
            <p className="truncate text-[11px] text-ink-4">
              {titleCase(shop.plan)} plan · {titleCase(user.role)}
            </p>
          </div>
        )}
      </div>
      <div className={cn("flex-1 overflow-y-auto pb-4", collapsed ? "px-3" : "px-3")}>
        <NavGroups collapsed={collapsed} />
      </div>
      <div className={cn("border-t border-white/[0.06] p-3", collapsed && "flex justify-center")}>
        {!collapsed && shop.booking?.enabled && (
          <a
            href={`/book/${shop.slug}`}
            target="_blank"
            rel="noopener"
            className="mb-2 flex items-center justify-between rounded-2xl bg-white/[0.04] px-3 py-2.5 text-xs text-ink-2 transition hover:bg-white/[0.08]"
          >
            Your booking page
            <ExternalLink className="size-3.5" aria-hidden />
          </a>
        )}
        <button
          onClick={onToggle}
          className="flex w-full items-center justify-center gap-2 rounded-2xl px-3 py-2 text-xs text-ink-3 transition hover:bg-white/[0.05] hover:text-ink"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronsRight className="size-4" /> : <><ChevronsLeft className="size-4" /> Collapse</>}
        </button>
      </div>
    </aside>
  );
}

function Topbar({ onSearch }: { onSearch: () => void }) {
  const { user, logout } = useAuth();
  const { connected, presence } = useRealtime();
  return (
    <header className="sticky top-0 z-30 px-3 pt-3 sm:px-6 lg:pr-6 lg:pl-2">
      <div className="glass flex h-14 items-center gap-2 rounded-full px-2 pl-3">
        <Link href="/app" className="lg:hidden" aria-label="Dashboard">
          <LogoMark size={30} />
        </Link>
        <button
          onClick={onSearch}
          className="glass-inset flex h-10 flex-1 items-center gap-2.5 rounded-full px-4 text-left text-sm text-ink-4 transition hover:text-ink-3 sm:max-w-md"
        >
          <Search className="size-4" aria-hidden />
          <span className="flex-1 truncate">Search or jump to…</span>
          <span className="hidden items-center gap-1 sm:flex">
            <Kbd>Ctrl</Kbd>
            <Kbd>K</Kbd>
          </span>
        </button>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="mr-1 hidden items-center -space-x-2 md:flex" title={`${presence.length} teammates online`}>
            {presence.slice(0, 4).map((p) => (
              <span key={p._id} className="rounded-full ring-2 ring-[#0b0e1c]">
                <Avatar name={p.name} size={26} />
              </span>
            ))}
          </div>
          <span
            className={cn("mr-1 hidden size-2 rounded-full sm:block", connected ? "bg-success shadow-[0_0_10px_var(--color-success)]" : "bg-ink-4")}
            title={connected ? "Live sync on" : "Reconnecting…"}
            aria-label={connected ? "Live sync connected" : "Live sync reconnecting"}
          />
          <ClockButton />
          <Menu
            trigger={
              <Button size="sm" className="h-10 px-3 sm:px-4" aria-label="Create">
                <Plus className="size-4" /> <span className="hidden sm:inline">Create</span>
              </Button>
            }
            items={[
              { label: "New job", href: "/app/jobs?new=1", icon: <Wrench className="size-4" /> },
              { label: "AI quote", href: "/app/quotes/new", icon: <FilePlus2 className="size-4" /> },
              { label: "New customer", href: "/app/customers?new=1", icon: <UserPlus className="size-4" /> },
              { label: "New invoice", href: "/app/invoices?new=1", icon: <Receipt className="size-4" /> },
            ]}
          />
          <Notifications />
          <Menu
            trigger={
              <button className="rounded-full p-0.5 transition hover:ring-2 hover:ring-white/20" aria-label="Account menu">
                <Avatar name={user.name} size={36} />
              </button>
            }
            items={[
              { label: <span className="block"><span className="block text-ink">{user.name}</span><span className="text-xs text-ink-4">{user.email}</span></span> },
              { label: "Account & shop settings", href: "/app/settings", icon: <UserRound className="size-4" /> },
              { label: "Log out", onClick: logout, danger: true, icon: <LogOut className="size-4" /> },
            ]}
          />
        </div>
      </div>
    </header>
  );
}

function ClockButton() {
  const { data, refresh } = useApi<{ active: TimeEntry | null }>("/time/status");
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const active = data?.active;

  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, [active]);

  async function toggle() {
    setBusy(true);
    try {
      if (active) {
        await api.post("/time/clock-out", {});
        toast.success("Clocked out. Nice work today.");
      } else {
        await api.post("/time/clock-in", {});
        toast.success("Clocked in");
      }
      invalidate("/time");
      await refresh();
      setNow(Date.now());
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const minutes = active ? Math.max(0, (now - new Date(active.clockIn).getTime()) / 60000) : 0;
  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={cn(
        "hidden h-10 items-center gap-2 rounded-full border px-3.5 text-xs font-medium transition sm:inline-flex",
        active
          ? "border-success/30 bg-success/10 text-success hover:bg-success/15"
          : "border-white/10 bg-white/[0.04] text-ink-2 hover:bg-white/[0.08]",
      )}
    >
      {active ? <Square className="size-3 fill-current" /> : <Play className="size-3 fill-current" />}
      {active ? formatDuration(minutes) : "Clock in"}
    </button>
  );
}

function Notifications() {
  const [open, setOpen] = useState(false);
  const { data, mutate } = useApi<AppNotification[]>("/notifications");
  const unread = data?.filter((n) => !n.read).length ?? 0;

  async function readAll() {
    mutate((prev) => (prev ?? []).map((n) => ({ ...n, read: true })));
    await api.post("/notifications/read-all").catch(() => undefined);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative inline-flex size-10 items-center justify-center rounded-full text-ink-2 transition hover:bg-white/[0.08] hover:text-ink"
        aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}
      >
        <Bell className="size-[18px]" />
        {unread > 0 && (
          <span className="absolute top-1.5 right-1.5 flex size-4 items-center justify-center rounded-full bg-plasma text-[9px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              className="glass-sheet absolute right-0 z-50 mt-2 w-[min(380px,calc(100vw-24px))] overflow-hidden rounded-3xl"
            >
              <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3">
                <p className="text-sm font-semibold">Notifications</p>
                {unread > 0 && (
                  <button onClick={readAll} className="text-xs text-aqua-soft hover:text-white">
                    Mark all read
                  </button>
                )}
              </div>
              <ul className="max-h-[420px] overflow-y-auto p-1.5">
                {(data ?? []).length === 0 && <li className="px-4 py-10 text-center text-sm text-ink-3">You&apos;re all caught up.</li>}
                {(data ?? []).slice(0, 30).map((n) => (
                  <li key={n._id}>
                    <Link
                      href={n.link || "#"}
                      onClick={() => setOpen(false)}
                      className="flex gap-3 rounded-2xl px-3 py-2.5 transition hover:bg-white/[0.06]"
                    >
                      <span
                        className={cn(
                          "mt-1.5 size-2 shrink-0 rounded-full",
                          n.read ? "bg-transparent" : "bg-aqua shadow-[0_0_8px_var(--color-aqua)]",
                        )}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-sm text-ink">{n.title}</span>
                          {n.kind === "booking" && <Badge tone="iris">Booking</Badge>}
                          {n.kind === "payment" && <Badge tone="success">Payment</Badge>}
                        </span>
                        {n.body && <span className="mt-0.5 line-clamp-2 block text-xs text-ink-3">{n.body}</span>}
                        <span className="mt-1 block text-[11px] text-ink-4">{relativeTime(n.createdAt)}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function MobileDock({ onMore }: { onMore: () => void }) {
  const pathname = usePathname();
  const items = appNav.flatMap((g) => g.items).filter((i) => ["/app", "/app/board", "/app/calendar", "/app/customers"].includes(i.href));
  return (
    <nav
      aria-label="Quick navigation"
      className="glass-2 fixed inset-x-3 bottom-3 z-40 flex items-center justify-around rounded-full px-2 py-2 lg:hidden"
      style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
    >
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center gap-0.5 rounded-2xl px-3 py-1.5 text-[10px] transition",
              active ? "bg-white/[0.1] text-ink" : "text-ink-3",
            )}
          >
            <item.icon className={cn("size-5", active && "text-aqua-soft")} aria-hidden />
            {item.label.replace("Live ", "")}
          </Link>
        );
      })}
      <button onClick={onMore} className="flex flex-col items-center gap-0.5 rounded-2xl px-3 py-1.5 text-[10px] text-ink-3">
        <MoreHorizontal className="size-5" aria-hidden />
        More
      </button>
    </nav>
  );
}
