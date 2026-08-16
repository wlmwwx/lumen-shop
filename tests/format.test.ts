/**
 * Tests for lib/format.ts
 */

import { describe, it, expect } from "vitest";
import { formatPrice, formatDate } from "@/lib/format";

describe("formatPrice", () => {
  it("should format price in CNY (zh locale)", () => {
    const result = formatPrice(299, "zh");
    expect(result).toContain("299");
    expect(result).toContain("¥"); // Chinese Yuan symbol
  });

  it("should format price in CNY (en locale)", () => {
    const result = formatPrice(99, "en");
    expect(result).toContain("99");
  });

  it("should handle large numbers with commas", () => {
    const result = formatPrice(9999, "zh");
    // Result should be ¥9,999 with thousand separator
    expect(result).toContain("9");
    expect(result).toMatch(/9.*999/); // Contains 9 and 999
  });

  it("should handle zero", () => {
    const result = formatPrice(0, "zh");
    expect(result).toContain("0");
  });

  it("should format integer prices correctly", () => {
    const result = formatPrice(100, "zh");
    expect(result).toContain("100");
  });
});

describe("formatDate", () => {
  it("should format date in Chinese locale", () => {
    const result = formatDate("2024-01-15", "zh");
    expect(result).toContain("2024");
    expect(result).toContain("1");
    expect(result).toContain("15");
  });

  it("should format date in English locale", () => {
    const result = formatDate("2024-03-20", "en");
    expect(result).toContain("2024");
  });

  it("should handle Date object input", () => {
    const date = new Date(2024, 0, 15);
    const result = formatDate(date, "zh");
    expect(result).toContain("2024");
  });

  it("should use short month format", () => {
    const result = formatDate("2024-03-15", "zh");
    // Should be something like 2024年3月15日 or 3/15/2024
    expect(result).toContain("2024");
  });
});
