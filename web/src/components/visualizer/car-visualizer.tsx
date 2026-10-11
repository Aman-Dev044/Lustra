"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { Camera, Download, RotateCw, Save } from "lucide-react";
import { useReducedMotion } from "motion/react";
import { Segmented, Switch } from "@/components/spatial";
import { cn, formatMoney } from "@/lib/utils";
import {
  bodyColors,
  caliperColors,
  coverages,
  defaultConfig,
  describeConfig,
  estimateConfig,
  finishes,
  swatchById,
  tints,
  wheelColors,
  type BodyStyle,
  type Coverage,
  type EnvPreset,
  type Finish,
  type Swatch,
  type Tint,
  type VisualizerConfig,
} from "./config";

/* ── Procedural vehicle ──────────────────────────────────────────────────── */

interface Proportions {
  len: number;
  width: number;
  clear: number;
  belt: number;
  roof: number;
  wheelR: number;
  wb: number;
  cabFront: number;
  cabRear: number;
  roofFront: number;
  roofRear: number;
  nose: number;
}

const PROPORTIONS: Record<BodyStyle, Proportions> = {
  coupe: { len: 4.45, width: 1.92, clear: 0.26, belt: 0.9, roof: 1.26, wheelR: 0.36, wb: 1.36, cabFront: 0.82, cabRear: -1.72, roofFront: -0.12, roofRear: -0.82, nose: 0.66 },
  sedan: { len: 4.75, width: 1.86, clear: 0.3, belt: 0.98, roof: 1.43, wheelR: 0.36, wb: 1.45, cabFront: 0.98, cabRear: -1.62, roofFront: 0.22, roofRear: -0.98, nose: 0.76 },
  suv: { len: 4.85, width: 1.98, clear: 0.42, belt: 1.18, roof: 1.8, wheelR: 0.42, wb: 1.5, cabFront: 1.08, cabRear: -2.12, roofFront: 0.5, roofRear: -1.9, nose: 1.02 },
};

function buildGeometries(p: Proportions) {
  const h = p.len / 2;
  const bottom = p.clear + 0.06;
  const arch = p.wheelR + 0.14;

  const body = new THREE.Shape();
  body.moveTo(-h + 0.1, bottom);
  body.lineTo(-p.wb - arch, bottom);
  body.absarc(-p.wb, p.wheelR, arch, Math.PI, 0, true);
  body.lineTo(p.wb - arch, bottom);
  body.absarc(p.wb, p.wheelR, arch, Math.PI, 0, true);
  body.lineTo(h - 0.1, bottom);
  body.quadraticCurveTo(h + 0.06, bottom + 0.04, h + 0.05, (bottom + p.nose) / 2);
  body.quadraticCurveTo(h + 0.03, p.nose, h - 0.18, p.nose + 0.03);
  body.bezierCurveTo(h - 0.8, p.nose + 0.12, p.cabFront + 0.45, p.belt - 0.02, p.cabFront, p.belt);
  body.lineTo(p.cabRear, p.belt + 0.03);
  body.bezierCurveTo(-h + 0.55, p.belt + 0.04, -h + 0.12, p.belt + 0.01, -h + 0.03, p.belt - 0.12);
  body.quadraticCurveTo(-h - 0.06, (bottom + p.belt) / 2, -h + 0.1, bottom);

  const bodyDepth = p.width - 0.3;
  const bodyGeo = new THREE.ExtrudeGeometry(body, {
    depth: bodyDepth,
    bevelEnabled: true,
    bevelThickness: 0.15,
    bevelSize: 0.08,
    bevelSegments: 10,
    curveSegments: 64,
  });
  bodyGeo.translate(0, 0, -bodyDepth / 2);
  bodyGeo.computeVertexNormals();

  const cabin = new THREE.Shape();
  cabin.moveTo(p.cabFront - 0.04, p.belt - 0.03);
  cabin.bezierCurveTo(p.cabFront - 0.38, p.belt + 0.12, p.roofFront + 0.28, p.roof - 0.02, p.roofFront, p.roof);
  cabin.lineTo(p.roofRear, p.roof - 0.01);
  cabin.bezierCurveTo(p.roofRear - 0.38, p.roof - 0.03, p.cabRear + 0.28, p.belt + 0.16, p.cabRear, p.belt);
  cabin.lineTo(p.cabFront - 0.04, p.belt - 0.03);
  const cabinDepth = p.width - 0.66;
  const cabinGeo = new THREE.ExtrudeGeometry(cabin, {
    depth: cabinDepth,
    bevelEnabled: true,
    bevelThickness: 0.17,
    bevelSize: 0.05,
    bevelSegments: 10,
    curveSegments: 48,
  });
  cabinGeo.translate(0, 0, -cabinDepth / 2);

  const roof = new THREE.Shape();
  roof.moveTo(p.roofFront + 0.12, p.roof - 0.06);
  roof.quadraticCurveTo(p.roofFront + 0.02, p.roof + 0.015, p.roofFront - 0.08, p.roof + 0.02);
  roof.lineTo(p.roofRear + 0.08, p.roof + 0.01);
  roof.quadraticCurveTo(p.roofRear - 0.04, p.roof + 0.005, p.roofRear - 0.12, p.roof - 0.07);
  roof.lineTo(p.roofFront + 0.12, p.roof - 0.06);
  const roofDepth = cabinDepth + 0.06;
  const roofGeo = new THREE.ExtrudeGeometry(roof, {
    depth: roofDepth,
    bevelEnabled: true,
    bevelThickness: 0.16,
    bevelSize: 0.03,
    bevelSegments: 8,
    curveSegments: 24,
  });
  roofGeo.translate(0, 0, -roofDepth / 2);

  return { bodyGeo, cabinGeo, roofGeo, h, bottom };
}

