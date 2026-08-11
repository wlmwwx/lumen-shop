import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/[^\w\u4e00-\u9fa5-]/g, "")
    .replace(/-+/g, "-");
}

export function parseImages(raw: string): string[] {
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string" && x) : [];
  } catch {
    return [];
  }
}

export function randomOrderNumber(): string {
  return `LN${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 9000 + 1000)}`;
}

/** 生成模拟物流单号：承运商前缀 + 时间戳 + 随机校验位，形如 LM2026081112345678 */
export function randomTrackingNumber(): string {
  const ts = Date.now()
    .toString()
    .slice(-10);
  const rand = String(Math.floor(Math.random() * 9000) + 1000);
  return `LM${ts}${rand}`;
}

export function formatDateTime(input: Date | string, locale = "zh-CN"): string {
  const d = typeof input === "string" ? new Date(input) : input;
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}
