import type { OrderStatus, OrderEvent } from "@prisma/client";

/** 物流轨迹阶段顺序：已下单 → 已支付 → 已发货 → 已完成 */
export const TIMELINE_STAGES: OrderStatus[] = ["PENDING", "PAID", "SHIPPED", "COMPLETED"];

/** 订单状态在流程中的序号（用于推导阶段完成度） */
export const FLOW_INDEX: Record<OrderStatus, number> = {
  PENDING: 0,
  PAID: 1,
  SHIPPED: 2,
  COMPLETED: 3,
  CANCELLED: -1,
};

/** 物流轨迹备注 key（阶段事件与轨迹明细的区分） */
export const LOGISTIC_NOTES = new Set([
  "logShipped",
  "logPickedUp",
  "logInTransit",
  "logArrivedCity",
  "logOutForDelivery",
  "logDelivered",
  "logCompleted",
]);

/** 物流轨迹备注的中文文案（后台使用；前台走 i18n） */
export const LOGISTIC_NOTE_ZH: Record<string, string> = {
  logShipped: "商家已发货",
  logPickedUp: "包裹已揽收",
  logInTransit: "运输中，已离开【杭州】转运中心",
  logArrivedCity: "包裹已到达【杭州】",
  logOutForDelivery: "快递员正在派送，请保持电话畅通",
  logDelivered: "包裹已签收，感谢你的信任！",
  logCompleted: "订单完成",
};

export type StageState = "done" | "current" | "todo" | "hidden";

/** 判断某一阶段的"已发生"状态：以订单当前状态为准 */
export function stageStatus(
  stage: OrderStatus,
  orderStatus: OrderStatus
): StageState {
  if (orderStatus === "CANCELLED") {
    if (stage === "PENDING") return "done";
    if (stage === "CANCELLED") return "current";
    return "hidden";
  }
  const stageIdx = FLOW_INDEX[stage];
  const orderIdx = FLOW_INDEX[orderStatus];
  if (stageIdx < orderIdx) return "done";
  if (stageIdx === orderIdx) return "current";
  return "todo";
}

/** 从订单事件中提取各阶段时间与物流轨迹明细 */
export function buildTimeline(order: {
  status: OrderStatus;
  events: OrderEvent[];
}): {
  eventByStatus: Map<OrderStatus, Date>;
  logistics: OrderEvent[];
} {
  // 各阶段事件时间：取该状态首个事件（阶段事件可能带备注，如 logPaid/logShipped）
  const eventByStatus = new Map<OrderStatus, Date>();
  for (const e of order.events) {
    if (!eventByStatus.has(e.status)) eventByStatus.set(e.status, e.createdAt);
  }
  // 物流轨迹明细：物流节点（含发货动作本身与签收）
  const logistics = order.events.filter(
    (e) => e.note && LOGISTIC_NOTES.has(e.note)
  );
  return { eventByStatus, logistics };
}
