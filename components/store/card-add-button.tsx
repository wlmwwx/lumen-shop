"use client";

import { Plus } from "lucide-react";
import { useCart } from "@/components/cart/cart-context";
import { parseImages } from "@/lib/utils";
import type { CardProduct } from "@/components/store/product-card";

export function CardAddButton({
  product,
  title,
  locale,
}: {
  product: CardProduct;
  title: string;
  locale: "zh" | "en";
}) {
  const { addItem } = useCart();

  return (
    <button
      type="button"
      aria-label={`Add ${title} to cart`}
      onClick={() =>
        addItem({
          productId: product.id,
          slug: product.slug,
          title,
          image: parseImages(product.images)[0] ?? "",
          price: product.price,
        })
      }
      className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border text-foreground opacity-100 transition-all duration-300 hover:bg-foreground hover:text-white sm:opacity-0 sm:group-hover:opacity-100"
    >
      <Plus size={16} />
    </button>
  );
}
