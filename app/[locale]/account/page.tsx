import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LogOut, PackageOpen, ArrowRight } from "lucide-react";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { logoutAction } from "@/actions/auth";
import { AuthForms } from "@/components/store/auth-forms";
import { Link } from "@/i18n/navigation";
import { formatPrice } from "@/lib/format";
import { formatDate } from "@/lib/format";
import { ORDER_STATUS_LABEL } from "@/lib/constants";
import { getReviewInviteEligibleOrders } from "@/lib/notifications";
import { ReviewInviteBanner } from "@/components/store/review-invite-banner";

export const metadata: Metadata = { title: "我的账号" };

export default async function AccountPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const loc = locale as "zh" | "en";
  setRequestLocale(locale);
  const t = await getTranslations("Account");
  const user = await getSessionUser();

  if (!user) {
    return (
      <div className="container-shop py-20">
        <h1 className="mb-10 text-center text-3xl font-light tracking-wide">
          {t("login")} / {t("register")}
        </h1>
        <AuthForms
          labels={{
            login: t("login"),
            register: t("register"),
            email: t("email"),
            password: t("password"),
            name: t("name"),
            loginBtn: t("loginBtn"),
            registerBtn: t("registerBtn"),
            switchToRegister: t("noAccount"),
            switchToLogin: t("haveAccount"),
          }}
        />
      </div>
    );
  }

  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { items: true } } },
  });

  // 评价邀请：取最近一笔符合条件的已完成订单（与站内通知共用查询）
  const eligible = await getReviewInviteEligibleOrders(user.id);
  const inviteOrder = eligible[0] ?? null;

  return (
    <div className="container-shop max-w-4xl py-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-light tracking-wide">
            {t("welcome", { name: user.name })}
          </h1>
          <p className="mt-2 text-sm text-muted">{user.email}</p>
        </div>
        <form action={logoutAction}>
          <button type="submit" className="btn-outline !px-5 !py-2 text-xs">
            <LogOut size={14} /> {t("logout")}
          </button>
        </form>
      </div>

      {/* 评价邀请横幅 */}
      {inviteOrder && (
        <div className="mt-8">
          <ReviewInviteBanner
            orderId={inviteOrder.id}
            title={t("reviewInviteTitle", { order: inviteOrder.orderNumber })}
            body={t("reviewInviteBody")}
            cta={t("reviewInviteCta")}
            pendingLabel={t("reviewInvitePending", { count: inviteOrder.pendingCount })}
            dismissLabel={t("reviewInviteDismiss")}
          />
        </div>
      )}

      <div className="mt-12">
        <h2 className="mb-6 text-sm font-semibold uppercase tracking-widest">
          {t("myOrders")}
        </h2>
        {orders.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-16 text-center">
            <PackageOpen size={36} className="mx-auto text-border" strokeWidth={1} />
            <p className="mt-4 text-sm text-muted">{t("emptyOrders")}</p>
            <Link href="/products" className="btn-primary mt-6">
              去逛逛
            </Link>
          </div>
        ) : (
          <ul className="space-y-4">
            {orders.map((o) => {
              const label = ORDER_STATUS_LABEL[o.status];
              return (
                <li key={o.id}>
                  <Link
                    href={`/order/${o.id}`}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border px-6 py-4 transition-all duration-200 hover:border-foreground/40 hover:shadow-sm"
                  >
                    <div>
                      <p className="text-sm font-medium">{o.orderNumber}</p>
                      <p className="mt-1 text-xs text-muted">
                        {formatDate(o.createdAt, loc)} · {o._count.items} 件
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="rounded-full bg-surface px-3 py-1 text-xs font-medium">
                        {loc === "en" ? label.en : label.zh}
                      </span>
                      <span className="text-base font-semibold">
                        {formatPrice(o.total, loc)}
                      </span>
                    </div>
                  </Link>
                  <div className="mt-2 px-2">
                    <Link
                      href={`/order/${o.id}/tracking`}
                      className="inline-flex items-center gap-1 text-xs text-muted underline-offset-4 transition-colors hover:text-foreground hover:underline"
                    >
                      {t("trackOrder")}
                      <ArrowRight size={12} />
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
