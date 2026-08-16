/**
 * Tests for lib/paypal-webhook-shared.ts - PayPal webhook parsing & status labels
 */

import { describe, it, expect } from "vitest";
import {
  parsePaypalEvent,
  PAYPAL_STATUS_LABEL,
  PAYPAL_STATUS_STYLES,
} from "@/lib/paypal-webhook-shared";

describe("parsePaypalEvent", () => {
  it("returns null for non-object / missing id", () => {
    expect(parsePaypalEvent(null)).toBeNull();
    expect(parsePaypalEvent("foo")).toBeNull();
    expect(parsePaypalEvent({})).toBeNull();
    expect(parsePaypalEvent({ event_type: "PAYMENT.CAPTURE.COMPLETED" })).toBeNull();
  });

  it("parses PAYMENT.CAPTURE.COMPLETED with capture id", () => {
    const ev = parsePaypalEvent({
      id: "WH-123",
      event_type: "PAYMENT.CAPTURE.COMPLETED",
      resource: {
        id: "CAP-ABC",
        status: "COMPLETED",
        supplementary_data: {
          related_ids: { order_id: "PO-999" },
        },
      },
    });
    expect(ev).toEqual({
      eventId: "WH-123",
      type: "COMPLETED",
      captureId: "CAP-ABC",
      refundId: undefined,
      paypalOrderId: "PO-999",
    });
  });

  it("parses PAYMENT.CAPTURE.REFUNDED (refund resource + related capture + amount)", () => {
    const ev = parsePaypalEvent({
      id: "WH-456",
      event_type: "PAYMENT.CAPTURE.REFUNDED",
      resource: {
        id: "REF-777",
        status: "COMPLETED",
        amount: { currency_code: "USD", value: "3.00" },
        supplementary_data: {
          related_ids: { order_id: "PO-999", capture_id: "CAP-ABC" },
        },
      },
    });
    expect(ev).toEqual({
      eventId: "WH-456",
      type: "REFUNDED",
      captureId: "CAP-ABC",
      refundId: "REF-777",
      refundAmountUsd: 3,
      paypalOrderId: "PO-999",
    });
  });

  it("REFUNDED without amount leaves refundAmountUsd undefined", () => {
    const ev = parsePaypalEvent({
      id: "WH-456b",
      event_type: "PAYMENT.CAPTURE.REFUNDED",
      resource: { id: "REF-778" },
    });
    expect(ev?.refundAmountUsd).toBeUndefined();
  });

  it("parses DENIED / REVERSED / PENDING", () => {
    for (const [et, type] of [
      ["PAYMENT.CAPTURE.DENIED", "DENIED"],
      ["PAYMENT.CAPTURE.REVERSED", "REVERSED"],
      ["PAYMENT.CAPTURE.PENDING", "PENDING"],
    ] as const) {
      const ev = parsePaypalEvent({
        id: "WH-x",
        event_type: et,
        resource: { id: "CAP-1" },
      });
      expect(ev?.type).toBe(type);
      expect(ev?.captureId).toBe("CAP-1");
    }
  });

  it("maps unknown event types to UNHANDLED", () => {
    const ev = parsePaypalEvent({
      id: "WH-888",
      event_type: "PAYMENT.CAPTURE.PARTIALLY_REFUNDED",
      resource: { id: "REF-1" },
    });
    expect(ev?.type).toBe("UNHANDLED");
  });

  it("tolerates missing resource / related_ids", () => {
    const ev = parsePaypalEvent({ id: "WH-1", event_type: "PAYMENT.CAPTURE.COMPLETED" });
    expect(ev?.type).toBe("COMPLETED");
    expect(ev?.captureId).toBeUndefined();
  });
});

describe("PAYPAL_STATUS_LABEL / STYLES", () => {
  it("covers the synced statuses", () => {
    for (const s of [
      "COMPLETED",
      "REFUNDED",
      "PARTIALLY_REFUNDED",
      "DENIED",
      "REVERSED",
      "PENDING",
    ]) {
      expect(PAYPAL_STATUS_LABEL[s]).toBeTruthy();
      expect(PAYPAL_STATUS_STYLES[s]).toBeTruthy();
    }
  });
});
