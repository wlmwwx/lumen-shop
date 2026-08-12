"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export type SortOption = { value: string; label: string; href: string };

export function SortDropdown({
  current,
  options,
  sortLabel,
}: {
  current: string;
  options: SortOption[];
  sortLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const openPanel = () => {
    setActiveIndex(Math.max(0, options.findIndex((o) => o.value === current)));
    // 下方空间不足时向上展开，避免面板开在视口外（短视口/触发钮靠近页面底部）
    const trigger = wrapRef.current?.querySelector("button");
    const estHeight = options.length * 36 + 24;
    const spaceBelow = trigger
      ? window.innerHeight - trigger.getBoundingClientRect().bottom
      : 0;
    setOpenUp(spaceBelow < estHeight + 8);
    setOpen(true);
  };

  // 面板打开时聚焦当前项；方向键移动焦点（Enter 由链接原生导航）
  useEffect(() => {
    if (!open) return;
    const el = panelRef.current?.querySelectorAll<HTMLElement>('[role="option"]')[activeIndex];
    el?.focus();
  }, [open, activeIndex]);

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

  const currentLabel = options.find((o) => o.value === current)?.label ?? "";

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openPanel())}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${sortLabel}: ${currentLabel}`}
        className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-1.5 text-xs transition-all duration-200 hover:border-foreground/50 hover:text-foreground"
      >
        <span className="text-muted">{sortLabel}</span>
        <span className="text-muted/50">·</span>
        <span className="font-medium text-foreground">{currentLabel}</span>
        <ChevronDown
          size={13}
          className={cn(
            "text-muted transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div
          ref={panelRef}
          role="listbox"
          aria-label={sortLabel}
          onKeyDown={(e) => {
            const count = options.length;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActiveIndex((i) => (i + 1) % count);
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActiveIndex((i) => (i - 1 + count) % count);
            } else if (e.key === "Home") {
              e.preventDefault();
              setActiveIndex(0);
            } else if (e.key === "End") {
              e.preventDefault();
              setActiveIndex(count - 1);
            }
          }}
          className={cn(
            "animate-fade-in-down absolute left-0 z-50 w-56 overflow-hidden rounded-xl border border-border bg-white p-1 shadow-[0_12px_40px_rgba(0,0,0,0.12)]",
            openUp ? "bottom-full mb-2" : "top-full mt-2"
          )}
        >
          {options.map((o, i) => {
            const active = o.value === current;
            return (
              <Link
                key={o.value}
                href={o.href}
                role="option"
                aria-selected={active}
                tabIndex={i === activeIndex ? 0 : -1}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center justify-between rounded-lg px-3 py-2 text-[13px] transition-colors",
                  active
                    ? "bg-surface font-medium text-foreground"
                    : "text-muted hover:bg-surface hover:text-foreground",
                  i === activeIndex && "outline-none ring-2 ring-foreground/15"
                )}
              >
                {o.label}
                {active && <Check size={14} className="text-foreground" />}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
