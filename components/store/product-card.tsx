import { Link } from "@/i18n/navigation";
import { ImageWithFallback } from "@/components/store/image-with-fallback";
import { CardAddButton } from "@/components/store/card-add-button";
import { formatPrice } from "@/lib/format";
import { parseImages } from "@/lib/utils";

export type CardProduct = {
  id: string;
  slug: string;
  title: string;
  titleEn: string | null;
  price: number;
  compareAtPrice: number | null;
  stock: number;
  images: string;
};

export function ProductCard({
  product,
  locale,
}: {
  product: CardProduct;
  locale: "zh" | "en";
}) {
  const images = parseImages(product.images);
  const title = locale === "en" && product.titleEn ? product.titleEn : product.title;
  const onSale =
    product.compareAtPrice != null && product.compareAtPrice > product.price;
  const discount = onSale
    ? Math.round((1 - product.price / (product.compareAtPrice as number)) * 100)
    : 0;
  const soldOut = product.stock <= 0;

  return (
    <div className="group relative">
      <Link
        href={`/products/${product.slug}`}
        className="relative block overflow-hidden rounded-lg bg-surface"
      >
        <div className="relative aspect-[4/5] overflow-hidden">
          <ImageWithFallback
            src={images[0]}
            alt={title}
            fill
            sizes="(min-width: 1024px) 25vw, 50vw"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
          />
          {images[1] && (
            <ImageWithFallback
              src={images[1]}
              alt=""
              fill
              sizes="(min-width: 1024px) 25vw, 50vw"
              className="absolute inset-0 object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
            />
          )}
        </div>
        {onSale && (
          <span className="absolute left-3 top-3 rounded-full bg-sale px-2.5 py-1 text-[11px] font-medium tracking-wide text-white">
            -{discount}%
          </span>
        )}
        {soldOut && (
          <span className="absolute right-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-medium tracking-wide text-foreground">
            Sold out
          </span>
        )}
      </Link>

      <div className="mt-3 flex items-start justify-between gap-2 px-0.5">
        <div className="min-w-0">
          <Link
            href={`/products/${product.slug}`}
            className="block truncate text-sm font-medium text-foreground transition-colors hover:text-muted"
          >
            {title}
          </Link>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-sm font-semibold">
              {formatPrice(product.price, locale)}
            </span>
            {onSale && (
              <span className="text-xs text-muted line-through">
                {formatPrice(product.compareAtPrice as number, locale)}
              </span>
            )}
          </div>
        </div>
        {!soldOut && <CardAddButton product={product} title={title} locale={locale} />}
      </div>
    </div>
  );
}
