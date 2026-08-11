import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatPrice } from "@/lib/format";
import { formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/admin/status-badge";
import { OrderStatusActions } from "@/components/admin/order-status-actions";
import {
  TIMELINE_STAGES,
  stageStatus,
  buildTimeline,
  LOGISTIC_NOTE_ZH,
} from "@/lib/order-timeline";
import { ORDER_STATUS_LABEL } from "@/lib/constants";
import {
  Clock,
  CheckCircle2,
  Truck,
  PackageCheck,
  XCircle,
  History,
} from "lucide-react";

export const metadata = { title: "订单详情" };

const STATUS_ICON: Record<string, typeof Clock> = {
  PENDING: Clock,
  PAID: CheckCircle2,
  SHIPPED: Truck,
  COMPLETED: PackageCheck,
  CANCELLED: XCircle,
};

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: true,
      user: true,
      events: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!order) notFound();

  const cancelled = order.status === "CANCELLED";
  const displayStages = cancelled
    ? (["PENDING", "CANCELLED"] as const)
    : TIMELINE_STAGES;
  const { eventByStatus, logistics } = buildTimeline(order);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/admin/orders" className="text-sm text-[#8a8a86] hover:text-[#1a1a1a]">
          ← 返回订单列表
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-4">
          <h1 className="text-2xl font-light tracking-wide">{order.orderNumber}</h1>
          <StatusBadge status={order.status} />
        </div>
        <p className="mt-1 text-sm text-[#8a8a86]">
          {formatDateTime(order.createdAt)}
        </p>
      </div>

      {/* 状态流转 */}
      <OrderStatusActions orderId={order.id} status={order.status} />

      {/* 状态时间线 */}
      <div className="rounded-xl border border-[#e8e8e4] bg-white p-6">
        <h2 className="mb-6 flex items-center gap-2 text-sm font-semibold">
          <History size={15} className="text-[#8a8a86]" /> 状态时间线
        </h2>
        <ol className="relative">
          {displayStages.map((stage, i) => {
            const done = stageStatus(stage, order.status);
            if (done === "hidden") return null;
            const isLast = i === displayStages.length - 1;
            const time = eventByStatus.get(stage);
            const StageIcon = STATUS_ICON[stage];
            const stageLabel = ORDER_STATUS_LABEL[stage];
            return (
              <li key={stage} className="relative flex gap-4 pb-6 last:pb-0">
                {!isLast && (
                  <span
                    className={cn(
                      "absolute left-[15px] top-8 h-[calc(100%-1.5rem)] w-px",
                      done === "done" ? "bg-[#d4d4cf]" : "bg-[#efefe9]"
                    )}
                  />
                )}
                <span
                  className={cn(
                    "relative z-10 mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border",
                    done === "done" && "border-[#1a1a1a] bg-[#1a1a1a] text-white",
                    done === "current" &&
                      "border-[#1a1a1a] bg-white text-[#1a1a1a] ring-4 ring-[#1a1a1a]/10",
                    done === "todo" &&
                      "border-[#e2e2de] bg-white text-[#c4c4bf]"
                  )}
                >
                  <StageIcon size={15} />
                </span>
                <div className="min-w-0 flex-1 pt-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <p
                      className={cn(
                        "text-sm font-medium",
                        done === "todo" ? "text-[#b0b0ab]" : "text-[#1a1a1a]"
                      )}
                    >
                      {stageLabel.zh}
                      {done === "current" && (
                        <span className="ml-2 rounded-full bg-[#1a1a1a]/5 px-2 py-0.5 text-[11px] font-medium">
                          当前
                        </span>
                      )}
                    </p>
                    {time && (
                      <p className="text-xs text-[#8a8a86]">
                        {formatDateTime(time)}
                      </p>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>

        {logistics.length > 0 && (
          <div className="mt-6 border-t border-[#f0f0ed] pt-5">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#8a8a86]">
              物流轨迹
            </h3>
            <ul className="space-y-2.5">
              {logistics.map((e) => (
                <li
                  key={e.id}
                  className="flex items-start justify-between gap-4 text-sm"
                >
                  <div className="flex items-start gap-2.5">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#1a1a1a]/40" />
                    <p>{e.note ? LOGISTIC_NOTE_ZH[e.note] ?? e.note : ""}</p>
                  </div>
                  <p className="shrink-0 text-xs text-[#8a8a86]">
                    {formatDateTime(e.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-xl border border-[#e8e8e4] bg-white p-6">
          <h2 className="mb-4 text-sm font-semibold">顾客信息</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-[#8a8a86]">姓名</dt><dd>{order.customerName}</dd></div>
            <div className="flex justify-between"><dt className="text-[#8a8a86]">邮箱</dt><dd>{order.customerEmail}</dd></div>
            <div className="flex justify-between"><dt className="text-[#8a8a86]">电话</dt><dd>{order.phone}</dd></div>
            <div className="flex justify-between"><dt className="text-[#8a8a86]">注册用户</dt><dd>{order.user ? "是" : "游客"}</dd></div>
          </dl>
        </div>
        <div className="rounded-xl border border-[#e8e8e4] bg-white p-6">
          <h2 className="mb-4 text-sm font-semibold">收货信息</h2>
          <p className="text-sm leading-relaxed text-[#5a5a56]">
            {order.province} {order.city} {order.address}
            {order.postalCode ? ` ${order.postalCode}` : ""}
          </p>
          <p className="mt-3 text-sm text-[#8a8a86]">
            配送：{order.shippingMethod}
          </p>
          <p className="mt-1 text-sm text-[#8a8a86]">
            支付：{order.paymentMethod}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-[#e8e8e4] bg-white">
        <div className="border-b border-[#eee] px-6 py-4">
          <h2 className="text-sm font-semibold">商品明细</h2>
        </div>
        <ul className="divide-y divide-[#f3f3f0] px-6">
          {order.items.map((it) => (
            <li key={it.id} className="flex items-center justify-between py-4">
              <div>
                <p className="text-sm font-medium">{it.title}</p>
                {it.variantInfo && (
                  <p className="mt-0.5 text-xs text-[#a0a09b]">{it.variantInfo}</p>
                )}
              </div>
              <p className="text-sm">
                {formatPrice(it.price, "zh")} × {it.quantity}
              </p>
            </li>
          ))}
        </ul>
        <div className="space-y-2 border-t border-[#eee] px-6 py-5 text-sm">
          <div className="flex justify-between text-[#8a8a86]">
            <span>商品小计</span>
            <span>{formatPrice(order.subtotal, "zh")}</span>
          </div>
          <div className="flex justify-between text-[#8a8a86]">
            <span>运费</span>
            <span>{order.shippingFee === 0 ? "—" : formatPrice(order.shippingFee, "zh")}</span>
          </div>
          <div className="flex justify-between pt-2 text-base font-semibold">
            <span>实付金额</span>
            <span>{formatPrice(order.total, "zh")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
