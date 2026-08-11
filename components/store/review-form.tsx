"use client";

import { useActionState, useState } from "react";
import { Star } from "lucide-react";
import { addReviewAction } from "@/actions/store";
import { cn } from "@/lib/utils";

export function ReviewForm({
  productId,
  slug,
  loginToReview,
  yourRating,
  placeholder,
  submit,
}: {
  productId: string;
  slug: string;
  loginToReview: string;
  yourRating: string;
  placeholder: string;
  submit: string;
}) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [state, formAction, pending] = useActionState(addReviewAction, undefined);

  if (state?.orderId === "ok") {
    return (
      <div className="rounded-lg border border-foreground/15 bg-surface px-5 py-4 text-sm font-medium">
        ✨ {submit} — {placeholder && "已提交，感谢分享！"}
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4 rounded-xl border border-border p-5">
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="rating" value={rating} />

      <div>
        <p className="label-shop">{yourRating}</p>
        <div className="flex gap-1">
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
                size={22}
                className={cn(
                  "transition-colors",
                  (hover || rating) >= n ? "fill-star text-star" : "text-border"
                )}
              />
            </button>
          ))}
        </div>
      </div>

      <div>
        <textarea
          name="comment"
          rows={3}
          required
          minLength={2}
          maxLength={1000}
          placeholder={placeholder}
          className="input-shop resize-none"
        />
      </div>

      {state?.error && (
        <p className="text-sm text-sale">{state.error}</p>
      )}
      {!rating && (
        <p className="text-xs text-muted">{loginToReview}</p>
      )}

      <button
        type="submit"
        disabled={pending || rating === 0}
        className="btn-primary !py-2.5"
      >
        {pending ? "…" : submit}
      </button>
    </form>
  );
}
