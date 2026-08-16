/**
 * 订单构建共享逻辑：校验结账表单、以数据库价格计算金额、检查库存。
 * 供两条流程复用：
 *   1. actions/store.ts 的 placeOrderAction（模拟支付，同步创建+扣款）
 *   2. app/api/paypal/create-order（PayPal 两阶段：先建单，授权后捕获）
 *
 * 原则：金额一律以数据库价格为准，防止前端篡改。
 */

import type { z } from "zod";
import { prisma } from "@/lib/db";
import { checkoutSchema } from "@/lib/validation";
import { FREE_SHIPPING_THRESHOLD, SHIPPING_METHODS } from "@/lib/constants";

export type CheckoutFieldValues = {
  customerName: unknown;
  customerEmail: unknown;
  phone: unknown;
  province: unknown;
  city: unknown;
  address: unknown;
  postalCode?: unknown;
  shippingMethod: unknown;
  paymentMethod: unknown;
  items: unknown;
};

export type OrderItemDraft = {
  productId: string;
  title: string;
  variantInfo?: string;
  price: number;
  quantity: number;
};

export type BuildOrderResult =
  | { ok: true; data: z.infer<typeof checkoutSchema>; orderItems: OrderItemDraft[]; subtotal: number; shippingFee: number; method: (typeof SHIPPING_METHODS)[number] }
  | { ok: false; error: string };

/**
 * 解析并校验结账表单 → 计算订单金额（数据库价格）→ 校验库存。
 * 不创建订单，不做任何写操作。
 */
export async function buildOrderFromForm(
  values: CheckoutFieldValues
): Promise<BuildOrderResult> {
  const parsed = checkoutSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "请检查表单" };
  }
  const data = parsed.data;

  const method = SHIPPING_METHODS.find((m) => m.id === data.shippingMethod);
  if (!method) return { ok: false, error: "配送方式无效" };

  // 以数据库价格为准，防止前端篡改
  const productIds = data.items.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, active: true },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

  let subtotal = 0;
  const orderItems: OrderItemDraft[] = [];
  for (const item of data.items) {
    const product = productMap.get(item.productId);
    if (!product) return { ok: false, error: "部分商品已下架，请刷新购物车" };
    if (product.stock < item.quantity) {
      return { ok: false, error: `「${product.title}」库存不足（剩余 ${product.stock} 件）` };
    }
    subtotal += product.price * item.quantity;
    orderItems.push({
      productId: product.id,
      title: product.title,
      variantInfo: item.variant,
      price: product.price,
      quantity: item.quantity,
    });
  }

  // 与前端一致的免邮逻辑：满 FREE_SHIPPING_THRESHOLD 标准配送免运费
  const freeShipping = subtotal >= FREE_SHIPPING_THRESHOLD;
  const shippingFee = method.id === "standard" && freeShipping ? 0 : method.fee;

  return { ok: true, data, orderItems, subtotal, shippingFee, method };
}
