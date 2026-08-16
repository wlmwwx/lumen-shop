import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckCircle2, Package, Truck, Clock, XCircle } from "lucide-react";
import { CopyButton } from "@/components/store/copy-button";
import { QuickReviewForm } from "@/components/store/quick-review-form";
import { ReviewSummary } from "@/components/store/review-summary";
import { getOrderReviewStats } from "@/lib/order-review";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { Link } from "@/i18n/navigation";
import { getSessionUser } from "@/lib/auth";
import { formatPrice } from "@/lib/format";
import { formatDateTime } from "@/lib/utils";
import { ORDER_STATUS_LABEL } from "@/lib/constants";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "订单详情" };

const STATUS_ICON: Record<string, typeof CheckCircle2> = {
  PENDING: Clock,
  PAID: CheckCircle2,
  SHIPPED: Truck,
  COMPLETED: Package,
  CANCELLED: XCircle,
};

export default async function OrderPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id, locale } = await params;
  const loc = locale as "zh" | "en";
  setRequestLocale(locale);
  const t = await getTranslations("Order");

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: { include: { product: { select: { slug: true } } } },
      user: true,
    },
  });
  if (!order) notFound();

  const user = await getSessionUser();
  if (order.userId && user && order.userId !== user.id) notFound();

  // 已完成订单：允许订单主人对购买的商品快捷评价（已评价的标记出来 + 评分汇总）
  const canReview =
    user && order.userId === user.id && order.status === "COMPLETED";
  const itemProductIds = order.items
    .map((it) => it.productId)
    .filter(Boolean) as string[];
  const { reviewedIds, reviewedCount, avgRating } = canReview
    ? await getOrderReviewStats(user.id, itemProductIds)
    : { reviewedIds: new Set<string>(), reviewedCount: 0, avgRating: 0 };

  const Icon = STATUS_ICON[order.status] ?? CheckCircle2;
  const statusLabel = ORDER_STATUS_LABEL[order.status];

  return (
    <div className="container-shop max-w-3xl py-12">
      {/* 成功横幅 */}
      <div className="mb-10 rounded-2xl bg-surface p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-foreground text-white">
          <CheckCircle2 size={28} />
        </div>
        <h1 className="text-2xl font-light">{t("thankYou")}</h1>
        <p className="mt-2 text-sm text-muted">{t("orderConfirmed")}</p>
        {!order.userId && (
          <p className="mt-2 text-xs text-muted">※ {t("guestNote")}</p>
        )}
      </div>

      {/* 订单信息卡 */}
      <div className="card-shop">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-5">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted">
              {t("orderNumber")}
            </p>
            <p className="mt-1 text-lg font-medium">{order.orderNumber}</p>
          </div>
          <div
            className={cn(
              "flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium",
              order.status === "CANCELLED"
                ? "bg-sale/10 text-sale"
                : "bg-foreground/5 text-foreground"
            )}
          >
            <Icon size={15} />
            {loc === "en" ? statusLabel.en : statusLabel.zh}
          </div>
        </div>

        <div className="grid gap-6 px-6 py-6 sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted">
              {t("placedAt")}
            </p>
            <p className="mt-1.5 text-sm">
              {formatDateTime(order.createdAt, locale)}
            </p>
            <p className="mt-4 text-xs uppercase tracking-widest text-muted">
              {t("paymentMethod")}
            </p>
            <p className="mt-1.5 text-sm">{order.paymentMethod}</p>
            {order.transactionId && (
              <>
                <p className="mt-3 text-xs uppercase tracking-widest text-muted">
                  {t("transactionId")}
                </p>
                <p className="mt-1.5 font-mono text-sm">{order.transactionId}</p>
              </>
            )}
            <p className="mt-4 text-xs uppercase tracking-widest text-muted">
              {t("shipping")}
            </p>
            <p className="mt-1.5 text-sm">{order.shippingMethod}</p>
            {(order.status === "SHIPPED" || order.status === "COMPLETED") &&
              order.trackingNumber && (
                <div className="mt-3">
                  <p className="text-xs uppercase tracking-widest text-muted">
                    {t("trackingNumber")}
                  </p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <code className="rounded-md bg-foreground/5 px-2 py-1 font-mono text-sm">
                      {order.trackingNumber}
                    </code>
                    <CopyButton
                      value={order.trackingNumber}
                      label={t("copy")}
                      copiedLabel={t("copied")}
                    />
                    {user && order.userId === user.id && (
                      <Link
                        href={`/order/${order.id}/tracking`}
                        className="text-xs text-muted underline-offset-4 hover:text-foreground hover:underline"
                      >
                        {t("trackOrder")} →
                      </Link>
                    )}
                  </div>
                </div>
              )}
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-muted">
              {t("shippingAddress")}
            </p>
            <div className="mt-1.5 space-y-1 text-sm">
              <p>
                {t("customerName")}: {order.customerName}
              </p>
              <p>
                {t("phone")}: {order.phone}
              </p>
              <p>
                {t("address")}: {order.province} {order.city} {order.address}
                {order.postalCode ? ` ${order.postalCode}` : ""}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 商品明细 */}
      <div className="card-shop mt-6">
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-sm font-semibold uppercase tracking-widest">
            {t("items")}
          </h2>
        </div>

        {/* 评分汇总（已完成订单 + 本人） */}
        {canReview && itemProductIds.length > 0 && (
          <div className="px-6 pt-5">
            <ReviewSummary
              reviewedCount={reviewedCount}
              totalCount={itemProductIds.length}
              avgRating={avgRating}
              ratedLabel={t("ratedItems")}
              averageLabel={t("avgRating")}
            />
          </div>
        )}

        <ul className="divide-y divide-border/60 px-6">
          {order.items.map((it) => (
            <li key={it.id} className="py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{it.title}</p>
                  {it.variantInfo && (
                    <p className="mt-0.5 text-xs text-muted">{it.variantInfo}</p>
                  )}
                </div>
                <p className="text-sm">
                  {formatPrice(it.price, loc)} × {it.quantity}
                </p>
              </div>
              {canReview && it.productId && it.product?.slug && (
                <div className="mt-2 pl-1">
                  {reviewedIds.has(it.productId) ? (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                      <CheckCircle2 size={13} /> {t("reviewed")}
                    </span>
                  ) : (
                    <QuickReviewForm
                      productId={it.productId}
                      productSlug={it.product.slug}
                      labels={{
                        write: t("writeReview"),
                        yourRating: t("yourRating"),
                        placeholder: t("reviewPlaceholder"),
                        submit: t("submit"),
                        success: t("reviewSuccess"),
                        cancel: t("cancel"),
                        viewReview: t("viewReview"),
                      }}
                    />
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
        <div className="space-y-2 border-t border-border px-6 py-5 text-sm">
          <div className="flex justify-between text-muted">
            <span>{t("subtotal")}</span>
            <span>{formatPrice(order.subtotal, loc)}</span>
          </div>
          <div className="flex justify-between text-muted">
            <span>{t("shipping")}</span>
            <span>{order.shippingFee === 0 ? "—" : formatPrice(order.shippingFee, loc)}</span>
          </div>
          <div className="flex justify-between pt-2 text-base font-semibold">
            <span>{t("total")}</span>
            <span>{formatPrice(order.total, loc)}</span>
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-center gap-4">
        <Link href="/products" className="btn-outline">
          {t("continueShopping")}
        </Link>
        {user && order.userId === user.id && (
          <>
            <Link href={`/order/${order.id}/tracking`} className="btn-outline">
              {t("trackOrder")}
            </Link>
            <Link href="/account" className="btn-primary">
              {t("viewOrders")}
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
