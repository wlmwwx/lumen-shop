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

  return (
    <html lang={locale}>
      <body className="flex min-h-screen flex-col bg-background text-foreground antialiased">
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
