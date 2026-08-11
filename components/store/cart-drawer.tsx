"use client";

import { useEffect } from "react";
import Image from "next/image";
import { X, Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCart } from "@/components/cart/cart-context";
import { Link } from "@/i18n/navigation";
import { formatPrice } from "@/lib/format";
import { FREE_SHIPPING_THRESHOLD } from "@/lib/constants";
import { ImageWithFallback } from "@/components/store/image-with-fallback";

export function CartDrawer({ locale }: { locale: "zh" | "en" }) {
  const t = useTranslations("Cart");
  const { items, subtotal, isOpen, closeCart, updateQuantity, removeItem } =
    useCart();

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const progress = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100);

  return (
    <div className="fixed inset-0 z-[90]" aria-modal="true">
      {/* 遮罩 */}
      <button
        aria-label="Close"
        className="absolute inset-0 bg-black/30 backdrop-blur-[2px] animate-[fade-in_0.2s_ease]"
        onClick={closeCart}
      />
      {/* 抽屉 */}
      <aside className="animate-slide-in-right absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-border px-6 py-5">
          <h2 className="text-lg font-medium tracking-wide">{t("title")}</h2>
          <button
            onClick={closeCart}
            className="rounded-full p-2 transition-colors hover:bg-surface"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </header>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <ShoppingBag size={40} className="text-border" strokeWidth={1} />
            <p className="text-sm text-muted">{t("empty")}</p>
            <Link href="/products" onClick={closeCart} className="btn-primary mt-2">
              {t("emptyCta")}
            </Link>
          </div>
        ) : (
          <>
            {/* 免邮进度 */}
            <div className="border-b border-border px-6 py-3">
              {remaining > 0 ? (
                <p className="text-xs text-muted">
                  {t("freeShippingProgress", { amount: formatPrice(remaining, locale) })}
                </p>
              ) : (
                <p className="text-xs font-medium text-foreground">
                  {t("freeShippingProgress", { amount: formatPrice(0, locale) })}
                </p>
              )}
              <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-surface">
                <div
                  className="h-full rounded-full bg-foreground transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <ul className="flex-1 overflow-y-auto px-6 py-4">
              {items.map((it) => (
                <li
                  key={`${it.productId}::${it.variant ?? ""}`}
                  className="flex gap-4 border-b border-border/60 py-4 last:border-0"
                >
                  <Link
                    href={`/products/${it.slug}`}
                    onClick={closeCart}
                    className="block h-20 w-20 shrink-0 overflow-hidden rounded-md bg-surface"
                  >
                    <ImageWithFallback
                      src={it.image}
                      alt={it.title}
                      width={80}
                      height={80}
                      className="h-full w-full object-cover"
                    />
                  </Link>
                  <div className="flex flex-1 flex-col justify-between">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Link
                          href={`/products/${it.slug}`}
                          onClick={closeCart}
                          className="text-sm font-medium leading-snug hover:underline"
                        >
                          {it.title}
                        </Link>
                        {it.variant && (
                          <p className="mt-0.5 text-xs text-muted">{it.variant}</p>
                        )}
                      </div>
                      <button
                        onClick={() => removeItem(it.productId, it.variant)}
                        className="p-1 text-muted transition-colors hover:text-sale"
                        aria-label={t("remove")}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="inline-flex items-center rounded-full border border-border">
                        <button
                          onClick={() =>
                            updateQuantity(it.productId, it.quantity - 1, it.variant)
                          }
                          className="p-1.5 text-muted hover:text-foreground"
                          aria-label="decrease"
                        >
                          <Minus size={13} />
                        </button>
                        <span className="w-8 text-center text-sm">{it.quantity}</span>
                        <button
                          onClick={() =>
                            updateQuantity(it.productId, it.quantity + 1, it.variant)
                          }
                          className="p-1.5 text-muted hover:text-foreground"
                          aria-label="increase"
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                      <p className="text-sm font-medium">
                        {formatPrice(it.price * it.quantity, locale)}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <footer className="border-t border-border px-6 py-5">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm text-muted">{t("total")}</span>
                <span className="text-xl font-medium">
                  {formatPrice(subtotal, locale)}
                </span>
              </div>
              <Link
                href="/checkout"
                onClick={closeCart}
                className="btn-primary w-full"
              >
                {t("checkout")}
              </Link>
              <button
                onClick={closeCart}
                className="mt-3 w-full text-center text-sm text-muted underline-offset-4 hover:underline"
              >
                {t("continueShopping")}
              </button>
            </footer>
          </>
        )}
      </aside>
    </div>
  );
}
