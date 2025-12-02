import { useTranslation } from "~/i18n/I18nContext";

export function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="py-6 sm:py-8 px-4 sm:px-6 lg:px-8 bg-secondary border-t border-gray-800">
      <div className="mx-auto text-center">
        <div className="flex items-center justify-center gap-2 text-lg sm:text-xl font-bold text-secondary mb-2">
          <span>🎯</span>
          <span>{t("common.appName")}</span>
        </div>
        <p className="text-gray-500 text-xs sm:text-sm">
          {t("common.footer.selfHostable")} • {t("common.footer.openSource")} • {t("common.footer.privacyFocused")}
        </p>
      </div>
    </footer>
  );
}