const FINISH_PARAMS: Record<Finish, { metalness: number; roughness: number; clearcoat: number; clearcoatRoughness: number }> = {
  gloss: { metalness: 0.35, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.03 },
  satin: { metalness: 0.45, roughness: 0.48, clearcoat: 0.35, clearcoatRoughness: 0.35 },
  matte: { metalness: 0.1, roughness: 0.82, clearcoat: 0, clearcoatRoughness: 1 },
  metallic: { metalness: 0.85, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.05 },
  chrome: { metalness: 1, roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.02 },
};

const TINT_OPACITY: Record<string, number> = { none: 0.28, "70": 0.42, "50": 0.55, "35": 0.68, "20": 0.82, "5": 0.94 };

function coveragePlanes(coverage: Coverage, p: Proportions, h: number, bottom: number): THREE.Plane[][] {
  const front = (x: number) => [new THREE.Plane(new THREE.Vector3(1, 0, 0), -x)];
  switch (coverage) {
    case "partial":
      return [front(h - 0.95)];
    case "full_front":
      return [front(p.cabFront - 0.05)];
    case "track":
      return [front(p.cabFront - 0.05), [new THREE.Plane(new THREE.Vector3(0, -1, 0), bottom + 0.24)]];
    case "full_body":
      return [[]];
    default:
      return [];
  }
}

function Wheel({ position, radius, wheel, caliper, flip }: { position: [number, number, number]; radius: number; wheel: string; caliper: string; flip: boolean }) {
  const side = flip ? -1 : 1;
  return (
    <group position={position}>
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[radius, radius, 0.27, 48]} />
        <meshStandardMaterial color="#0c0d10" roughness={0.9} metalness={0} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, side * 0.01]}>
        <cylinderGeometry args={[radius * 0.7, radius * 0.7, 0.275, 48]} />
        <meshPhysicalMaterial color={wheel} metalness={0.9} roughness={0.25} clearcoat={0.6} />
      </mesh>
      <mesh position={[0.06, radius * 0.25, side * 0.05]}>
        <boxGeometry args={[0.18, 0.14, 0.12]} />
        <meshStandardMaterial color={caliper} roughness={0.4} metalness={0.2} />
      </mesh>
      {Array.from({ length: 5 }).map((_, i) => (
        <mesh key={i} position={[0, 0, side * 0.145]} rotation={[0, 0, (i / 5) * Math.PI * 2]}>
          <boxGeometry args={[radius * 1.2, 0.05, 0.02]} />
          <meshPhysicalMaterial color={wheel} metalness={1} roughness={0.18} />
        </mesh>
      ))}
      <mesh position={[0, 0, side * 0.15]}>
        <cylinderGeometry args={[0.06, 0.06, 0.02, 24]} />
        <meshStandardMaterial color="#111" metalness={0.8} roughness={0.3} />
      </mesh>
    </group>
  );
}

