"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import {
  REVIEW_INVITE_TYPE,
  getReviewInviteEligibleOrders,
} from "@/lib/notifications";

/**
 * 点击某条评价邀请通知：标记已读并跳转到对应订单（快捷评价入口所在页）。
 */
export async function markReviewInviteReadAction(orderId: string) {
  const user = await getSessionUser();
  if (!user) redirect("/account");
  await prisma.notification.upsert({
    where: {
      userId_type_orderId: {
        userId: user.id,
        type: REVIEW_INVITE_TYPE,
        orderId,
      },
    },
    update: { read: true },
    create: { userId: user.id, type: REVIEW_INVITE_TYPE, orderId, read: true },
  });
  // 中间件 matcher 只匹配带语言前缀的路径，必须手动带上 locale
  const locale = await getLocale();
  redirect(`/${locale}/order/${orderId}`);
}

/** 全部标为已读（当前所有待评价订单），红点清零。 */
export async function markAllReviewInvitesReadAction() {
  const user = await getSessionUser();
  if (!user) redirect("/account");
  const eligible = await getReviewInviteEligibleOrders(user.id);
  const orderIds = eligible.map((o) => o.id);
  if (orderIds.length > 0) {
    // SQLite 的 createMany 不支持 skipDuplicates：先查已有行，updateMany 覆盖 + createMany 补齐
    const existing = await prisma.notification.findMany({
      where: {
        userId: user.id,
        type: REVIEW_INVITE_TYPE,
        orderId: { in: orderIds },
      },
      select: { orderId: true },
    });
    const existingSet = new Set(existing.map((e) => e.orderId));
    const existingIds = orderIds.filter((id) => existingSet.has(id));
    if (existingIds.length > 0) {
      await prisma.notification.updateMany({
        where: {
          userId: user.id,
          type: REVIEW_INVITE_TYPE,
          orderId: { in: existingIds },
        },
        data: { read: true },
      });
    }
    const newIds = orderIds.filter((id) => !existingSet.has(id));
    if (newIds.length > 0) {
      await prisma.notification.createMany({
        data: newIds.map((orderId) => ({
          userId: user.id,
          type: REVIEW_INVITE_TYPE,
          orderId,
          read: true,
        })),
      });
    }
  }
  revalidatePath("/", "layout");
}
