"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Menu, X, Search, User, Heart, ShoppingBag, Settings } from "lucide-react";
import { useCart } from "@/components/cart/cart-context";
import { Link, useRouter } from "@/i18n/navigation";
import { LocaleSwitcher } from "@/components/store/locale-switcher";
import {
  NotificationBell,
  type NotificationBellItem,
} from "@/components/store/notification-bell";
import { cn } from "@/lib/utils";

type HeaderUser = { name: string; role: string } | null;

export function Header({
  user,
  notifications,
  unreadCount,
}: {
  user: HeaderUser;
  notifications: NotificationBellItem[];
  unreadCount: number;
}) {
  const t = useTranslations("Header");
  const tc = useTranslations("Common");
  const { count, openCart } = useCart();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const submitSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/products?q=${encodeURIComponent(q)}` : "/products");
  };

  const nav = [
    { href: "/", label: t("home") },
    { href: "/products", label: t("products") },
    { href: "/#story", label: t("about") },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white">
      {/* 公告栏 */}
      <div className="bg-foreground py-2 text-center text-[11px] tracking-wider text-white">
        {tc("freeShipping")}
      </div>

      <div
        className={cn(
          "border-b border-border/60 transition-shadow duration-300",
          scrolled && "shadow-[0_1px_12px_rgba(0,0,0,0.06)]"
        )}
      >
        <div className="container-shop flex h-16 items-center justify-between gap-4">
          {/* 移动端菜单按钮 */}
          <button
            className="rounded-full p-2 transition-colors hover:bg-surface lg:hidden"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Menu"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>

          {/* Logo */}
          <Link
            href="/"
            className="text-2xl font-light tracking-[0.28em] text-foreground"
          >
            LUMEN
          </Link>

          {/* 桌面导航 */}
          <nav className="hidden items-center gap-8 lg:flex">
            {nav.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="text-sm text-muted transition-colors hover:text-foreground"
              >
                {n.label}
              </Link>
            ))}
          </nav>

          {/* 右侧操作区 */}
          <div className="flex items-center gap-1.5">
            <form onSubmit={submitSearch} className="hidden items-center md:flex">
              <div className="relative">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("searchPlaceholder")}
                  className="w-40 rounded-full border border-border bg-surface py-2 pl-9 pr-4 text-sm outline-none transition-all duration-300 focus:w-56 focus:border-foreground lg:w-48 lg:focus:w-64"
                />
                <Search
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                />
              </div>
            </form>

            {user && (
              <NotificationBell items={notifications} unreadCount={unreadCount} />
            )}

            <Link
              href="/wishlist"
              className="rounded-full p-2 text-foreground transition-colors hover:bg-surface"
              aria-label={t("wishlist")}
            >
              <Heart size={20} strokeWidth={1.6} />
            </Link>

            <Link
              href="/account"
              className="rounded-full p-2 text-foreground transition-colors hover:bg-surface"
              aria-label={t("account")}
            >
              <User size={20} strokeWidth={1.6} />
            </Link>

            {user?.role === "ADMIN" && (
              <Link
                href="/admin"
                className="rounded-full p-2 text-foreground transition-colors hover:bg-surface"
                aria-label={t("admin")}
              >
                <Settings size={20} strokeWidth={1.6} />
              </Link>
            )}

            <button
              onClick={openCart}
              className="relative rounded-full p-2 text-foreground transition-colors hover:bg-surface"
              aria-label={t("cart")}
            >
              <ShoppingBag size={20} strokeWidth={1.6} />
              {count > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-foreground px-1 text-[10px] font-medium text-white">
                  {count}
                </span>
              )}
            </button>

            <LocaleSwitcher className="ml-1 hidden sm:inline-flex" />
          </div>
        </div>

        {/* 移动端菜单 */}
        {menuOpen && (
          <div className="border-t border-border bg-white px-6 py-4 lg:hidden">
            <form onSubmit={submitSearch} className="mb-4">
              <div className="relative">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("searchPlaceholder")}
                  className="input-shop pl-9"
                />
                <Search
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                />
              </div>
            </form>
            <nav className="flex flex-col gap-3">
              {nav.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  onClick={() => setMenuOpen(false)}
                  className="py-1 text-sm text-muted hover:text-foreground"
                >
                  {n.label}
                </Link>
              ))}
              <div className="mt-2">
                <LocaleSwitcher />
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
