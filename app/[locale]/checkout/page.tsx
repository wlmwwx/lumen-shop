import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CheckoutForm } from "@/components/store/checkout-form";
import { Link } from "@/i18n/navigation";

export const metadata: Metadata = { title: "结算" };

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const loc = locale as "zh" | "en";
  setRequestLocale(locale);
  const t = await getTranslations("Checkout");

  return (
    <div className="container-shop py-12">
      <div className="mb-10 flex items-center justify-between">
        <h1 className="text-3xl font-light tracking-wide">{t("title")}</h1>
        <Link
          href="/products"
          className="text-sm text-muted underline-offset-4 hover:underline"
        >
          ← {t("backToCart")}
        </Link>
      </div>
      <CheckoutForm locale={loc} />
    </div>
  );
}
