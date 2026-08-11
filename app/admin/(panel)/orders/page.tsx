import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatPrice } from "@/lib/format";
import { formatDateTime } from "@/lib/utils";
import { StatusBadge } from "@/components/admin/status-badge";
import { ORDER_STATUSES } from "@/lib/constants";

export const metadata = { title: "订单管理" };

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() || "";
  const status = ORDER_STATUSES.includes((sp.status ?? "") as never) ? sp.status! : "";
  const page = Math.max(1, Number(sp.page) || 1);
  const PAGE_SIZE = 15;

  const where: Record<string, unknown> = {};
  if (q) {
    where.OR = [
      { orderNumber: { contains: q } },
      { customerName: { contains: q } },
      { customerEmail: { contains: q } },
    ];
  }
  if (status) where.status = status;

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { _count: { select: { items: true } } },
    }),
    prisma.order.count({ where }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const statuses = ["", "PENDING", "PAID", "SHIPPED", "COMPLETED", "CANCELLED"];
  const statusNames: Record<string, string> = {
    "": "全部状态",
    PENDING: "待支付",
    PAID: "已支付",
    SHIPPED: "已发货",
    COMPLETED: "已完成",
    CANCELLED: "已取消",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-light tracking-wide">订单管理</h1>
        <p className="mt-1 text-sm text-[#8a8a86]">共 {total} 笔订单</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <form className="flex">
          <input
            name="q"
            defaultValue={q}
            placeholder="订单号 / 顾客…"
            className="input-shop rounded-r-none"
          />
          <button className="btn-primary rounded-l-none !px-5 !py-2.5">搜索</button>
        </form>
        <div className="flex flex-wrap gap-2">
          {statuses.map((s) => (
            <Link
              key={s}
              href={s ? `/admin/orders?status=${s}` : "/admin/orders"}
              className={`rounded-full border px-3.5 py-1.5 text-xs transition-colors ${
                status === s
                  ? "border-[#1a1a1a] bg-[#1a1a1a] text-white"
                  : "border-[#e2e2de] text-[#5a5a56] hover:border-[#1a1a1a]"
              }`}
            >
              {statusNames[s]}
            </Link>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-[#e8e8e4] bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#eee] text-left text-xs uppercase tracking-wider text-[#8a8a86]">
              <th className="px-5 py-3 font-medium">订单号</th>
              <th className="px-5 py-3 font-medium">顾客</th>
              <th className="px-5 py-3 font-medium">商品数</th>
              <th className="px-5 py-3 font-medium">金额</th>
              <th className="px-5 py-3 font-medium">支付</th>
              <th className="px-5 py-3 font-medium">状态</th>
              <th className="px-5 py-3 font-medium">时间</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b border-[#f3f3f0] last:border-0 hover:bg-[#fafaf8]">
                <td className="px-5 py-3.5 font-medium">
                  <Link href={`/admin/orders/${o.id}`} className="hover:underline">
                    {o.orderNumber}
                  </Link>
                </td>
                <td className="px-5 py-3.5">
                  <p className="font-medium">{o.customerName}</p>
                  <p className="text-xs text-[#a0a09b]">{o.customerEmail}</p>
                </td>
                <td className="px-5 py-3.5 text-[#5a5a56]">{o._count.items} 件</td>
                <td className="px-5 py-3.5 font-medium">
                  {formatPrice(o.total, "zh")}
                </td>
                <td className="px-5 py-3.5 text-xs text-[#8a8a86]">
                  {o.paymentMethod.replace("模拟支付 · ", "")}
                </td>
                <td className="px-5 py-3.5">
                  <StatusBadge status={o.status} />
                </td>
                <td className="px-5 py-3.5 text-xs text-[#8a8a86]">
                  {formatDateTime(o.createdAt)}
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-[#a0a09b]">
                  暂无订单
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
            <Link
              key={n}
              href={`/admin/orders?${q ? `q=${encodeURIComponent(q)}&` : ""}${status ? `status=${status}&` : ""}page=${n}`}
              className={`flex h-9 w-9 items-center justify-center rounded-full border text-sm ${
                n === page
                  ? "border-[#1a1a1a] bg-[#1a1a1a] text-white"
                  : "border-[#e2e2de] text-[#5a5a56] hover:border-[#1a1a1a]"
              }`}
            >
              {n}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
