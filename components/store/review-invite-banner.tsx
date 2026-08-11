"use client";

import { useEffect, useState } from "react";
import { Sparkles, ArrowRight, Star, X } from "lucide-react";
import { Link } from "@/i18n/navigation";

function dismissKey(orderId: string) {
  return `lumen.reviewInviteDismissed.${orderId}`;
}

// localStorage 在隐私模式等场景可能抛错，统一安全读写
const safeGet = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const safeSet = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    // 写入失败静默忽略
  }
};

export function ReviewInviteBanner({
  orderId,
  title,
  body,
  cta,
  pendingLabel,
  dismissLabel,
}: {
  orderId: string;
  title: string;
  body: string;
  cta: string;
  pendingLabel: string;
  dismissLabel: string;
}) {
  const [dismissed, setDismissed] = useState(false);

  // 挂载后再读 localStorage，避免 SSR hydration 不一致
  useEffect(() => {
    if (safeGet(dismissKey(orderId))) setDismissed(true);
  }, [orderId]);

  const handleDismiss = () => {
    safeSet(dismissKey(orderId), "1");
    setDismissed(true);
  };

  if (dismissed) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-amber-200/70 bg-gradient-to-r from-amber-50 via-surface to-surface p-6">
      {/* 装饰星星 */}
      <div className="pointer-events-none absolute -right-6 -top-6 opacity-10">
        <Star size={120} className="text-amber-400" fill="currentColor" />
      </div>

      {/* 关闭按钮：点击后不再提醒（localStorage 按订单记忆） */}
      <button
        type="button"
        onClick={handleDismiss}
        aria-label={dismissLabel}
        title={dismissLabel}
        className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full text-amber-500/70 transition-all duration-200 hover:bg-amber-100 hover:text-amber-700"
      >
        <X size={14} />
      </button>

      <div className="relative flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
            <Sparkles size={20} />
          </div>
          <div>
            <p className="text-sm font-semibold">{title}</p>
            <p className="mt-1 text-xs text-muted">{body}</p>
            <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-100/70 px-2.5 py-0.5 text-[11px] font-medium text-amber-700">
              <Star size={11} className="fill-current" />
              {pendingLabel}
            </p>
          </div>
        </div>

        <Link
          href={`/order/${orderId}`}
          className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-white transition-all duration-300 hover:bg-[#333333]"
        >
          {cta} <ArrowRight size={15} />
        </Link>
      </div>
    </div>
  );
}
