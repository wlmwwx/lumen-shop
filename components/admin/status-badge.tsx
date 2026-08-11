import { cn } from "@/lib/utils";
import { ORDER_STATUS_LABEL } from "@/lib/constants";

const STYLES: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  PAID: "bg-blue-50 text-blue-700 border-blue-200",
  SHIPPED: "bg-violet-50 text-violet-700 border-violet-200",
  COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CANCELLED: "bg-red-50 text-red-600 border-red-200",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
        STYLES[status] ?? "bg-gray-50 text-gray-600 border-gray-200"
      )}
    >
      {ORDER_STATUS_LABEL[status]?.zh ?? status}
    </span>
  );
}
