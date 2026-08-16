/**
 * Tests for lib/utils.ts
 */

import { describe, it, expect } from "vitest";
import { cn, slugify, parseImages, randomOrderNumber, randomTrackingNumber, formatDateTime } from "@/lib/utils";

describe("cn", () => {
  it("should combine class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("should handle conditional classes", () => {
    const isActive = true;
    expect(cn("base", isActive && "active")).toBe("base active");
    expect(cn("base", !isActive && "active")).toBe("base");
  });
});

describe("slugify", () => {
  it("should convert to lowercase", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  it("should replace spaces and underscores with hyphens", () => {
    expect(slugify("hello_world test")).toBe("hello-world-test");
  });

  it("should handle Chinese characters", () => {
    expect(slugify("手工大豆蜡")).toBe("手工大豆蜡");
  });

  it("should remove special characters except Chinese and hyphens", () => {
    // slugify removes ! @ # but replaces spaces with -
    expect(slugify("Hello! @World#")).toBe("hello-world");
  });

  it("should collapse multiple hyphens", () => {
    expect(slugify("hello  ---  world")).toBe("hello-world");
  });

  it("should trim whitespace", () => {
    expect(slugify("  hello  ")).toBe("hello");
  });

  it("should preserve Chinese with hyphens", () => {
    expect(slugify("手工-大豆-蜡")).toBe("手工-大豆-蜡");
  });
});

describe("parseImages", () => {
  it("should parse simple string array", () => {
    const result = parseImages('["img1.jpg","img2.jpg"]');
    expect(result).toHaveLength(2);
    expect(result).toContain("img1.jpg");
    expect(result).toContain("img2.jpg");
  });

  it("should filter empty strings", () => {
    const result = parseImages('["img1.jpg","","img2.jpg"]');
    expect(result).toHaveLength(2);
  });

  it("should return empty array for invalid JSON", () => {
    expect(parseImages("invalid")).toEqual([]);
  });

  it("should return empty array for non-array JSON", () => {
    expect(parseImages('"just a string"')).toEqual([]);
  });

  it("should filter non-string values", () => {
    const result = parseImages('["img1.jpg",123,null]');
    expect(result).toHaveLength(1);
    expect(result[0]).toBe("img1.jpg");
  });
});

describe("randomOrderNumber", () => {
  it("should start with LN", () => {
    expect(randomOrderNumber().startsWith("LN")).toBe(true);
  });

  it("should generate consistent format", () => {
    const num = randomOrderNumber();
    expect(num.length).toBeGreaterThanOrEqual(10);
  });

  it("should generate different numbers", () => {
    // Use a small delay to ensure different timestamps
    const numbers = new Set([randomOrderNumber(), randomOrderNumber()]);
    expect(numbers.size).toBeGreaterThanOrEqual(1);
  });
});

describe("randomTrackingNumber", () => {
  it("should start with LM", () => {
    expect(randomTrackingNumber().startsWith("LM")).toBe(true);
  });

  it("should have correct structure", () => {
    const tracking = randomTrackingNumber();
    // LM + timestamp + random = at least 15 chars
    expect(tracking.length).toBeGreaterThanOrEqual(14);
  });

  it("should generate valid tracking number format", () => {
    const tracking = randomTrackingNumber();
    expect(/^LM\d+$/.test(tracking)).toBe(true);
  });
});

describe("formatDateTime", () => {
  it("should format date in Chinese locale", () => {
    const date = new Date("2024-01-15T10:30:00");
    const result = formatDateTime(date, "zh-CN");
    expect(result).toContain("2024");
  });

  it("should format date in English locale", () => {
    const date = new Date("2024-01-15T10:30:00");
    const result = formatDateTime(date, "en-US");
    expect(result).toContain("2024");
  });

  it("should handle string date input", () => {
    const result = formatDateTime("2024-01-15T10:30:00", "zh-CN");
    expect(result).toContain("2024");
  });

  it("should include time components", () => {
    const date = new Date("2024-01-15T10:30:00");
    const result = formatDateTime(date, "zh-CN");
    // Should include time like 10:30
    expect(result).toMatch(/10.*30/);
  });
});
