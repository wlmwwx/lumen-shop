import "server-only";

/**
 * PayPal Orders v2 REST API 客户端（服务端专用）。
 *
 * 官方已弃用 @paypal/checkout-server-sdk，推荐直接用 REST API：
 *   https://developer.paypal.com/api/rest/
 *
 * 流程（两阶段）：
 *   1. createPayPalOrder()  —— 创建 PayPal 订单，返回 PayPal order id
 *   2. 前端弹出 PayPal 授权窗口，买家确认后
 *   3. capturePayPalOrder()  —— 服务端捕获资金，返回交易号
 *
 * 环境变量：
 *   PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET —— PayPal REST API 凭据（必填）
 *   PAYPAL_ENV = "sandbox" | "live"（默认 sandbox）
 *
 * 说明：本店价格体系为 CNY（Order.currency = "CNY"），PayPal 订单按实时汇率换算为
 * USD 提交（见 lib/fx.ts：实时汇率 API + 缓存 + 兜底）；本地订单仍以 CNY 记账，
 * PayPal 只负责收款。
 */

const SANDBOX_BASE = "https://api-m.sandbox.paypal.com";
const LIVE_BASE = "https://api-m.paypal.com";

export function isPayPalConfigured(): boolean {
  return Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
}

export function paypalBaseUrl(): string {
  return process.env.PAYPAL_ENV === "live" ? LIVE_BASE : SANDBOX_BASE;
}

let cachedToken: { token: string; expiresAt: number } | undefined;

/** 获取 OAuth2 access token（带内存缓存，避免每个请求都换 token） */
async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.token;
  }
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !secret) {
    throw new Error("PayPal 未配置：请设置 PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET");
  }
  const res = await fetch(`${paypalBaseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`PayPal 获取 access token 失败：HTTP ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return data.access_token;
}

export type CreatePayPalOrderInput = {
  /** USD 金额字符串（两位小数） */
  amountUsd: string;
  /** 本地订单号，作为 PayPal 订单的 reference_id（便于对账） */
  orderNumber: string;
  /** 商店名 / 描述 */
  description?: string;
};

/** 创建 PayPal 订单（intent=CAPTURE），返回 PayPal order id */
export async function createPayPalOrder(input: CreatePayPalOrderInput): Promise<string> {
  const token = await getAccessToken();
  const res = await fetch(`${paypalBaseUrl()}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: input.orderNumber,
          description: input.description ?? "LUMEN 拾光生活馆",
          amount: { currency_code: "USD", value: input.amountUsd },
        },
      ],
    }),
    cache: "no-store",
  });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      `PayPal 创建订单失败：HTTP ${res.status} ${data.message ?? JSON.stringify(data).slice(0, 300)}`
    );
  }
  return data.id as string;
}

export type CaptureResult = {
  success: boolean;
  transactionId?: string;
  status?: string;
  message?: string;
};

/** 捕获已授权的 PayPal 订单，返回交易号 */
export async function capturePayPalOrder(paypalOrderId: string): Promise<CaptureResult> {
  const token = await getAccessToken();
  const res = await fetch(
    `${paypalBaseUrl()}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: "{}",
      cache: "no-store",
    }
  );
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      success: false,
      status: data.details?.[0]?.issue ?? `HTTP ${res.status}`,
      message: `PayPal 捕获订单失败：${data.message ?? JSON.stringify(data).slice(0, 300)}`,
    };
  }
  const capture = data.purchase_units?.[0]?.payments?.captures?.[0];
  return {
    success: data.status === "COMPLETED" && Boolean(capture?.id),
    transactionId: capture?.id,
    status: data.status,
    message: data.status === "COMPLETED" ? "支付成功" : `PayPal 状态：${data.status}`,
  };
}

export type WebhookHeaders = {
  "paypal-auth-algo"?: string | null;
  "paypal-cert-url"?: string | null;
  "paypal-transmission-id"?: string | null;
  "paypal-transmission-sig"?: string | null;
  "paypal-transmission-time"?: string | null;
};

/** 是否已配置 PayPal Webhook（PAYPAL_WEBHOOK_ID） */
export function isWebhookConfigured(): boolean {
  return Boolean(process.env.PAYPAL_WEBHOOK_ID);
}

/**
 * 验证 PayPal Webhook 请求签名：把请求头 + 原始事件体交给 PayPal
 * `POST /v1/notifications/verify-webhook-signature` 校验，防止伪造事件。
 *
 * 返回 true 表示事件确系 PayPal 发出（verification_status === "SUCCESS"）。
 * 注意：webhook_event 必须与收到的原始 JSON 完全一致（原样透传，勿重新序列化）。
 */
export async function verifyWebhookSignature(
  headers: WebhookHeaders,
  webhookEvent: unknown
): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) {
    throw new Error("PayPal Webhook 未配置：请设置 PAYPAL_WEBHOOK_ID");
  }
  const token = await getAccessToken();
  const res = await fetch(`${paypalBaseUrl()}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      auth_algo: headers["paypal-auth-algo"],
      cert_url: headers["paypal-cert-url"],
      transmission_id: headers["paypal-transmission-id"],
      transmission_sig: headers["paypal-transmission-sig"],
      transmission_time: headers["paypal-transmission-time"],
      webhook_id: webhookId,
      webhook_event: webhookEvent,
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`PayPal 验证 webhook 签名失败：HTTP ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { verification_status?: string };
  return data.verification_status === "SUCCESS";
}
