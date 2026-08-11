"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Tags,
  MessageSquare,
  Users,
  Mail,
  LogOut,
  Store,
} from "lucide-react";
import { logoutAction } from "@/actions/auth";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "仪表盘", icon: LayoutDashboard, exact: true },
  { href: "/admin/products", label: "商品管理", icon: Package },
  { href: "/admin/orders", label: "订单管理", icon: ShoppingCart },
  { href: "/admin/categories", label: "分类管理", icon: Tags },
  { href: "/admin/reviews", label: "评论管理", icon: MessageSquare },
  { href: "/admin/emails", label: "邮件记录", icon: Mail },
  { href: "/admin/customers", label: "顾客管理", icon: Users },
];

export function AdminShell({
  user,
  children,
}: {
  user: { name: string };
  children: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen">
      {/* 侧边栏 */}
      <aside className="fixed inset-y-0 left-0 z-30 flex w-60 flex-col border-r border-[#e8e8e4] bg-white">
        <div className="flex h-16 items-center gap-2 border-b border-[#eee] px-6">
          <span className="text-xl font-light tracking-[0.25em]">LUMEN</span>
          <span className="rounded-full bg-[#f2f2ef] px-2 py-0.5 text-[10px] text-[#8a8a86]">
            后台
          </span>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200",
                  active
                    ? "bg-[#1a1a1a] font-medium text-white"
                    : "text-[#5a5a56] hover:bg-[#f4f4f1] hover:text-[#1a1a1a]"
                )}
              >
                <item.icon size={17} strokeWidth={1.8} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-[#eee] p-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1a1a1a] text-sm font-medium text-white">
              {user.name.slice(0, 1)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="text-xs text-[#8a8a86]">管理员</p>
            </div>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[#5a5a56] transition-colors hover:bg-[#f4f4f1] hover:text-[#c5283d]"
            >
              <LogOut size={15} /> 退出登录
            </button>
          </form>
        </div>
      </aside>

      {/* 主区 */}
      <div className="ml-60 flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-[#e8e8e4] bg-white/90 px-8 backdrop-blur">
          <p className="text-sm text-[#8a8a86]">拾光 LUMEN · 独立店商管理后台</p>
          <Link
            href="/zh"
            target="_blank"
            className="flex items-center gap-1.5 text-sm text-[#5a5a56] transition-colors hover:text-[#1a1a1a]"
          >
            <Store size={15} /> 查看店铺
          </Link>
        </header>
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
