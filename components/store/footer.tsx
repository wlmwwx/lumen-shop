import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AtSign, Globe, MessageCircle, Mail, Phone, MapPin } from "lucide-react";

export async function Footer() {
  const t = await getTranslations("Footer");

  return (
    <footer className="mt-24 border-t border-border bg-surface/60">
      <div className="container-shop grid grid-cols-1 gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-2xl font-light tracking-[0.28em]">LUMEN</p>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">
            {t("aboutText")}
          </p>
          <div className="mt-5 flex gap-3">
            {[AtSign, Globe, MessageCircle].map((Icon, i) => (
              <a
                key={i}
                href="#"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted transition-all duration-300 hover:border-foreground hover:bg-foreground hover:text-white"
                aria-label="social"
              >
                <Icon size={16} />
              </a>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-foreground">
            {t("about")}
          </h3>
          <ul className="mt-4 space-y-2.5 text-sm text-muted">
            <li><Link href="/#story" className="hover:text-foreground">{t("story")}</Link></li>
            <li><Link href="/products" className="hover:text-foreground">{t("shopAll")}</Link></li>
            <li><a href="#" className="hover:text-foreground">{t("shippingPolicy")}</a></li>
          </ul>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-foreground">
            {t("help")}
          </h3>
          <ul className="mt-4 space-y-2.5 text-sm text-muted">
            <li><a href="#" className="hover:text-foreground">{t("faq")}</a></li>
            <li><a href="#" className="hover:text-foreground">{t("returns")}</a></li>
            <li><a href="#" className="hover:text-foreground">{t("privacy")}</a></li>
            <li><a href="#" className="hover:text-foreground">{t("terms")}</a></li>
          </ul>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-foreground">
            {t("contact")}
          </h3>
          <ul className="mt-4 space-y-2.5 text-sm text-muted">
            <li className="flex items-center gap-2">
              <Mail size={14} /> {t("email")}
            </li>
            <li className="flex items-center gap-2">
              <Phone size={14} /> {t("phone")}
            </li>
            <li className="flex items-start gap-2">
              <MapPin size={14} className="mt-0.5 shrink-0" /> {t("address")}
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border py-6">
        <p className="container-shop text-center text-xs text-muted">
          {t("copyright")}
        </p>
      </div>
    </footer>
  );
}
