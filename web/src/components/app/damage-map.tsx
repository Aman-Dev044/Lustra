"use client";

import { useRef, useState } from "react";
import type { DamageKind, Inspection, InspectionView } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Segmented } from "@/components/spatial";

export type Marker = Inspection["markers"][number];

export const damageKinds: { value: DamageKind; label: string; short: string }[] = [
  { value: "scratch", label: "Scratch", short: "S" },
  { value: "dent", label: "Dent", short: "D" },
  { value: "chip", label: "Rock chip", short: "C" },
  { value: "swirl", label: "Swirls", short: "W" },
  { value: "crack", label: "Crack", short: "K" },
  { value: "stain", label: "Stain", short: "T" },
  { value: "other", label: "Other", short: "O" },
];

export const severityMeta: Record<1 | 2 | 3, { label: string; color: string }> = {
  1: { label: "Minor", color: "#fbbf24" },
  2: { label: "Moderate", color: "#fb923c" },
  3: { label: "Severe", color: "#fb7185" },
};

export const viewOptions: { value: InspectionView; label: string }[] = [
  { value: "top", label: "Top" },
  { value: "left", label: "Driver" },
  { value: "right", label: "Passenger" },
  { value: "front", label: "Front" },
  { value: "rear", label: "Rear" },
];

const W = 400;
const H = 220;

const stroke = { stroke: "rgb(255 255 255 / 0.55)", strokeWidth: 1.6, fill: "url(#dm-body)", strokeLinejoin: "round" as const };
const glass = { stroke: "rgb(122 231 247 / 0.45)", strokeWidth: 1.2, fill: "rgb(34 211 238 / 0.08)", strokeLinejoin: "round" as const };
const wheel = { fill: "rgb(0 0 0 / 0.55)", stroke: "rgb(255 255 255 / 0.35)", strokeWidth: 1.4 };

function TopView() {
  return (
    <g>
      <rect x="78" y="34" width="34" height="18" rx="6" {...wheel} />
      <rect x="78" y="168" width="34" height="18" rx="6" {...wheel} />
      <rect x="282" y="34" width="34" height="18" rx="6" {...wheel} />
      <rect x="282" y="168" width="34" height="18" rx="6" {...wheel} />
      <path d="M44 110 C44 66 60 46 104 44 L300 44 C340 46 360 62 362 110 C360 158 340 174 300 176 L104 176 C60 174 44 154 44 110 Z" {...stroke} />
      <path d="M150 58 L176 66 L176 154 L150 162 C136 140 136 80 150 58 Z" {...glass} />
      <rect x="182" y="66" width="86" height="88" rx="12" fill="rgb(255 255 255 / 0.04)" stroke="rgb(255 255 255 / 0.25)" strokeWidth="1.2" />
      <path d="M274 68 L298 62 C308 84 308 136 298 158 L274 152 Z" {...glass} />
      <path d="M150 52 L140 40 L130 42 L140 56 Z M150 168 L140 180 L130 178 L140 164 Z" fill="rgb(255 255 255 / 0.2)" />
      <path d="M60 80 Q100 76 140 70 M60 140 Q100 144 140 150" stroke="rgb(255 255 255 / 0.18)" fill="none" />
      <text x="54" y="114" fontSize="9" fill="rgb(255 255 255 / 0.35)">FRONT</text>
    </g>
  );
}

function SideView() {
  return (
    <g>
      <path
        d="M36 152 L40 126 C44 114 62 108 96 104 L140 98 L176 68 C184 62 196 60 210 60 L268 60 C282 60 292 64 302 72 L330 100 L356 108 C364 112 366 120 366 130 L366 152 C366 158 362 160 356 160 L332 160 A34 34 0 0 0 264 160 L146 160 A34 34 0 0 0 78 160 L44 160 C38 160 36 158 36 152 Z"
        {...stroke}
      />
      <path d="M150 98 L182 70 C188 66 196 66 206 66 L218 66 L218 98 Z" {...glass} />
      <path d="M226 66 L266 66 C278 66 286 70 294 78 L314 98 L226 98 Z" {...glass} />
      <path d="M96 116 L360 116" stroke="rgb(255 255 255 / 0.15)" fill="none" />
      <path d="M220 104 L220 156" stroke="rgb(255 255 255 / 0.18)" fill="none" />
      <circle cx="112" cy="162" r="27" {...wheel} />
      <circle cx="112" cy="162" r="13" fill="rgb(255 255 255 / 0.08)" stroke="rgb(255 255 255 / 0.3)" />
      <circle cx="298" cy="162" r="27" {...wheel} />
      <circle cx="298" cy="162" r="13" fill="rgb(255 255 255 / 0.08)" stroke="rgb(255 255 255 / 0.3)" />
      <rect x="40" y="122" width="14" height="8" rx="3" fill="rgb(255 255 255 / 0.5)" />
      <rect x="352" y="118" width="12" height="8" rx="3" fill="rgb(251 113 133 / 0.6)" />
    </g>
  );
}

