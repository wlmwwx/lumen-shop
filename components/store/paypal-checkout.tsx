"use client";

import { useState } from "react";
import { PayPalProvider, PayPalOneTimePaymentButton } from "@paypal/react-paypal-js/sdk-v6";
import { useRouter } from "@/i18n/navigation";

export type PayPalOrderPayload = {
  customerName: string;
  customerEmail: string;
  phone: string;
  province: string;
  city: string;
  address: string;
  postalCode?: string;
  shippingMethod: string;
  items: { productId: string; quantity: number; variant?: string }[];
};

const CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ?? "";
const ENV = process.env.NEXT_PUBLIC_PAYPAL_ENV === "live" ? "production" : "sandbox";

/** PayPal 是否已配置（有公开 client id 才渲染按钮） */
export function isPayPalEnabled(): boolean {
  return CLIENT_ID.length > 0;
}

/**
 * PayPal 智能按钮（弹窗授权）。
 *
 * createOrder：把当前结账表单字段交给服务端 /api/paypal/create-order，
 * 服务端建本地订单并调 PayPal 建单，返回 PayPal order id 弹窗授权。
 * onApprove：调 /api/paypal/capture-order 捕获，成功后跳转订单详情页。
 */
export function PayPalCheckout({
  getPayload,
}: {
  getPayload: () => PayPalOrderPayload | { error: string };
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const createOrder = async () => {
    const payload = getPayload();
    if ("error" in payload) {
      setError(payload.error);
      throw new Error(payload.error);
    }
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/paypal/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "创建 PayPal 订单失败");
        throw new Error(data.error ?? "创建 PayPal 订单失败");
      }
      return { orderId: data.paypalOrderId as string };
    } finally {
      setSubmitting(false);
    }
  };

  const onApprove = async ({ orderId }: { orderId: string }) => {
    const res = await fetch("/api/paypal/capture-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paypalOrderId: orderId }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "支付捕获失败，请重试");
      throw new Error(data.error ?? "支付捕获失败，请重试");
    }
    // next-intl 的 useRouter 会自动加 locale 前缀，这里传无前缀路径
    router.push(`/order/${data.localOrderId}`);
  };

  return (
    <div className="space-y-3">
      {error && (
        <p className="rounded-lg bg-sale/5 px-4 py-3 text-sm text-sale">{error}</p>
      )}
      <PayPalProvider
        clientId={CLIENT_ID}
        environment={ENV}
        components={["paypal-payments"]}
        pageType="checkout"
      >
        <PayPalOneTimePaymentButton
          createOrder={createOrder}
          onApprove={onApprove}
          onCancel={() => setError(null)}
          disabled={submitting}
          type="checkout"
        />
      </PayPalProvider>
    </div>
  );
}
