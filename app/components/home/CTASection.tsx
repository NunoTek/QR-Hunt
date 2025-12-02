import { Link } from "@remix-run/react";
import { useTranslation } from "~/i18n/I18nContext";

export function CTASection() {
  const { t } = useTranslation();

  return (
    <section className="py-12 sm:py-16 lg:py-20 xl:py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-dark)] flex items-center justify-center">
      <div className="max-w-3xl w-full text-center text-white">
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold mb-3 sm:mb-4">
          {t("pages.home.cta.title")}
        </h2>
        <p className="text-base sm:text-lg lg:text-xl opacity-90 mb-6 sm:mb-8">
          {t("pages.home.cta.subtitle")}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
          <Link
            to="/join"
            className="inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-white text-[var(--color-primary)] font-semibold rounded-xl hover:bg-gray-100 transition-all shadow-lg text-base sm:text-lg min-h-[3rem] sm:min-h-[3.5rem]"
          >
            {t("pages.home.hero.joinGame")}
          </Link>
          <Link
            to="/admin"
            className="inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-white/20 text-warning font-semibold rounded-xl border-2 border-white/50 hover:bg-gray-100 hover:border-white/70 transition-all text-base sm:text-lg min-h-[3rem] sm:min-h-[3.5rem] backdrop-blur-sm"
          >
            {t("pages.home.hero.createHunt")}
          </Link>
        </div>
      </div>
    </section>
  );
}
