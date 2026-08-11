import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { Link } from "@/i18n/navigation";
import { ProductCard, type CardProduct } from "@/components/store/product-card";
import { NewsletterForm } from "@/components/store/newsletter-form";
import { ImageWithFallback } from "@/components/store/image-with-fallback";
import { parseImages } from "@/lib/utils";

const HERO_IMG =
  "https://images.unsplash.com/photo-1484101403633-562f891dc89a?auto=format&fit=crop&w=1600&q=80";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const loc = locale as "zh" | "en";
  setRequestLocale(locale);

  const t = await getTranslations("Home");

  const [featured, newest, categories] = await Promise.all([
    prisma.product.findMany({
      where: { active: true, featured: true },
      take: 8,
      orderBy: { createdAt: "desc" },
    }),
    prisma.product.findMany({
      where: { active: true },
      take: 8,
      orderBy: { createdAt: "desc" },
    }),
    prisma.category.findMany({
      orderBy: { order: "asc" },
      include: {
        products: {
          where: { active: true },
          take: 1,
          select: { images: true },
        },
      },
    }),
  ]);

  const toCard = (p: {
    id: string;
    slug: string;
    title: string;
    titleEn: string | null;
    price: number;
    compareAtPrice: number | null;
    stock: number;
    images: string;
  }): CardProduct => p;

  return (
    <>
      {/* ============ Hero ============ */}
      <section className="relative overflow-hidden bg-foreground">
        <div className="absolute inset-0">
          <ImageWithFallback
            src={HERO_IMG}
            alt="LUMEN hero"
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-90"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
        </div>
        <div className="container-shop relative flex min-h-[72vh] items-center py-24">
          <div className="max-w-xl animate-fade-up">
            <p className="mb-4 text-xs font-medium uppercase tracking-[0.35em] text-white/70">
              {t("categoriesSubtitle")}
            </p>
            <h1 className="text-4xl font-light leading-tight text-white sm:text-5xl lg:text-6xl">
              {t("heroTitle")}
            </h1>
            <p className="mt-6 max-w-md text-base leading-relaxed text-white/80">
              {t("heroSubtitle")}
            </p>
            <Link href="/products" className="btn-primary mt-10 !bg-white !text-foreground hover:!bg-white/90">
              {t("heroCta")}
            </Link>
          </div>
        </div>
      </section>

      {/* ============ 品类 ============ */}
      <section className="container-shop py-20">
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-light tracking-wide sm:text-3xl">
            {t("categoriesTitle")}
          </h2>
          <p className="mt-2 text-sm text-muted">{t("categoriesSubtitle")}</p>
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {categories.slice(0, 8).map((cat) => {
            const img = cat.products[0]
              ? parseImages(cat.products[0].images)[0]
              : "";
            const name = loc === "en" && cat.nameEn ? cat.nameEn : cat.name;
            return (
              <Link
                key={cat.id}
                href={`/products?category=${cat.slug}`}
                className="group relative block aspect-[3/4] overflow-hidden rounded-xl bg-surface"
              >
                <ImageWithFallback
                  src={img}
                  alt={name}
                  fill
                  sizes="(min-width: 1024px) 25vw, 50vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5">
                  <p className="text-lg font-light tracking-wide text-white">
                    {name}
                  </p>
                  <p className="mt-1 text-xs tracking-widest text-white/70 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    {t("shopNow")} →
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ============ 精选 ============ */}
      <section className="bg-surface/50 py-20">
        <div className="container-shop">
          <div className="mb-10 flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-light tracking-wide sm:text-3xl">
                {t("featuredTitle")}
              </h2>
              <p className="mt-2 text-sm text-muted">{t("featuredSubtitle")}</p>
            </div>
            <Link
              href="/products?sort=featured"
              className="hidden text-sm text-muted underline-offset-4 hover:underline sm:block"
            >
              {t("viewAll")} →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4">
            {featured.map((p) => (
              <ProductCard key={p.id} product={toCard(p)} locale={loc} />
            ))}
          </div>
        </div>
      </section>

      {/* ============ 新品 ============ */}
      <section className="container-shop py-20">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-light tracking-wide sm:text-3xl">
              {t("newTitle")}
            </h2>
            <p className="mt-2 text-sm text-muted">{t("newSubtitle")}</p>
          </div>
          <Link
            href="/products?sort=newest"
            className="hidden text-sm text-muted underline-offset-4 hover:underline sm:block"
          >
            {t("viewAll")} →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4">
          {newest.map((p) => (
            <ProductCard key={p.id} product={toCard(p)} locale={loc} />
          ))}
        </div>
      </section>

      {/* ============ 品牌故事 ============ */}
      <section id="story" className="container-shop grid items-center gap-12 pb-20 lg:grid-cols-2">
        <div className="relative aspect-[4/3] overflow-hidden rounded-xl">
          <ImageWithFallback
            src="https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=1200&q=80"
            alt="LUMEN story"
            fill
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover"
          />
        </div>
        <div>
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.3em] text-muted">
            LUMEN · {t("storyTitle")}
          </p>
          <h2 className="text-3xl font-light leading-snug sm:text-4xl">
            {t("storyBody1")}
          </h2>
          <p className="mt-6 leading-relaxed text-muted">{t("storyBody2")}</p>
          <Link href="/products" className="btn-outline mt-8">
            {t("storyCta")}
          </Link>
        </div>
      </section>

      {/* ============ 订阅 ============ */}
      <section className="border-t border-border bg-surface/60 py-16">
        <div className="container-shop flex flex-col items-center text-center">
          <h2 className="text-2xl font-light tracking-wide">
            {t("newsletterTitle")}
          </h2>
          <p className="mb-8 mt-3 max-w-md text-sm text-muted">
            {t("newsletterSubtitle")}
          </p>
          <NewsletterForm
            placeholder={t("newsletterPlaceholder")}
            button={t("newsletterButton")}
            successText={t("newsletterSuccess")}
          />
        </div>
      </section>
    </>
  );
}
