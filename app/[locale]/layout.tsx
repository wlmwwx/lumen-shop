import type { ReactNode } from "react";
import type { Metadata } from "next";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { CartProvider } from "@/components/cart/cart-context";
import { Header } from "@/components/store/header";
import { Footer } from "@/components/store/footer";
import { CartDrawer } from "@/components/store/cart-drawer";
import { getSessionUser } from "@/lib/auth";
import { getReviewInviteNotifications } from "@/lib/notifications";
import "../globals.css";

export const metadata: Metadata = {
  title: {
    default: "LUMEN · 拾光生活馆",
    template: "%s · LUMEN",
  },
  description:
    "拾光 LUMEN — 精选全球生活方式好物的独立店商。家居、香氛、文创、配饰，好物让日常发光。",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const user = await getSessionUser();
  const notifications = user
    ? await getReviewInviteNotifications(user.id)
    : { items: [], unreadCount: 0 };

  // suppressHydrationWarning：浏览器扩展（如沉浸式翻译/暗黑模式）会在 hydration 前向
  // <html>/<body> 根元素注入 data-immersive-translate-* 等属性或 class，导致服务端 HTML
  // 与客户端不一致的误报。仅作用于这两个根元素，不会掩盖其他真实的 hydration mismatch
  // （子树的文本/结构不匹配警告照常报出）。
  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className="flex min-h-screen flex-col bg-background text-foreground antialiased"
        suppressHydrationWarning
      >
        <NextIntlClientProvider>
          <CartProvider>
            <Header
              user={user}
              notifications={notifications.items}
              unreadCount={notifications.unreadCount}
            />
            <main className="flex-1">{children}</main>
            <CartDrawer locale={locale as "zh" | "en"} />
          </CartProvider>
          <Footer />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
