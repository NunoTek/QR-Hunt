import { useTranslation } from "~/i18n/I18nContext";
import { Repeat } from "../icons";

const STEPS = [
  { icon: "🎮", key: "join", gradient: "from-[var(--color-primary)] to-[var(--color-primary-dark)]" },
  { icon: "📜", key: "clue", gradient: "from-[var(--color-primary)] to-[var(--color-primary-dark)]" },
  { icon: "🔍", key: "hunt", gradient: "from-[var(--color-primary)] to-[var(--color-primary-dark)]" },
  { icon: "✨", key: "scan", gradient: "from-[var(--color-success)] to-emerald-700" },
];

export function PlayerExperienceSection() {
  const { t } = useTranslation();

  return (
    <section className="py-12 sm:py-16 lg:py-20 xl:py-24 px-4 sm:px-6 lg:px-8 bg-primary">
      <div className="mx-auto">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-primary mb-3 sm:mb-4">
            {t("pages.home.playerExperience.title")}
          </h2>
          <p className="text-secondary text-base sm:text-lg max-w-2xl mx-auto">
            {t("pages.home.playerExperience.subtitle")}
          </p>
        </div>

        {/* Flow Steps */}
        <div className="relative">
          {/* Connection Line (hidden on mobile) */}
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-[var(--color-primary)]/20 via-[var(--color-primary)] to-[var(--color-primary)]/20 -translate-y-1/2 z-0" />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 relative z-10">
            {STEPS.map((step) => (
              <div
                key={step.key}
                className="bg-elevated p-5 sm:p-6 rounded-2xl border-2 border-[var(--color-primary)]/30 hover:border-[var(--color-primary)] transition-all text-center group"
              >
                <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br ${step.gradient} flex items-center justify-center mx-auto mb-4 text-white text-2xl sm:text-3xl group-hover:scale-110 transition-transform`}>
                  {step.icon}
                </div>
                <h3 className="text-base sm:text-lg font-bold text-primary mb-2">
                  {t(`pages.home.playerExperience.steps.${step.key}.title`)}
                </h3>
                <p className="text-secondary text-sm">
                  {t(`pages.home.playerExperience.steps.${step.key}.description`)}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Repeat indicator */}
        <div className="flex items-center justify-center gap-3 mt-6 sm:mt-8 text-[var(--color-primary)]">
          <Repeat size={20} />
          <span className="font-semibold text-sm sm:text-base">{t("pages.home.playerExperience.repeat")}</span>
        </div>
      </div>
    </section>
  );
}
