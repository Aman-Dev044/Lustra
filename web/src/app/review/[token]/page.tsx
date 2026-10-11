"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ExternalLink, Heart, SearchX, Star } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError, errorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button, Skeleton, Textarea } from "@/components/spatial";
import { PublicShell, PublicState, type PublicShop } from "@/components/app/public-shell";

type Data = { shop: PublicShop; customerFirstName?: string; job?: { title?: string; number?: number } | null };
const labels = ["", "Not great", "Could be better", "Good", "Great", "Absolutely loved it"];

export default function PublicReviewPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<Data | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "notfound" | "error">("loading");
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<{ redirect?: string } | null>(null);

  useEffect(() => {
    api
      .get<Data>(`/public/reviews/${token}`)
      .then((d) => {
        setData(d);
        setState("ready");
      })
      .catch((e) => setState(e instanceof ApiError && e.status === 404 ? "notfound" : "error"));
  }, [token]);

  async function submit() {
    setSending(true);
    try {
      const r = await api.post<{ ok: boolean; redirect?: string }>(`/public/reviews/${token}`, { rating, comment: comment.trim() || undefined });
      setDone({ redirect: r.redirect });
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSending(false);
    }
  }

  if (state === "loading")
    return (
      <PublicShell>
        <Skeleton className="mx-auto h-96 max-w-lg" />
      </PublicShell>
    );
  if (!data)
    return (
      <PublicShell>
        <PublicState
          icon={<SearchX className="size-6" />}
          title={state === "notfound" ? "This review link has expired" : "We couldn't load this page"}
          description={state === "notfound" ? "It may have already been used. Thank you!" : "Please refresh in a moment."}
        />
      </PublicShell>
    );

  const brand = data.shop.brandColor || "#7c5cff";
  const shown = hover || rating;

  return (
    <PublicShell shop={data.shop}>
      <div className="mx-auto max-w-lg">
        <AnimatePresence mode="wait">
          {done ? (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} className="glass-2 rim mt-6 rounded-[32px] p-10 text-center">
              <span className="mx-auto flex size-16 items-center justify-center rounded-full" style={{ background: `linear-gradient(135deg, ${brand}, #f472b6)`, boxShadow: `0 20px 50px -14px ${brand}` }}>
                <Heart className="size-8 fill-white text-white" />
              </span>
              <h1 className="mt-5 text-2xl font-semibold tracking-tight">Thank you{data.customerFirstName ? `, ${data.customerFirstName}` : ""}!</h1>
              <p className="mt-2 text-sm text-ink-3">Your feedback goes straight to the {data.shop.name} team.</p>
              {done.redirect && (
                <>
                  <p className="mt-6 text-sm text-ink-2">Would you share your review publicly? It helps a small business more than you know.</p>
                  <Button href={done.redirect} className="mt-4" style={{ background: `linear-gradient(120deg, ${brand}, #22d3ee)` }}>
                    <ExternalLink className="size-4" /> Share on Google
                  </Button>
                </>
              )}
            </motion.div>
          ) : (
            <motion.div key="form" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="glass-2 rim mt-6 rounded-[32px] p-8 text-center">
              <h1 className="text-2xl font-semibold tracking-tight">How did we do{data.customerFirstName ? `, ${data.customerFirstName}` : ""}?</h1>
              {data.job?.title && <p className="mt-1 text-sm text-ink-3">{data.job.title}</p>}
              <div className="mt-8 flex justify-center gap-2" onMouseLeave={() => setHover(0)} role="radiogroup" aria-label="Rating">
                {[1, 2, 3, 4, 5].map((n) => (
                  <motion.button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={rating === n}
                    aria-label={`${n} star${n > 1 ? "s" : ""}`}
                    onMouseEnter={() => setHover(n)}
                    onClick={() => setRating(n)}
                    whileHover={{ scale: 1.18, y: -4 }}
                    whileTap={{ scale: 0.9 }}
                    className="rounded-full p-1"
                  >
                    <Star
                      className={cn("size-11 transition-colors", n <= shown ? "fill-warning text-warning drop-shadow-[0_0_14px_rgb(251_191_36/0.6)]" : "text-ink/15")}
                      strokeWidth={1.5}
                    />
                  </motion.button>
                ))}
              </div>
              <p className="mt-3 h-5 text-sm font-medium text-ink-2">{labels[shown]}</p>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={rating && rating <= 3 ? "What could we have done better?" : "Tell us what you loved (optional)"}
                className="mt-5 text-left"
                aria-label="Comment"
              />
              <Button className="mt-5 w-full" size="lg" onClick={submit} loading={sending} disabled={!rating} style={{ background: `linear-gradient(120deg, ${brand}, #22d3ee)` }}>
                Submit feedback
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PublicShell>
  );
}
