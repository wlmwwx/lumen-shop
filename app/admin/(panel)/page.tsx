import { prisma } from "@/lib/db";
import { StatCard } from "@/components/admin/stat-card";
import { SalesChart, type SalesPoint } from "@/components/admin/sales-chart";
import { StatusBadge } from "@/components/admin/status-badge";
import { formatPrice } from "@/lib/format";
import { formatDateTime } from "@/lib/utils";
import {
  Banknote,
  ShoppingCart,
  Users,
  TrendingUp,
  Flame,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { parseImages } from "@/lib/utils";
import { ImageWithFallback } from "@/components/store/image-with-fallback";

const LOW_STOCK_THRESHOLD = 10;

export default async function DashboardPage() {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [
    todayOrders,
    paidOrders,
    orderCount,
    customerCount,
    productCount,
    lowStockProducts,
    lowStockCount,
    recentOrders,
    last30Orders,
    topItems,
  ] = await Promise.all([
    prisma.order.findMany({
      where: { createdAt: { gte: todayStart }, status: { not: "CANCELLED" } },
    }),
    prisma.order.findMany({ where: { status: { not: "CANCELLED" } } }),
    prisma.order.count(),
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.product.count(),
    prisma.product.findMany({
      where: { stock: { lte: LOW_STOCK_THRESHOLD } },
      include: { category: true },
      orderBy: [{ stock: "asc" }, { title: "asc" }],
      take: 8,
    }),
    prisma.product.count({ where: { stock: { lte: LOW_STOCK_THRESHOLD } } }),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { _count: { select: { items: true } } },
    }),
    prisma.order.findMany({
      where: {
        createdAt: { gte: new Date(Date.now() - 30 * 86400000) },
        status: { not: "CANCELLED" },
      },
    }),
    prisma.orderItem.groupBy({
      by: ["productId"],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
    }),
  ]);

  const todaySales = todayOrders.reduce((s, o) => s + o.total, 0);
  const totalSales = paidOrders.reduce((s, o) => s + o.total, 0);

  // 近 30 天按日聚合
  const byDay = new Map<string, number>();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    byDay.set(
      `${d.getMonth() + 1}-${String(d.getDate()).padStart(2, "0")}`,
      0
    );
  }
  for (const o of last30Orders) {
    const d = new Date(o.createdAt);
    const key = `${d.getMonth() + 1}-${String(d.getDate()).padStart(2, "0")}`;
    byDay.set(key, (byDay.get(key) ?? 0) + o.total);
  }
  const chartData: SalesPoint[] = Array.from(byDay.entries()).map(
    ([date, amount]) => ({ date, amount })
  );

  // 热销商品
  const topIds = topItems.map((t) => t.productId).filter(Boolean) as string[];
  const topProducts = await prisma.product.findMany({
    where: { id: { in: topIds } },
  });
  const topProductMap = new Map(topProducts.map((p) => [p.id, p]));
  const topList = topItems
    .filter((t) => t.productId)
    .map((t) => ({
      product: topProductMap.get(t.productId as string),
      qty: t._sum.quantity ?? 0,
    }))
    .filter((x) => x.product);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-light tracking-wide">仪表盘</h1>
        <p className="mt-1 text-sm text-[#8a8a86]">店铺经营总览</p>
      </div>

      {/* 统计卡 */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Banknote}
          label="今日销售额"
          value={`¥${todaySales.toLocaleString()}`}
          hint={`${todayOrders.length} 笔订单`}
        />
        <StatCard
          icon={TrendingUp}
          label="累计销售额"
          value={`¥${totalSales.toLocaleString()}`}
        />
        <StatCard icon={ShoppingCart} label="订单总数" value={orderCount} />
        <StatCard icon={Users} label="注册顾客" value={customerCount} />
      </div>

      {/* 图表 + 热销 */}
      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="rounded-xl border border-[#e8e8e4] bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold">近 30 天销售额</h2>
            <span className="text-xs text-[#a0a09b]">单位：¥</span>
          </div>
          <SalesChart data={chartData} />
        </div>

        <div className="rounded-xl border border-[#e8e8e4] bg-white p-6">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold">
            <Flame size={15} className="text-[#c5283d]" /> 热销商品 TOP 5
          </h2>
          <ul className="space-y-3">
            {topList.map((t, i) => (
              <li key={t.product!.id} className="flex items-center gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#f4f4f1] text-xs font-semibold text-[#8a8a86]">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm">
                  {t.product!.title}
                </span>
                <span className="shrink-0 text-xs text-[#8a8a86]">
                  售出 {t.qty} 件
                </span>
              </li>
            ))}
            {topList.length === 0 && (
              <li className="text-sm text-[#a0a09b]">暂无销售数据</li>
            )}
          </ul>
        </div>
      </div>

      {/* 低库存预警 */}
      <div className="rounded-xl border border-[#e8e8e4] bg-white">
        <div className="flex items-center justify-between border-b border-[#eee] px-6 py-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <AlertTriangle size={15} className="text-amber-500" />
            低库存预警
            {lowStockCount > 0 && (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-600">
                {lowStockCount} 件
              </span>
            )}
          </h2>
          <Link href="/admin/products" className="text-xs text-[#8a8a86] hover:text-[#1a1a1a]">
            查看全部 →
          </Link>
        </div>
        {lowStockProducts.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-[#a0a09b]">
            库存充足，暂无预警 🎉
          </p>
        ) : (
          <ul className="grid gap-px bg-[#f0f0ed] sm:grid-cols-2 xl:grid-cols-3">
            {lowStockProducts.map((p) => {
              const img = parseImages(p.images)[0] ?? "";
              const out = p.stock <= 0;
              const critical = p.stock > 0 && p.stock <= 5;
              const pct = Math.min(100, Math.round((p.stock / LOW_STOCK_THRESHOLD) * 100));
              return (
                <li key={p.id} className="bg-white">
                  <Link
                    href={`/admin/products/${p.id}/edit`}
                    className="flex items-center gap-3 p-4 transition-colors hover:bg-[#fafaf8]"
                  >
                    <div className="relative h-14 w-12 shrink-0 overflow-hidden rounded-md bg-[#f4f4f1]">
                      <ImageWithFallback src={img} alt="" fill sizes="48px" className="object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{p.title}</p>
                      <p className="mt-0.5 truncate text-xs text-[#a0a09b]">
                        {p.category?.name ?? "未分类"}
                        {!p.active && <span className="ml-1.5 text-[#a0a09b]">· 已下架</span>}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#f0f0ed]">
                          <div
                            className={`h-full rounded-full ${
                              out ? "bg-[#c5283d]" : critical ? "bg-amber-500" : "bg-amber-400"
                            }`}
                            style={{ width: `${out ? 4 : pct}%` }}
                          />
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            out
                              ? "bg-red-50 text-[#c5283d]"
                              : critical
                                ? "bg-amber-100 text-amber-700"
                                : "bg-amber-50 text-amber-600"
                          }`}
                        >
                          {out ? "缺货" : `剩 ${p.stock} 件`}
                        </span>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* 最近订单 */}
      <div className="rounded-xl border border-[#e8e8e4] bg-white">
        <div className="flex items-center justify-between border-b border-[#eee] px-6 py-4">
          <h2 className="text-sm font-semibold">最近订单</h2>
          <Link href="/admin/orders" className="text-xs text-[#8a8a86] hover:text-[#1a1a1a]">
            查看全部 →
          </Link>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#f0f0ed] text-left text-xs uppercase tracking-wider text-[#8a8a86]">
              <th className="px-6 py-3 font-medium">订单号</th>
              <th className="px-6 py-3 font-medium">顾客</th>
              <th className="px-6 py-3 font-medium">金额</th>
              <th className="px-6 py-3 font-medium">状态</th>
              <th className="px-6 py-3 font-medium">时间</th>
            </tr>
          </thead>
          <tbody>
            {recentOrders.map((o) => (
              <tr key={o.id} className="border-b border-[#f5f5f2] last:border-0 hover:bg-[#fafaf8]">
                <td className="px-6 py-3.5 font-medium">
                  <Link href={`/admin/orders/${o.id}`} className="hover:underline">
                    {o.orderNumber}
                  </Link>
                </td>
                <td className="px-6 py-3.5 text-[#5a5a56]">{o.customerName}</td>
                <td className="px-6 py-3.5 font-medium">
                  {formatPrice(o.total, "zh")}
                </td>
                <td className="px-6 py-3.5">
                  <StatusBadge status={o.status} />
                </td>
                <td className="px-6 py-3.5 text-xs text-[#8a8a86]">
                  {formatDateTime(o.createdAt)}
                </td>
              </tr>
            ))}
            {recentOrders.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-sm text-[#a0a09b]">
                  暂无订单
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
