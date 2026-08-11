import type { LucideIcon } from "lucide-react";

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-[#e8e8e4] bg-white p-5 transition-shadow hover:shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-[#8a8a86]">
          {label}
        </p>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f4f4f1] text-[#1a1a1a]">
          <Icon size={16} strokeWidth={1.8} />
        </span>
      </div>
      <p className="mt-3 text-2xl font-medium">{value}</p>
      {hint && <p className="mt-1 text-xs text-[#a0a09b]">{hint}</p>}
    </div>
  );
}
