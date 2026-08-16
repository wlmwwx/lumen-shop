/**
 * End-to-end: PayPal webhook 处理逻辑（真实 SQLite DB）。
 *
 * 覆盖：COMPLETED（PENDING→PAID + 扣库存）、重复事件幂等、REFUNDED（记退款号）。
 * 测试自建产品/订单，结束清理，不污染开发数据。
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { prisma } from "@/lib/db";
import { processWebhookEvent } from "@/lib/paypal-webhook";

// 固定汇率，避免真实网络请求导致全额/部分退款边界判断抖动；
// 导出与 lib/fx 保持一致，防止未来新增导出被静默替换为 undefined
vi.mock("@/lib/fx", () => ({
  cnyToUsd: async (cny: number) => (Math.round(cny * 0.14 * 100) / 100).toFixed(2),
  getCnyToUsdRate: async () => 0.14,
  fxCacheTtlSeconds: () => 3600,
  fxFallbackTtlSeconds: () => 300,
}));

let productId: string;
let originalStock: number;
const createdEventIds = new Set<string>();

beforeAll(async () => {
  // 自建测试商品（唯一 slug），记录原库存以便还原
  const slug = `wh-e2e-${Date.now()}`;
  const product = await prisma.product.create({
    data: {
      title: "Webhook 测试商品",
      slug,
      description: "e2e",
      price: 100,
      stock: 10,
      images: "[]",
      active: true,
    },
  });
  productId = product.id;
  originalStock = product.stock;
});

afterAll(async () => {
  // 清理：只删除本次测试创建的事件 id 与订单（不碰 dev 库其他数据）
  await prisma.webhookEvent.deleteMany({
    where: { id: { in: [...createdEventIds] } },
  });
  const orders = await prisma.order.findMany({ where: { note: "wh-e2e" } });
  for (const o of orders) {
    await prisma.order.delete({ where: { id: o.id } });
  }
  await prisma.product.update({
    where: { id: productId },
    data: { stock: originalStock },
  });
  await prisma.product.delete({ where: { id: productId } });
  await prisma.$disconnect();
});

/** 记录事件 id，便于清理 */
function trackEvent(id: string) {
  createdEventIds.add(id);
  return id;
}

async function createPendingOrder(paypalOrderId: string, txId: string) {
  return prisma.order.create({
    data: {
      orderNumber: `WH-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`,
      customerName: "测试",
      customerEmail: `wh-${Date.now()}@example.com`,
      phone: "13800138000",
      province: "浙江",
      city: "杭州",
      address: "测试路 1 号",
      shippingMethod: "标准配送",
      shippingFee: 12,
      subtotal: 100,
      total: 112,
      paymentMethod: "PayPal",
      status: "PENDING",
      paypalOrderId,
      transactionId: txId,
      note: "wh-e2e",
      items: { create: [{ productId, title: "Webhook 测试商品", price: 100, quantity: 2 }] },
    },
  });
}

