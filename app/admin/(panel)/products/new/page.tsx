import Link from "next/link";
import { prisma } from "@/lib/db";
import { ProductForm } from "@/components/admin/product-form";

export const metadata = { title: "新建商品" };

export default async function NewProductPage() {
  const categories = await prisma.category.findMany({
    orderBy: { order: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/admin/products" className="text-sm text-[#8a8a86] hover:text-[#1a1a1a]">
          ← 返回商品列表
        </Link>
        <h1 className="mt-2 text-2xl font-light tracking-wide">新建商品</h1>
      </div>
      <ProductForm categories={categories} />
    </div>
  );
}
