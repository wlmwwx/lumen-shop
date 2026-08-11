import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { ProductForm } from "@/components/admin/product-form";

export const metadata = { title: "编辑商品" };

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [product, categories] = await Promise.all([
    prisma.product.findUnique({ where: { id }, include: { variants: true } }),
    prisma.category.findMany({
      orderBy: { order: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  if (!product) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/admin/products" className="text-sm text-[#8a8a86] hover:text-[#1a1a1a]">
          ← 返回商品列表
        </Link>
        <h1 className="mt-2 text-2xl font-light tracking-wide">
          编辑：{product.title}
        </h1>
      </div>
      <ProductForm
        categories={categories}
        initial={{
          id: product.id,
          title: product.title,
          titleEn: product.titleEn ?? "",
          slug: product.slug,
          description: product.description,
          descriptionEn: product.descriptionEn ?? "",
          price: product.price,
          compareAtPrice: product.compareAtPrice,
          stock: product.stock,
          images: product.images,
          categoryId: product.categoryId,
          featured: product.featured,
          active: product.active,
          variants: product.variants.map((v) => ({
            id: v.id,
            name: v.name,
            nameEn: v.nameEn ?? "",
            value: v.value,
            valueEn: v.valueEn ?? "",
          })),
        }}
      />
    </div>
  );
}
