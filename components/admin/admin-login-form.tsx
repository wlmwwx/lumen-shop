"use client";

import { useActionState } from "react";
import { adminLoginAction } from "@/actions/auth";

export function AdminLoginForm() {
  const [state, formAction, pending] = useActionState(adminLoginAction, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[#8a8a86]">
          邮箱
        </label>
        <input
          name="email"
          type="email"
          required
          className="w-full rounded-lg border border-[#e2e2de] bg-white px-4 py-2.5 text-sm outline-none transition-all focus:border-[#1a1a1a] focus:ring-2 focus:ring-[#1a1a1a]/10"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[#8a8a86]">
          密码
        </label>
        <input
          name="password"
          type="password"
          required
          className="w-full rounded-lg border border-[#e2e2de] bg-white px-4 py-2.5 text-sm outline-none transition-all focus:border-[#1a1a1a] focus:ring-2 focus:ring-[#1a1a1a]/10"
        />
      </div>
      {state?.error && (
        <p className="rounded-lg bg-[#c5283d]/5 px-4 py-2.5 text-sm text-[#c5283d]">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-[#1a1a1a] py-3 text-sm font-medium text-white transition-all duration-300 hover:bg-[#333333] disabled:opacity-50"
      >
        {pending ? "登录中…" : "登录后台"}
      </button>
    </form>
  );
}
