"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const LOCALES = [
  { code: "zh", label: "中文" },
  { code: "en", label: "EN" },
];

export function LocaleSwitcher({ className }: { className?: string }) {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border border-border px-1 py-1",
        className
      )}
    >
      {LOCALES.map((l) => {
        const active = locale === l.code;
        return (
          <button
            key={l.code}
            type="button"
            onClick={() => {
              router.replace(pathname, { locale: l.code });
            }}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium tracking-wide transition-all duration-200",
              active
                ? "bg-foreground text-white"
                : "text-muted hover:text-foreground"
            )}
          >
            {l.label}
          </button>
        );
      })}
    </div>
  );
}
