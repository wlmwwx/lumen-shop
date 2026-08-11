// 纯函数邮件模板：零依赖，应用与 seed 均可复用

export type ReviewInviteEmailProps = {
  orderNumber: string;
  pendingCount: number;
  reviewUrl: string; // 直达评价链接（订单详情页，含快捷评价入口）
};

export function reviewInviteEmailHtml({
  orderNumber,
  pendingCount,
  reviewUrl,
}: ReviewInviteEmailProps): string {
  const safe = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const url = safe(reviewUrl);
  const orderNo = safe(orderNumber);
  return `<!DOCTYPE html>
<html lang="zh-CN">
<body style="margin:0;padding:0;background:#f5f5f2;font-family:-apple-system,BlinkMacSystemFont,'PingFang SC','Microsoft YaHei',sans-serif;">
  <div style="max-width:520px;margin:24px auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #ecece6;">
    <div style="background:#1a1a1a;color:#ffffff;text-align:center;padding:28px 24px;">
      <div style="font-size:20px;letter-spacing:6px;">LUMEN</div>
      <div style="font-size:11px;letter-spacing:2px;color:#a8a8a2;margin-top:6px;">拾光生活馆 · GOOD THINGS FOR DAILY LIFE</div>
    </div>
    <div style="padding:32px 28px;color:#333333;">
      <p style="font-size:15px;line-height:1.8;margin:0 0 12px;">你好，</p>
      <p style="font-size:15px;line-height:1.8;margin:0 0 8px;">
        你的订单 <strong style="color:#1a1a1a;">${orderNo}</strong> 已收货一段时间了，用过的体验值得分享给更多人。
      </p>
      <p style="font-size:13px;color:#8a8a86;margin:0 0 24px;">还有 ${pendingCount} 件商品等待你的评价，只需 1 分钟即可完成。</p>
      <div style="text-align:center;margin:24px 0;">
        <a href="${url}" style="display:inline-block;background:#1a1a1a;color:#ffffff;text-decoration:none;padding:13px 38px;border-radius:999px;font-size:14px;letter-spacing:1px;">立即去评价 →</a>
      </div>
      <p style="font-size:12px;color:#a8a8a2;line-height:1.8;margin:24px 0 0;border-top:1px dashed #e5e5e0;padding-top:16px;">
        直达链接（可复制到浏览器打开）：<a href="${url}" style="color:#8a8a86;word-break:break-all;">${url}</a><br/>
        <span style="color:#c8c8c2;">这是一封演示环境模拟邮件，不会真实发送。谢谢你的支持！</span>
      </p>
    </div>
    <div style="background:#f5f5f2;padding:18px 28px;text-align:center;color:#999999;font-size:11px;line-height:1.8;">
      拾光 LUMEN · 精选全球生活方式好物<br/>
      hello@lumen.demo · 400-888-0000 · 杭州市西湖区拾光路 88 号
    </div>
  </div>
</body>
</html>`;
}

export function reviewInviteEmailSubject(orderNumber: string): string {
  return `订单 ${orderNumber} 期待你的评价 · LUMEN 拾光生活馆`;
}
