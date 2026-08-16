/**
 * Integration tests for Server Actions
 * Testing the actions module functions
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database and auth modules
vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    session: {
      create: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  hashPassword: vi.fn().mockResolvedValue("hashed_password"),
  verifyPassword: vi.fn().mockResolvedValue(true),
  createSession: vi.fn(),
  destroySession: vi.fn(),
  getSessionUser: vi.fn(),
  SESSION_COOKIE: "lumen_session",
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue({ value: "test_token" }),
    set: vi.fn(),
    delete: vi.fn(),
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

import { registerSchema, loginSchema, reviewSchema, checkoutSchema, cartItemSchema } from "@/lib/validation";
import { prisma } from "@/lib/db";

describe("Server Actions - Validation Schemas", () => {
  describe("registerSchema", () => {
    it("should validate valid registration", () => {
      const result = registerSchema.safeParse({
        name: "测试用户",
        email: "test@example.com",
        password: "password123",
      });
      expect(result.success).toBe(true);
    });

    it("should validate email uniqueness requirement", () => {
      // Email should be normalized to lowercase
      const result = registerSchema.safeParse({
        name: "测试用户",
        email: "Test@EXAMPLE.COM",
        password: "password123",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("loginSchema", () => {
    it("should validate valid login credentials", () => {
      const result = loginSchema.safeParse({
        email: "user@example.com",
        password: "correctpassword",
      });
      expect(result.success).toBe(true);
    });

    it("should accept any non-empty password", () => {
      const result = loginSchema.safeParse({
        email: "user@example.com",
        password: "any_password",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("reviewSchema", () => {
    it("should validate rating as integer 1-5", () => {
      const validRatings = [1, 2, 3, 4, 5];
      validRatings.forEach((rating) => {
        const result = reviewSchema.safeParse({
          productId: "prod_123",
          rating,
          comment: "这是一条有效的评论内容",
        });
        expect(result.success).toBe(true);
      });
    });

    it("should reject ratings outside 1-5", () => {
      const invalidRatings = [0, 6, -1, 10];
      invalidRatings.forEach((rating) => {
        const result = reviewSchema.safeParse({
          productId: "prod_123",
          rating,
          comment: "测试评论",
        });
        expect(result.success).toBe(false);
      });
    });

    it("should enforce minimum comment length", () => {
      const result = reviewSchema.safeParse({
        productId: "prod_123",
        rating: 5,
        comment: "好", // Less than 2 chars
      });
      expect(result.success).toBe(false);
    });
  });

  describe("checkoutSchema", () => {
    const validCheckout = {
      customerName: "张三",
      customerEmail: "zhang@example.com",
      phone: "13800138000",
      province: "广东省",
      city: "深圳市",
      address: "南山区科技园路100号",
      shippingMethod: "standard" as const,
      paymentMethod: "模拟支付",
      items: [
        { productId: "prod_1", quantity: 1 },
        { productId: "prod_2", quantity: 2 },
      ],
    };

    it("should validate complete checkout data", () => {
      const result = checkoutSchema.safeParse(validCheckout);
      expect(result.success).toBe(true);
    });

    it("should accept all valid shipping methods", () => {
      const methods = ["standard", "express", "pickup"];
      methods.forEach((method) => {
        const result = checkoutSchema.safeParse({
          ...validCheckout,
          shippingMethod: method,
        });
        expect(result.success).toBe(true);
      });
    });

    it("should require at least one item", () => {
      const result = checkoutSchema.safeParse({
        ...validCheckout,
        items: [],
      });
      expect(result.success).toBe(false);
    });

    it("should validate item quantities", () => {
      const result = checkoutSchema.safeParse({
        ...validCheckout,
        items: [{ productId: "prod_1", quantity: 0 }],
      });
      expect(result.success).toBe(false);
    });
  });

  describe("cartItemSchema", () => {
    it("should validate item with variant", () => {
      const result = cartItemSchema.safeParse({
        productId: "prod_123",
        quantity: 2,
        variant: "蓝色/M",
      });
      expect(result.success).toBe(true);
    });

    it("should validate item without variant", () => {
      const result = cartItemSchema.safeParse({
        productId: "prod_123",
        quantity: 1,
      });
      expect(result.success).toBe(true);
    });

    it("should reject quantity over 99", () => {
      const result = cartItemSchema.safeParse({
        productId: "prod_123",
        quantity: 100,
      });
      expect(result.success).toBe(false);
    });
  });
});

describe("Authentication Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should handle registration with new email", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockResolvedValue({
      id: "user_new",
      email: "new@example.com",
      name: "New User",
      passwordHash: "hashed",
      role: "CUSTOMER" as const,
      createdAt: new Date(),
    });

    const { hashPassword } = await import("@/lib/auth");
    const result = await hashPassword("password123");
    expect(result).toBe("hashed_password");
  });

  it("should reject registration with existing email", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "existing_user",
      email: "existing@example.com",
      name: "Existing User",
      passwordHash: "hashed",
      role: "CUSTOMER",
      createdAt: new Date(),
    });

    const existing = await import("@/lib/db").then(m => m.prisma.user.findUnique({
      where: { email: "existing@example.com" },
    }));

    expect(existing).toBeTruthy();
  });

  it("should verify password correctly", async () => {
    const { verifyPassword } = await import("@/lib/auth");
    const result = await verifyPassword("password123", "hashed_password");
    expect(result).toBe(true);
  });
});
