import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/db";
import { formatPrice } from "@/lib/format";
import { parseImages } from "@/lib/utils";
import { ProductRowActions } from "@/components/admin/product-row-actions";
import { ImageWithFallback } from "@/components/store/image-with-fallback";

export const metadata = { title: "商品管理" };

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() || "";
  const page = Math.max(1, Number(sp.page) || 1);
  const PAGE_SIZE = 12;

  const where = q
    ? { OR: [{ title: { contains: q } }, { titleEn: { contains: q } }] }
    : {};

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { category: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.product.count({ where }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-light tracking-wide">商品管理</h1>
          <p className="mt-1 text-sm text-[#8a8a86]">共 {total} 件商品</p>
        </div>
        <Link href="/admin/products/new" className="btn-primary !px-5 !py-2.5 text-sm">
          <Plus size={16} /> 新建商品
        </Link>
      </div>

      <form className="flex max-w-sm">
        <input
          name="q"
          defaultValue={q}
          placeholder="搜索商品名称…"
          className="input-shop rounded-r-none"
        />
        <button className="btn-primary rounded-l-none !px-5 !py-2.5">搜索</button>
      </form>

      <div className="overflow-hidden rounded-xl border border-[#e8e8e4] bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#eee] text-left text-xs uppercase tracking-wider text-[#8a8a86]">
              <th className="px-5 py-3 font-medium">商品</th>
              <th className="px-5 py-3 font-medium">分类</th>
              <th className="px-5 py-3 font-medium">价格</th>
              <th className="px-5 py-3 font-medium">库存</th>
              <th className="px-5 py-3 font-medium">状态</th>
              <th className="px-5 py-3 text-right font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const img = parseImages(p.images)[0] ?? "";
              return (
                <tr key={p.id} className="border-b border-[#f3f3f0] last:border-0 hover:bg-[#fafaf8]">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="relative h-12 w-10 shrink-0 overflow-hidden rounded-md bg-[#f4f4f1]">
                        <ImageWithFallback src={img} alt="" fill sizes="40px" className="object-cover" />
                      </div>
                      <div className="min-w-0">
                        <p className="max-w-[240px] truncate font-medium">{p.title}</p>
                        <p className="text-xs text-[#a0a09b]">{p.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-[#5a5a56]">
                    {p.category?.name ?? "—"}
                  </td>
                  <td className="px-5 py-3.5 font-medium">
                    {formatPrice(p.price, "zh")}
                    {p.compareAtPrice && (
                      <span className="ml-1.5 text-xs text-[#a0a09b] line-through">
                        {formatPrice(p.compareAtPrice, "zh")}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={
                        p.stock <= 5
                          ? "font-medium text-[#c5283d]"
                          : "text-[#5a5a56]"
                      }
                    >
                      {p.stock}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        p.active
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {p.active ? "已上架" : "已下架"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/products/${p.id}/edit`}
                        className="rounded-full border border-[#e2e2de] px-3 py-1.5 text-xs transition-colors hover:border-[#1a1a1a]"
                      >
                        编辑
                      </Link>
                      <ProductRowActions
                        id={p.id}
                        active={p.active}
                        stock={p.stock}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
            {products.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-[#a0a09b]">
                  暂无商品
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
              href={`/admin/products?${q ? `q=${encodeURIComponent(q)}&` : ""}page=${n}`}
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
