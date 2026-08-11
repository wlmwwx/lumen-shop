import { Mail, Inbox } from "lucide-react";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/utils";
import { getAllReviewInviteEligibleOrders } from "@/lib/notifications";
import { EmailJobButton } from "@/components/admin/email-job-button";

export const metadata = { title: "邮件记录" };

export default async function AdminEmailsPage() {
  const [emails, eligible] = await Promise.all([
    prisma.emailLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    getAllReviewInviteEligibleOrders(),
  ]);

  const sentOrderIds = new Set(emails.map((e) => e.orderId));
  const pendingCount = eligible.filter((e) => !sentOrderIds.has(e.id)).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-light tracking-wide">邮件记录</h1>
          <p className="mt-1 text-sm text-[#8a8a86]">
            评价邀请邮件（演示环境为模拟发送） · 已发送 {emails.length} 封 · 待发送{" "}
            {pendingCount} 封
          </p>
        </div>
        <EmailJobButton />
      </div>

      <div className="overflow-hidden rounded-xl border border-[#e8e8e4] bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#eee] text-left text-xs uppercase tracking-wider text-[#8a8a86]">
              <th className="px-5 py-3 font-medium">收件人</th>
              <th className="px-5 py-3 font-medium">主题</th>
              <th className="px-5 py-3 font-medium">发送时间</th>
              <th className="px-5 py-3 font-medium">预览</th>
            </tr>
          </thead>
          <tbody>
            {emails.map((e) => (
              <tr key={e.id} className="border-b border-[#f3f3f0] last:border-0 hover:bg-[#fafaf8]">
                <td className="px-5 py-3.5">
                  <p className="font-medium">{e.toEmail}</p>
                  <p className="text-xs text-[#a0a09b]">{e.orderId.slice(-6).toUpperCase()}</p>
                </td>
                <td className="max-w-[320px] truncate px-5 py-3.5 text-[#5a5a56]">{e.subject}</td>
                <td className="whitespace-nowrap px-5 py-3.5 text-xs text-[#8a8a86]">
                  {formatDateTime(e.createdAt)}
                </td>
                <td className="px-5 py-3.5">
                  <details className="group">
                    <summary className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[#e2e2de] px-3 py-1.5 text-xs text-[#5a5a56] transition-colors hover:border-[#1a1a1a] hover:text-[#1a1a1a]">
                      <Mail size={12} /> 查看邮件
                    </summary>
                    <div className="mt-3 overflow-hidden rounded-lg border border-[#e8e8e4]">
                      {/* 邮件正文预览（真实邮件客户端渲染效果） */}
                      <div className="max-h-[420px] overflow-y-auto bg-[#f5f5f2] p-4">
                        <div
                          className="mx-auto w-full max-w-[520px]"
                          dangerouslySetInnerHTML={{ __html: e.body }}
                        />
                      </div>
                    </div>
                  </details>
                </td>
              </tr>
            ))}
            {emails.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-16 text-center text-[#a0a09b]">
                  <Inbox size={32} strokeWidth={1.2} className="mx-auto mb-3 text-[#d0d0cb]" />
                  还没有邮件记录，点击右上角「运行发送任务」即可自动为待评价订单发送邀请邮件
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
