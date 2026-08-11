"use client";

import { useMemo, useState, useTransition } from "react";
import { Heart, Minus, Plus, ShoppingBag, Zap } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCart } from "@/components/cart/cart-context";
import { useRouter } from "@/i18n/navigation";
import { toggleWishlistAction } from "@/actions/store";
import { cn } from "@/lib/utils";

type BuyBoxVariant = {
  name: string;
  nameEn: string;
  value: string;
  valueEn: string;
};

export type BuyBoxProduct = {
  id: string;
  slug: string;
  title: string;
  price: number;
  stock: number;
  image: string;
  variants: BuyBoxVariant[];
};

export function ProductBuyBox({
  product,
  locale,
  inWishlist,
}: {
  product: BuyBoxProduct;
  locale: "zh" | "en";
  inWishlist: boolean;
}) {
  const t = useTranslations("ProductDetail");
  const { addItem } = useCart();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [quantity, setQuantity] = useState(1);

  const groups = useMemo(() => {
    const map = new Map<string, BuyBoxVariant[]>();
    for (const v of product.variants) {
      const key = locale === "en" && v.nameEn ? v.nameEn : v.name;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(v);
    }
    return Array.from(map.entries());
  }, [product.variants, locale]);

  const [selection, setSelection] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    const map = new Map<string, BuyBoxVariant[]>();
    for (const v of product.variants) {
      const key = locale === "en" && v.nameEn ? v.nameEn : v.name;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(v);
    }
    map.forEach((list, name) => {
      init[name] = list[0].valueEn || list[0].value;
    });
    return init;
  });

  const variantLabel = Object.values(selection).join(" / ");
  const soldOut = product.stock <= 0;

  const handleAdd = () => {
    addItem({
      productId: product.id,
      slug: product.slug,
      title: product.title,
      image: product.image,
      price: product.price,
      quantity,
      variant: variantLabel,
    });
  };

  const handleBuyNow = () => {
    handleAdd();
    router.push("/checkout");
  };

  const handleWishlist = () => {
    startTransition(async () => {
      await toggleWishlistAction(product.id);
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      {groups.map(([groupName, options]) => (
        <div key={groupName}>
          <p className="label-shop">
            {groupName}
            <span className="ml-2 normal-case text-foreground/70">
              {selection[groupName]}
            </span>
          </p>
          <div className="flex flex-wrap gap-2">
            {options.map((opt) => {
              const val = opt.valueEn || opt.value;
              const selected = selection[groupName] === val;
              return (
                <button
                  key={`${groupName}-${opt.value}`}
                  type="button"
                  onClick={() =>
                    setSelection((s) => ({ ...s, [groupName]: val }))
                  }
                  className={cn(
                    "rounded-full border px-4 py-2 text-sm transition-all duration-200",
                    selected
                      ? "border-foreground bg-foreground text-white"
                      : "border-border hover:border-foreground/50"
                  )}
                >
                  {locale === "en" && opt.valueEn ? opt.valueEn : opt.value}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* 数量 */}
      <div>
        <p className="label-shop">{t("quantity")}</p>
        <div className="inline-flex items-center rounded-full border border-border">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="p-3 text-muted transition-colors hover:text-foreground"
            aria-label="decrease"
          >
            <Minus size={16} />
          </button>
          <span className="w-12 text-center font-medium">{quantity}</span>
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.min(99, q + 1))}
            className="p-3 text-muted transition-colors hover:text-foreground"
            aria-label="increase"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      {/* 操作 */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleAdd}
          disabled={soldOut}
          className="btn-primary flex-1"
        >
          <ShoppingBag size={16} />
          {soldOut ? t("outOfStock") : t("addToCart")}
        </button>
        <button
          onClick={handleBuyNow}
          disabled={soldOut}
          className="btn-outline flex-1"
        >
          <Zap size={16} />
          {t("buyNow")}
        </button>
        <button
          onClick={handleWishlist}
          disabled={isPending}
          aria-label={inWishlist ? t("wishlistRemove") : t("wishlistAdd")}
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition-all duration-300",
            inWishlist
              ? "border-sale bg-sale/5 text-sale"
              : "border-border hover:border-sale hover:text-sale"
          )}
        >
          <Heart size={18} fill={inWishlist ? "currentColor" : "none"} />
        </button>
      </div>

      {product.stock > 0 && product.stock <= 10 && (
        <p className="text-xs text-sale">仅剩 {product.stock} 件</p>
      )}
    </div>
  );
}
