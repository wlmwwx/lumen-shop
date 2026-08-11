import type { ReactNode } from "react";
import type { Metadata } from "next";
import "../globals.css";

export const metadata: Metadata = {
  title: { default: "拾光 LUMEN · 管理后台", template: "%s · 管理后台" },
};

export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="bg-[#f6f6f4] text-[#1a1a1a] antialiased">{children}</body>
    </html>
  );
}
