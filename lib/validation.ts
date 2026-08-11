import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(1, "请输入姓名").max(40),
  email: z.string().email("邮箱格式不正确"),
  password: z.string().min(6, "密码至少 6 位").max(72),
});

export const loginSchema = z.object({
  email: z.string().email("邮箱格式不正确"),
  password: z.string().min(1, "请输入密码"),
});

export const reviewSchema = z.object({
  productId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(2, "评论至少 2 个字").max(1000),
});

export const cartItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1).max(99),
  variant: z.string().optional(),
});

export const checkoutSchema = z.object({
  customerName: z.string().min(1, "请输入收货人姓名"),
  customerEmail: z.string().email("邮箱格式不正确"),
  phone: z.string().min(6, "请输入联系电话"),
  province: z.string().min(1, "请输入省份"),
  city: z.string().min(1, "请输入城市"),
  address: z.string().min(4, "请输入详细地址"),
  postalCode: z.string().optional(),
  shippingMethod: z.enum(["standard", "express", "pickup"]),
  paymentMethod: z.string().min(1),
  items: z.array(cartItemSchema).min(1, "购物车为空"),
});

export const productSchema = z.object({
  title: z.string().min(1).max(120),
  titleEn: z.string().max(120).optional().or(z.literal("")),
  slug: z.string().min(1).max(120),
  description: z.string().min(1).max(5000),
  descriptionEn: z.string().max(5000).optional().or(z.literal("")),
  price: z.coerce.number().min(0),
  compareAtPrice: z.coerce.number().min(0).optional().nullable(),
  stock: z.coerce.number().int().min(0),
  images: z.string().min(1, "至少填写一张图片 URL"),
  categoryId: z.string().optional().nullable(),
  featured: z.boolean().optional(),
  active: z.boolean().optional(),
  variants: z
    .array(
      z.object({
        id: z.string().optional(),
        name: z.string(),
        nameEn: z.string().optional().or(z.literal("")),
        value: z.string(),
        valueEn: z.string().optional().or(z.literal("")),
      })
    )
    .optional(),
});

export const categorySchema = z.object({
  name: z.string().min(1),
  nameEn: z.string().optional().or(z.literal("")),
  slug: z.string().min(1),
  description: z.string().optional().or(z.literal("")),
  order: z.coerce.number().int().default(0),
});
