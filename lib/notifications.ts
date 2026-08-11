import { prisma } from "@/lib/db";
import { REVIEW_INVITE_DAYS } from "@/lib/constants";

export const REVIEW_INVITE_TYPE = "REVIEW_INVITE";

export type ReviewInviteEligibleOrder = {
  id: string;
  orderNumber: string;
  pendingCount: number;
  createdAt: Date;
};

/**
 * 已完成 + 下单超过 N 天 + 还有未评价商品的订单（最近的在前）。
 * 评价邀请横幅与站内通知中心共用此查询。
 */
export async function getReviewInviteEligibleOrders(
  userId: string
): Promise<ReviewInviteEligibleOrder[]> {
  const cutoff = new Date(Date.now() - REVIEW_INVITE_DAYS * 86400000);
  const completedOrders = await prisma.order.findMany({
    where: { userId, status: "COMPLETED", createdAt: { lte: cutoff } },
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });
  if (completedOrders.length === 0) return [];

  // 一次性查询所有商品的评价集合，避免 N+1
  const allProductIds = [
    ...new Set(
      completedOrders.flatMap((o) =>
        o.items.map((it) => it.productId).filter(Boolean)
      )
    ),
  ] as string[];
  const reviewedSet = new Set(
    (
      allProductIds.length > 0
        ? await prisma.review.findMany({
            where: { userId, productId: { in: allProductIds } },
            select: { productId: true },
          })
        : []
    ).map((r) => r.productId)
  );

  const result: ReviewInviteEligibleOrder[] = [];
  for (const o of completedOrders) {
    const productIds = o.items
      .map((it) => it.productId)
      .filter(Boolean) as string[];
    if (productIds.length === 0) continue;
    const pendingCount = productIds.filter((id) => !reviewedSet.has(id)).length;
    if (pendingCount > 0) {
      result.push({
        id: o.id,
        orderNumber: o.orderNumber,
        pendingCount,
        createdAt: o.createdAt,
      });
    }
  }
  return result;
}

export type ReviewInviteEligibleOrderGlobal = ReviewInviteEligibleOrder & {
  userId: string;
};

/**
 * 全局扫描所有顾客的待评价订单（跨用户，供邮件任务等后台作业使用）。
 * 与 getReviewInviteEligibleOrders 同一套判断逻辑，但一次查询覆盖所有用户。
 */
export async function getAllReviewInviteEligibleOrders(): Promise<
  ReviewInviteEligibleOrderGlobal[]
> {
  const cutoff = new Date(Date.now() - REVIEW_INVITE_DAYS * 86400000);
  const completedOrders = await prisma.order.findMany({
    where: {
      status: "COMPLETED",
      createdAt: { lte: cutoff },
      userId: { not: null },
    },
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });
  if (completedOrders.length === 0) return [];

  const allProductIds = [
    ...new Set(
      completedOrders.flatMap((o) =>
        o.items.map((it) => it.productId).filter(Boolean)
      )
    ),
  ] as string[];
  const reviews =
    allProductIds.length > 0
      ? await prisma.review.findMany({
          where: { productId: { in: allProductIds } },
          select: { userId: true, productId: true },
        })
      : [];
  const reviewedKeys = new Set(
    reviews.map((r) => `${r.userId}|${r.productId}`)
  );

  const result: ReviewInviteEligibleOrderGlobal[] = [];
  for (const o of completedOrders) {
    const productIds = o.items
      .map((it) => it.productId)
      .filter(Boolean) as string[];
    if (productIds.length === 0 || !o.userId) continue;
    const pendingCount = productIds.filter(
      (id) => !reviewedKeys.has(`${o.userId}|${id}`)
    ).length;
    if (pendingCount > 0) {
      result.push({
        id: o.id,
        userId: o.userId,
        orderNumber: o.orderNumber,
        pendingCount,
        createdAt: o.createdAt,
      });
    }
  }
  return result;
}

export type ReviewInviteNotificationItem = {
  orderId: string;
  orderNumber: string;
  pendingCount: number;
  createdAt: string; // ISO
  read: boolean;
};

/**
 * 站内通知中心数据：待评价订单列表（派生）+ 已读状态（Notification 账本）。
 * 渲染期间零写入——Notification 行仅记录"已读"，由用户操作写入。
 */
export async function getReviewInviteNotifications(userId: string): Promise<{
  items: ReviewInviteNotificationItem[];
  unreadCount: number;
}> {
  const eligible = await getReviewInviteEligibleOrders(userId);
  if (eligible.length === 0) return { items: [], unreadCount: 0 };

  const readRows = await prisma.notification.findMany({
    where: { userId, type: REVIEW_INVITE_TYPE, read: true },
    select: { orderId: true },
  });
  const readSet = new Set(readRows.map((r) => r.orderId));

  const items = eligible.map((o) => ({
    orderId: o.id,
    orderNumber: o.orderNumber,
    pendingCount: o.pendingCount,
    createdAt: o.createdAt.toISOString(),
    read: readSet.has(o.id),
  }));
  return {
    items,
    unreadCount: items.filter((i) => !i.read).length,
  };
}
