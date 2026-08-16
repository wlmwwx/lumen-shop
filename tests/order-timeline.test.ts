/**
 * Tests for lib/order-timeline.ts
 */

import { describe, it, expect } from "vitest";
import {
  TIMELINE_STAGES,
  FLOW_INDEX,
  LOGISTIC_NOTES,
  LOGISTIC_NOTE_ZH,
  stageStatus,
  buildTimeline,
  type StageState,
} from "@/lib/order-timeline";
import type { OrderStatus, OrderEvent } from "@prisma/client";

describe("TIMELINE_STAGES", () => {
  it("should have correct order stages", () => {
    expect(TIMELINE_STAGES).toEqual(["PENDING", "PAID", "SHIPPED", "COMPLETED"]);
  });
});

describe("FLOW_INDEX", () => {
  it("should have correct index for each status", () => {
    expect(FLOW_INDEX["PENDING"]).toBe(0);
    expect(FLOW_INDEX["PAID"]).toBe(1);
    expect(FLOW_INDEX["SHIPPED"]).toBe(2);
    expect(FLOW_INDEX["COMPLETED"]).toBe(3);
    expect(FLOW_INDEX["CANCELLED"]).toBe(-1);
  });
});

describe("LOGISTIC_NOTES", () => {
  it("should contain logistic note keys", () => {
    expect(LOGISTIC_NOTES.has("logShipped")).toBe(true);
    expect(LOGISTIC_NOTES.has("logDelivered")).toBe(true);
    expect(LOGISTIC_NOTES.has("logCompleted")).toBe(true);
  });
});

describe("LOGISTIC_NOTE_ZH", () => {
  it("should have Chinese text for logistic notes", () => {
    expect(LOGISTIC_NOTE_ZH["logShipped"]).toBe("商家已发货");
    expect(LOGISTIC_NOTE_ZH["logDelivered"]).toBe("包裹已签收，感谢你的信任！");
  });
});

describe("stageStatus", () => {
  const testCases: Array<{
    stage: OrderStatus;
    orderStatus: OrderStatus;
    expected: StageState;
  }> = [
    // Normal flow
    { stage: "PENDING", orderStatus: "PENDING", expected: "current" },
    { stage: "PENDING", orderStatus: "PAID", expected: "done" },
    { stage: "PAID", orderStatus: "PAID", expected: "current" },
    { stage: "PAID", orderStatus: "SHIPPED", expected: "done" },
    { stage: "SHIPPED", orderStatus: "SHIPPED", expected: "current" },
    { stage: "SHIPPED", orderStatus: "COMPLETED", expected: "done" },
    { stage: "COMPLETED", orderStatus: "COMPLETED", expected: "current" },

    // Cancelled order
    { stage: "PENDING", orderStatus: "CANCELLED", expected: "done" },
    { stage: "CANCELLED", orderStatus: "CANCELLED", expected: "current" },
    { stage: "PAID", orderStatus: "CANCELLED", expected: "hidden" },
    { stage: "SHIPPED", orderStatus: "CANCELLED", expected: "hidden" },

    // Future stages should be "todo"
    { stage: "PAID", orderStatus: "PENDING", expected: "todo" },
    { stage: "SHIPPED", orderStatus: "PAID", expected: "todo" },
    { stage: "COMPLETED", orderStatus: "SHIPPED", expected: "todo" },
  ];

  testCases.forEach(({ stage, orderStatus, expected }) => {
    it(`stage ${stage} with order ${orderStatus} should be ${expected}`, () => {
      expect(stageStatus(stage, orderStatus)).toBe(expected);
    });
  });
});

describe("buildTimeline", () => {
  const createMockEvent = (
    status: OrderStatus,
    note?: string | null,
    createdAt?: Date
  ): OrderEvent =>
    ({
      id: `evt_${Math.random().toString(36).substr(2, 9)}`,
      orderId: "order_123",
      status,
      note: note ?? null,
      createdAt: createdAt ?? new Date(),
    }) as OrderEvent;

  it("should extract eventByStatus from events", () => {
    const events = [
      createMockEvent("PENDING", null, new Date("2024-01-01T10:00:00")),
      createMockEvent("PAID", null, new Date("2024-01-01T10:30:00")),
      createMockEvent("SHIPPED", null, new Date("2024-01-01T11:00:00")),
    ];

    const { eventByStatus } = buildTimeline({
      status: "SHIPPED",
      events,
    });

    expect(eventByStatus.has("PENDING")).toBe(true);
    expect(eventByStatus.has("PAID")).toBe(true);
    expect(eventByStatus.has("SHIPPED")).toBe(true);
  });

  it("should only keep first event per status", () => {
    const events = [
      createMockEvent("PAID", null, new Date("2024-01-01T10:30:00")),
      createMockEvent("PAID", "logPaid", new Date("2024-01-01T10:31:00")), // duplicate
    ];

    const { eventByStatus } = buildTimeline({
      status: "PAID",
      events,
    });

    expect(eventByStatus.get("PAID")).toEqual(new Date("2024-01-01T10:30:00"));
  });

  it("should filter logistic events", () => {
    const events = [
      createMockEvent("PENDING", null),
      createMockEvent("PAID", null),
      createMockEvent("SHIPPED", "logShipped"),
      createMockEvent("SHIPPED", "logInTransit"),
    ];

    const { logistics } = buildTimeline({
      status: "SHIPPED",
      events,
    });

    expect(logistics).toHaveLength(2);
    expect(logistics[0].note).toBe("logShipped");
    expect(logistics[1].note).toBe("logInTransit");
  });

  it("should return empty logistics when no logistic notes", () => {
    const events = [
      createMockEvent("PENDING", null),
      createMockEvent("PAID", null),
    ];

    const { logistics } = buildTimeline({
      status: "PAID",
      events,
    });

    expect(logistics).toHaveLength(0);
  });

  it("should handle empty events", () => {
    const { eventByStatus } = buildTimeline({
      status: "PENDING",
      events: [],
    });

    expect(eventByStatus.size).toBe(0);
    expect(logistics).toHaveLength(0);
  });
});
