/**
 * PayPal Webhook 纯函数与状态映射（无副作用，可在客户端 / 测试环境引用）。
 *
 * 服务端处理逻辑见 lib/paypal-webhook.ts（含 prisma 依赖）。
 */

/** PayPal 支付状态 → 后台展示文案（中文） */
export const PAYPAL_STATUS_LABEL: Record<string, string> = {
  COMPLETED: "已捕获",
  REFUNDED: "已退款",
  PARTIALLY_REFUNDED: "部分退款",
  DENIED: "支付被拒绝",
  REVERSED: "已撤销",
  PENDING: "处理中",
};

export const PAYPAL_STATUS_STYLES: Record<string, string> = {
  COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  REFUNDED: "bg-orange-50 text-orange-700 border-orange-200",
  PARTIALLY_REFUNDED: "bg-amber-50 text-amber-700 border-amber-200",
  DENIED: "bg-red-50 text-red-600 border-red-200",
  REVERSED: "bg-red-50 text-red-600 border-red-200",
  PENDING: "bg-gray-50 text-gray-600 border-gray-200",
};

/** 与 PayPal 侧实际事件类型同构的本地状态（用于 paypalStatus 字段） */
export type PaypalEventType =
  | "COMPLETED"
  | "REFUNDED"
  | "DENIED"
  | "REVERSED"
  | "PENDING"
  | "UNHANDLED";

export type ParsedPaypalEvent = {
  eventId: string;
  type: PaypalEventType;
  /** 捕获交易号（COMPLETED 的 resource.id / REFUNDED 的 related capture） */
  captureId?: string;
  /** 退款交易号（REFUNDED 的 resource.id） */
  refundId?: string;
  /** 退款金额（USD，REFUNDED 的 resource.amount.value；用于区分全额/部分退款） */
  refundAmountUsd?: number;
  /** PayPal 订单 id（supplementary_data.related_ids.order_id） */
  paypalOrderId?: string;
};

/**
 * 把 PayPal webhook 原始 body 解析为内部事件结构（纯函数，便于单测）。
 * 无法识别的事件类型归为 UNHANDLED（记录后跳过，返回 200 让 PayPal 停止重试）。
 */
export function parsePaypalEvent(body: unknown): ParsedPaypalEvent | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, any>;
  const eventId = typeof b.id === "string" ? b.id : "";
  if (!eventId) return null;

  const eventType = b.event_type as string | undefined;
  const resource = (b.resource ?? {}) as Record<string, any>;
  const related = (resource.supplementary_data?.related_ids ?? {}) as Record<
    string,
    any
  >;

  const base: ParsedPaypalEvent = {
    eventId,
    type: "UNHANDLED",
    captureId:
      typeof related.capture_id === "string" ? related.capture_id : undefined,
    refundId: undefined,
    paypalOrderId:
      typeof related.order_id === "string" ? related.order_id : undefined,
  };

  switch (eventType) {
    case "PAYMENT.CAPTURE.COMPLETED":
      base.type = "COMPLETED";
      base.captureId = typeof resource.id === "string" ? resource.id : undefined;
      break;
    case "PAYMENT.CAPTURE.REFUNDED":
      base.type = "REFUNDED";
      base.refundId = typeof resource.id === "string" ? resource.id : undefined;
      base.captureId =
        typeof related.capture_id === "string" ? related.capture_id : undefined;
      const amt = Number(resource.amount?.value);
      base.refundAmountUsd = Number.isFinite(amt) && amt > 0 ? amt : undefined;
      break;
    case "PAYMENT.CAPTURE.DENIED":
      base.type = "DENIED";
      base.captureId = typeof resource.id === "string" ? resource.id : undefined;
      break;
    case "PAYMENT.CAPTURE.REVERSED":
      base.type = "REVERSED";
      base.captureId = typeof resource.id === "string" ? resource.id : undefined;
      break;
    case "PAYMENT.CAPTURE.PENDING":
      base.type = "PENDING";
      base.captureId = typeof resource.id === "string" ? resource.id : undefined;
      break;
    default:
      break;
  }
  return base;
}
