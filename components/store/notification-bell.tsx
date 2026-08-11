"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Bell, Star, CheckCheck } from "lucide-react";
import {
  markReviewInviteReadAction,
  markAllReviewInvitesReadAction,
} from "@/actions/notifications";

export type NotificationBellItem = {
  orderId: string;
  orderNumber: string;
  pendingCount: number;
  createdAt: string;
  read: boolean;
};

function relativeTime(
  iso: string,
  t: (key: string, values?: Record<string, any>) => string
) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t("justNow");
  const hours = Math.floor(mins / 60);
  if (hours < 1) return t("minutesAgo", { count: mins });
  const days = Math.floor(hours / 24);
  if (days < 1) return t("hoursAgo", { count: hours });
  return t("daysAgo", { count: days });
}

export function NotificationBell({
  items,
  unreadCount,
}: {
  items: NotificationBellItem[];
  unreadCount: number;
}) {
  const t = useTranslations("Notifications");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // 点击外部 / 按 Esc 关闭
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-full p-2 text-foreground transition-colors hover:bg-surface"
        aria-label={t("title")}
        aria-expanded={open}
      >
        <Bell size={20} strokeWidth={1.6} />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-border bg-white shadow-[0_12px_40px_rgba(0,0,0,0.12)]">
          <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
            <p className="text-sm font-semibold">{t("title")}</p>
            {unreadCount > 0 && (
              <form action={markAllReviewInvitesReadAction}>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] text-muted transition-colors hover:bg-surface hover:text-foreground"
                >
                  <CheckCheck size={12} /> {t("markAllRead")}
                </button>
              </form>
            )}
          </div>

          {items.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <Bell size={28} strokeWidth={1.2} className="mx-auto text-border" />
              <p className="mt-3 text-xs text-muted">{t("empty")}</p>
            </div>
          ) : (
            <ul className="max-h-80 overflow-y-auto">
              {items.map((item) => (
                <li key={item.orderId}>
                  <form action={markReviewInviteReadAction.bind(null, item.orderId)}>
                    <button
                      type="submit"
                      className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-surface ${
                        item.read ? "opacity-55" : "bg-amber-50/40"
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                          item.read
                            ? "bg-surface text-muted"
                            : "bg-amber-100 text-amber-600"
                        }`}
                      >
                        <Star size={14} className={item.read ? "" : "fill-current"} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-foreground">
                          {t("reviewInviteTitle", { order: item.orderNumber })}
                        </span>
                        <span className="mt-0.5 block text-[11px] text-muted">
                          {t("pending", { count: item.pendingCount })} ·{" "}
                          {relativeTime(item.createdAt, t)}
                        </span>
                      </span>
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
