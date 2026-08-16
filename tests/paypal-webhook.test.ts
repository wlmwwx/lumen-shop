/**
 * PayPal Webhook 解析函数测试
 */
import { describe, it, expect } from "vitest";
import { parsePaypalEvent } from "@/lib/paypal-webhook-shared";

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

  it("should parse DENIED event", () => {
    const body = {
      id: "WH-DENY-1",
      event_type: "PAYMENT.CAPTURE.DENIED",
      resource: {
        id: "capture-denied-1",
      },
    };

    const result = parsePaypalEvent(body);
    expect(result).not.toBeNull();
    expect(result!.type).toBe("DENIED");
    expect(result!.captureId).toBe("capture-denied-1");
  });

  it("should parse REVERSED event", () => {
    const body = {
      id: "WH-REV-1",
      event_type: "PAYMENT.CAPTURE.REVERSED",
      resource: {
        id: "capture-reversed-1",
      },
    };

    const result = parsePaypalEvent(body);
    expect(result).not.toBeNull();
    expect(result!.type).toBe("REVERSED");
  });

  it("should parse PENDING event", () => {
    const body = {
      id: "WH-PEND-1",
      event_type: "PAYMENT.CAPTURE.PENDING",
      resource: {
        id: "capture-pending-1",
      },
    };

    const result = parsePaypalEvent(body);
    expect(result).not.toBeNull();
    expect(result!.type).toBe("PENDING");
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
