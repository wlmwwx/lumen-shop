import { cn } from "@/lib/utils";
import {
  PAYPAL_STATUS_LABEL,
  PAYPAL_STATUS_STYLES,
} from "@/lib/paypal-webhook-shared";

/**
 * PayPal 支付状态徽标（后台用）：COMPLETED / REFUNDED / PARTIALLY_REFUNDED 等。
 * 仅当订单通过 PayPal 支付且 webhook 已同步过状态时显示。
 */
export function PaypalStatusBadge({ status }: { status: string | null }) {
  if (!status) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
        PAYPAL_STATUS_STYLES[status] ?? "bg-gray-50 text-gray-600 border-gray-200"
      )}
    >
      {PAYPAL_STATUS_LABEL[status] ?? status}
    </span>
  );
}
