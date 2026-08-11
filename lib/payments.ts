/**
 * 支付服务抽象层。
 * MVP 使用 MockPaymentProvider 模拟支付成功；
 * 未来接入真实支付（Stripe / 支付宝 / 微信支付）时，
 * 实现同一 PaymentProvider 接口并在下方替换实例即可，业务代码无需改动。
 */
export interface PaymentProvider {
  readonly name: string;
  charge(input: {
    orderId: string;
    amount: number;
    method: string;
  }): Promise<{ success: boolean; transactionId?: string; message?: string }>;
}

export class MockPaymentProvider implements PaymentProvider {
  readonly name = "MockPayment";

  async charge({ orderId, amount, method }: { orderId: string; amount: number; method: string }) {
    // 模拟支付网关延迟
    await new Promise((resolve) => setTimeout(resolve, 900));
    return {
      success: true,
      transactionId: `MOCK-${Date.now()}`,
      message: `模拟支付成功：${method}，金额 ¥${amount}（订单 ${orderId}）`,
    };
  }
}

export const paymentProvider: PaymentProvider = new MockPaymentProvider();
