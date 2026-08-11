import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getAllReviewInviteEligibleOrders } from "@/lib/notifications";
import {
  reviewInviteEmailHtml,
  reviewInviteEmailSubject,
} from "@/lib/email-template";

/** 演示环境站点地址（邮件中的直达链接以此为基础） */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3100";

type EligibleOrder = Awaited<
  ReturnType<typeof getAllReviewInviteEligibleOrders>
>[number];

/**
 * 发送一封评价邀请邮件（模拟）：按订单落库 EmailLog，orderId 唯一约束保证一单一封。
 * 返回已发送的记录；若该订单已发送过则返回 null（幂等）。
 */
export async function sendReviewInviteEmail(
  order: EligibleOrder
): Promise<{ id: string } | null> {
  const detail = await prisma.order.findUnique({
    where: { id: order.id },
    select: { customerEmail: true, customerName: true },
  });
  if (!detail) return null;

  const reviewUrl = `${SITE_URL}/zh/order/${order.id}`;
  try {
    const log = await prisma.emailLog.create({
      data: {
        orderId: order.id,
        toEmail: detail.customerEmail,
        subject: reviewInviteEmailSubject(order.orderNumber),
        body: reviewInviteEmailHtml({
          orderNumber: order.orderNumber,
          pendingCount: order.pendingCount,
          reviewUrl,
        }),
      },
      select: { id: true },
    });
    return log;
  } catch (e) {
    // 唯一约束冲突（并发/重复执行）→ 已发送过，静默忽略
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      return null;
    }
    throw e;
  }
}

/**
 * 自动发送任务（演示环境用后台按钮模拟每日定时任务）：
 * 扫描所有「已完成 + 超 N 天 + 有未评价商品」的订单，为未发送过的订单发一封邀请邮件。
 */
export async function runReviewInviteEmailJob(): Promise<{
  scanned: number;
  sent: number;
}> {
  const eligible = await getAllReviewInviteEligibleOrders();
  if (eligible.length === 0) return { scanned: 0, sent: 0 };

  const existing = await prisma.emailLog.findMany({
    where: { orderId: { in: eligible.map((e) => e.id) } },
    select: { orderId: true },
  });
  const sentSet = new Set(existing.map((e) => e.orderId));

  let sent = 0;
  for (const order of eligible) {
    if (sentSet.has(order.id)) continue; // 已发送过，跳过
    const log = await sendReviewInviteEmail(order);
    if (log) sent++;
  }
  return { scanned: eligible.length, sent };
}
