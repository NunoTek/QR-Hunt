import { Link } from "@remix-run/react";
import { useTranslation } from "~/i18n/I18nContext";
import { LogIn, Settings } from "../icons";

export function HeroSection() {
  const { t } = useTranslation();

  return (
    <section className="relative min-h-screen flex items-center justify-center px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-16 overflow-hidden">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/hero-bg.png')" }}
      />
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-primary)]/50 via-[var(--color-primary-dark)]/60 to-indigo-800/50" />

      {/* Content */}
      <div className="relative text-center max-w-4xl mx-auto text-white px-4">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 sm:gap-3 mb-6 sm:mb-8 animate-fade-in">
          <span className="text-4xl sm:text-5xl lg:text-6xl" aria-label="Target">🎯</span>
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold">{t("common.appName")}</h1>
        </div>

        {/* Title */}
        <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-extrabold leading-tight mb-4 sm:mb-6 animate-slide-up">
          {t("pages.home.hero.title")}
          <span className="bg-gradient-to-r from-amber-200 to-amber-400 bg-clip-text text-transparent"> {t("pages.home.hero.titleHighlight")}</span>
        </h2>

        {/* Subtitle */}
        <p className="text-base sm:text-lg md:text-xl lg:text-2xl opacity-90 leading-relaxed mb-6 sm:mb-8 max-w-2xl mx-auto animate-slide-up" style={{ animationDelay: "0.1s" }}>
          {t("pages.home.hero.subtitle")}
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center animate-pop-in" style={{ animationDelay: "0.2s" }}>
          <Link
            to="/join"
            className="inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-white text-[var(--color-primary)] font-semibold rounded-xl hover:bg-gray-100 transition-all shadow-lg hover:shadow-xl text-base sm:text-lg min-h-[3rem] sm:min-h-[3.5rem]"
          >
            <LogIn size={20} className="flex-shrink-0" />
            <span>{t("pages.home.hero.joinGame")}</span>
          </Link>
          <Link
            to="/admin"
            className="inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-white/20 text-warning font-semibold rounded-xl border-2 border-white/50 hover:bg-gray-100 hover:border-white/70 transition-all text-base sm:text-lg min-h-[3rem] sm:min-h-[3.5rem] backdrop-blur-sm"
          >
            <Settings size={20} className="flex-shrink-0" />
            <span>{t("pages.home.hero.createHunt")}</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
