"use client";

import { useActionState, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Lock } from "lucide-react";
import { useCart } from "@/components/cart/cart-context";
import { placeOrderAction } from "@/actions/store";
import { PayPalCheckout, isPayPalEnabled, type PayPalOrderPayload } from "@/components/store/paypal-checkout";
import { Link } from "@/i18n/navigation";
import { formatPrice } from "@/lib/format";
import { FREE_SHIPPING_THRESHOLD, SHIPPING_METHODS, PAYMENT_METHODS } from "@/lib/constants";
import { ImageWithFallback } from "@/components/store/image-with-fallback";
import { cn } from "@/lib/utils";

export function CheckoutForm({ locale }: { locale: "zh" | "en" }) {
  const t = useTranslations("Checkout");
  const { items, subtotal } = useCart();
  const [shippingId, setShippingId] = useState<string>("standard");
  const [payment, setPayment] = useState<string>(PAYMENT_METHODS[0]);
  const [state, formAction, pending] = useActionState(placeOrderAction, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  // PayPal 支付：从当前表单字段收集结账数据，交给 /api/paypal/create-order
  const paypalEnabled = isPayPalEnabled();
  const isPaypal = payment === "PayPal";
  const getPayPalPayload = (): PayPalOrderPayload | { error: string } => {
    const form = formRef.current;
    if (!form) return { error: "表单未就绪" };
    const fd = new FormData(form);
    const required = ["customerName", "customerEmail", "phone", "province", "city", "address"];
    for (const key of required) {
      if (!String(fd.get(key) ?? "").trim()) return { error: t("fillForm") };
    }
    return {
      customerName: String(fd.get("customerName")),
      customerEmail: String(fd.get("customerEmail")),
      phone: String(fd.get("phone")),
      province: String(fd.get("province")),
      city: String(fd.get("city")),
      address: String(fd.get("address")),
      postalCode: String(fd.get("postalCode") ?? "") || undefined,
      shippingMethod: shippingId,
      items: items.map((it) => ({
        productId: it.productId,
        quantity: it.quantity,
        variant: it.variant,
      })),
    };
  };

  const freeShipping = subtotal >= FREE_SHIPPING_THRESHOLD;
  const shippingFee = useMemo(() => {
    const m = SHIPPING_METHODS.find((s) => s.id === shippingId)!;
    return shippingId === "standard" && freeShipping ? 0 : m.fee;
  }, [shippingId, freeShipping]);

  if (items.length === 0) {
    return (
      <div className="py-24 text-center">
        <p className="text-muted">{t("items")} — 0</p>
        <Link href="/products" className="btn-primary mt-6">
          {t("backToCart")}
        </Link>
      </div>
    );
  }

  const itemsJson = JSON.stringify(
    items.map((it) => ({
      productId: it.productId,
      quantity: it.quantity,
      variant: it.variant,
    }))
  );

  return (
    <div className="grid gap-12 lg:grid-cols-[1fr_400px]">
      {/* 左侧表单 */}
      <form ref={formRef} action={formAction} className="space-y-10">
        <input type="hidden" name="items" value={itemsJson} />
        <input type="hidden" name="shippingMethod" value={shippingId} />
        <input type="hidden" name="paymentMethod" value={payment} />

        {/* 联系方式 */}
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest">
            1 · {t("contact")}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label-shop">{t("fullName")}</label>
              <input name="customerName" required className="input-shop" />
            </div>
            <div>
              <label className="label-shop">{t("email")}</label>
              <input name="customerEmail" type="email" required className="input-shop" />
            </div>
            <div className="sm:col-span-2">
              <label className="label-shop">{t("phone")}</label>
              <input name="phone" type="tel" required className="input-shop" />
            </div>
          </div>
        </section>

        {/* 收货地址 */}
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest">
            2 · {t("shippingAddress")}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label-shop">{t("province")}</label>
              <input name="province" required className="input-shop" />
            </div>
            <div>
              <label className="label-shop">{t("city")}</label>
              <input name="city" required className="input-shop" />
            </div>
            <div className="sm:col-span-2">
              <label className="label-shop">{t("address")}</label>
              <input name="address" required className="input-shop" />
            </div>
            <div>
              <label className="label-shop">{t("postal")}</label>
              <input name="postalCode" className="input-shop" />
            </div>
          </div>
        </section>

        {/* 配送方式 */}
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest">
            3 · {t("shippingMethod")}
          </h2>
          <div className="space-y-3">
            {SHIPPING_METHODS.map((m) => {
              const fee = m.id === "standard" && freeShipping ? 0 : m.fee;
              const active = shippingId === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setShippingId(m.id)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl border p-4 text-left transition-all duration-200",
                    active
                      ? "border-foreground bg-surface"
                      : "border-border hover:border-foreground/40"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "flex h-4 w-4 items-center justify-center rounded-full border",
                        active ? "border-foreground" : "border-border"
                      )}
                    >
                      {active && <span className="h-2 w-2 rounded-full bg-foreground" />}
                    </span>
                    <div>
                      <p className="text-sm font-medium">
                        {locale === "en" ? m.nameEn : m.name}
                      </p>
                      <p className="text-xs text-muted">
                        {locale === "en" ? m.etaEn : m.eta}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-medium">
                    {fee === 0 ? "免费" : formatPrice(fee, locale)}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* 支付方式 */}
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest">
            4 · {t("paymentMethod")}
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {PAYMENT_METHODS.map((m) => {
              const isPayPalOption = m === "PayPal";
              // PayPal 未配置时隐藏入口，避免出现点不了的选项
              if (isPayPalOption && !paypalEnabled) return null;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPayment(m)}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-xl border p-4 text-sm transition-all duration-200",
                    payment === m
                      ? "border-foreground bg-surface font-medium"
                      : "border-border text-muted hover:border-foreground/40"
                  )}
                >
                  {isPayPalOption ? (
                    <span className="flex items-center gap-1.5">
                      <span className="font-bold italic">Pay</span>
                      <span className="font-bold">Pal</span>
                    </span>
                  ) : (
                    m.replace("模拟支付 · ", "")
                  )}
                </button>
              );
            })}
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-xs text-muted">
            <Lock size={12} /> {t("secure")}
          </p>
        </section>

        {state?.error && (
          <p className="rounded-lg bg-sale/5 px-4 py-3 text-sm text-sale">
            {state.error}
          </p>
        )}

        {isPaypal ? (
          // PayPal 两阶段支付：授权弹窗代替提交按钮
          <PayPalCheckout getPayload={getPayPalPayload} />
        ) : (
          <button type="submit" disabled={pending} className="btn-primary w-full !py-4 text-base">
            {pending ? (
              <>
                <Loader2 size={18} className="animate-spin" /> {t("processing")}
              </>
            ) : (
              t("placeOrder")
            )}
          </button>
        )}
      </form>

      {/* 右侧摘要 */}
      <aside className="h-fit rounded-xl border border-border p-6 lg:sticky lg:top-28">
        <h2 className="mb-5 text-sm font-semibold uppercase tracking-widest">
          {t("orderSummary")}
        </h2>
        <ul className="space-y-4">
          {items.map((it) => (
            <li key={`${it.productId}::${it.variant ?? ""}`} className="flex items-center gap-3">
              <div className="relative h-16 w-14 shrink-0 overflow-hidden rounded-md bg-surface">
                <ImageWithFallback src={it.image} alt={it.title} fill className="object-cover" sizes="56px" />
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-[10px] text-white">
                  {it.quantity}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{it.title}</p>
                {it.variant && <p className="text-xs text-muted">{it.variant}</p>}
              </div>
              <span className="text-sm font-medium">
                {formatPrice(it.price * it.quantity, locale)}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-6 space-y-2 border-t border-border pt-4 text-sm">
          <div className="flex justify-between text-muted">
            <span>{t("items")}</span>
            <span>{formatPrice(subtotal, locale)}</span>
          </div>
          <div className="flex justify-between text-muted">
            <span>{t("shipping")}</span>
            <span>{shippingFee === 0 ? "—" : formatPrice(shippingFee, locale)}</span>
          </div>
          <div className="flex justify-between pt-2 text-base font-semibold">
            <span>{t("total")}</span>
            <span>{formatPrice(subtotal + shippingFee, locale)}</span>
          </div>
        </div>
      </aside>
    </div>
  );
}