function FrontView({ rear = false }: { rear?: boolean }) {
  return (
    <g>
      <rect x="104" y="160" width="34" height="34" rx="8" {...wheel} />
      <rect x="262" y="160" width="34" height="34" rx="8" {...wheel} />
      <path d="M96 176 L92 132 C92 118 100 110 116 106 L140 62 C146 52 156 48 170 48 L230 48 C244 48 254 52 260 62 L284 106 C300 110 308 118 308 132 L304 176 C304 182 300 184 294 184 L106 184 C100 184 96 182 96 176 Z" {...stroke} />
      <path d="M146 100 L162 62 C164 58 168 56 174 56 L226 56 C232 56 236 58 238 62 L254 100 Z" {...glass} />
      <path d="M116 106 L92 96 L88 104 L112 112 Z M284 106 L308 96 L312 104 L288 112 Z" fill="rgb(255 255 255 / 0.2)" />
      {rear ? (
        <>
          <rect x="108" y="122" width="52" height="16" rx="6" fill="rgb(251 113 133 / 0.55)" />
          <rect x="240" y="122" width="52" height="16" rx="6" fill="rgb(251 113 133 / 0.55)" />
          <rect x="170" y="146" width="60" height="18" rx="3" fill="rgb(255 255 255 / 0.12)" stroke="rgb(255 255 255 / 0.3)" />
          <text x="183" y="159" fontSize="9" fill="rgb(255 255 255 / 0.4)">PLATE</text>
        </>
      ) : (
        <>
          <rect x="108" y="120" width="52" height="16" rx="6" fill="rgb(255 255 255 / 0.55)" />
          <rect x="240" y="120" width="52" height="16" rx="6" fill="rgb(255 255 255 / 0.55)" />
          <rect x="168" y="132" width="64" height="26" rx="8" fill="rgb(0 0 0 / 0.35)" stroke="rgb(255 255 255 / 0.25)" />
          <path d="M172 140 H228 M172 146 H228 M172 152 H228" stroke="rgb(255 255 255 / 0.15)" />
        </>
      )}
    </g>
  );
}

function VehicleDrawing({ view }: { view: InspectionView }) {
  switch (view) {
    case "top":
      return <TopView />;
    case "left":
      return <SideView />;
    case "right":
      return (
        <g transform={`translate(${W} 0) scale(-1 1)`}>
          <SideView />
        </g>
      );
    case "front":
      return <FrontView />;
    case "rear":
      return <FrontView rear />;
  }
}

