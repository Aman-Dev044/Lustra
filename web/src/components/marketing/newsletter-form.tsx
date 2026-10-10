"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";
import { api, errorMessage } from "@/lib/api";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/public/leads", { name: email.split("@")[0], email, source: "newsletter" });
      toast.success("You're in. Expect one sharp email a month — no fluff.");
      setEmail("");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="glass-inset mt-6 flex max-w-sm items-center gap-1 rounded-full p-1 pl-4">
      <label htmlFor="newsletter-email" className="sr-only">
        Email address
      </label>
      <input
        id="newsletter-email"
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Get the shop-growth letter"
        className="h-9 flex-1 bg-transparent text-sm text-ink placeholder:text-ink-4 focus:outline-none"
      />
      <button
        type="submit"
        disabled={loading}
        className="bg-spectral inline-flex size-9 items-center justify-center rounded-full text-white transition hover:scale-105 disabled:opacity-60"
        aria-label="Subscribe"
      >
        <ArrowRight className="size-4" />
      </button>
    </form>
  );
}
