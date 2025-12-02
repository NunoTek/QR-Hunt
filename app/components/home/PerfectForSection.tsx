import { useTranslation } from "~/i18n/I18nContext";

const CATEGORIES = [
  { icon: "🏢", key: "teamBuilding" },
  { icon: "🎉", key: "parties" },
  { icon: "🎓", key: "education" },
  { icon: "🏕️", key: "camps" },
  { icon: "🏛️", key: "museums" },
  { icon: "💒", key: "weddings" },
];

export function PerfectForSection() {
  const { t } = useTranslation();

  return (
    <section className="py-12 sm:py-16 lg:py-20 xl:py-24 px-4 sm:px-6 lg:px-8 bg-primary">
      <div className="mx-auto">
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-center text-primary mb-8 sm:mb-12 lg:mb-16">
          {t("pages.home.perfectFor.title")}
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 lg:gap-6">
          {CATEGORIES.map((item) => (
            <div
              key={item.key}
              className="bg-secondary p-4 sm:p-5 lg:p-6 rounded-xl border hover:border-[var(--color-primary)]/50 transition-colors text-center"
            >
              <span
                className="text-3xl sm:text-4xl block mb-2 sm:mb-3"
                role="img"
                aria-label={t(`pages.home.perfectFor.items.${item.key}.title`)}
              >
                {item.icon}
              </span>
              <h4 className="font-bold text-primary text-xs sm:text-sm lg:text-base mb-1">
                {t(`pages.home.perfectFor.items.${item.key}.title`)}
              </h4>
              <p className="text-tertiary text-xs lg:text-sm">
                {t(`pages.home.perfectFor.items.${item.key}.description`)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
