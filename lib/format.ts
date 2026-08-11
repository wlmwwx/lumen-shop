export function formatPrice(value: number, locale: "zh" | "en" = "zh"): string {
  return new Intl.NumberFormat(locale === "en" ? "en-US" : "zh-CN", {
    style: "currency",
    currency: "CNY",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(input: Date | string, locale: "zh" | "en" = "zh"): string {
  const d = typeof input === "string" ? new Date(input) : input;
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(d);
}
