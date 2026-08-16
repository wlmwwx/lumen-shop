export const SITE_NAME = "LUMEN";
export const SITE_NAME_ZH = "拾光生活馆";
export const CURRENCY = "CNY";
export const FREE_SHIPPING_THRESHOLD = 299;

/** 订单完成后多少天提醒顾客评价（已完成 + 超过该天数 + 有未评价商品时显示邀请横幅） */
export const REVIEW_INVITE_DAYS = 3;

export const SHIPPING_METHODS = [
  { id: "standard", name: "标准配送", nameEn: "Standard", fee: 12, eta: "3-5 天", etaEn: "3-5 days" },
  { id: "express", name: "次日达", nameEn: "Express", fee: 25, eta: "1 天", etaEn: "1 day" },
  { id: "pickup", name: "门店自提", nameEn: "Store pickup", fee: 0, eta: "当天", etaEn: "Same day" },
] as const;

export const PAYMENT_METHODS = ["模拟支付 · 微信", "模拟支付 · 支付宝", "模拟支付 · 银行卡", "PayPal"] as const;

export const ORDER_STATUSES = ["PENDING", "PAID", "SHIPPED", "COMPLETED", "CANCELLED"] as const;

/** 模拟承运商（演示用固定承运商，物流单号前缀 LM） */
export const CARRIER = {
  name: "LUMEN 拾光物流",
  nameEn: "LUMEN Express",
};

export function trackingHref(trackingNumber: string): string {
  // 演示环境：无真实物流查询接口，指向一个占位查询页
  return `https://www.baidu.com/s?wd=${encodeURIComponent(trackingNumber)}`;
}

export const ORDER_STATUS_LABEL: Record<string, { zh: string; en: string }> = {
  PENDING: { zh: "待支付", en: "Pending" },
  PAID: { zh: "已支付", en: "Paid" },
  SHIPPED: { zh: "已发货", en: "Shipped" },
  COMPLETED: { zh: "已完成", en: "Completed" },
  CANCELLED: { zh: "已取消", en: "Cancelled" },
};
