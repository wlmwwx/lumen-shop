/**
 * Tests for lib/order.ts - Checkout logic
 * Tests the pure business logic of buildOrderFromForm
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildOrderFromForm, type CheckoutFieldValues } from "@/lib/order";
import type { Product } from "@prisma/client";

// Mock prisma
vi.mock("@/lib/db", () => ({
  prisma: {
    product: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/db";

describe("buildOrderFromForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const validValues: CheckoutFieldValues = {
    customerName: "张三",
    customerEmail: "test@example.com",
    phone: "13800138000",
    province: "广东省",
    city: "深圳市",
    address: "南山区科技园路100号",
    shippingMethod: "standard",
    paymentMethod: "模拟支付",
    items: [
      { productId: "prod_1", quantity: 2 },
      { productId: "prod_2", quantity: 1 },
    ],
  };

  const mockProducts: Product[] = [
    { id: "prod_1", title: "商品1", price: 100, stock: 10, active: true, slug: "prod-1", description: "", images: "", currency: "CNY", compareAtPrice: null, categoryId: null, featured: false, createdAt: new Date(), titleEn: null, descriptionEn: null } as Product,
    { id: "prod_2", title: "商品2", price: 50, stock: 5, active: true, slug: "prod-2", description: "", images: "", currency: "CNY", compareAtPrice: null, categoryId: null, featured: false, createdAt: new Date(), titleEn: null, descriptionEn: null } as Product,
  ];

  describe("form validation", () => {
    it("should reject empty customerName", async () => {
      const result = await buildOrderFromForm({
        ...validValues,
        customerName: "",
      });
      expect(result.ok).toBe(false);
    });

    it("should reject invalid email", async () => {
      const result = await buildOrderFromForm({
        ...validValues,
        customerEmail: "invalid",
      });
      expect(result.ok).toBe(false);
    });

    it("should reject short phone", async () => {
      const result = await buildOrderFromForm({
        ...validValues,
        phone: "123",
      });
      expect(result.ok).toBe(false);
    });

    it("should reject short address", async () => {
      const result = await buildOrderFromForm({
        ...validValues,
        address: "深圳",
      });
      expect(result.ok).toBe(false);
    });

    it("should reject empty items", async () => {
      const result = await buildOrderFromForm({
        ...validValues,
        items: [],
      });
      expect(result.ok).toBe(false);
    });

    it("should reject invalid shipping method", async () => {
      const result = await buildOrderFromForm({
        ...validValues,
        shippingMethod: "invalid_method",
      });
      expect(result.ok).toBe(false);
    });
  });

  describe("product lookup", () => {
    it("should reject if product not found", async () => {
      vi.mocked(prisma.product.findMany).mockResolvedValue([]);

      const result = await buildOrderFromForm(validValues);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("已下架");
      }
    });

    it("should reject if product is inactive", async () => {
      vi.mocked(prisma.product.findMany).mockResolvedValue([mockProducts[0]!]);

      const result = await buildOrderFromForm(validValues);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("已下架");
      }
    });

    it("should reject if stock is insufficient", async () => {
      const lowStockProduct = { ...mockProducts[1]!, stock: 0 };
      vi.mocked(prisma.product.findMany).mockResolvedValue([mockProducts[0]!, lowStockProduct]);

      const result = await buildOrderFromForm(validValues);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("库存不足");
      }
    });
  });

  describe("price calculation", () => {
    it("should calculate correct subtotal from DB prices", async () => {
      vi.mocked(prisma.product.findMany).mockResolvedValue(mockProducts);

      const result = await buildOrderFromForm(validValues);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.subtotal).toBe(250);
      }
    });

    it("should calculate correct shipping fee for standard", async () => {
      vi.mocked(prisma.product.findMany).mockResolvedValue(mockProducts);

      const result = await buildOrderFromForm(validValues);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.shippingFee).toBe(12);
      }
    });

    it("should waive standard shipping when over threshold", async () => {
      const expensiveProduct = { ...mockProducts[0]!, price: 300 };
      vi.mocked(prisma.product.findMany).mockResolvedValue([expensiveProduct]);

      const result = await buildOrderFromForm({
        ...validValues,
        items: [{ productId: "prod_1", quantity: 1 }],
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.shippingFee).toBe(0);
      }
    });

    it("should charge express shipping fee", async () => {
      vi.mocked(prisma.product.findMany).mockResolvedValue(mockProducts);

      const result = await buildOrderFromForm({
        ...validValues,
        shippingMethod: "express",
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.shippingFee).toBe(25);
      }
    });

    it("should charge no fee for pickup", async () => {
      vi.mocked(prisma.product.findMany).mockResolvedValue(mockProducts);

      const result = await buildOrderFromForm({
        ...validValues,
        shippingMethod: "pickup",
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.shippingFee).toBe(0);
      }
    });
  });

  describe("order items building", () => {
    it("should build correct order items", async () => {
      vi.mocked(prisma.product.findMany).mockResolvedValue(mockProducts);

      const result = await buildOrderFromForm(validValues);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.orderItems).toHaveLength(2);
        expect(result.orderItems[0]).toMatchObject({
          productId: "prod_1",
          title: "商品1",
          price: 100,
          quantity: 2,
        });
      }
    });

    it("should include variant info when provided", async () => {
      vi.mocked(prisma.product.findMany).mockResolvedValue([mockProducts[0]!]);

      const result = await buildOrderFromForm({
        ...validValues,
        items: [{ productId: "prod_1", quantity: 1, variant: "蓝色/M" }],
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.orderItems[0]!.variantInfo).toBe("蓝色/M");
      }
    });
  });

  describe("shipping method validation", () => {
    it("should return method object for valid shipping", async () => {
      vi.mocked(prisma.product.findMany).mockResolvedValue(mockProducts);

      const result = await buildOrderFromForm(validValues);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.method.id).toBe("standard");
        expect(result.method.name).toBe("标准配送");
      }
    });
  });
});
