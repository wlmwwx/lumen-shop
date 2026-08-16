/**
 * Tests for lib/payments.ts - Payment Provider
 */

import { describe, it, expect, beforeEach } from "vitest";
import { MockPaymentProvider, paymentProvider } from "@/lib/payments";

describe("MockPaymentProvider", () => {
  let provider: MockPaymentProvider;

  beforeEach(() => {
    provider = new MockPaymentProvider();
  });

  it("should have correct name", () => {
    expect(provider.name).toBe("MockPayment");
  });

  it("should return success for valid charge", async () => {
    const result = await provider.charge({
      orderId: "order_123",
      amount: 100,
      method: "模拟支付",
    });

    expect(result.success).toBe(true);
    expect(result.transactionId).toBeDefined();
    expect(result.transactionId).toMatch(/^MOCK-\d+$/);
    expect(result.message).toContain("模拟支付成功");
    expect(result.message).toContain("100");
  });

  it("should include orderId in message", async () => {
    const result = await provider.charge({
      orderId: "LN123456",
      amount: 299,
      method: "PayPal",
    });

    expect(result.message).toContain("LN123456");
  });

  it("should handle different payment methods", async () => {
    const methods = ["模拟支付 · 微信", "模拟支付 · 支付宝", "PayPal"];

    for (const method of methods) {
      const result = await provider.charge({
        orderId: `order_${method}`,
        amount: 50,
        method,
      });
      expect(result.success).toBe(true);
      expect(result.message).toContain(method);
    }
  });
});

describe("paymentProvider singleton", () => {
  it("should be an instance of MockPaymentProvider", () => {
    expect(paymentProvider).toBeInstanceOf(MockPaymentProvider);
  });

  it("should have name property", () => {
    expect(paymentProvider.name).toBe("MockPayment");
  });
});
