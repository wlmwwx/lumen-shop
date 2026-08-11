"use client";

import { useActionState, useState } from "react";
import { Star, Check, Loader2, ArrowRight } from "lucide-react";
import { addReviewAction } from "@/actions/store";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export function QuickReviewForm({
  productId,
  productSlug,
  labels,
}: {
  productId: string;
  productSlug: string;
  labels: {
    write: string;
    yourRating: string;
    placeholder: string;
    submit: string;
    success: string;
    cancel: string;
    viewReview: string;
  };
}) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [state, formAction, pending] = useActionState(addReviewAction, undefined);

  const success = state?.orderId === "ok";

  if (success) {
    return (
      <div className="flex items-center gap-3 text-xs font-medium">
        <span className="inline-flex items-center gap-1.5 text-emerald-600">
          <Check size={13} /> {labels.success}
        </span>
        <Link
          href={`/products/${productSlug}#reviews`}
          className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-muted transition-colors hover:border-foreground/40 hover:text-foreground"
        >
          {labels.viewReview} <ArrowRight size={12} />
        </Link>
      </div>
    );
  }

  return (
    <div>
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs text-muted transition-colors hover:border-foreground/40 hover:text-foreground"
        >
          <Star size={12} /> {labels.write}
        </button>
      ) : (
        <form
          action={formAction}
          className="mt-2 space-y-2.5 rounded-lg border border-border bg-surface/60 p-3"
        >
          <input type="hidden" name="productId" value={productId} />
          <input type="hidden" name="rating" value={rating} />

          <div className="flex items-center justify-between">
            <p className="text-xs text-muted">{labels.yourRating}</p>
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onMouseEnter={() => setHover(n)}
                  onMouseLeave={() => setHover(0)}
                  onClick={() => setRating(n)}
                  className="p-0.5 transition-transform hover:scale-110"
                  aria-label={`${n} star`}
                >
                  <Star
                    size={16}
                    className={cn(
                      "transition-colors",
                      (hover || rating) >= n ? "fill-star text-star" : "text-border"
                    )}
                  />
                </button>
              ))}
            </div>
          </div>

          <textarea
            name="comment"
            rows={2}
            required
            minLength={2}
            maxLength={1000}
            placeholder={labels.placeholder}
            className="input-shop resize-none !py-2 text-xs"
          />

          {state?.error && <p className="text-xs text-sale">{state.error}</p>}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending || rating === 0}
              className="btn-primary !px-4 !py-1.5 text-xs"
            >
              {pending ? <Loader2 size={12} className="animate-spin" /> : labels.submit}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full border border-border px-3 py-1.5 text-xs text-muted hover:text-foreground"
            >
              {labels.cancel}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
