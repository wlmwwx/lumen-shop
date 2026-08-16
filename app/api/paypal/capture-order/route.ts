import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { capturePayPalOrder, isPayPalConfigured } from "@/lib/paypal";

/**
 * POST /api/paypal/capture-order
 *
 * PayPal 两阶段流程 · 第二步：买家在 PayPal 弹窗中授权后，前端带上 PayPal order id
 * 调本接口。服务端捕获资金，成功后把本地订单置为 PAID、扣库存、记录状态事件。
 *
 * 请求体：{ paypalOrderId }
 * 响应：{ localOrderId }；失败返回 { error } 与对应状态码。
 */
export async function POST(req: Request) {
  if (!isPayPalConfigured()) {
    return NextResponse.json(
      { error: "PayPal 未配置：请在 .env 设置 PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET" },
      { status: 503 }
    );
  }

  let body: { paypalOrderId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }
  const paypalOrderId = body.paypalOrderId;
  if (!paypalOrderId) {
    return NextResponse.json({ error: "缺少 paypalOrderId" }, { status: 400 });
  }

  // 按 PayPal order id 反查本地订单（create-order 时已回填）
  const order = await prisma.order.findFirst({ where: { paypalOrderId } });
  if (!order) {
    return NextResponse.json({ error: "未找到对应订单" }, { status: 404 });
  }
  if (order.status === "PAID") {
    // 幂等：已支付成功（可能前端重复回调）
    return NextResponse.json({ localOrderId: order.id });
  }
  if (order.status !== "PENDING") {
    return NextResponse.json({ error: `订单状态异常：${order.status}` }, { status: 409 });
  }

  const capture = await capturePayPalOrder(paypalOrderId);
  if (!capture.success) {
    return NextResponse.json(
      { error: capture.message ?? "PayPal 捕获失败，请重试" },
      { status: 502 }
    );
  }

  try {
    await prisma.$transaction(async (tx) => {
      // 原子状态流转：仅当订单仍为 PENDING 时才置为 PAID。
      // 防止并发重复捕获（双击/重试）导致双重扣库存。
      const claimed = await tx.order.updateMany({
        where: { id: order.id, status: "PENDING" },
        data: { status: "PAID", transactionId: capture.transactionId },
      });
      if (claimed.count === 0) {
        throw new Error("订单已被处理");
      }
      await tx.orderEvent.create({
        data: { orderId: order.id, status: "PAID" },
      });

      // 条件扣库存：stock >= quantity 才扣，防并发超卖
      const items = await tx.orderItem.findMany({ where: { orderId: order.id } });
      for (const item of items) {
        if (!item.productId) continue;
        const updated = await tx.product.updateMany({
          where: { id: item.productId, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });
        if (updated.count === 0) {
          throw new Error(`库存不足：「${item.title}」`);
        }
      }
    });
  } catch (e) {
    // 注意：走到这里时 PayPal 资金可能已经扣款成功（例如并发超卖导致扣库存失败）。
    // 对演示项目，明确提示用户支付已成功、需联系客服处理，避免误以为支付失败。
    const message = e instanceof Error ? e.message : "更新订单失败";
    return NextResponse.json(
      { error: `支付已成功但订单处理遇到问题（${message}）。请保留 PayPal 交易号联系客服处理。` },
      { status: 409 }
    );
  }

  return NextResponse.json({ localOrderId: order.id });
}
