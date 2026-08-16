/**
 * PayPal Webhook 事件处理（服务端专用）。
 *
 * 事件类型 → 本地订单状态同步：
 *   - PAYMENT.CAPTURE.COMPLETED  —— 支付成功：若订单仍是 PENDING，补置 PAID + 补扣库存
 *   - PAYMENT.CAPTURE.REFUNDED    —— 已退款：记录 refundId + paypalStatus=REFUNDED
 *   - PAYMENT.CAPTURE.DENIED      —— 支付被拒绝：paypalStatus=DENIED
 *   - PAYMENT.CAPTURE.REVERSED    —— 支付被撤销：paypalStatus=REVERSED
 *   - PAYMENT.CAPTURE.PENDING     —— 捕获挂起：paypalStatus=PENDING
 *
 * 幂等：以 PayPal 事件 id 为主键写入 WebhookEvent 表，重复事件直接跳过。
 *
 * 注意：正常下单流程由 /api/paypal/capture-order 完成（主流程）。Webhook 是
 * 兜底同步——覆盖“捕获 API 事务失败但资金已到账”“用户从 PayPal 侧操作”等
 * 异常路径，保证后台支付状态与 PayPal 实际资金状态一致。
 */
import "server-only";
import { prisma } from "@/lib/db";
import { cnyToUsd } from "@/lib/fx";
import {
  parsePaypalEvent,
  type ParsedPaypalEvent,
} from "@/lib/paypal-webhook-shared";

export {
  parsePaypalEvent,
  PAYPAL_STATUS_LABEL,
  PAYPAL_STATUS_STYLES,
} from "@/lib/paypal-webhook-shared";
export type { ParsedPaypalEvent } from "@/lib/paypal-webhook-shared";

/** 按捕获交易号或 PayPal 订单 id 反查本地订单 */
async function findOrder(ev: ParsedPaypalEvent) {
  if (ev.paypalOrderId) {
    const byPaypal = await prisma.order.findFirst({
      where: { paypalOrderId: ev.paypalOrderId },
    });
    if (byPaypal) return byPaypal;
  }
  if (ev.captureId) {
    const byTx = await prisma.order.findFirst({
      where: { transactionId: ev.captureId },
    });
    if (byTx) return byTx;
  }
  return null;
}

/**
 * 处理单个 webhook 事件（幂等）。
 * 返回 { handled, orderId }：handled=true 表示本次确实执行了状态更新；
 * 重复事件 / 无法识别 / 找不到订单时返回 handled=false（调用方仍应回 200，
 * 避免 PayPal 无限重试——PayPal 只对非 2xx 重试）。
 */
export async function processWebhookEvent(
  body: unknown
): Promise<{ handled: boolean; orderId?: string }> {
  const ev = parsePaypalEvent(body);
  if (!ev) return { handled: false };
  if (ev.type === "UNHANDLED") {
    // 记录但不做状态更新，避免刷屏（仍回 200）
    await recordEvent(ev, null, body);
    return { handled: false };
  }

  // 幂等：事件 id 已存在则跳过
  const existing = await prisma.webhookEvent.findUnique({
    where: { id: ev.eventId },
  });
  if (existing) return { handled: false, orderId: existing.orderId ?? undefined };

  const order = await findOrder(ev);
  if (!order) {
    // 找不到本地订单（可能本地订单已被删除）——记录事件，回 200
    await recordEvent(ev, null, body);
    return { handled: false };
  }

  switch (ev.type) {
    case "COMPLETED":
      await handleCompleted(order.id, ev);
      break;
    case "REFUNDED":
      await handleRefunded(order.id, ev);
      break;
    case "DENIED":
      await handleStatusSync(order.id, ev, "DENIED");
      break;
    case "REVERSED":
      await handleStatusSync(order.id, ev, "REVERSED");
      break;
    case "PENDING":
      await handleStatusSync(order.id, ev, "PENDING");
      break;
  }

  await recordEvent(ev, order.id, body);
  return { handled: true, orderId: order.id };
}

/**
 * 支付成功同步：仅当订单仍为 PENDING 时补置 PAID + 补扣库存。
 * 若订单已被主流程（capture-order）置为 PAID/SHIPPED/COMPLETED，只补 paypalStatus。
 */
async function handleCompleted(orderId: string, ev: ParsedPaypalEvent) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return;

  if (order.status !== "PENDING") {
    // 主流程已处理支付：仅同步 PayPal 侧状态（不重复扣库存）
    await prisma.order.update({
      where: { id: orderId },
      data: { paypalStatus: "COMPLETED" },
    });
    return;
  }

  await prisma.$transaction(async (tx) => {
    // 原子流转：仅当仍为 PENDING 才置 PAID（防并发 webhook 重复扣库存）
    const claimed = await tx.order.updateMany({
      where: { id: orderId, status: "PENDING" },
      data: { status: "PAID", paypalStatus: "COMPLETED", transactionId: ev.captureId ?? undefined },
    });
    if (claimed.count === 0) return;

    await tx.orderEvent.create({
      data: { orderId, status: "PAID" },
    });

    // 条件扣库存；若库存不足（如已并发超卖），资金已到账，订单保持 PAID，
    // 在 note 标注库存异常待人工处理（不能让订单回退成未支付）。
    let stockNote = "";
    const items = await tx.orderItem.findMany({ where: { orderId } });
    for (const item of items) {
      if (!item.productId) continue;
      const updated = await tx.product.updateMany({
        where: { id: item.productId, stock: { gte: item.quantity } },
        data: { stock: { decrement: item.quantity } },
      });
      if (updated.count === 0) {
        stockNote = `（库存异常：「${item.title}」扣减失败，请人工处理）`;
      }
    }
    if (stockNote) {
      await tx.order.update({
        where: { id: orderId },
        data: { note: `${order.note ?? ""}${stockNote}`.trim() },
      });
    }
  });
}

/**
 * 退款同步：记录退款交易号 + 支付状态（订单主状态流转仍由后台人工控制）。
 * 全额退款 → REFUNDED；退款金额小于订单 USD 总额 → PARTIALLY_REFUNDED。
 */
async function handleRefunded(orderId: string, ev: ParsedPaypalEvent) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return;

  // 订单以 CNY 记账，退款金额是 USD——换算后比较判断全额/部分退款
  const orderUsd = Number(await cnyToUsd(order.total));
  const full =
    ev.refundAmountUsd === undefined || ev.refundAmountUsd >= orderUsd;
  await prisma.order.update({
    where: { id: orderId },
    data: {
      paypalStatus: full ? "REFUNDED" : "PARTIALLY_REFUNDED",
      refundId: ev.refundId ?? undefined,
    },
  });
}

/** 其他状态（DENIED/REVERSED/PENDING）仅同步 paypalStatus */
async function handleStatusSync(
  orderId: string,
  ev: ParsedPaypalEvent,
  status: string
) {
  await prisma.order.update({
    where: { id: orderId },
    data: { paypalStatus: status },
  });
}

/** 记录事件日志（幂等表），payload 存原始 JSON 便于排查 */
async function recordEvent(
  ev: ParsedPaypalEvent,
  orderId: string | null,
  body: unknown
) {
  await prisma.webhookEvent
    .create({
      data: {
        id: ev.eventId,
        type: ev.type,
        orderId,
        payload: JSON.stringify(body).slice(0, 4000),
      },
    })
    .catch((e: unknown) => {
      // 仅吞掉并发重复到达时的唯一约束冲突（P2002）；其他错误重抛，交给路由层 502 让 PayPal 重试
      if ((e as { code?: string })?.code === "P2002") return;
      throw e;
    });
}
