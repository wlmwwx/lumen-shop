"use client";

import { useActionState } from "react";
import { Send } from "lucide-react";
import { runReviewInviteEmailJobAction } from "@/actions/admin";

export function EmailJobButton() {
  const [state, formAction, pending] = useActionState(
    runReviewInviteEmailJobAction,
    null
  );

  return (
    <form action={formAction}>
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-lg bg-[#1a1a1a] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#333] disabled:opacity-60"
      >
        <Send size={14} />
        {pending ? "正在发送…" : "运行发送任务"}
      </button>
      {state && (
        <p className="mt-2 text-xs text-[#5a5a56]">
          {state.sent > 0
            ? `已发送 ${state.sent} 封评价邀请邮件`
            : "没有新的待发送订单（均已发送过）"}
        </p>
      )}
    </form>
  );
}
