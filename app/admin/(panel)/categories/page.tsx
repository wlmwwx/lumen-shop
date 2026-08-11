import { prisma } from "@/lib/db";
import { createCategoryFormAction } from "@/actions/admin";
import { CategoryRow } from "@/components/admin/category-row";

export const metadata = { title: "分类管理" };

export default async function AdminCategoriesPage() {
  const categories = await prisma.category.findMany({
    orderBy: { order: "asc" },
    include: { _count: { select: { products: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-light tracking-wide">分类管理</h1>
        <p className="mt-1 text-sm text-[#8a8a86]">共 {categories.length} 个分类</p>
      </div>

      {/* 新建分类 */}
      <form
        action={createCategoryFormAction}
        className="grid gap-3 rounded-xl border border-[#e8e8e4] bg-white p-5 sm:grid-cols-[1fr_1fr_1fr_80px_auto]"
      >
        <input name="name" required placeholder="分类名称" className="input-shop !py-2 text-sm" />
        <input name="nameEn" placeholder="Name (EN)" className="input-shop !py-2 text-sm" />
        <input name="slug" placeholder="slug（留空自动生成）" className="input-shop !py-2 text-sm" />
        <input name="order" type="number" defaultValue={0} className="input-shop !py-2 text-sm" />
        <button className="rounded-full bg-[#1a1a1a] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#333333]">
          + 新建
        </button>
      </form>

      <div className="overflow-hidden rounded-xl border border-[#e8e8e4] bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#eee] text-left text-xs uppercase tracking-wider text-[#8a8a86]">
              <th className="px-5 py-3 font-medium">名称</th>
              <th className="px-5 py-3 font-medium">英文名</th>
              <th className="px-5 py-3 font-medium">Slug</th>
              <th className="px-5 py-3 font-medium">商品数</th>
              <th className="px-5 py-3 text-right font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <CategoryRow
                key={c.id}
                category={{
                  id: c.id,
                  name: c.name,
                  nameEn: c.nameEn,
                  slug: c.slug,
                  order: c.order,
                }}
                productCount={c._count.products}
              />
            ))}
            {categories.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-[#a0a09b]">
                  暂无分类
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
