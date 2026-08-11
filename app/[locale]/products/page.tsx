import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { Link } from "@/i18n/navigation";
import { ProductCard, type CardProduct } from "@/components/store/product-card";
import { PriceFilter } from "@/components/store/price-filter";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 12;
const SORTS = ["featured", "newest", "price-asc", "price-desc"] as const;

export const metadata: Metadata = { title: "全部商品" };

export default async function ProductsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  const loc = locale as "zh" | "en";
  setRequestLocale(locale);
  const sp = await searchParams;
  const t = await getTranslations("Products");

  const get = (key: string) => {
    const v = sp[key];
    return Array.isArray(v) ? v[0] : v;
  };
  const category = get("category") || "";
  const q = get("q")?.trim() || "";
  const sort = (get("sort") as (typeof SORTS)[number]) || "featured";
  const min = get("min") ? Number(get("min")) : undefined;
  const max = get("max") ? Number(get("max")) : undefined;
  const page = Math.max(1, Number(get("page")) || 1);

  const where: Prisma.ProductWhereInput = { active: true };
  if (category) where.category = { is: { slug: category } };
  if (q) {
    where.OR = [
      { title: { contains: q } },
      { titleEn: { contains: q } },
      { description: { contains: q } },
    ];
  }
  if (min !== undefined || max !== undefined) {
    where.price = {};
    if (min !== undefined) where.price.gte = min;
    if (max !== undefined) where.price.lte = max;
  }

  const orderBy: Prisma.ProductOrderByWithRelationInput =
    sort === "newest"
      ? { createdAt: "desc" }
      : sort === "price-asc"
        ? { price: "asc" }
        : sort === "price-desc"
          ? { price: "desc" }
          : { featured: "desc" };

  const [products, total, categories] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.product.count({ where }),
    prisma.category.findMany({
      orderBy: { order: "asc" },
      include: { _count: { select: { products: { where: { active: true } } } } },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const catName = (slug: string) => {
    const c = categories.find((x) => x.slug === slug);
    return c ? (loc === "en" && c.nameEn ? c.nameEn : c.name) : "";
  };

  // 构建带查询参数的链接
  const buildHref = (overrides: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) {
      if (typeof v === "string") p.set(k, v);
    }
    for (const [k, v] of Object.entries(overrides)) {
      if (v === undefined || v === "") p.delete(k);
      else p.set(k, String(v));
    }
    const qs = p.toString();
    return qs ? `/products?${qs}` : "/products";
  };

  return (
    <div className="container-shop py-12">
      {/* 页头 */}
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-light tracking-wide">
          {category ? catName(category) : t("title")}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {total} {t("results")}
        </p>
      </div>

      <div className="grid gap-10 lg:grid-cols-[240px_1fr]">
        {/* ===== 筛选栏 ===== */}
        <aside className="space-y-8 lg:sticky lg:top-28 lg:self-start">
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-foreground">
              {t("category")}
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href={buildHref({ category: undefined, page: 1 })}
                  className={cn(
                    "transition-colors",
                    !category ? "font-medium text-foreground" : "text-muted hover:text-foreground"
                  )}
                >
                  {t("all")}
                </Link>
              </li>
              {categories.map((c) => {
                const name = loc === "en" && c.nameEn ? c.nameEn : c.name;
                return (
                  <li key={c.id}>
                    <Link
                      href={buildHref({ category: c.slug, page: 1 })}
                      className={cn(
                        "flex items-center justify-between transition-colors",
                        category === c.slug
                          ? "font-medium text-foreground"
                          : "text-muted hover:text-foreground"
                      )}
                    >
                      {name}
                      <span className="text-xs text-muted/60">
                        {c._count.products}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          <PriceFilter
            min={min}
            max={max}
            labels={{ min: t("min"), max: t("max"), apply: t("apply") }}
          />

          {(category || q || min !== undefined || max !== undefined) && (
            <Link
              href="/products"
              className="text-sm text-muted underline-offset-4 hover:underline"
            >
              ✕ {t("clear")}
            </Link>
          )}
        </aside>

        {/* ===== 商品区 ===== */}
        <div>
          {/* 排序 */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
            <div className="flex flex-wrap gap-2">
              {SORTS.map((s) => (
                <Link
                  key={s}
                  href={buildHref({ sort: s === "featured" ? undefined : s, page: 1 })}
                  className={cn(
                    "rounded-full border px-4 py-1.5 text-xs transition-all duration-200",
                    sort === s
                      ? "border-foreground bg-foreground text-white"
                      : "border-border text-muted hover:border-foreground/50 hover:text-foreground"
                  )}
                >
                  {t(s)}
                </Link>
              ))}
            </div>
          </div>

          {products.length === 0 ? (
            <div className="py-24 text-center">
              <p className="text-muted">{t("noProducts")}</p>
              <Link href="/products" className="btn-outline mt-6">
                {t("clear")}
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((p) => (
                <ProductCard key={p.id} product={p as CardProduct} locale={loc} />
              ))}
            </div>
          )}

          {/* 分页 */}
          {totalPages > 1 && (
            <nav className="mt-14 flex items-center justify-center gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <Link
                  key={n}
                  href={buildHref({ page: n === 1 ? undefined : n })}
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full border text-sm transition-all",
                    n === page
                      ? "border-foreground bg-foreground text-white"
                      : "border-border text-muted hover:border-foreground/50 hover:text-foreground"
                  )}
                >
                  {n}
                </Link>
              ))}
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}
