import { useTranslation } from "~/i18n/I18nContext";
import { QrCode, Users, Camera, BarChart } from "../icons";

const FEATURES = [
  {
    key: "create",
    icon: <QrCode size={24} stroke="white" className="sm:w-7 sm:h-7" />,
  },
  {
    key: "invite",
    icon: <Users size={24} stroke="white" className="sm:w-7 sm:h-7" />,
  },
  {
    key: "hunt",
    icon: <Camera size={24} stroke="white" className="sm:w-7 sm:h-7" />,
  },
  {
    key: "leaderboard",
    icon: <BarChart size={24} stroke="white" className="sm:w-7 sm:h-7" />,
  },
];

export function HowItWorksSection() {
  const { t } = useTranslation();

  return (
    <section className="py-12 sm:py-16 lg:py-20 xl:py-24 px-4 sm:px-6 lg:px-8 bg-secondary">
      <div className="mx-auto">
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-center text-primary mb-8 sm:mb-12 lg:mb-16">
          {t("pages.home.howItWorks.title")}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
          {FEATURES.map((feature) => (
            <div
              key={feature.key}
              className="bg-elevated/50 p-5 sm:p-6 lg:p-8 rounded-2xl border transition-all hover:border-[var(--color-primary)]/50 hover:-translate-y-1 duration-normal"
            >
              <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-dark)] flex items-center justify-center mb-4 sm:mb-5">
                {feature.icon}
              </div>
              <h3 className="text-base sm:text-lg lg:text-xl font-bold text-primary mb-2">
                {t(`pages.home.howItWorks.steps.${feature.key}.title`)}
              </h3>
              <p className="text-secondary text-sm sm:text-base">
                {t(`pages.home.howItWorks.steps.${feature.key}.description`)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
