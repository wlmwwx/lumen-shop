import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import {
  CheckCircle2,
  Clock,
  Truck,
  PackageCheck,
  XCircle,
  MapPin,
  ChevronRight,
  Package,
  ExternalLink,
} from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { Link } from "@/i18n/navigation";
import { getSessionUser } from "@/lib/auth";
import { formatPrice } from "@/lib/format";
import { formatDateTime } from "@/lib/utils";
import { ORDER_STATUS_LABEL, SHIPPING_METHODS, CARRIER, trackingHref } from "@/lib/constants";
import { cn } from "@/lib/utils";
import {
  TIMELINE_STAGES,
  stageStatus,
  buildTimeline,
} from "@/lib/order-timeline";
import { CopyButton } from "@/components/store/copy-button";
import { QuickReviewForm } from "@/components/store/quick-review-form";
import { ReviewSummary } from "@/components/store/review-summary";
import { getOrderReviewStats } from "@/lib/order-review";

export const metadata: Metadata = { title: "订单跟踪" };

const STATUS_ICON: Record<string, typeof Clock> = {
  PENDING: Clock,
  PAID: CheckCircle2,
  SHIPPED: Truck,
  COMPLETED: PackageCheck,
  CANCELLED: XCircle,
};

export default async function TrackingPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id, locale } = await params;
  const loc = locale as "zh" | "en";
  setRequestLocale(locale);
  const t = await getTranslations("Tracking");

  // 仅登录顾客可跟踪订单
  const user = await getSessionUser();
  if (!user) redirect("/account");

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: { include: { product: { select: { titleEn: true, slug: true } } } },
      events: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!order || order.userId !== user.id) notFound();

  // 已完成订单：允许订单主人对购买的商品快捷评价（已评价的标记出来 + 评分汇总）
  const canReview = order.status === "COMPLETED";
  const itemProductIds = order.items
    .map((it) => it.productId)
    .filter(Boolean) as string[];
  const { reviewedIds, reviewedCount, avgRating } = canReview
    ? await getOrderReviewStats(user.id, itemProductIds)
    : { reviewedIds: new Set<string>(), reviewedCount: 0, avgRating: 0 };

  // 配送方式英文名
  const shippingMethodEn =
    SHIPPING_METHODS.find((m) => m.name === order.shippingMethod)?.nameEn ??
    order.shippingMethod;

  const cancelled = order.status === "CANCELLED";
  const displayStages = cancelled
    ? (["PENDING", "CANCELLED"] as const)
    : TIMELINE_STAGES;

  const { eventByStatus, logistics } = buildTimeline(order);

  const statusLabel = ORDER_STATUS_LABEL[order.status];
  const CurrentIcon = STATUS_ICON[order.status] ?? Truck;
  const shipped = order.status === "SHIPPED" || order.status === "COMPLETED";
  const carrierName = loc === "en" ? CARRIER.nameEn : CARRIER.name;

  return (
    <div className="container-shop max-w-3xl py-12">
      {/* 顶部状态横幅 */}
      <div className="mb-10 rounded-2xl bg-surface p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-foreground text-white">
              <CurrentIcon size={22} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-muted">
                {t("orderNumber")} · {order.orderNumber}
              </p>
              <h1 className="mt-1 text-2xl font-light">
                {loc === "en" ? statusLabel.en : statusLabel.zh}
              </h1>
            </div>
          </div>
          <Link
            href={`/order/${order.id}`}
            className="flex items-center gap-1 text-sm text-muted underline-offset-4 hover:text-foreground hover:underline"
          >
            {t("viewOrderDetails")} <ChevronRight size={14} />
          </Link>
        </div>
        {!cancelled && order.status === "PENDING" && (
          <p className="mt-4 rounded-lg bg-amber-50 px-4 py-2.5 text-sm text-amber-700">
            {t("pendingNotice")}
          </p>
        )}
      </div>

      {/* 物流单号（发货后） */}
      {shipped && order.trackingNumber && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-white p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-foreground/5 text-foreground">
              <Truck size={20} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-muted">
                {t("trackingNumber")} · {carrierName}
              </p>
              <p className="mt-0.5 font-mono text-lg tracking-wide">
                {order.trackingNumber}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <CopyButton
              value={order.trackingNumber}
              label={t("copy")}
              copiedLabel={t("copied")}
            />
            <a
              href={trackingHref(order.trackingNumber)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-foreground/40 hover:text-foreground"
            >
              {t("trackOnCarrier")} <ExternalLink size={13} />
            </a>
          </div>
        </div>
      )}

      {/* 物流时间线 */}
      <div className="card-shop p-6 sm:p-8">
        <h2 className="mb-8 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest">
          <MapPin size={15} /> {t("timelineTitle")}
        </h2>

        <ol className="relative">
          {displayStages.map((stage, i) => {
            const done = stageStatus(stage, order.status);
            if (done === "hidden") return null;
            const isLast = i === displayStages.length - 1;
            const time = eventByStatus.get(stage);
            const StageIcon = STATUS_ICON[stage];
            const stageLabel = ORDER_STATUS_LABEL[stage];
            return (
              <li key={stage} className="relative flex gap-4 pb-8 last:pb-0">
                {/* 连接线 */}
                {!isLast && (
                  <span
                    className={cn(
                      "absolute left-[15px] top-8 h-[calc(100%-2rem)] w-px",
                      done === "done" ? "bg-foreground/30" : "bg-border"
                    )}
                  />
                )}
                {/* 节点 */}
                <span
                  className={cn(
                    "relative z-10 mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors",
                    done === "done" && "border-foreground bg-foreground text-white",
                    done === "current" && "border-foreground bg-white text-foreground ring-4 ring-foreground/10",
                    done === "todo" && "border-border bg-white text-[#c4c4bf]"
                  )}
                >
                  <StageIcon size={15} />
                </span>
                <div className="min-w-0 flex-1 pt-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <p
                      className={cn(
                        "text-sm font-medium",
                        done === "todo" ? "text-[#b0b0ab]" : "text-foreground"
                      )}
                    >
                      {loc === "en" ? stageLabel.en : stageLabel.zh}
                      {done === "current" && (
                        <span className="ml-2 rounded-full bg-foreground/5 px-2 py-0.5 text-[11px] font-medium text-foreground">
                          {t("current")}
                        </span>
                      )}
                    </p>
                    {time && (
                      <p className="text-xs text-muted">{formatDateTime(time, locale)}</p>
                    )}
                  </div>
                  {done === "todo" && (
                    <p className="mt-1 text-xs text-[#b0b0ab]">{t("upcoming")}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>

        {/* 物流轨迹明细（发货后） */}
        {logistics.length > 0 && (
          <div className="mt-8 border-t border-border pt-6">
            <h3 className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted">
              <Package size={13} /> {t("trackingHistory")}
            </h3>
            <ul className="space-y-3">
              {logistics.map((e) => (
                <li key={e.id} className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-2.5">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/40" />
                    <p className="text-sm">{e.note ? t(e.note) : ""}</p>
                  </div>
                  <p className="shrink-0 text-xs text-muted">
                    {formatDateTime(e.createdAt, locale)}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* 收货信息 + 商品摘要 */}
      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <div className="card-shop p-6">
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted">
            {t("shippingAddress")}
          </h3>
          <div className="space-y-1.5 text-sm">
            <p className="font-medium">
              {order.customerName} · {order.phone}
            </p>
            <p className="text-muted">
              {order.province} {order.city} {order.address}
              {order.postalCode ? ` ${order.postalCode}` : ""}
            </p>
            <p className="pt-2 text-xs text-muted">
              {t("shippingMethod")}: {loc === "en" ? shippingMethodEn : order.shippingMethod}
            </p>
          </div>
        </div>

        <div className="card-shop p-6">
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted">
            {t("items")}（{order.items.length}）
          </h3>
          {canReview && itemProductIds.length > 0 && (
            <div className="mb-5">
              <ReviewSummary
                reviewedCount={reviewedCount}
                totalCount={itemProductIds.length}
                avgRating={avgRating}
                ratedLabel={t("ratedItems")}
                averageLabel={t("avgRating")}
              />
            </div>
          )}
          <ul className="space-y-2.5">
            {order.items.map((it) => (
              <li key={it.id} className="text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate">
                    {loc === "en" && it.product?.titleEn ? it.product.titleEn : it.title}
                    {it.variantInfo && (
                      <span className="ml-1.5 text-xs text-muted">{it.variantInfo}</span>
                    )}
                    <span className="ml-1.5 text-xs text-muted">× {it.quantity}</span>
                  </span>
                  <span className="shrink-0 font-medium">
                    {formatPrice(it.price * it.quantity, loc)}
                  </span>
                </div>
                {canReview && it.productId && it.product?.slug && (
                  <div className="mt-1.5">
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
          <div className="mt-4 flex justify-between border-t border-border pt-3 text-sm font-semibold">
            <span>{t("total")}</span>
            <span>{formatPrice(order.total, loc)}</span>
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-center gap-4">
        <Link href={`/order/${order.id}`} className="btn-outline">
          {t("viewOrderDetails")}
        </Link>
        <Link href="/account" className="btn-primary">
          {t("backToOrders")}
        </Link>
      </div>
    </div>
  );
}
