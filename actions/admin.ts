"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { categorySchema, productSchema } from "@/lib/validation";
import { slugify, randomTrackingNumber } from "@/lib/utils";
import { runReviewInviteEmailJob } from "@/lib/email";
import type { OrderStatus } from "@prisma/client";

export type AdminActionState = { error?: string } | undefined;

const revalidateAdmin = () => {
  revalidatePath("/admin");
  revalidatePath("/admin/products");
  revalidatePath("/admin/orders");
  revalidatePath("/admin/categories");
  revalidatePath("/");
};

/* ---------------- 商品 ---------------- */

export async function createProductAction(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  await requireAdmin();
  let variantsRaw: unknown = [];
  try {
    variantsRaw = JSON.parse(String(formData.get("variants") || "[]"));
  } catch {
    variantsRaw = [];
  }
  const parsed = productSchema.safeParse({
    title: formData.get("title"),
    titleEn: formData.get("titleEn") || undefined,
    slug: formData.get("slug") || slugify(String(formData.get("title") || "")),
    description: formData.get("description"),
    descriptionEn: formData.get("descriptionEn") || undefined,
    price: formData.get("price"),
    compareAtPrice: formData.get("compareAtPrice") || null,
    stock: formData.get("stock"),
    images: formData.get("images"),
    categoryId: formData.get("categoryId") || null,
    featured: formData.get("featured") === "on",
    active: formData.get("active") === "on",
    variants: variantsRaw as never,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "表单校验失败" };
  }
  const d = parsed.data;

  const exists = await prisma.product.findUnique({ where: { slug: d.slug } });
  if (exists) return { error: "Slug 已被占用，请更换" };

  const imageLines = d.images
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);

  await prisma.product.create({
    data: {
      title: d.title,
      titleEn: d.titleEn || null,
      slug: d.slug,
      description: d.description,
      descriptionEn: d.descriptionEn || null,
      price: d.price,
      compareAtPrice: d.compareAtPrice ?? null,
      stock: d.stock,
      images: JSON.stringify(imageLines),
      categoryId: d.categoryId || null,
      featured: d.featured,
      active: d.active,
      variants: d.variants?.length
        ? {
            create: d.variants.map((v) => ({
              name: v.name,
              nameEn: v.nameEn || null,
              value: v.value,
              valueEn: v.valueEn || null,
            })),
          }
        : undefined,
    },
  });
  revalidateAdmin();
  redirect("/admin/products");
}

export async function updateProductAction(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  await requireAdmin();
  const id = String(formData.get("id") || "");
  let variantsRaw: unknown = [];
  try {
    variantsRaw = JSON.parse(String(formData.get("variants") || "[]"));
  } catch {
    variantsRaw = [];
  }
  const parsed = productSchema.safeParse({
    title: formData.get("title"),
    titleEn: formData.get("titleEn") || undefined,
    slug: formData.get("slug"),
    description: formData.get("description"),
    descriptionEn: formData.get("descriptionEn") || undefined,
    price: formData.get("price"),
    compareAtPrice: formData.get("compareAtPrice") || null,
    stock: formData.get("stock"),
    images: formData.get("images"),
    categoryId: formData.get("categoryId") || null,
    featured: formData.get("featured") === "on",
    active: formData.get("active") === "on",
    variants: variantsRaw as never,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "表单校验失败" };
  }
  const d = parsed.data;

  const clash = await prisma.product.findFirst({
    where: { slug: d.slug, id: { not: id } },
  });
  if (clash) return { error: "Slug 已被占用，请更换" };

  const imageLines = d.images
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);

  await prisma.$transaction(async (tx) => {
    await tx.variant.deleteMany({ where: { productId: id } });
    await tx.product.update({
      where: { id },
      data: {
        title: d.title,
        titleEn: d.titleEn || null,
        slug: d.slug,
        description: d.description,
        descriptionEn: d.descriptionEn || null,
        price: d.price,
        compareAtPrice: d.compareAtPrice ?? null,
        stock: d.stock,
        images: JSON.stringify(imageLines),
        categoryId: d.categoryId || null,
        featured: d.featured,
        active: d.active,
        variants: d.variants?.length
          ? { create: d.variants.map((v) => ({ name: v.name, nameEn: v.nameEn || null, value: v.value, valueEn: v.valueEn || null })) }
          : undefined,
      },
    });
  });
  revalidateAdmin();
  redirect("/admin/products");
}

