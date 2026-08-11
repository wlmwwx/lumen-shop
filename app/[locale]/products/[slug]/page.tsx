import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Star } from "lucide-react";
import { prisma } from "@/lib/db";
import { Link } from "@/i18n/navigation";
import { getSessionUser } from "@/lib/auth";
import { ProductGallery } from "@/components/store/product-gallery";
import { ProductBuyBox } from "@/components/store/product-buy-box";
import { ProductCard, type CardProduct } from "@/components/store/product-card";
import { ReviewForm } from "@/components/store/review-form";
import { ImageWithFallback } from "@/components/store/image-with-fallback";
import { formatPrice } from "@/lib/format";
import { parseImages } from "@/lib/utils";
import { cn } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}): Promise<Metadata> {
  const { slug, locale } = await params;
  const product = await prisma.product.findUnique({ where: { slug } });
  if (!product) return { title: "未找到商品" };
  const title =
    locale === "en" && product.titleEn ? product.titleEn : product.title;
  return { title, description: product.description };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}) {
  const { slug, locale } = await params;
  const loc = locale as "zh" | "en";
  setRequestLocale(locale);
  const t = await getTranslations("ProductDetail");

  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      category: true,
      variants: true,
      reviews: { include: { user: true }, orderBy: { createdAt: "desc" } },
      wishlistItems: true,
    },
  });
  if (!product || !product.active) notFound();

  const user = await getSessionUser();
  const images = parseImages(product.images);
  const title = loc === "en" && product.titleEn ? product.titleEn : product.title;
  const description =
    loc === "en" && product.descriptionEn
      ? product.descriptionEn
      : product.description;
  const onSale =
    product.compareAtPrice != null && product.compareAtPrice > product.price;

  const avg =
    product.reviews.length > 0
      ? product.reviews.reduce((s, r) => s + r.rating, 0) / product.reviews.length
      : 0;

  const [related] = await Promise.all([
    prisma.product.findMany({
      where: {
        active: true,
        categoryId: product.categoryId,
        id: { not: product.id },
      },
      take: 4,
    }),
  ]);

  const isWishlisted = user
    ? product.wishlistItems.some((w) => w.userId === user.id)
    : false;

  return (
    <div className="container-shop py-10">
      {/* 面包屑 */}
      <nav className="mb-8 flex items-center gap-2 text-xs text-muted">
        <Link href="/" className="hover:text-foreground">Home</Link>
        <span>/</span>
        {product.category && (
          <>
            <Link
              href={`/products?category=${product.category.slug}`}
              className="hover:text-foreground"
            >
              {loc === "en" && product.category.nameEn
                ? product.category.nameEn
                : product.category.name}
            </Link>
            <span>/</span>
          </>
        )}
        <span className="truncate text-foreground">{title}</span>
      </nav>

      <div className="grid gap-12 lg:grid-cols-2">
        {/* 画廊 */}
        <ProductGallery images={images} title={title} />

        {/* 信息 */}
        <div>
          <h1 className="text-3xl font-light leading-snug sm:text-4xl">{title}</h1>

          {/* 评分概览 */}
          {product.reviews.length > 0 && (
            <div className="mt-4 flex items-center gap-2 text-sm">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    size={15}
                    className={cn(
                      n <= Math.round(avg) ? "fill-star text-star" : "text-border"
                    )}
                  />
                ))}
              </div>
              <span className="text-muted">
                {avg.toFixed(1)} · {product.reviews.length} {t("reviews")}
              </span>
            </div>
          )}

          <div className="mt-5 flex items-baseline gap-3">
            <span className="text-3xl font-medium">
              {formatPrice(product.price, loc)}
            </span>
            {onSale && (
              <span className="text-lg text-muted line-through">
                {formatPrice(product.compareAtPrice as number, loc)}
              </span>
            )}
          </div>

          <p
            className={cn(
              "mt-3 text-xs",
              product.stock > 0 ? "text-muted" : "text-sale"
            )}
          >
            {product.stock > 0 ? t("inStock", { count: product.stock }) : t("outOfStock")}
          </p>

          <div className="my-8 border-t border-border" />

          <ProductBuyBox
            product={{
              id: product.id,
              slug: product.slug,
              title,
              price: product.price,
              stock: product.stock,
              image: images[0] ?? "",
              variants: product.variants.map((v) => ({
                name: v.name,
                nameEn: v.nameEn || v.name,
                value: v.value,
                valueEn: v.valueEn || v.value,
              })),
            }}
            locale={loc}
            inWishlist={isWishlisted}
          />

          {/* 描述 */}
          <div className="mt-10">
            <h2 className="text-sm font-semibold uppercase tracking-widest">
              {t("description")}
            </h2>
            <p className="mt-4 whitespace-pre-line leading-relaxed text-muted">
              {description}
            </p>
          </div>
        </div>
      </div>

      {/* ===== 评价区 ===== */}
      <section id="reviews" className="mt-20 scroll-mt-28 border-t border-border pt-12">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-light tracking-wide">{t("reviews")}</h2>
            {product.reviews.length > 0 && (
              <p className="mt-2 text-sm text-muted">
                {t("average")}: {avg.toFixed(1)} / 5（{product.reviews.length}）
              </p>
            )}
          </div>
        </div>

        <div className="grid gap-10 lg:grid-cols-[360px_1fr]">
          {/* 写评价 */}
          <div>
            {user ? (
              <ReviewForm
                productId={product.id}
                slug={product.slug}
                loginToReview={t("loginToReview")}
                yourRating={t("yourRating")}
                placeholder={t("reviewPlaceholder")}
                submit={t("submit")}
              />
            ) : (
              <div className="rounded-xl border border-dashed border-border p-6 text-center">
                <p className="text-sm text-muted">{t("loginToReview")}</p>
                <Link href="/account" className="btn-outline mt-4 !py-2 text-xs">
                  {t("loginToReview")}
                </Link>
              </div>
            )}
          </div>

          {/* 评价列表 */}
          <div>
            {product.reviews.length === 0 ? (
              <p className="text-sm text-muted">{t("noReviews")}</p>
            ) : (
              <ul className="space-y-6">
                {product.reviews.map((r) => (
                  <li key={r.id} className="border-b border-border/60 pb-6 last:border-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-surface text-sm font-medium">
                          {r.user.name.slice(0, 1)}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{r.user.name}</p>
                          <div className="mt-0.5 flex">
                            {[1, 2, 3, 4, 5].map((n) => (
                              <Star
                                key={n}
                                size={12}
                                className={cn(
                                  n <= r.rating
                                    ? "fill-star text-star"
                                    : "text-border"
                                )}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs text-muted">
                        {new Intl.DateTimeFormat(locale === "en" ? "en-US" : "zh-CN", {
                          dateStyle: "medium",
                        }).format(r.createdAt)}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-foreground/80">
                      {r.comment}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      {/* ===== 相关推荐 ===== */}
      {related.length > 0 && (
        <section className="mt-20">
          <h2 className="mb-8 text-2xl font-light tracking-wide">{t("related")}</h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p as CardProduct} locale={loc} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
