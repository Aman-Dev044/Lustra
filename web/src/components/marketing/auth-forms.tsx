"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Eye, EyeOff, Sparkles, Zap } from "lucide-react";
import { Badge, Button, Field, Glass, Input } from "@/components/spatial";
import { api, ApiError, errorMessage } from "@/lib/api";
import { industryCatalog } from "@/lib/content/catalog";
import { pricingPlans } from "@/lib/plans";
import type { Industry, PlanId } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Only allow same-origin relative redirects (blocks open-redirects like //evil.com). */
function safeNext(next: string | null) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/app";
}

/** Maps a server validation error's details (zod issues or a field map) onto form fields. */
function fieldErrors(err: unknown): Record<string, string> {
  if (!(err instanceof ApiError)) return {};
  const out: Record<string, string> = {};
  const d = err.details as unknown;
  if (Array.isArray(d)) {
    for (const issue of d as { path?: (string | number)[] | string; message?: string }[]) {
      const key = Array.isArray(issue.path) ? String(issue.path[0]) : issue.path;
      if (key && issue.message) out[key] = issue.message;
    }
  } else if (d && typeof d === "object") {
    for (const [k, v] of Object.entries(d as Record<string, unknown>)) if (typeof v === "string") out[k] = v;
  }
  if (err.code === "CONFLICT" && !out.email) out.email = err.message;
  return out;
}

