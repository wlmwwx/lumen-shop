"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Truck, Package, X } from "lucide-react";
import type { OrderStatus } from "@prisma/client";
import { updateOrderStatusAction } from "@/actions/admin";

const FLOW: Record<string, { label: string; next: string; icon: typeof Check }[]> = {
  PENDING: [
    { label: "标记为已支付", next: "PAID", icon: Check },
    { label: "取消订单", next: "CANCELLED", icon: X },
  ],
  PAID: [{ label: "发货", next: "SHIPPED", icon: Truck }],
  SHIPPED: [{ label: "完成订单", next: "COMPLETED", icon: Package }],
};

export function OrderStatusActions({
  orderId,
  status,
}: {
  orderId: string;
  status: string;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const actions = FLOW[status];

  if (!actions) return null;

  const run = (next: string) => {
    if (next === "CANCELLED" && !confirm("确认取消该订单？")) return;
    startTransition(async () => {
      await updateOrderStatusAction(orderId, next as OrderStatus);
      router.refresh();
    });
  };

  return (
    <div className="flex flex-wrap gap-3">
      {actions.map((a) => (
        <button
          key={a.next}
          onClick={() => run(a.next)}
          disabled={isPending}
          className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-all duration-300 disabled:opacity-50 ${
            a.next === "CANCELLED"
              ? "border border-[#e2e2de] text-[#c5283d] hover:border-[#c5283d]"
              : "bg-[#1a1a1a] text-white hover:bg-[#333333]"
          }`}
        >
          <a.icon size={15} /> {isPending ? "处理中…" : a.label}
        </button>
      ))}
    </div>
  );
}
