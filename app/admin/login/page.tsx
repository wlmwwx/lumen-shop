import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { AdminLoginForm } from "@/components/admin/admin-login-form";

export const metadata: Metadata = { title: "登录" };

export default async function AdminLoginPage() {
  const user = await getSessionUser();
  if (user?.role === "ADMIN") redirect("/admin");

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <p className="text-3xl font-light tracking-[0.3em]">LUMEN</p>
          <p className="mt-2 text-sm text-[#8a8a86]">拾光 · 管理后台</p>
        </div>
        <AdminLoginForm />
        <p className="mt-6 text-center text-xs text-[#a0a09b]">
          默认管理员：admin@lumen.demo / admin123（请在 .env 中修改）
        </p>
      </div>
    </div>
  );
}