describe("processWebhookEvent (e2e, real DB)", () => {
  it("COMPLETED: PENDING → PAID, 补扣库存, 记录 paypalStatus", async () => {
    const poId = `PO-COMP-${Date.now()}`;
    const txId = `CAP-COMP-${Date.now()}`;
    const order = await createPendingOrder(poId, txId);

    const res = await processWebhookEvent({
      id: trackEvent(`WH-COMP-${Date.now()}`),
      event_type: "PAYMENT.CAPTURE.COMPLETED",
      resource: {
        id: txId,
        status: "COMPLETED",
        supplementary_data: { related_ids: { order_id: poId } },
      },
    });

    expect(res.handled).toBe(true);
    expect(res.orderId).toBe(order.id);
    const updated = await prisma.order.findUnique({ where: { id: order.id } });
    expect(updated?.status).toBe("PAID");
    expect(updated?.paypalStatus).toBe("COMPLETED");
    // 库存 10 → 10-2=8
    const prod = await prisma.product.findUnique({ where: { id: productId } });
    expect(prod?.stock).toBe(8);
  });

  it("幂等：重复的 COMPLETED 事件跳过，库存不重复扣", async () => {
    const poId = `PO-COMP2-${Date.now()}`;
    const txId = `CAP-COMP2-${Date.now()}`;
    await createPendingOrder(poId, txId);
    const eventId = trackEvent(`WH-COMP2-${Date.now()}`);
    const event = {
      id: eventId,
      event_type: "PAYMENT.CAPTURE.COMPLETED",
      resource: {
        id: txId,
        status: "COMPLETED",
        supplementary_data: { related_ids: { order_id: poId } },
      },
    };

    const first = await processWebhookEvent(event);
    expect(first.handled).toBe(true);
    const stockAfterFirst = (await prisma.product.findUnique({ where: { id: productId } }))?.stock;

    const second = await processWebhookEvent(event);
    expect(second.handled).toBe(false);
    const stockAfterSecond = (await prisma.product.findUnique({ where: { id: productId } }))?.stock;
    expect(stockAfterSecond).toBe(stockAfterFirst);
  });

  it("REFUNDED 全额: paypalStatus=REFUNDED + refundId", async () => {
    const poId = `PO-REF-${Date.now()}`;
    const txId = `CAP-REF-${Date.now()}`;
    const order = await createPendingOrder(poId, txId);
    const refundId = `REF-${Date.now()}`;

    const res = await processWebhookEvent({
      id: trackEvent(`WH-REF-${Date.now()}`),
      event_type: "PAYMENT.CAPTURE.REFUNDED",
      resource: {
        id: refundId,
        status: "COMPLETED",
        amount: { currency_code: "USD", value: "20.00" }, // ≥ 订单 USD 总额 15.68
        supplementary_data: { related_ids: { order_id: poId, capture_id: txId } },
      },
    });

    expect(res.handled).toBe(true);
    const updated = await prisma.order.findUnique({ where: { id: order.id } });
    expect(updated?.paypalStatus).toBe("REFUNDED");
    expect(updated?.refundId).toBe(refundId);
  });

  it("REFUNDED 部分: 退款金额 < 订单 USD 总额 → PARTIALLY_REFUNDED", async () => {
    const poId = `PO-REF2-${Date.now()}`;
    const txId = `CAP-REF2-${Date.now()}`;
    const order = await createPendingOrder(poId, txId);

    const res = await processWebhookEvent({
      id: trackEvent(`WH-REF2-${Date.now()}`),
      event_type: "PAYMENT.CAPTURE.REFUNDED",
      resource: {
        id: `REF-PART-${Date.now()}`,
        status: "COMPLETED",
        amount: { currency_code: "USD", value: "3.00" }, // < 15.68
        supplementary_data: { related_ids: { order_id: poId, capture_id: txId } },
      },
    });

    expect(res.handled).toBe(true);
    const updated = await prisma.order.findUnique({ where: { id: order.id } });
    expect(updated?.paypalStatus).toBe("PARTIALLY_REFUNDED");
  });

  it("找不到订单的事件：handled=false 且不抛错（记录后回 200）", async () => {
    const res = await processWebhookEvent({
      id: trackEvent(`WH-NF-${Date.now()}`),
      event_type: "PAYMENT.CAPTURE.COMPLETED",
      resource: {
        id: "CAP-UNKNOWN",
        status: "COMPLETED",
        supplementary_data: { related_ids: { order_id: "PO-UNKNOWN" } },
      },
    });
    expect(res.handled).toBe(false);
  });

  it("无法识别的事件类型：handled=false 不报错", async () => {
    const res = await processWebhookEvent({
      id: trackEvent(`WH-UNK-${Date.now()}`),
      event_type: "SOMETHING.ELSE",
      resource: { id: "X" },
    });
    expect(res.handled).toBe(false);
  });
});
