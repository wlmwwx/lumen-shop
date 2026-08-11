import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Heart } from "lucide-react";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { Link } from "@/i18n/navigation";
import { ProductCard, type CardProduct } from "@/components/store/product-card";
import { WishlistRemoveButton } from "@/components/store/wishlist-remove-button";

export const metadata: Metadata = { title: "我的收藏" };

export default async function WishlistPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const loc = locale as "zh" | "en";
  setRequestLocale(locale);
  const t = await getTranslations("Wishlist");
  const user = await getSessionUser();
  if (!user) redirect("/account");

  const items = await prisma.wishlistItem.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { product: true },
  });

  return (
    <div className="container-shop py-12">
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-light tracking-wide">{t("title")}</h1>
        <p className="mt-2 text-sm text-muted">{items.length} items</p>
      </div>

      {items.length === 0 ? (
        <div className="py-16 text-center">
          <Heart size={40} className="mx-auto text-border" strokeWidth={1} />
          <p className="mt-4 text-sm text-muted">{t("empty")}</p>
          <Link href="/products" className="btn-primary mt-6">
            {t("emptyCta")}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4">
          {items.map((item) => (
            <div key={item.id} className="relative">
              <ProductCard product={item.product as CardProduct} locale={loc} />
              <div className="mt-2">
                <WishlistRemoveButton
                  productId={item.productId}
                  label={t("remove")}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
