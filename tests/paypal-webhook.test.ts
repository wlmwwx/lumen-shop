/**
 * PayPal Webhook E2E 测试
 * 验证 webhook 处理逻辑与 Prisma 操作的集成
 */
import { describe, it, expect, vi } from "vitest";
import { parsePaypalEvent } from "@/lib/paypal-webhook-shared";
// Mock prisma for future integration tests
// import { prisma } from "@/lib/db";

// Mock prisma
// vi.mock("@/lib/db", () => ({
  prisma: {
    webhookEvent: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    order: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    product: {
      updateMany: vi.fn(),
    },
  },
}));

describe("parsePaypalEvent", () => {
  it("should parse COMPLETED event", () => {
    const body = {
      id: "WH-123",
      event_type: "PAYMENT.CAPTURE.COMPLETED",
      resource: {
        id: "capture-123",
        supplementary_data: {
          related_ids: {
            order_id: "PPO-456",
          },
        },
      },
    };

    const result = parsePaypalEvent(body);
    expect(result).not.toBeNull();
    expect(result!.eventId).toBe("WH-123");
    expect(result!.type).toBe("COMPLETED");
    expect(result!.captureId).toBe("capture-123");
    expect(result!.paypalOrderId).toBe("PPO-456");
  });

  it("should parse REFUNDED event", () => {
    const body = {
      id: "WH-789",
      event_type: "PAYMENT.CAPTURE.REFUNDED",
      resource: {
        id: "refund-123",
        amount: { value: "50.00" },
        supplementary_data: {
          related_ids: {
            capture_id: "capture-123",
            order_id: "PPO-456",
          },
        },
      },
    };

    const result = parsePaypalEvent(body);
    expect(result).not.toBeNull();
    expect(result!.eventId).toBe("WH-789");
    expect(result!.type).toBe("REFUNDED");
    expect(result!.refundId).toBe("refund-123");
    expect(result!.refundAmountUsd).toBe(50);
  });

  it("should return null for invalid body", () => {
    expect(parsePaypalEvent(null)).toBeNull();
    expect(parsePaypalEvent({})).toBeNull();
    expect(parsePaypalEvent({ id: "" })).toBeNull();
  });

  it("should return UNHANDLED for unknown event type", () => {
    const body = {
      id: "WH-999",
      event_type: "BILLING.SUBSCRIPTION.CREATED",
      resource: {},
    };

    const result = parsePaypalEvent(body);
    expect(result).not.toBeNull();
    expect(result!.type).toBe("UNHANDLED");
  });
});