function Car({ config }: { config: VisualizerConfig }) {
  const p = PROPORTIONS[config.style];
  const { bodyGeo, cabinGeo, roofGeo, h, bottom } = useMemo(() => buildGeometries(p), [p]);
  useEffect(
    () => () => {
      bodyGeo.dispose();
      cabinGeo.dispose();
      roofGeo.dispose();
    },
    [bodyGeo, cabinGeo, roofGeo],
  );

  const color = swatchById(bodyColors, config.colorId).hex;
  const finish = FINISH_PARAMS[config.finish];
  const paint = useMemo(() => new THREE.MeshPhysicalMaterial({ color, ...finish, envMapIntensity: 1.2 }), [color, finish]);
  const glass = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: "#0a0e18",
        metalness: 0.2,
        roughness: 0.05,
        clearcoat: 1,
        transparent: true,
        opacity: TINT_OPACITY[String(config.tint)],
        envMapIntensity: 1.5,
      }),
    [config.tint],
  );
  useEffect(() => () => paint.dispose(), [paint]);
  useEffect(() => () => glass.dispose(), [glass]);

  const planesSets = useMemo(() => coveragePlanes(config.coverage, p, h, bottom), [config.coverage, p, h, bottom]);
  const overlayMats = useMemo(
    () =>
      planesSets.map(
        (planes) =>
          new THREE.MeshPhysicalMaterial({
            color: "#7ae7f7",
            emissive: "#22d3ee",
            emissiveIntensity: 0.25,
            transparent: true,
            opacity: 0.22,
            roughness: 0.05,
            clearcoat: 1,
            depthWrite: false,
            polygonOffset: true,
            polygonOffsetFactor: -2,
            clippingPlanes: planes,
          }),
      ),
    [planesSets],
  );
  useEffect(() => () => overlayMats.forEach((m) => m.dispose()), [overlayMats]);

  useFrame(({ clock }) => {
    const pulse = 0.16 + Math.sin(clock.elapsedTime * 2.2) * 0.07;
    overlayMats.forEach((m) => (m.opacity = pulse));
  });

  const wheel = swatchById(wheelColors, config.wheelId).hex;
  const caliper = swatchById(caliperColors, config.caliperId).hex;
  const zWheel = p.width / 2 - 0.16;
  const showOverlay = config.showCoverage && config.coverage !== "none";

  return (
    <group>
      <mesh geometry={bodyGeo} material={paint} castShadow />
      <mesh geometry={roofGeo} material={paint} castShadow />
      <mesh geometry={cabinGeo} material={glass} />
      {showOverlay &&
        overlayMats.map((m, i) => (
          <group key={i}>
            <mesh geometry={bodyGeo} material={m} scale={1.004} />
            {config.coverage === "full_body" && <mesh geometry={roofGeo} material={m} scale={1.004} />}
          </group>
        ))}
      {/* Headlights & taillight */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[h - 0.06, p.nose - 0.04, s * (p.width / 2 - 0.38)]} rotation={[0, 0, -0.35]}>
          <boxGeometry args={[0.1, 0.05, 0.42]} />
          <meshStandardMaterial color="#e8f6ff" emissive="#cfeeff" emissiveIntensity={3} />
        </mesh>
      ))}
      <mesh position={[-h + 0.02, p.belt - 0.16, 0]}>
        <boxGeometry args={[0.06, 0.05, p.width - 0.36]} />
        <meshStandardMaterial color="#ff1f3d" emissive="#ff1f3d" emissiveIntensity={2.4} />
      </mesh>
      {/* Lower trim */}
      <mesh position={[0, bottom + 0.02, 0]}>
        <boxGeometry args={[p.len - 0.5, 0.05, p.width - 0.1]} />
        <meshStandardMaterial color="#0b0c10" roughness={0.7} />
      </mesh>
      {(
        [
          [p.wb, 1],
          [p.wb, -1],
          [-p.wb, 1],
          [-p.wb, -1],
        ] as const
      ).map(([x, s]) => (
        <Wheel key={`${x}-${s}`} position={[x, p.wheelR, s * zWheel]} radius={p.wheelR} wheel={wheel} caliper={caliper} flip={s < 0} />
      ))}
    </group>
  );
}

