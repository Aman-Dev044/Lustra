/* Miniature, non-interactive renderings of real Lustra UI used to illustrate features. Pure JSX + CSS motion. */
import type { ReactNode } from "react";
import {
  BadgeCheck,
  Bell,
  CalendarDays,
  Camera,
  Check,
  CircleDollarSign,
  Clock,
  Crown,
  MapPin,
  MessageCircle,
  Navigation,
  PackageCheck,
  QrCode,
  Sparkles,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function MockFrame({ children, className, title }: { children: ReactNode; className?: string; title?: string }) {
  return (
    <div className={cn("glass-2 rim overflow-hidden rounded-[24px]", className)} aria-hidden>
      {title && (
        <div className="flex items-center gap-1.5 border-b border-white/[0.07] px-4 py-2.5">
          <span className="size-2 rounded-full bg-white/20" />
          <span className="size-2 rounded-full bg-white/20" />
          <span className="size-2 rounded-full bg-white/20" />
          <span className="ml-2 text-[10px] font-medium tracking-wide text-ink-4">{title}</span>
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}


export function BoardMock() {
  const cols = [
    { name: "Scheduled", color: "bg-iris-soft", cards: [["Model Y", "Ceramic 5yr", "$1,299"], ["F-150", "Full Detail", "$289"]] },
    { name: "In progress", color: "bg-aqua", cards: [["911 GT3", "Track Pack PPF", "$2,400"]] },
    { name: "QC", color: "bg-warning", cards: [["M3", "Stage 2", "$850"]] },
  ];
  return (
    <MockFrame title="Live Board">
      <div className="grid grid-cols-3 gap-2">
        {cols.map((c) => (
          <div key={c.name} className="rounded-xl bg-black/20 p-2">
            <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold text-ink-3">
              <span className={cn("size-1.5 rounded-full", c.color)} /> {c.name}
            </p>
            <div className="space-y-1.5">
              {c.cards.map(([car, svc, price], i) => (
                <div key={car} className={cn("rounded-lg border border-white/10 bg-white/[0.06] p-2", c.name === "In progress" && i === 0 && "animate-float shadow-[var(--shadow-glow-aqua)]")}>
                  <p className="text-[11px] font-medium text-ink">{car}</p>
                  <p className="text-[10px] text-ink-3">{svc}</p>
                  <p className="mt-1 text-[10px] font-semibold text-aqua-soft">{price}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </MockFrame>
  );
}

export function CopilotMock() {
  return (
    <MockFrame title="AI Quote Copilot">
      <div className="rounded-xl bg-black/25 p-3 text-[11px] text-ink-2">“2021 Tesla Model Y, heavy swirls, wants ceramic + front PPF”</div>
      <div className="mt-3 flex items-center gap-1.5 text-[10px] text-aqua-soft">
        <Sparkles className="size-3" /> Detected: large · heavy defects · ceramic, ppf
      </div>
      <ul className="mt-2 space-y-1.5">
        {[
          ["Paint Correction — Stage 2", "$1,105"],
          ["Ceramic Coating — 5 Year", "$1,689"],
          ["Full Front PPF", "$2,340"],
        ].map(([n, p]) => (
          <li key={n} className="flex justify-between rounded-lg bg-white/[0.05] px-2.5 py-1.5 text-[11px]">
            <span className="text-ink">{n}</span>
            <span className="text-ink-2 tabular-nums">{p}</span>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex items-center justify-between border-t border-white/[0.07] pt-2 text-[11px]">
        <span className="text-ink-3">Confidence 92%</span>
        <span className="font-semibold text-ink">$5,134.00</span>
      </div>
    </MockFrame>
  );
}

export function BookingMock() {
  const slots = ["8:00", "8:30", "9:00", "10:30", "11:00", "1:00", "2:30", "3:00"];
  return (
    <MockFrame title="Book online · Apex Auto Spa">
      <div className="mb-3 flex gap-1.5">
        {["Mon 14", "Tue 15", "Wed 16", "Thu 17"].map((d, i) => (
          <span key={d} className={cn("flex-1 rounded-lg py-1.5 text-center text-[10px]", i === 1 ? "bg-spectral text-white" : "bg-white/[0.05] text-ink-3")}>
            {d}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {slots.map((s, i) => (
          <span
            key={s}
            className={cn(
              "rounded-lg border py-1.5 text-center text-[10px]",
              i === 2 ? "border-aqua/60 bg-aqua/15 text-aqua-soft" : i === 4 ? "border-transparent bg-white/[0.02] text-ink-4 line-through" : "border-white/10 text-ink-2",
            )}
          >
            {s}
          </span>
        ))}
      </div>
      <div className="mt-3 rounded-lg bg-success/10 px-2.5 py-2 text-[10px] text-success">
        <Check className="mr-1 inline size-3" /> 2 bays free · Full Detail · 4h
      </div>
    </MockFrame>
  );
}

export function PortalMock() {
  const steps = ["Scheduled", "In progress", "Quality check", "Ready"];
  return (
    <MockFrame title="lustra.app/portal">
      <p className="text-[11px] text-ink-3">Hi Sarah — your Porsche 911</p>
      <p className="text-sm font-semibold text-ink">is in quality check ✨</p>
      <ol className="mt-3 space-y-2">
        {steps.map((s, i) => (
          <li key={s} className="flex items-center gap-2 text-[11px]">
            <span
              className={cn(
                "flex size-4 items-center justify-center rounded-full",
                i < 2 ? "bg-success/80" : i === 2 ? "animate-pulse bg-aqua" : "bg-white/10",
              )}
            >
              {i < 2 && <Check className="size-2.5 text-white" />}
            </span>
            <span className={i <= 2 ? "text-ink" : "text-ink-4"}>{s}</span>
          </li>
        ))}
      </ol>
      <div className="mt-3 flex gap-1.5">
        <span className="flex-1 rounded-lg bg-spectral py-1.5 text-center text-[10px] font-medium text-white">Pay $1,299</span>
        <span className="flex-1 rounded-lg bg-white/[0.07] py-1.5 text-center text-[10px] text-ink-2">View inspection</span>
      </div>
    </MockFrame>
  );
}

export function PaymentMock() {
  return (
    <MockFrame>
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-2xl bg-success/15 text-success">
          <CircleDollarSign className="size-5" />
        </span>
        <div>
          <p className="text-xs font-semibold text-ink">Payment received</p>
          <p className="text-[11px] text-ink-3">INV-2048 · $1,299.00 + $60 tip</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-1.5 text-center text-[10px]">
        {["Tap to pay", "Text link", "Financing"].map((m) => (
          <span key={m} className="rounded-lg bg-white/[0.05] py-1.5 text-ink-2">
            {m}
          </span>
        ))}
      </div>
    </MockFrame>
  );
}

export function CalendarMock() {
  const blocks = [
    { day: 0, top: 6, h: 38, label: "Ceramic · Bay 1", c: "bg-iris/40 border-iris/60" },
    { day: 1, top: 20, h: 30, label: "PPF · Bay 2", c: "bg-aqua/30 border-aqua/60" },
    { day: 2, top: 4, h: 20, label: "Tint", c: "bg-info/30 border-info/60" },
    { day: 2, top: 30, h: 28, label: "Detail", c: "bg-success/25 border-success/50" },
    { day: 3, top: 12, h: 50, label: "Full body PPF", c: "bg-plasma/25 border-plasma/50" },
  ];
  return (
    <MockFrame title="Week · Bays 1–2">
      <div className="grid grid-cols-4 gap-1.5 text-[10px] text-ink-4">
        {["Mon", "Tue", "Wed", "Thu"].map((d) => (
          <span key={d} className="text-center">
            {d}
          </span>
        ))}
      </div>
      <div className="relative mt-2 grid h-36 grid-cols-4 gap-1.5">
        {[0, 1, 2, 3].map((d) => (
          <div key={d} className="relative rounded-lg bg-black/20">
            {blocks
              .filter((b) => b.day === d)
              .map((b) => (
                <div
                  key={b.label}
                  className={cn("absolute inset-x-1 rounded-md border px-1 py-0.5 text-[9px] text-ink", b.c)}
                  style={{ top: `${b.top}%`, height: `${b.h}%` }}
                >
                  {b.label}
                </div>
              ))}
          </div>
        ))}
      </div>
    </MockFrame>
  );
}

export function CapacityMock() {
  const rows = [
    [1, 2, 2, 1, 0, 2, 2, 1],
    [2, 2, 1, 1, 2, 2, 2, 2],
    [0, 1, 1, 2, 2, 1, 0, 0],
    [1, 2, 2, 2, 2, 2, 1, 1],
  ];
  const tone = ["bg-white/[0.05]", "bg-aqua/35", "bg-iris/70"];
  return (
    <MockFrame title="Bay capacity · next 4 days">
      <div className="space-y-1.5">
        {rows.map((r, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className="w-8 text-[10px] text-ink-4">{["Mon", "Tue", "Wed", "Thu"][i]}</span>
            {r.map((v, j) => (
              <span key={j} className={cn("h-5 flex-1 rounded", tone[v])} />
            ))}
          </div>
        ))}
      </div>
      <p className="mt-3 text-[10px] text-ink-3">
        <span className="text-aqua-soft">Wed afternoon</span> has 6 open bay-hours — push a promo?
      </p>
    </MockFrame>
  );
}

export function InspectionMock() {
  return (
    <MockFrame title="Pre-service inspection">
      <div className="relative mx-auto h-28 w-full max-w-[260px]">
        <svg viewBox="0 0 260 110" className="h-full w-full">
          <path
            d="M20 70 C 30 45, 70 38, 95 36 L 150 30 C 175 30, 195 42, 215 52 C 236 56, 244 64, 244 74 L 244 82 L 20 82 Z"
            fill="rgb(255 255 255 / 0.06)"
            stroke="rgb(255 255 255 / 0.3)"
            strokeWidth="1.5"
          />
          <circle cx="65" cy="84" r="14" fill="#0b0e1c" stroke="rgb(255 255 255 / 0.3)" />
          <circle cx="198" cy="84" r="14" fill="#0b0e1c" stroke="rgb(255 255 255 / 0.3)" />
        </svg>
        {[
          { x: "28%", y: "40%", c: "bg-warning" },
          { x: "62%", y: "30%", c: "bg-danger" },
          { x: "80%", y: "55%", c: "bg-info" },
        ].map((p, i) => (
          <span key={i} className="absolute" style={{ left: p.x, top: p.y }}>
            <span className={cn("absolute -inset-1.5 animate-pulse-ring rounded-full opacity-60", p.c)} />
            <span className={cn("relative block size-3 rounded-full ring-2 ring-[#0b0e1c]", p.c)} />
          </span>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between text-[10px]">
        <span className="flex items-center gap-1 text-ink-3">
          <Camera className="size-3" /> 12 photos · 3 pins
        </span>
        <span className="flex items-center gap-1 text-success">
          <BadgeCheck className="size-3" /> Signed by S. Chen
        </span>
      </div>
    </MockFrame>
  );
}

export function AutomationMock() {
  const nodes = [
    { icon: Zap, label: "When job → Completed", c: "text-warning" },
    { icon: Clock, label: "Wait 3 days", c: "text-ink-3" },
    { icon: MessageCircle, label: "Text review request", c: "text-aqua-soft" },
    { icon: Clock, label: "Wait 11 months", c: "text-ink-3" },
    { icon: CalendarDays, label: "Offer maintenance booking", c: "text-iris-soft" },
  ];
  return (
    <MockFrame title="Automation · Coating lifecycle">
      <ol className="relative space-y-2 before:absolute before:top-3 before:bottom-3 before:left-[13px] before:w-px before:bg-white/10">
        {nodes.map((n, i) => (
          <li key={i} className="relative flex items-center gap-2.5">
            <span className="glass relative z-10 flex size-7 items-center justify-center rounded-full">
              <n.icon className={cn("size-3.5", n.c)} />
            </span>
            <span className="rounded-lg bg-white/[0.05] px-2.5 py-1.5 text-[11px] text-ink">{n.label}</span>
          </li>
        ))}
      </ol>
    </MockFrame>
  );
}

export function MessagesMock() {
  return (
    <MockFrame title="Inbox · Sarah Chen">
      <div className="space-y-2 text-[11px]">
        <p className="max-w-[80%] rounded-2xl rounded-bl-md bg-white/[0.07] px-3 py-2 text-ink-2">Hey! Is my car ready for pickup?</p>
        <p className="ml-auto max-w-[80%] rounded-2xl rounded-br-md bg-spectral px-3 py-2 text-white">
          It’s in final QC now — ready by 4:30. Track it live: lustra.app/p/7Kx2
        </p>
        <p className="max-w-[80%] rounded-2xl rounded-bl-md bg-white/[0.07] px-3 py-2 text-ink-2">Amazing, see you then 🙌</p>
      </div>
    </MockFrame>
  );
}

export function CertificateMock() {
  return (
    <MockFrame>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] tracking-[0.16em] text-aqua-soft uppercase">Certificate of protection</p>
          <p className="mt-1 text-sm font-semibold text-ink">9H Lifetime Ceramic Coating</p>
          <p className="text-[11px] text-ink-3">2024 Porsche 911 Carrera · Full body</p>
        </div>
        <span className="rounded-xl bg-white p-1.5 text-[#0b0e1c]">
          <QrCode className="size-9" />
        </span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-white/[0.07] pt-3 text-[10px]">
        <div>
          <p className="text-ink-4">Code</p>
          <p className="font-mono text-ink">LX-7K2M9Q</p>
        </div>
        <div>
          <p className="text-ink-4">Installed</p>
          <p className="text-ink">Mar 12, 2026</p>
        </div>
        <div>
          <p className="text-ink-4">Status</p>
          <p className="text-success">● Active</p>
        </div>
      </div>
    </MockFrame>
  );
}

export function MembershipMock() {
  return (
    <MockFrame title="Memberships">
      {[
        { name: "Gloss Club", price: "$89/mo", members: 64, c: "from-iris to-aqua" },
        { name: "Ceramic Care", price: "$129/mo", members: 31, c: "from-plasma to-iris" },
      ].map((p) => (
        <div key={p.name} className="mb-2 flex items-center gap-3 rounded-xl bg-white/[0.04] p-2.5">
          <span className={cn("flex size-8 items-center justify-center rounded-xl bg-gradient-to-br", p.c)}>
            <Crown className="size-4 text-white" />
          </span>
          <div className="flex-1">
            <p className="text-[11px] font-medium text-ink">{p.name}</p>
            <p className="text-[10px] text-ink-3">{p.members} active members</p>
          </div>
          <span className="text-[11px] font-semibold text-ink">{p.price}</span>
        </div>
      ))}
      <p className="text-[10px] text-ink-3">
        MRR <span className="font-semibold text-success">$9,695</span> · renews automatically
      </p>
    </MockFrame>
  );
}

export function TeamMock() {
  const rows = [
    ["Marco R.", "38.5h", "$612", "$1,140"],
    ["Jess T.", "41.0h", "$488", "$1,380"],
    ["Kai L.", "29.0h", "$310", "$760"],
  ];
  return (
    <MockFrame title="Earnings · this week">
      <div className="grid grid-cols-4 gap-1 border-b border-white/[0.07] pb-1.5 text-[9px] tracking-wide text-ink-4 uppercase">
        <span>Tech</span>
        <span>Hours</span>
        <span>Tips</span>
        <span>Commission</span>
      </div>
      {rows.map((r) => (
        <div key={r[0]} className="grid grid-cols-4 gap-1 py-1.5 text-[11px] text-ink-2">
          {r.map((c, i) => (
            <span key={i} className={i === 0 ? "text-ink" : "tabular-nums"}>
              {c}
            </span>
          ))}
        </div>
      ))}
    </MockFrame>
  );
}

export function InventoryMock() {
  const items = [
    ["XPEL Ultimate Plus 60\"", 72, "rolls ft"],
    ["Gtechniq Crystal Serum", 18, "bottles"],
    ["Ceramic tint 35%", 9, "rolls"],
  ] as const;
  return (
    <MockFrame title="Inventory">
      {items.map(([n, pct, unit]) => (
        <div key={n} className="mb-2.5">
          <div className="flex justify-between text-[11px]">
            <span className="text-ink">{n}</span>
            <span className={pct < 20 ? "text-warning" : "text-ink-3"}>{pct < 20 ? "Low stock" : unit}</span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-white/[0.06]">
            <div className={cn("h-full rounded-full", pct < 20 ? "bg-warning" : "bg-gradient-to-r from-iris to-aqua")} style={{ width: `${pct}%` }} />
          </div>
        </div>
      ))}
      <p className="flex items-center gap-1 text-[10px] text-ink-3">
        <PackageCheck className="size-3" /> Reorder alert sent to Marco
      </p>
    </MockFrame>
  );
}

export function AnalyticsMock() {
  const bars = [32, 45, 38, 56, 49, 68, 61, 74, 70, 86, 79, 94];
  return (
    <MockFrame title="Revenue · last 90 days">
      <div className="flex items-baseline justify-between">
        <p className="text-xl font-semibold text-ink">$148,320</p>
        <p className="text-[11px] text-success">▲ 24.6%</p>
      </div>
      <div className="mt-3 flex h-24 items-end gap-1">
        {bars.map((b, i) => (
          <span key={i} className="flex-1 rounded-t bg-gradient-to-t from-iris/50 to-aqua" style={{ height: `${b}%`, opacity: 0.5 + i / 24 }} />
        ))}
      </div>
    </MockFrame>
  );
}

export function RouteMock() {
  return (
    <MockFrame title="Today's route · 5 stops">
      <div className="relative h-32 rounded-xl bg-[radial-gradient(circle_at_30%_40%,rgb(34_211_238/0.12),transparent_60%)]">
        <svg viewBox="0 0 260 120" className="absolute inset-0 h-full w-full">
          <path d="M20 100 C 60 90, 70 40, 110 50 S 170 100, 200 60 S 240 20, 245 18" fill="none" stroke="url(#rg)" strokeWidth="2.5" strokeDasharray="5 5" />
          <defs>
            <linearGradient id="rg" x1="0" x2="1">
              <stop stopColor="#a594ff" />
              <stop offset="1" stopColor="#22d3ee" />
            </linearGradient>
          </defs>
        </svg>
        {[
          [6, 80],
          [40, 36],
          [62, 72],
          [77, 44],
          [93, 10],
        ].map(([x, y], i) => (
          <span key={i} className="absolute flex size-5 items-center justify-center rounded-full bg-spectral text-[9px] font-bold text-white" style={{ left: `${x}%`, top: `${y}%` }}>
            {i + 1}
          </span>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between text-[10px] text-ink-3">
        <span className="flex items-center gap-1">
          <MapPin className="size-3" /> 38 mi · saved 11 mi
        </span>
        <span className="flex items-center gap-1 text-aqua-soft">
          <Navigation className="size-3" /> On-my-way sent
        </span>
      </div>
    </MockFrame>
  );
}

export function NotificationMock({ title, body, icon = "bell" }: { title: string; body: string; icon?: "bell" | "money" | "spark" }) {
  const Icon = icon === "money" ? CircleDollarSign : icon === "spark" ? Sparkles : Bell;
  return (
    <div className="glass-2 flex items-center gap-3 rounded-2xl px-4 py-3" aria-hidden>
      <span className={cn("flex size-9 items-center justify-center rounded-xl", icon === "money" ? "bg-success/15 text-success" : "bg-iris/20 text-iris-soft")}>
        <Icon className="size-4" />
      </span>
      <div>
        <p className="text-xs font-semibold text-ink">{title}</p>
        <p className="text-[11px] text-ink-3">{body}</p>
      </div>
    </div>
  );
}

export function InsightsMock() {
  const actual = [40, 44, 39, 52, 48, 57, 55];
  const predicted = [58, 61, 59, 66, 70];
  const pts = (arr: number[], offset: number) => arr.map((v, i) => `${(i + offset) * 22},${80 - v}`).join(" ");
  return (
    <MockFrame title="AI Insights">
      <div className="flex items-baseline justify-between">
        <p className="text-[11px] text-ink-3">Next 30 days forecast</p>
        <p className="text-sm font-semibold text-ink">$52.4k <span className="text-[10px] font-normal text-success">▲ 12%</span></p>
      </div>
      <svg viewBox="0 0 264 70" className="mt-2 h-16 w-full" preserveAspectRatio="none">
        <polygon points="132,25 220,6 220,22 132,31" fill="rgb(34 211 238 / 0.14)" />
        <polyline points={pts(actual, 0)} fill="none" stroke="#a594ff" strokeWidth="2" />
        <polyline points={pts([actual[6]!, ...predicted], 6)} fill="none" stroke="#22d3ee" strokeWidth="2" strokeDasharray="4 4" />
      </svg>
      <ul className="mt-2 space-y-1.5 text-[11px]">
        {[
          ["14 coating anniversaries this month", "+$1,806", "text-success"],
          ["9 quotes awaiting follow-up", "+$7,240", "text-success"],
          ["6 VIPs at churn risk", "High", "text-danger"],
        ].map(([t, v, c]) => (
          <li key={t} className="flex justify-between rounded-lg bg-white/[0.05] px-2.5 py-1.5">
            <span className="text-ink-2">{t}</span>
            <span className={cn("font-semibold", c)}>{v}</span>
          </li>
        ))}
      </ul>
    </MockFrame>
  );
}

export function CampaignMock() {
  return (
    <MockFrame title="Campaign · Coating anniversary">
      <div className="flex flex-wrap gap-1.5 text-[10px]">
        <span className="rounded-full bg-iris/20 px-2 py-0.5 text-iris-soft">Segment: coating anniversary</span>
        <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-ink-3">42 recipients · SMS</span>
      </div>
      <p className="mt-3 rounded-2xl rounded-bl-md bg-white/[0.07] px-3 py-2 text-[11px] text-ink-2">
        Hi Jordan! Your Model Y’s coating turns 1 this month 🎉 Book its maintenance wash and get a free glass topper: lustra.app/b/apex
      </p>
      <div className="mt-3 grid grid-cols-3 gap-1.5 text-center">
        {[
          ["41", "delivered"],
          ["11", "booked"],
          ["$1,419", "revenue"],
        ].map(([v, l]) => (
          <div key={l} className="rounded-lg bg-black/25 py-1.5">
            <p className="text-xs font-semibold text-ink">{v}</p>
            <p className="text-[9px] text-ink-4">{l}</p>
          </div>
        ))}
      </div>
    </MockFrame>
  );
}

export function ReviewsMock() {
  return (
    <MockFrame title="Reputation Hub">
      <div className="flex items-center gap-3">
        <p className="text-2xl font-semibold text-ink">4.9</p>
        <div className="flex-1 space-y-0.5">
          {[86, 9, 3, 1, 1].map((w, i) => (
            <div key={i} className="flex items-center gap-1.5 text-[9px] text-ink-4">
              <span className="w-2">{5 - i}</span>
              <span className="h-1 flex-1 rounded-full bg-white/[0.06]">
                <span className="block h-full rounded-full bg-warning" style={{ width: `${w}%` }} />
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 rounded-xl bg-white/[0.05] p-2.5 text-[11px]">
        <p className="text-warning">★★★★★ <span className="text-ink-3">· Google · Sarah C.</span></p>
        <p className="mt-1 text-ink-2">“Car looks better than the day I bought it.”</p>
        <p className="mt-2 flex items-center gap-1 text-[10px] text-aqua-soft">
          <Sparkles className="size-3" /> AI reply ready — “Thank you, Sarah! It was a pleasure…”
        </p>
      </div>
    </MockFrame>
  );
}

export function PromoMock() {
  return (
    <MockFrame>
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-iris via-[#5b7cfa] to-aqua p-4 text-white">
        <p className="text-[10px] tracking-[0.18em] uppercase opacity-80">E-gift card</p>
        <p className="mt-1 text-2xl font-semibold">$250.00</p>
        <p className="mt-3 font-mono text-[11px] opacity-90">GC-8F3K-2QPL</p>
        <span className="absolute -top-6 -right-6 size-20 rounded-full bg-white/20 blur-xl" />
      </div>
      <div className="mt-3 flex items-center justify-between rounded-xl border border-dashed border-white/20 px-3 py-2 text-[11px]">
        <span className="font-mono text-ink">SPRING20</span>
        <span className="text-ink-3">20% off · min $150 · 37/100 used</span>
      </div>
    </MockFrame>
  );
}

export function LeadFormMock() {
  return (
    <MockFrame title="Get a PPF quote">
      <div className="space-y-2">
        {["Your name", "Phone"].map((l) => (
          <div key={l} className="rounded-lg border border-white/10 bg-black/25 px-2.5 py-1.5 text-[10px] text-ink-4">
            {l}
          </div>
        ))}
        <div className="grid grid-cols-3 gap-1.5 text-[10px]">
          {["2024", "Porsche", "911"].map((v) => (
            <span key={v} className="rounded-lg border border-white/10 bg-black/25 px-2 py-1.5 text-ink-2">
              {v}
            </span>
          ))}
        </div>
        <div className="flex flex-wrap gap-1 text-[10px]">
          {["Full front PPF", "Ceramic", "Tint"].map((s, i) => (
            <span key={s} className={cn("rounded-full px-2 py-0.5", i < 2 ? "bg-aqua/15 text-aqua-soft" : "bg-white/[0.05] text-ink-3")}>
              {s}
            </span>
          ))}
        </div>
        <div className="bg-spectral rounded-lg py-1.5 text-center text-[10px] font-medium text-white">Request a quote</div>
      </div>
      <p className="mt-2 flex items-center gap-1 text-[10px] text-success">
        <Check className="size-3" /> New lead #2091 added to the board
      </p>
    </MockFrame>
  );
}

export function MarketplaceMock() {
  const items = [
    ["Ceramic Pro 9H kit", "$189", "$169"],
    ["Clear PPF 60\" × 50ft", "$1,240", "$1,115"],
    ["Ceramic tint 35% roll", "$310", "$279"],
  ];
  return (
    <MockFrame title="Marketplace">
      {items.map(([n, list, member]) => (
        <div key={n} className="mb-1.5 flex items-center justify-between rounded-lg bg-white/[0.05] px-2.5 py-1.5 text-[11px]">
          <span className="text-ink">{n}</span>
          <span>
            <span className="mr-1.5 text-ink-4 line-through">{list}</span>
            <span className="font-semibold text-success">{member}</span>
          </span>
        </div>
      ))}
      <div className="mt-2 flex justify-between text-[10px] text-ink-3">
        <span>Member pricing applied</span>
        <span className="text-aqua-soft">+$31.26 credit earned</span>
      </div>
    </MockFrame>
  );
}

export function IntegrationsMock() {
  const apps = [
    ["QuickBooks", "Synced 2m ago", true],
    ["Stripe", "Connected", true],
    ["Zapier", "3 zaps active", true],
    ["Webhook", "job.completed → 200 OK", true],
  ] as const;
  return (
    <MockFrame title="Integrations & API">
      {apps.map(([n, s]) => (
        <div key={n} className="mb-1.5 flex items-center gap-2.5 rounded-lg bg-white/[0.05] px-2.5 py-1.5 text-[11px]">
          <span className="size-1.5 rounded-full bg-success shadow-[0_0_6px_var(--color-success)]" />
          <span className="flex-1 text-ink">{n}</span>
          <span className="text-ink-3">{s}</span>
        </div>
      ))}
      <p className="mt-2 rounded-lg bg-black/30 px-2.5 py-1.5 font-mono text-[10px] text-aqua-soft">X-Lustra-Signature: sha256=9f2c…</p>
    </MockFrame>
  );
}

export const featureMocks: Record<string, () => ReactNode> = {
  "live-job-board": BoardMock,
  "quote-copilot": CopilotMock,
  "online-booking": BookingMock,
  "customer-portal": PortalMock,
  payments: PaymentMock,
  "smart-scheduling": CalendarMock,
  "digital-inspections": InspectionMock,
  "workflow-automations": AutomationMock,
  messaging: MessagesMock,
  "warranty-certificates": CertificateMock,
  memberships: MembershipMock,
  "team-payroll": TeamMock,
  inventory: InventoryMock,
  "profit-analytics": AnalyticsMock,
  "mobile-routing": RouteMock,
  "ai-insights": InsightsMock,
  "smart-campaigns": CampaignMock,
  "reputation-hub": ReviewsMock,
  "promotions-gift-cards": PromoMock,
  "lead-forms": LeadFormMock,
  "supplier-marketplace": MarketplaceMock,
  "integrations-api": IntegrationsMock,
};