function PasswordInput({
  id,
  value,
  onChange,
  autoComplete,
  invalid,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
  invalid?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? "text" : "password"}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={invalid}
        className="pr-11"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full p-2 text-ink-4 transition hover:text-ink"
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

/* ── Login ─────────────────────────────────────────────────────────────── */

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  async function login(creds: { email: string; password: string }) {
    setLoading(true);
    setErrors({});
    try {
      const res = await api.post<{ user: { name: string } }>("/auth/login", creds);
      toast.success(`Welcome back, ${res.user.name.split(" ")[0]}`);
      router.replace(next);
      router.refresh();
    } catch (err) {
      const fe = fieldErrors(err);
      setErrors(Object.keys(fe).length ? fe : { form: errorMessage(err) });
      setLoading(false);
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const fe: Record<string, string> = {};
    if (!/^\S+@\S+\.\S+$/.test(email)) fe.email = "Enter a valid email address.";
    if (!password) fe.password = "Enter your password.";
    if (Object.keys(fe).length) return setErrors(fe);
    void login({ email, password });
  }

  return (
    <Glass tier={2} rim className="w-full max-w-md rounded-[30px] p-7 sm:p-9">
      <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
      <p className="mt-1.5 text-sm text-ink-3">Log in to your Lustra workspace.</p>

      <button
        type="button"
        onClick={() => {
          setEmail("demo@lustra.app");
          setPassword("demo1234");
          void login({ email: "demo@lustra.app", password: "demo1234" });
        }}
        disabled={loading}
        className="group mt-6 flex w-full items-center gap-3 rounded-2xl border border-aqua/25 bg-aqua/[0.07] p-3.5 text-left transition hover:border-aqua/50 hover:bg-aqua/[0.12] disabled:opacity-60"
      >
        <span className="bg-spectral flex size-10 shrink-0 items-center justify-center rounded-xl text-white">
          <Zap className="size-5" aria-hidden />
        </span>
        <span className="flex-1">
          <span className="block text-sm font-medium text-ink">Use demo account</span>
          <span className="block font-mono text-xs text-ink-3">demo@lustra.app / demo1234</span>
        </span>
        <ArrowRight className="size-4 text-aqua-soft transition group-hover:translate-x-1" aria-hidden />
      </button>

      <div className="my-6 flex items-center gap-3 text-xs text-ink-4">
        <span className="h-px flex-1 bg-ink/10" /> or with email <span className="h-px flex-1 bg-ink/10" />
      </div>

      <form onSubmit={submit} noValidate className="space-y-4">
        <Field label="Email" htmlFor="login-email" error={errors.email}>
          <Input id="login-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!errors.email} />
        </Field>
        <Field label="Password" htmlFor="login-password" error={errors.password}>
          <PasswordInput id="login-password" autoComplete="current-password" value={password} onChange={setPassword} invalid={!!errors.password} />
        </Field>
        {errors.form && (
          <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
            {errors.form}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full" loading={loading}>
          Log in
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-ink-3">
        New to Lustra?{" "}
        <Link href="/signup" className="font-medium text-aqua-soft hover:text-ink">
          Start your free trial
        </Link>
      </p>
    </Glass>
  );
}

/* ── Signup ────────────────────────────────────────────────────────────── */

function passwordScore(pw: string) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return Math.min(4, s);
}
const scoreLabel = ["Too short", "Weak", "Fair", "Strong", "Excellent"];
const scoreColor = ["bg-danger", "bg-danger", "bg-warning", "bg-aqua", "bg-success"];

const industryValue: Record<string, Industry> = {
  "auto-detailing": "detailing",
  "ceramic-coating": "ceramic",
  "paint-protection-film": "ppf",
  "window-tint": "tint",
  "vinyl-wrap": "wrap",
  "mobile-detailing": "mobile",
  "marine-detailing": "marine",
  "flat-glass": "flat-glass",
  landscaping: "landscaping",
  "lawn-care": "lawn-care",
};

export function SignupForm() {
  const router = useRouter();
  const params = useSearchParams();
  const planParam = params.get("plan");
  const plan: PlanId = planParam === "express" || planParam === "enterprise" ? planParam : "pro";
  const planInfo = pricingPlans.find((p) => p.id === plan)!;

  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState({ name: "", email: "", password: "", shopName: "", industry: "detailing" as Industry, phone: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const score = useMemo(() => passwordScore(form.password), [form.password]);

  function validateStep1() {
    const e: Record<string, string> = {};
    if (form.name.trim().length < 2) e.name = "Enter your full name.";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = "Enter a valid email address.";
    if (form.password.length < 8) e.password = "Use at least 8 characters.";
    setErrors(e);
    return !Object.keys(e).length;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (step === 1) {
      if (validateStep1()) setStep(2);
      return;
    }
    if (form.shopName.trim().length < 2) return setErrors({ shopName: "Enter your shop's name." });
    setLoading(true);
    setErrors({});
    try {
      await api.post("/auth/register", { ...form, phone: form.phone || undefined, plan });
      toast.success("Your workspace is ready 🎉");
      router.replace("/app");
      router.refresh();
    } catch (err) {
      const fe = fieldErrors(err);
      if (fe.name || fe.email || fe.password) setStep(1);
      setErrors(Object.keys(fe).length ? fe : { form: errorMessage(err) });
      setLoading(false);
    }
  }

  return (
    <Glass tier={2} rim className="w-full max-w-lg rounded-[30px] p-7 sm:p-9">
      <div className="flex items-center justify-between gap-3">
        <Badge tone="iris">
          <Sparkles className="size-3" aria-hidden /> {planInfo.name} · 14-day free trial
        </Badge>
        <span className="text-xs text-ink-4">Step {step} of 2</span>
      </div>
      <div className="mt-4 flex gap-1.5" aria-hidden>
        {[1, 2].map((s) => (
          <span key={s} className={cn("h-1 flex-1 rounded-full transition-colors", s <= step ? "bg-spectral" : "bg-ink/10")} />
        ))}
      </div>

      <form onSubmit={submit} noValidate className="mt-6">
        <AnimatePresence mode="wait" initial={false}>
          {step === 1 ? (
            <motion.div key="s1" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="space-y-4">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
                <p className="mt-1.5 text-sm text-ink-3">No credit card required. ${planInfo.monthly}/month after your trial.</p>
              </div>
              <Field label="Full name" htmlFor="su-name" error={errors.name}>
                <Input id="su-name" autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} aria-invalid={!!errors.name} autoFocus />
              </Field>
              <Field label="Work email" htmlFor="su-email" error={errors.email}>
                <Input id="su-email" type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} aria-invalid={!!errors.email} />
              </Field>
              <Field label="Password" htmlFor="su-password" error={errors.password}>
                <PasswordInput id="su-password" autoComplete="new-password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} invalid={!!errors.password} />
                <div className="mt-2 flex items-center gap-2" aria-live="polite">
                  <div className="flex flex-1 gap-1" aria-hidden>
                    {[0, 1, 2, 3].map((i) => (
                      <span key={i} className={cn("h-1 flex-1 rounded-full", form.password && i < Math.max(1, score) ? scoreColor[score] : "bg-ink/10")} />
                    ))}
                  </div>
                  {form.password && <span className="text-[11px] text-ink-3">{scoreLabel[form.password.length < 8 ? 0 : score]}</span>}
                </div>
              </Field>
              <Button type="submit" size="lg" className="w-full">
                Continue <ArrowRight className="size-4" />
              </Button>
            </motion.div>
          ) : (
            <motion.div key="s2" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} className="space-y-4">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">Tell us about your shop</h1>
                <p className="mt-1.5 text-sm text-ink-3">We’ll preload services, prices and automations for your industry.</p>
              </div>
              <Field label="Shop name" htmlFor="su-shop" error={errors.shopName}>
                <Input id="su-shop" autoComplete="organization" value={form.shopName} onChange={(e) => setForm({ ...form, shopName: e.target.value })} aria-invalid={!!errors.shopName} autoFocus />
              </Field>
              <fieldset>
                <legend className="mb-1.5 text-xs font-medium tracking-wide text-ink-2">What do you do?</legend>
                <div className="grid grid-cols-2 gap-2" role="radiogroup">
                  {industryCatalog.map((ind) => {
                    const value = industryValue[ind.slug]!;
                    const active = form.industry === value;
                    return (
                      <button
                        key={ind.slug}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => setForm({ ...form, industry: value })}
                        className={cn(
                          "flex items-center gap-2.5 rounded-2xl border px-3 py-2.5 text-left text-sm transition",
                          active ? "border-aqua/60 bg-aqua/10 text-ink" : "border-ink/10 bg-ink/[0.03] text-ink-3 hover:text-ink",
                        )}
                      >
                        <ind.icon className={cn("size-4 shrink-0", active ? "text-aqua" : "text-ink-4")} aria-hidden />
                        {ind.title}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
              <Field label="Shop phone" htmlFor="su-phone" hint="Optional — shown on your booking page and messages.">
                <Input id="su-phone" type="tel" autoComplete="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </Field>
              {errors.form && (
                <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
                  {errors.form}
                </p>
              )}
              <div className="flex gap-2">
                <Button type="button" variant="secondary" size="lg" onClick={() => setStep(1)}>
                  <ArrowLeft className="size-4" /> Back
                </Button>
                <Button type="submit" size="lg" className="flex-1" loading={loading}>
                  Create my workspace
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </form>

      <p className="mt-6 text-center text-xs text-ink-4">
        By continuing you agree to the{" "}
        <Link href="/legal/terms" className="underline underline-offset-2 hover:text-ink">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/legal/privacy" className="underline underline-offset-2 hover:text-ink">
          Privacy Policy
        </Link>
        .
      </p>
      <p className="mt-3 text-center text-sm text-ink-3">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-aqua-soft hover:text-ink">
          Log in
        </Link>
      </p>
    </Glass>
  );
}