// Studio matches the showroom floor; sunset / night add colour.
const ENV_BG: Record<EnvPreset, string> = { studio: "#101013", sunset: "#1a0f1c", night: "#04050b" };

function Lighting({ preset }: { preset: EnvPreset }) {
  return (
    <Environment resolution={256} key={preset}>
      <color attach="background" args={[ENV_BG[preset]]} />
      {preset === "studio" && (
        <>
          <Lightformer form="rect" intensity={3} color="#ffffff" position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[10, 2, 1]} />
          <Lightformer form="rect" intensity={2} color="#ffffff" position={[0, 6, -3]} rotation-x={Math.PI / 2} scale={[10, 1, 1]} />
          <Lightformer form="rect" intensity={2} color="#ffffff" position={[0, 6, 3]} rotation-x={Math.PI / 2} scale={[10, 1, 1]} />
          <Lightformer form="rect" intensity={1.5} color="#c9c2ff" position={[-8, 2, 0]} rotation-y={Math.PI / 2} scale={[20, 3, 1]} />
          <Lightformer form="rect" intensity={1.5} color="#bdf3ff" position={[8, 2, 0]} rotation-y={-Math.PI / 2} scale={[20, 3, 1]} />
        </>
      )}
      {preset === "sunset" && (
        <>
          <Lightformer form="rect" intensity={4} color="#ff9b5c" position={[-6, 1.5, -4]} rotation-y={Math.PI / 3} scale={[14, 4, 1]} />
          <Lightformer form="rect" intensity={2.5} color="#ff5ea8" position={[6, 2, -2]} rotation-y={-Math.PI / 3} scale={[10, 3, 1]} />
          <Lightformer form="rect" intensity={1} color="#6d7cff" position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[10, 10, 1]} />
        </>
      )}
      {preset === "night" && (
        <>
          <Lightformer form="rect" intensity={2.5} color="#4f7cff" position={[0, 5, 0]} rotation-x={Math.PI / 2} scale={[12, 1, 1]} />
          <Lightformer form="ring" intensity={3} color="#22d3ee" position={[-5, 2, 3]} scale={3} onUpdate={(self) => self.lookAt(0, 0, 0)} />
          <Lightformer form="rect" intensity={2} color="#f472b6" position={[6, 1, -3]} rotation-y={-Math.PI / 2} scale={[10, 1, 1]} />
        </>
      )}
    </Environment>
  );
}

function Scene({ config }: { config: VisualizerConfig }) {
  return (
    <>
      <color attach="background" args={[ENV_BG[config.env]]} />
      <fog attach="fog" args={[ENV_BG[config.env], 9, 22]} />
      <ambientLight intensity={0.25} />
      <directionalLight position={[4, 6, 3]} intensity={0.8} />
      <Lighting preset={config.env} />
      <Car config={config} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]} receiveShadow>
        <circleGeometry args={[14, 64]} />
        <meshStandardMaterial color={ENV_BG[config.env]} roughness={0.55} metalness={0.4} />
      </mesh>
      <ContactShadows position={[0, 0, 0]} opacity={config.env === "studio" ? 0.5 : 0.75} scale={12} blur={2.4} far={2.5} resolution={512} color="#000000" />
      <OrbitControls
        makeDefault
        enablePan={false}
        minDistance={4.2}
        maxDistance={11}
        minPolarAngle={0.25}
        maxPolarAngle={Math.PI / 2.08}
        autoRotate={config.autoRotate}
        autoRotateSpeed={0.7}
        target={[0, 0.65, 0]}
      />
    </>
  );
}

/* ── Controls ─────────────────────────────────────────────────────────────── */

function Group({ title, children, aside }: { title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <fieldset className="border-t border-ink/[0.06] pt-4 first:border-0 first:pt-0">
      <legend className="mb-2.5 flex w-full items-center justify-between text-[11px] font-semibold tracking-[0.12em] text-ink-3 uppercase">
        {title}
        {aside}
      </legend>
      {children}
    </fieldset>
  );
}

