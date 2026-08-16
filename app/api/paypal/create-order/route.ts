import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { buildOrderFromForm } from "@/lib/order";
import { createPayPalOrder, isPayPalConfigured } from "@/lib/paypal";
import { cnyToUsd } from "@/lib/fx";
import { randomOrderNumber } from "@/lib/utils";

/**
 * POST /api/paypal/create-order
 *
 * PayPal 两阶段流程 · 第一步：校验结账表单 → 以数据库价格建本地订单（PENDING，
 * 记录 paypalOrderId）→ 调 PayPal 创建订单 → 返回 PayPal order id 供前端弹窗授权。
 *
 * 请求体：与 placeOrderAction 的 FormData 字段一致（JSON 形式）。
 * 响应：{ paypalOrderId, localOrderId }；失败返回 { error } 与 4xx 状态码。
 */
export async function POST(req: Request) {
  if (!isPayPalConfigured()) {
    return NextResponse.json(
      { error: "PayPal 未配置：请在 .env 设置 PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET" },
      { status: 503 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }

  const built = await buildOrderFromForm({
    customerName: body.customerName,
    customerEmail: body.customerEmail,
    phone: body.phone,
    province: body.province,
    city: body.city,
    address: body.address,
    postalCode: body.postalCode ?? undefined,
    shippingMethod: body.shippingMethod,
    paymentMethod: body.paymentMethod ?? "PayPal",
    items: body.items,
  });
  if (!built.ok) {
    return NextResponse.json({ error: built.error }, { status: 400 });
  }
  const { data, orderItems, subtotal, shippingFee, method } = built;

  const user = await getSessionUser();

  let localOrderId: string | undefined;
  let paypalOrderId: string;
  try {
    // 本地订单先落库为 PENDING（未扣款、未扣库存），等 PayPal 授权后捕获
    const order = await prisma.order.create({
      data: {
        orderNumber: randomOrderNumber(),
        userId: user?.id,
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        phone: data.phone,
        province: data.province,
        city: data.city,
        address: data.address,
        postalCode: data.postalCode,
        shippingMethod: method.name,
        shippingFee,
        subtotal,
        total: subtotal + shippingFee,
        paymentMethod: "PayPal",
        status: "PENDING",
        items: { create: orderItems },
      },
    });
    localOrderId = order.id;

    // 本地订单号做 PayPal 的 reference_id（便于对账）；金额 CNY→USD 实时汇率换算
    paypalOrderId = await createPayPalOrder({
      amountUsd: await cnyToUsd(order.total),
      orderNumber: order.orderNumber,
      description: `LUMEN 订单 ${order.orderNumber}`,
    });

    // 回填 paypalOrderId，供捕获阶段按 PayPal order id 反查本地订单
    await prisma.order.update({
      where: { id: order.id },
      data: { paypalOrderId },
    });

    await prisma.orderEvent.create({
      data: { orderId: order.id, status: "PENDING" },
    });
  } catch (e) {
    // PayPal 建单失败：删除刚创建的本地 PENDING 订单（级联清理 items/events），
    // 避免残留“从未支付也无人认领”的脏订单
    if (localOrderId) {
      await prisma.order.delete({ where: { id: localOrderId } }).catch(() => {});
    }
    const message = e instanceof Error ? e.message : "创建 PayPal 订单失败";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  return NextResponse.json({ paypalOrderId, localOrderId });
}