/** Interactive damage map. Coordinates are stored as 0–100 percentages of the drawing for each view. */
export function DamageMap({
  markers,
  onChange,
  readOnly = false,
  selected,
  onSelect,
  view: controlledView,
  onViewChange,
  className,
}: {
  markers: Marker[];
  onChange?: (markers: Marker[]) => void;
  readOnly?: boolean;
  selected?: number | null;
  onSelect?: (index: number | null) => void;
  view?: InspectionView;
  onViewChange?: (v: InspectionView) => void;
  className?: string;
}) {
  const [innerView, setInnerView] = useState<InspectionView>("top");
  const view = controlledView ?? innerView;
  const setView = (v: InspectionView) => (onViewChange ? onViewChange(v) : setInnerView(v));
  const svgRef = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<{ index: number; x: number; y: number; moved: boolean } | null>(null);

  const toPct = (e: React.PointerEvent) => {
    const r = svgRef.current!.getBoundingClientRect();
    return {
      x: Math.min(100, Math.max(0, ((e.clientX - r.left) / r.width) * 100)),
      y: Math.min(100, Math.max(0, ((e.clientY - r.top) / r.height) * 100)),
    };
  };

  function onBackgroundClick(e: React.PointerEvent) {
    if (readOnly || !onChange || drag) return;
    const { x, y } = toPct(e);
    const next: Marker = { view, x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, kind: "scratch", severity: 1, note: "" };
    onChange([...markers, next]);
    onSelect?.(markers.length);
  }

  function onPinDown(e: React.PointerEvent, index: number) {
    e.stopPropagation();
    onSelect?.(index);
    if (readOnly) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const m = markers[index]!;
    setDrag({ index, x: m.x, y: m.y, moved: false });
  }

  function onMove(e: React.PointerEvent) {
    if (!drag) return;
    const { x, y } = toPct(e);
    setDrag({ ...drag, x, y, moved: true });
  }

  function onUp() {
    if (!drag) return;
    if (drag.moved && onChange) {
      onChange(markers.map((m, i) => (i === drag.index ? { ...m, x: Math.round(drag.x * 10) / 10, y: Math.round(drag.y * 10) / 10 } : m)));
    }
    setTimeout(() => setDrag(null), 0);
  }

  const counts = viewOptions.map((o) => markers.filter((m) => m.view === o.value).length);

  return (
    <div className={className}>
      <div className="mb-3 flex justify-center overflow-x-auto">
        <Segmented
          size="sm"
          value={view}
          onChange={setView}
          options={viewOptions.map((o, i) => ({
            value: o.value,
            label: (
              <>
                {o.label}
                {counts[i]! > 0 && <span className="rounded-full bg-plasma/25 px-1.5 text-[10px] text-plasma">{counts[i]}</span>}
              </>
            ),
          }))}
        />
      </div>
      <div className="glass-inset relative overflow-hidden rounded-2xl">
        <div className="grid-floor pointer-events-none absolute inset-0 opacity-60" />
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className={cn("relative block w-full touch-none select-none", !readOnly && "cursor-crosshair")}
          style={{ aspectRatio: `${W} / ${H}` }}
          onPointerUp={(e) => {
            if (drag) onUp();
            else if (e.target === svgRef.current || (e.target as Element).closest("[data-car]")) onBackgroundClick(e);
          }}
          onPointerMove={onMove}
          role="img"
          aria-label={`Vehicle damage map, ${view} view${readOnly ? "" : ". Click to add a damage marker."}`}
        >
          <defs>
            <linearGradient id="dm-body" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="rgb(165 148 255 / 0.16)" />
              <stop offset="1" stopColor="rgb(34 211 238 / 0.05)" />
            </linearGradient>
            <filter id="dm-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <g data-car>
            <VehicleDrawing view={view} />
          </g>
          {markers.map((m, i) => {
            if (m.view !== view) return null;
            const isDrag = drag?.index === i;
            const x = ((isDrag ? drag.x : m.x) / 100) * W;
            const y = ((isDrag ? drag.y : m.y) / 100) * H;
            const color = severityMeta[m.severity]?.color ?? "#fbbf24";
            const kind = damageKinds.find((k) => k.value === m.kind);
            const isSel = selected === i;
            return (
              <g
                key={m._id ?? i}
                transform={`translate(${x} ${y})`}
                onPointerDown={(e) => onPinDown(e, i)}
                className={readOnly ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"}
                role="button"
                aria-label={`${kind?.label ?? m.kind}, ${severityMeta[m.severity]?.label}`}
              >
                {isSel && <circle r="15" fill="none" stroke={color} strokeOpacity="0.6" strokeWidth="1.5" className="animate-pulse" />}
                <circle r="10" fill={color} fillOpacity="0.25" filter="url(#dm-glow)" />
                <circle r="8" fill={color} stroke="#0b0e1c" strokeWidth="1.5" />
                <text textAnchor="middle" dy="3.2" fontSize="9" fontWeight="700" fill="#0b0e1c">
                  {kind?.short ?? "?"}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-[11px] text-ink-3">
        {([1, 2, 3] as const).map((s) => (
          <span key={s} className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-full" style={{ background: severityMeta[s].color }} />
            {severityMeta[s].label}
          </span>
        ))}
        <span className="text-ink-4">·</span>
        {damageKinds.map((k) => (
          <span key={k.value}>
            <b className="font-semibold text-ink-2">{k.short}</b> {k.label}
          </span>
        ))}
      </div>
    </div>
  );
}