function Swatches({ list, value, onChange, size = 28 }: { list: Swatch[]; value: string; onChange: (id: string) => void; size?: number }) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup">
      {list.map((s) => (
        <button
          key={s.id}
          type="button"
          role="radio"
          aria-checked={value === s.id}
          aria-label={s.name}
          title={s.name}
          onClick={() => onChange(s.id)}
          className={cn(
            "rounded-full ring-offset-2 ring-offset-void transition hover:scale-110",
            value === s.id ? "ring-2 ring-aqua" : "ring-1 ring-ink/20",
          )}
          style={{ width: size, height: size, background: `radial-gradient(circle at 30% 30%, rgb(255 255 255 / 0.45), transparent 45%), ${s.hex}` }}
        />
      ))}
    </div>
  );
}

function Chips<T extends string | number>({ options, value, onChange }: { options: { id: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup">
      {options.map((o) => (
        <button
          key={String(o.id)}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          onClick={() => onChange(o.id)}
          className={cn(
            "rounded-full border px-3 py-1.5 text-xs font-medium transition",
            value === o.id ? "border-aqua/60 bg-aqua/15 text-ink" : "border-ink/10 bg-ink/[0.03] text-ink-3 hover:text-ink",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export interface CarVisualizerProps {
  mode?: "marketing" | "app";
  initialConfig?: Partial<VisualizerConfig>;
  onSave?: (config: VisualizerConfig, summary: string) => void;
  onConfigChange?: (config: VisualizerConfig) => void;
}

export default function CarVisualizer({ mode = "marketing", initialConfig, onSave, onConfigChange }: CarVisualizerProps) {
  const reduce = useReducedMotion();
  const [config, setConfig] = useState<VisualizerConfig>(() => ({ ...defaultConfig, ...initialConfig }));
  const glRef = useRef<THREE.WebGLRenderer | null>(null);

  useEffect(() => {
    onConfigChange?.(config);
  }, [config, onConfigChange]);

  const set = <K extends keyof VisualizerConfig>(key: K, value: VisualizerConfig[K]) => setConfig((c) => ({ ...c, [key]: value }));
  const estimate = estimateConfig(config);
  const cov = coverages.find((c) => c.id === config.coverage)!;

  function screenshot() {
    const canvas = glRef.current?.domElement;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const win = window.open(url, "_blank", "noopener");
      if (!win) {
        const a = document.createElement("a");
        a.href = url;
        a.download = "lustra-visualizer.png";
        a.click();
      }
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    }, "image/png");
  }

  return (
    <div className={cn("grid gap-4", mode === "app" ? "lg:grid-cols-[1fr_360px]" : "lg:grid-cols-[1fr_340px]")}>
      <div
        className={cn(
          "glass-2 rim relative overflow-hidden rounded-[28px]",
          mode === "app" ? "h-[58vh] min-h-[420px] lg:h-[calc(100dvh-170px)]" : "h-[420px] sm:h-[540px]",
        )}
      >
        <Canvas
          shadows
          dpr={[1, 2]}
          camera={{ position: [5.6, 2.3, 5.4], fov: 35 }}
          gl={{ preserveDrawingBuffer: true, antialias: true }}
          onCreated={({ gl }) => {
            gl.localClippingEnabled = true;
            gl.toneMapping = THREE.ACESFilmicToneMapping;
            glRef.current = gl;
          }}
          aria-label={`3D preview: ${describeConfig(config)}`}
        >
          <Scene config={{ ...config, autoRotate: config.autoRotate && !reduce }} />
        </Canvas>
        <div className="pointer-events-none absolute top-4 left-4 flex flex-wrap gap-2">
          <span className="glass-2 rounded-full px-3 py-1 text-[11px] text-ink-2">Drag to orbit · scroll to zoom</span>
        </div>
        <div className="absolute right-4 bottom-4 left-4 flex flex-wrap items-center justify-between gap-2">
          <div className="glass-2 rounded-2xl px-4 py-2.5">
            <p className="text-[10px] tracking-[0.14em] text-ink-4 uppercase">Estimated package</p>
            <p className="text-lg font-semibold text-ink tabular-nums">{formatMoney(estimate.total)}</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => set("autoRotate", !config.autoRotate)}
              className="glass-2 inline-flex size-10 items-center justify-center rounded-full text-ink-2 transition hover:text-ink"
              aria-label={config.autoRotate ? "Stop auto-rotate" : "Start auto-rotate"}
              aria-pressed={config.autoRotate}
            >
              <RotateCw className={cn("size-4", config.autoRotate && "text-aqua")} />
            </button>
            <button
              type="button"
              onClick={screenshot}
              className="glass-2 inline-flex size-10 items-center justify-center rounded-full text-ink-2 transition hover:text-ink"
              aria-label="Take screenshot"
            >
              <Camera className="size-4" />
            </button>
          </div>
        </div>
      </div>

      <div className={cn("glass rounded-[28px] p-5", mode === "app" && "lg:max-h-[calc(100dvh-170px)] lg:overflow-y-auto")}>
        <div className="space-y-4">
          <Group title="Body style">
            <Segmented
              size="sm"
              value={config.style}
              onChange={(v) => set("style", v)}
              options={[
                { value: "coupe", label: "Coupe" },
                { value: "sedan", label: "Sedan" },
                { value: "suv", label: "SUV" },
              ]}
            />
          </Group>
          <Group title="Film color" aside={<span className="normal-case tracking-normal text-ink-4">{swatchById(bodyColors, config.colorId).name}</span>}>
            <Swatches list={bodyColors} value={config.colorId} onChange={(id) => set("colorId", id)} />
            <div className="mt-3">
              <Chips options={finishes} value={config.finish} onChange={(v: Finish) => set("finish", v)} />
            </div>
          </Group>
          <Group
            title="PPF coverage"
            aside={
              <label className="flex items-center gap-2 normal-case tracking-normal text-ink-4">
                Highlight
                <Switch checked={config.showCoverage} onChange={(v) => set("showCoverage", v)} label="Highlight PPF coverage" />
              </label>
            }
          >
            <Chips options={coverages.map((c) => ({ id: c.id, label: c.label }))} value={config.coverage} onChange={(v: Coverage) => set("coverage", v)} />
            <p className="mt-2 text-xs text-ink-4">{cov.detail}</p>
          </Group>
          <Group title="Window tint (VLT)">
            <Chips options={tints} value={config.tint} onChange={(v: Tint) => set("tint", v)} />
          </Group>
          <Group title="Wheels & calipers">
            <Swatches list={wheelColors} value={config.wheelId} onChange={(id) => set("wheelId", id)} size={24} />
            <div className="mt-2.5">
              <Swatches list={caliperColors} value={config.caliperId} onChange={(id) => set("caliperId", id)} size={20} />
            </div>
          </Group>
          <Group title="Lighting">
            <Segmented
              size="sm"
              value={config.env}
              onChange={(v) => set("env", v)}
              options={[
                { value: "studio", label: "Studio" },
                { value: "sunset", label: "Sunset" },
                { value: "night", label: "Night" },
              ]}
            />
          </Group>
          <Group title="Package">
            <ul className="space-y-1.5 text-sm">
              {estimate.lines.length === 0 && <li className="text-ink-4">Factory paint, no film selected.</li>}
              {estimate.lines.map((l) => (
                <li key={l.label} className="flex justify-between gap-3 text-ink-2">
                  <span className="capitalize">{l.label}</span>
                  <span className="text-ink tabular-nums">{formatMoney(l.price, "USD", true)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[11px] text-ink-4">Sample pricing — each shop sets its own.</p>
            <div className="mt-4 flex gap-2">
              {(onSave || mode === "app") && (
                <button
                  type="button"
                  onClick={() => onSave?.(config, describeConfig(config))}
                  className="bg-spectral inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-full text-sm font-medium text-white transition hover:-translate-y-0.5"
                >
                  <Save className="size-4" /> Save configuration
                </button>
              )}
              <button
                type="button"
                onClick={screenshot}
                className="glass inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-full text-sm text-ink transition hover:bg-ink/[0.08]"
              >
                <Download className="size-4" /> Screenshot
              </button>
            </div>
          </Group>
        </div>
      </div>
    </div>
  );
}
