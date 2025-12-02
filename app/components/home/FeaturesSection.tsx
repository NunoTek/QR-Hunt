import { useTranslation } from "~/i18n/I18nContext";
import { Check } from "../icons";

export function FeaturesSection() {
  const { t } = useTranslation();
  const features = t("pages.home.features.list") as unknown as string[];

  return (
    <section className="py-12 sm:py-16 lg:py-20 xl:py-24 px-4 sm:px-6 lg:px-8 bg-secondary">
      <div className="mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-16 items-center">
          {/* Features List */}
          <div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-primary mb-6 sm:mb-8 text-center lg:text-left">
              {t("pages.home.features.title")}
            </h2>
            <ul className="space-y-3 sm:space-y-4">
              {features.map((feature: string, i: number) => (
                <li key={i} className="flex items-start gap-3 text-secondary">
                  <Check className="w-5 h-5 sm:w-6 sm:h-6 text-[var(--color-success)] flex-shrink-0 mt-0.5" strokeWidth={3} />
                  <span className="text-sm sm:text-base lg:text-lg">{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Phone Mockup */}
          <div className="flex justify-center lg:justify-end">
            <PhoneMockup />
          </div>
        </div>
      </div>
    </section>
  );
}

function PhoneMockup() {
  const { t } = useTranslation();

  return (
    <div className="w-64 sm:w-72 lg:w-80 bg-tertiary rounded-[2.5rem] p-3 shadow-2xl border border-border">
      <div className="bg-primary rounded-[2rem] p-4 sm:p-5 min-h-[400px]">
        {/* Mockup Header */}
        <div className="flex items-center gap-2 mb-4 sm:mb-5">
          <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-success)]" />
          <span className="font-semibold text-primary text-xs sm:text-sm">
            {t("pages.home.features.mockup.teamName")}
          </span>
          <span className="ml-auto bg-[var(--color-primary)] text-white text-xs font-bold px-2.5 py-1 rounded-full">
            245 {t("common.points")}
          </span>
        </div>

        {/* Mockup Clue */}
        <div className="bg-secondary rounded-xl p-3 sm:p-4 mb-3 sm:mb-4 border-l-4 border-[var(--color-primary)]">
          <p className="text-xs text-[var(--color-primary)] font-semibold mb-1">
            {t("pages.home.features.mockup.nextClue")}
          </p>
          <p className="font-bold text-primary text-sm mb-1">
            {t("pages.home.features.mockup.clueTitle")}
          </p>
          <p className="text-tertiary text-xs">
            {t("pages.home.features.mockup.clueHint")}
          </p>
        </div>

        {/* Mockup Chat */}
        <div className="mb-3 sm:mb-4">
          <div className="bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] text-white text-xs px-3 py-2 rounded-lg inline-block">
            {t("pages.home.features.mockup.adminHint")}
          </div>
        </div>

        {/* Mockup Button */}
        <div className="bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] text-white text-center py-2.5 sm:py-3 rounded-xl font-semibold text-xs sm:text-sm">
          {t("pages.home.features.mockup.scanButton")}
        </div>
      </div>
    </div>
  );
}
