import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatPrice } from "@/lib/format";
import { formatDate } from "@/lib/format";

export const metadata = { title: "顾客管理" };

export default async function AdminCustomersPage() {
  const customers = await prisma.user.findMany({
    where: { role: "CUSTOMER" },
    orderBy: { createdAt: "desc" },
    include: {
      orders: {
        where: { status: { not: "CANCELLED" } },
        select: { total: true, id: true, orderNumber: true },
      },
      _count: { select: { reviews: true, wishlist: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-light tracking-wide">顾客管理</h1>
        <p className="mt-1 text-sm text-[#8a8a86]">共 {customers.length} 位注册顾客</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {customers.map((c) => {
          const spent = c.orders.reduce((s, o) => s + o.total, 0);
          return (
            <div
              key={c.id}
              className="rounded-xl border border-[#e8e8e4] bg-white p-5 transition-shadow hover:shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#1a1a1a] font-medium text-white">
                  {c.name.slice(0, 1)}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium">{c.name}</p>
                  <p className="truncate text-xs text-[#8a8a86]">{c.email}</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-[#f3f3f0] pt-4 text-center">
                <div>
                  <p className="text-lg font-semibold">{c.orders.length}</p>
                  <p className="text-xs text-[#8a8a86]">订单</p>
                </div>
                <div>
                  <p className="text-lg font-semibold">{spent > 0 ? formatPrice(spent, "zh") : "¥0"}</p>
                  <p className="text-xs text-[#8a8a86]">消费</p>
                </div>
                <div>
                  <p className="text-lg font-semibold">{c._count.reviews}</p>
                  <p className="text-xs text-[#8a8a86]">评论</p>
                </div>
              </div>
              <p className="mt-3 text-xs text-[#a0a09b]">
                注册于 {formatDate(c.createdAt)}
              </p>
              {c.orders.length > 0 && (
                <Link
                  href={`/admin/orders?q=${encodeURIComponent(c.email)}`}
                  className="mt-3 inline-block text-xs text-[#8a8a86] underline-offset-4 hover:text-[#1a1a1a] hover:underline"
                >
                  查看 TA 的订单 →
                </Link>
              )}
            </div>
          );
        })}
        {customers.length === 0 && (
          <div className="col-span-full rounded-xl border border-dashed border-[#e2e2de] py-16 text-center text-[#a0a09b]">
            暂无注册顾客
          </div>
        )}
      </div>
    </div>
  );
}
