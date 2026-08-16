import { NextResponse } from "next/server";
import { verifyWebhookSignature, isWebhookConfigured } from "@/lib/paypal";
import { processWebhookEvent } from "@/lib/paypal-webhook";

/**
 * POST /api/webhooks/paypal
 *
 * PayPal Webhook 入口：校验签名 → 幂等处理（支付成功 / 退款 / 拒绝等）。
 *
 * 配置：在 PayPal Developer 后台给 App 添加 Webhook，URL 填
 *   https://<你的域名>/api/webhooks/paypal
 * 订阅事件（Payment capture events 全部），并把后台生成的 Webhook ID 填入
 *   PAYPAL_WEBHOOK_ID
 *
 * 响应约定（PayPal 对所有非 2xx 都会按退避策略重试）：
 *   - 200：事件已接收并处理（停止投递）
 *   - 400：签名校验失败（伪造请求；重试无害，但不会成功）
 *   - 502：验证接口或处理出错（瞬时故障，PayPal 重试可恢复）
 *   - 503：未配置 PAYPAL_WEBHOOK_ID
 */
export async function POST(req: Request) {
  if (!isWebhookConfigured()) {
    return NextResponse.json(
      { error: "PayPal Webhook 未配置：请在 .env 设置 PAYPAL_WEBHOOK_ID" },
      { status: 503 }
    );
  }

  // 原样读取事件体：签名验证要求与收到时字节一致
  const raw = await req.text();
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }

  // 从请求头提取 PayPal 签名头
  const headers: Record<string, string | null> = {};
  for (const name of [
    "paypal-auth-algo",
    "paypal-cert-url",
    "paypal-transmission-id",
    "paypal-transmission-sig",
    "paypal-transmission-time",
  ]) {
    headers[name] = req.headers.get(name);
  }

  let verified: boolean;
  try {
    verified = await verifyWebhookSignature(headers, body);
  } catch (e) {
    // 验证接口自身失败（网络/凭据问题）——返回 502，PayPal 会重试
    const message = e instanceof Error ? e.message : "验证 Webhook 签名失败";
    return NextResponse.json({ error: message }, { status: 502 });
  }
  if (!verified) {
    // 签名不匹配：视为伪造请求，拒绝（PayPal 对 4xx 不重试）
    return NextResponse.json({ error: "Webhook 签名校验失败" }, { status: 400 });
  }

  // 幂等处理；无论是否 handled 都回 200，避免 PayPal 无限重试
  try {
    await processWebhookEvent(body);
  } catch (e) {
    // 处理失败（数据库异常等）——回 502 让 PayPal 重试
    const message = e instanceof Error ? e.message : "处理 Webhook 事件失败";
    return NextResponse.json({ error: message }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