export async function deleteProductAction(id: string): Promise<void> {
  await requireAdmin();
  await prisma.product.delete({ where: { id } });
  revalidateAdmin();
}

export async function toggleProductAction(id: string): Promise<void> {
  await requireAdmin();
  const product = await prisma.product.findUnique({ where: { id } });
  if (product) {
    await prisma.product.update({
      where: { id },
      data: { active: !product.active },
    });
  }
  revalidateAdmin();
}

/* ---------------- 分类 ---------------- */

/** 供 <form action> 直接使用的包装（返回 void） */
export async function createCategoryFormAction(formData: FormData): Promise<void> {
  await createCategoryAction(undefined, formData);
}

export async function createCategoryAction(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  await requireAdmin();
  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    nameEn: formData.get("nameEn") || undefined,
    slug: formData.get("slug") || slugify(String(formData.get("name") || "")),
    description: formData.get("description") || undefined,
    order: formData.get("order") || 0,
  });
  if (!parsed.success) return { error: "表单校验失败" };
  await prisma.category.create({ data: parsed.data as never });
  revalidateAdmin();
  redirect("/admin/categories");
}

export async function updateCategoryAction(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  await requireAdmin();
  const id = String(formData.get("id") || "");
  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    nameEn: formData.get("nameEn") || undefined,
    slug: formData.get("slug"),
    description: formData.get("description") || undefined,
    order: formData.get("order") || 0,
  });
  if (!parsed.success) return { error: "表单校验失败" };
  await prisma.category.update({ where: { id }, data: parsed.data as never });
  revalidateAdmin();
  redirect("/admin/categories");
}

export async function deleteCategoryAction(id: string): Promise<void> {
  await requireAdmin();
  await prisma.category.delete({ where: { id } });
  revalidateAdmin();
}

/* ---------------- 订单 ---------------- */

/** 订单状态机：只允许合法流转，服务端强制校验 */
const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["PAID", "CANCELLED"],
  PAID: ["SHIPPED"],
  SHIPPED: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
};

export async function updateOrderStatusAction(
  orderId: string,
  status: OrderStatus
): Promise<void> {
  await requireAdmin();
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return;
  if (!ALLOWED_TRANSITIONS[order.status]?.includes(status)) return;

  // 发货时生成模拟物流单号（幂等：已有单号则沿用）
  const trackingNumber =
    status === "SHIPPED"
      ? order.trackingNumber || randomTrackingNumber()
      : order.trackingNumber;

  await prisma.$transaction([
    prisma.order.update({
      where: { id: orderId },
      data: { status, trackingNumber },
    }),
    prisma.orderEvent.create({
      data: { orderId, status, note: statusNote(status) },
    }),
  ]);
  revalidateAdmin();
  revalidatePath("/", "layout");
}

/** 后台流转时写入的备注文案 key */
function statusNote(status: OrderStatus): string | null {
  switch (status) {
    case "PAID":
      return "logPaid";
    case "SHIPPED":
      return "logShipped";
    case "COMPLETED":
      return "logCompleted";
    case "CANCELLED":
      return "logCancelled";
    default:
      return null;
  }
}

export async function deleteReviewAction(id: string): Promise<void> {
  await requireAdmin();
  await prisma.review.delete({ where: { id } });
  revalidateAdmin();
}

/* ---------------- 邮件 ---------------- */

/** 运行评价邀请邮件任务（模拟每日定时发送），返回本次新发送数 */
export async function runReviewInviteEmailJobAction(): Promise<{ sent: number }> {
  await requireAdmin();
  const { sent } = await runReviewInviteEmailJob();
  revalidatePath("/admin/emails");
  return { sent };
}
