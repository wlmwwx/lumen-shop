"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { checkoutSchema, reviewSchema } from "@/lib/validation";
import { paymentProvider } from "@/lib/payments";
import { FREE_SHIPPING_THRESHOLD, SHIPPING_METHODS } from "@/lib/constants";
import { randomOrderNumber } from "@/lib/utils";

export type StoreActionState = { error?: string; orderId?: string } | undefined;

export async function placeOrderAction(
  _prev: StoreActionState,
  formData: FormData
): Promise<StoreActionState> {
  let rawItems: unknown[] = [];
  try {
    rawItems = JSON.parse(String(formData.get("items") || "[]"));
  } catch {
    return { error: "购物车数据异常" };
  }

  const parsed = checkoutSchema.safeParse({
    customerName: formData.get("customerName"),
    customerEmail: formData.get("customerEmail"),
    phone: formData.get("phone"),
    province: formData.get("province"),
    city: formData.get("city"),
    address: formData.get("address"),
    postalCode: formData.get("postalCode") || undefined,
    shippingMethod: formData.get("shippingMethod"),
    paymentMethod: formData.get("paymentMethod"),
    items: rawItems,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "请检查表单" };
  }
  const data = parsed.data;

  const user = await getSessionUser();
  const method = SHIPPING_METHODS.find((m) => m.id === data.shippingMethod);
  if (!method) return { error: "配送方式无效" };

  // 以数据库价格为准，防止前端篡改
  const productIds = data.items.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, active: true },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

  let subtotal = 0;
  const orderItems: {
    productId: string;
    title: string;
    variantInfo?: string;
    price: number;
    quantity: number;
  }[] = [];
  for (const item of data.items) {
    const product = productMap.get(item.productId);
    if (!product) return { error: "部分商品已下架，请刷新购物车" };
    if (product.stock < item.quantity) {
      return { error: `「${product.title}」库存不足（剩余 ${product.stock} 件）` };
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

  // 与前端一致的免邮逻辑：满 ¥299 标准配送免运费
  const freeShipping = subtotal >= FREE_SHIPPING_THRESHOLD;
  const shippingFee = method.id === "standard" && freeShipping ? 0 : method.fee;

  let orderId: string | null = null;
  try {
    // 下单 + 支付 + 扣库存放在同一事务：库存不足则整单回滚，防止并发超卖
    orderId = await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
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
          paymentMethod: data.paymentMethod,
          items: { create: orderItems },
        },
      });

      // 记录状态事件：已下单
      await tx.orderEvent.create({
        data: { orderId: order.id, status: "PENDING" },
      });

      // 模拟支付（未来替换为真实支付 Provider）
      const pay = await paymentProvider.charge({
        orderId: order.id,
        amount: order.total,
        method: data.paymentMethod,
      });
      if (!pay.success) {
        throw new Error("支付失败，请更换支付方式重试");
      }

      await tx.order.update({
        where: { id: order.id },
        data: { status: "PAID" },
      });

      // 记录状态事件：已支付
      await tx.orderEvent.create({
        data: { orderId: order.id, status: "PAID" },
      });

      // 条件扣库存：stock >= quantity 才扣，防并发超卖
      for (const item of orderItems) {
        const updated = await tx.product.updateMany({
          where: { id: item.productId!, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });
        if (updated.count === 0) {
          throw new Error(`库存不足：「${item.title}」`);
        }
      }
      return order.id;
    });
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("库存不足")) {
      return { error: e.message };
    }
    if (e instanceof Error && e.message.startsWith("支付失败")) {
      return { error: e.message };
    }
    throw e;
  }

  revalidatePath("/", "layout");
  // 中间件 matcher 只匹配带语言前缀的路径，必须手动带上 locale（修复无前缀 404）
  const locale = await getLocale();
  redirect(`/${locale}/order/${orderId}`);
}

export async function addReviewAction(
  _prev: StoreActionState,
  formData: FormData
): Promise<StoreActionState> {
  const user = await getSessionUser();
  if (!user) return { error: "请先登录" };

  const parsed = reviewSchema.safeParse({
    productId: formData.get("productId"),
    rating: Number(formData.get("rating")),
    comment: formData.get("comment"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "评论内容不合法" };
  }

  // 同一用户对同一商品只能评价一次（防重复提交）
  const existing = await prisma.review.findFirst({
    where: { userId: user.id, productId: parsed.data.productId },
  });
  if (existing) {
    return { error: "你已评价过该商品" };
  }

  await prisma.review.create({
    data: {
      productId: parsed.data.productId,
      userId: user.id,
      rating: parsed.data.rating,
      comment: parsed.data.comment,
    },
  });
  revalidatePath("/", "layout");
  revalidatePath("/admin/reviews");
  return { orderId: "ok" };
}

export async function toggleWishlistAction(productId: string): Promise<void> {
  const user = await getSessionUser();
  if (!user) redirect("/account?next=wishlist");

  const existing = await prisma.wishlistItem.findUnique({
    where: { userId_productId: { userId: user.id, productId } },
  });
  if (existing) {
    await prisma.wishlistItem.delete({ where: { id: existing.id } });
  } else {
    await prisma.wishlistItem.create({ data: { userId: user.id, productId } });
  }
  revalidatePath("/wishlist");
}

export async function subscribeAction(email: string): Promise<{ ok: boolean }> {
  // 演示环境：仅模拟订阅，不落库
  await new Promise((r) => setTimeout(r, 400));
  return { ok: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) };
}
