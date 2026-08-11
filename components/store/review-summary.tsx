import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function ReviewSummary({
  reviewedCount,
  totalCount,
  avgRating,
  ratedLabel,
  averageLabel,
}: {
  reviewedCount: number;
  totalCount: number;
  avgRating: number;
  ratedLabel: string;
  averageLabel: string;
}) {
  const pct = totalCount > 0 ? Math.round((reviewedCount / totalCount) * 100) : 0;

  return (
    <div className="rounded-xl border border-border bg-surface/50 px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* 平均分 */}
        <div className="flex items-center gap-3">
          <div className="flex">
            {[1, 2, 3, 4, 5].map((n) => (
              <Star
                key={n}
                size={16}
                className={cn(
                  n <= Math.round(avgRating)
                    ? "fill-star text-star"
                    : "text-border"
                )}
              />
            ))}
          </div>
          <div>
            <p className="text-lg font-medium leading-none">
              {avgRating > 0 ? avgRating.toFixed(1) : "—"}
              <span className="ml-1 text-xs font-normal text-muted">/ 5</span>
            </p>
            <p className="mt-1 text-xs text-muted">{averageLabel}</p>
          </div>
        </div>

        {/* 已评分件数 */}
        <div className="min-w-[140px]">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted">{ratedLabel}</span>
            <span className="font-medium">
              {reviewedCount}/{totalCount}
            </span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-border/60">
            <div
              className="h-full rounded-full bg-foreground/70 transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-1 text-right text-[11px] text-muted">
            {pct}%
          </p>
        </div>
      </div>
    </div>
  );
}
