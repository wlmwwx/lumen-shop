import type { ReactNode } from "react";
import type { Metadata } from "next";
import "../globals.css";

export const metadata: Metadata = {
  title: { default: "拾光 LUMEN · 管理后台", template: "%s · 管理后台" },
};

export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return (
    // suppressHydrationWarning：与前台布局一致，防止浏览器扩展在 hydration 前
    // 向 <html>/<body> 根元素注入属性导致的水合误报（详见 app/[locale]/layout.tsx）。
    <html lang="zh-CN" suppressHydrationWarning>
      <body
        className="bg-[#f6f6f4] text-[#1a1a1a] antialiased"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
