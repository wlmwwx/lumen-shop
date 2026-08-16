/**
 * Tests for lib/validation.ts - Zod schemas
 */

import { describe, it, expect } from "vitest";
import {
  registerSchema,
  loginSchema,
  reviewSchema,
  cartItemSchema,
  checkoutSchema,
  productSchema,
  categorySchema,
} from "@/lib/validation";

describe("registerSchema", () => {
  it("should validate valid registration data", () => {
    const result = registerSchema.safeParse({
      name: "张三",
      email: "test@example.com",
      password: "123456",
    });
    expect(result.success).toBe(true);
  });

  it("should reject empty name", () => {
    const result = registerSchema.safeParse({
      name: "",
      email: "test@example.com",
      password: "123456",
    });
    expect(result.success).toBe(false);
  });

  it("should reject invalid email", () => {
    const result = registerSchema.safeParse({
      name: "张三",
      email: "not-an-email",
      password: "123456",
    });
    expect(result.success).toBe(false);
  });

  it("should reject short password", () => {
    const result = registerSchema.safeParse({
      name: "张三",
      email: "test@example.com",
      password: "123",
    });
    expect(result.success).toBe(false);
  });

  it("should reject name longer than 40 chars", () => {
    const result = registerSchema.safeParse({
      name: "a".repeat(41),
      email: "test@example.com",
      password: "123456",
    });
    expect(result.success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("should validate valid login data", () => {
    const result = loginSchema.safeParse({
      email: "test@example.com",
      password: "password123",
    });
    expect(result.success).toBe(true);
  });

  it("should reject empty email", () => {
    const result = loginSchema.safeParse({
      email: "",
      password: "password",
    });
    expect(result.success).toBe(false);
  });

  it("should reject empty password", () => {
    const result = loginSchema.safeParse({
      email: "test@example.com",
      password: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("reviewSchema", () => {
  it("should validate valid review", () => {
    const result = reviewSchema.safeParse({
      productId: "prod_123",
      rating: 5,
      comment: "非常好用的产品！",
    });
    expect(result.success).toBe(true);
  });

  it("should reject rating below 1", () => {
    const result = reviewSchema.safeParse({
      productId: "prod_123",
      rating: 0,
      comment: "不错",
    });
    expect(result.success).toBe(false);
  });

  it("should reject rating above 5", () => {
    const result = reviewSchema.safeParse({
      productId: "prod_123",
      rating: 6,
      comment: "不错",
    });
    expect(result.success).toBe(false);
  });

  it("should reject comment shorter than 2 chars", () => {
    const result = reviewSchema.safeParse({
      productId: "prod_123",
      rating: 4,
      comment: "好",
    });
    expect(result.success).toBe(false);
  });
});

describe("cartItemSchema", () => {
  it("should validate valid cart item", () => {
    const result = cartItemSchema.safeParse({
      productId: "prod_123",
      quantity: 2,
    });
    expect(result.success).toBe(true);
  });

  it("should accept optional variant", () => {
    const result = cartItemSchema.safeParse({
      productId: "prod_123",
      quantity: 1,
      variant: "蓝色/M",
    });
    expect(result.success).toBe(true);
  });

  it("should reject quantity below 1", () => {
    const result = cartItemSchema.safeParse({
      productId: "prod_123",
      quantity: 0,
    });
    expect(result.success).toBe(false);
  });

  it("should reject quantity above 99", () => {
    const result = cartItemSchema.safeParse({
      productId: "prod_123",
      quantity: 100,
    });
    expect(result.success).toBe(false);
  });
});

describe("checkoutSchema", () => {
  const validBase = {
    customerName: "张三",
    customerEmail: "test@example.com",
    phone: "13800138000",
    province: "广东省",
    city: "深圳市",
    address: "南山区科技园路100号",
    shippingMethod: "standard" as const,
    paymentMethod: "模拟支付",
    items: [{ productId: "prod_123", quantity: 1 }],
  };

  it("should validate valid checkout data", () => {
    const result = checkoutSchema.safeParse(validBase);
    expect(result.success).toBe(true);
  });

  it("should accept optional postalCode", () => {
    const result = checkoutSchema.safeParse({
      ...validBase,
      postalCode: "518000",
    });
    expect(result.success).toBe(true);
  });

  it("should reject empty customerName", () => {
    const result = checkoutSchema.safeParse({
      ...validBase,
      customerName: "",
    });
    expect(result.success).toBe(false);
  });

  it("should reject short address", () => {
    const result = checkoutSchema.safeParse({
      ...validBase,
      address: "深圳",
    });
    expect(result.success).toBe(false);
  });

  it("should reject empty items array", () => {
    const result = checkoutSchema.safeParse({
      ...validBase,
      items: [],
    });
    expect(result.success).toBe(false);
  });

  it("should accept express shipping", () => {
    const result = checkoutSchema.safeParse({
      ...validBase,
      shippingMethod: "express",
    });
    expect(result.success).toBe(true);
  });

  it("should accept pickup shipping", () => {
    const result = checkoutSchema.safeParse({
      ...validBase,
      shippingMethod: "pickup",
    });
    expect(result.success).toBe(true);
  });

  it("should reject invalid shipping method", () => {
    const result = checkoutSchema.safeParse({
      ...validBase,
      shippingMethod: "invalid",
    });
    expect(result.success).toBe(false);
  });
});

describe("productSchema", () => {
  const validProduct = {
    title: "手工香薰蜡烛",
    titleEn: "Handmade Candle",
    slug: "handmade-candle",
    description: "优质大豆蜡香薰蜡烛",
    descriptionEn: "Premium soy wax candle",
    price: 89,
    stock: 100,
    images: "https://example.com/candle.jpg",
    categoryId: "cat_123",
    featured: true,
    active: true,
    variants: [],
  };

  it("should validate valid product", () => {
    const result = productSchema.safeParse(validProduct);
    expect(result.success).toBe(true);
  });

  it("should accept empty titleEn", () => {
    const result = productSchema.safeParse({
      ...validProduct,
      titleEn: "",
    });
    expect(result.success).toBe(true);
  });

  it("should accept null compareAtPrice", () => {
    const result = productSchema.safeParse({
      ...validProduct,
      compareAtPrice: null,
    });
    expect(result.success).toBe(true);
  });

  it("should accept variants with optional id", () => {
    const result = productSchema.safeParse({
      ...validProduct,
      variants: [
        { name: "颜色", nameEn: "Color", value: "红色", valueEn: "Red" },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("should reject empty title", () => {
    const result = productSchema.safeParse({
      ...validProduct,
      title: "",
    });
    expect(result.success).toBe(false);
  });

  it("should reject negative price", () => {
    const result = productSchema.safeParse({
      ...validProduct,
      price: -10,
    });
    expect(result.success).toBe(false);
  });

  it("should reject empty images", () => {
    const result = productSchema.safeParse({
      ...validProduct,
      images: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("categorySchema", () => {
  it("should validate valid category", () => {
    const result = categorySchema.safeParse({
      name: "家居生活",
      nameEn: "Home Living",
      slug: "home-living",
      description: "家居用品",
    });
    expect(result.success).toBe(true);
  });

  it("should allow optional fields", () => {
    const result = categorySchema.safeParse({
      name: "家居生活",
      slug: "home-living",
    });
    expect(result.success).toBe(true);
  });

  it("should default order to 0", () => {
    const result = categorySchema.safeParse({
      name: "家居生活",
      slug: "home-living",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.order).toBe(0);
    }
  });

  it("should reject empty name", () => {
    const result = categorySchema.safeParse({
      name: "",
      slug: "home-living",
    });
    expect(result.success).toBe(false);
  });
});
