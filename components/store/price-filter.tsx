"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter, usePathname } from "@/i18n/navigation";

export function PriceFilter({
  min,
  max,
  labels,
}: {
  min?: number;
  max?: number;
  labels: { min: string; max: string; apply: string; priceRange: string };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [minVal, setMinVal] = useState(min ? String(min) : "");
  const [maxVal, setMaxVal] = useState(max ? String(max) : "");

  // 与 URL 状态保持同步（浏览器后退/前进、清除筛选时输入框不残留旧值）
  useEffect(() => {
    setMinVal(min ? String(min) : "");
    setMaxVal(max ? String(max) : "");
  }, [min, max]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const p = new URLSearchParams(window.location.search);
    if (minVal) p.set("min", minVal);
    else p.delete("min");
    if (maxVal) p.set("max", maxVal);
    else p.delete("max");
    p.delete("page");
    const qs = p.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  return (
    <form onSubmit={submit}>
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-foreground">
        {labels.priceRange}
      </h3>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={0}
          placeholder={labels.min}
          value={minVal}
          onChange={(e) => setMinVal(e.target.value)}
          className="input-shop !py-2 text-xs"
        />
        <span className="text-muted">—</span>
        <input
          type="number"
          min={0}
          placeholder={labels.max}
          value={maxVal}
          onChange={(e) => setMaxVal(e.target.value)}
          className="input-shop !py-2 text-xs"
        />
      </div>
      <button type="submit" className="btn-outline mt-3 w-full !py-2 text-xs">
        {labels.apply}
      </button>
    </form>
  );
}
