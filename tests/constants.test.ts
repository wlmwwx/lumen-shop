/**
 * Tests for lib/constants.ts
 */

import { describe, it, expect } from "vitest";
import {
  SITE_NAME,
  SITE_NAME_ZH,
  CURRENCY,
  FREE_SHIPPING_THRESHOLD,
  REVIEW_INVITE_DAYS,
  SHIPPING_METHODS,
  PAYMENT_METHODS,
  ORDER_STATUSES,
  CARRIER,
  trackingHref,
  ORDER_STATUS_LABEL,
} from "@/lib/constants";

describe("constants", () => {
  describe("site constants", () => {
    it("should have correct site name", () => {
      expect(SITE_NAME).toBe("LUMEN");
      expect(SITE_NAME_ZH).toBe("拾光生活馆");
    });

    it("should use CNY currency", () => {
      expect(CURRENCY).toBe("CNY");
    });
  });

  describe("shipping constants", () => {
    it("should have free shipping threshold", () => {
      expect(FREE_SHIPPING_THRESHOLD).toBe(299);
    });

    it("should have three shipping methods", () => {
      expect(SHIPPING_METHODS).toHaveLength(3);
    });

    it("should have standard shipping with fee", () => {
      const standard = SHIPPING_METHODS.find((m) => m.id === "standard");
      expect(standard).toBeDefined();
      expect(standard!.fee).toBe(12);
    });

    it("should have express shipping with higher fee", () => {
      const express = SHIPPING_METHODS.find((m) => m.id === "express");
      expect(express).toBeDefined();
      expect(express!.fee).toBe(25);
    });

    it("should have pickup with no fee", () => {
      const pickup = SHIPPING_METHODS.find((m) => m.id === "pickup");
      expect(pickup).toBeDefined();
      expect(pickup!.fee).toBe(0);
    });
  });

  describe("payment methods", () => {
    it("should have payment methods", () => {
      expect(PAYMENT_METHODS.length).toBeGreaterThan(0);
    });

    it("should include PayPal", () => {
      expect(PAYMENT_METHODS).toContain("PayPal");
    });
  });

  describe("order statuses", () => {
    it("should have all order statuses", () => {
      expect(ORDER_STATUSES).toContain("PENDING");
      expect(ORDER_STATUSES).toContain("PAID");
      expect(ORDER_STATUSES).toContain("SHIPPED");
      expect(ORDER_STATUSES).toContain("COMPLETED");
      expect(ORDER_STATUSES).toContain("CANCELLED");
    });
  });

  describe("review invite", () => {
    it("should have review invite days set", () => {
      expect(REVIEW_INVITE_DAYS).toBe(3);
    });
  });

  describe("carrier", () => {
    it("should have carrier info", () => {
      expect(CARRIER.name).toBeDefined();
      expect(CARRIER.nameEn).toBeDefined();
    });
  });

  describe("trackingHref", () => {
    it("should return baidu search URL with tracking number", () => {
      const trackingNumber = "LM1234567890";
      const href = trackingHref(trackingNumber);
      expect(href).toContain("baidu.com");
      expect(href).toContain(encodeURIComponent(trackingNumber));
    });
  });

  describe("ORDER_STATUS_LABEL", () => {
    it("should have labels for all statuses", () => {
      expect(ORDER_STATUS_LABEL["PENDING"]).toEqual({ zh: "待支付", en: "Pending" });
      expect(ORDER_STATUS_LABEL["PAID"]).toEqual({ zh: "已支付", en: "Paid" });
      expect(ORDER_STATUS_LABEL["SHIPPED"]).toEqual({ zh: "已发货", en: "Shipped" });
      expect(ORDER_STATUS_LABEL["COMPLETED"]).toEqual({ zh: "已完成", en: "Completed" });
      expect(ORDER_STATUS_LABEL["CANCELLED"]).toEqual({ zh: "已取消", en: "Cancelled" });
    });
  });
});
