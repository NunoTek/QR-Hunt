import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import {
  createTranslator,
  defaultLanguage,
  detectLanguage,
  supportedLanguages,
  type Language,
  type TranslationFunction,
} from "./index";

interface I18nContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: TranslationFunction;
  supportedLanguages: readonly Language[];
}

const I18nContext = createContext<I18nContextValue | null>(null);

interface I18nProviderProps {
  children: ReactNode;
  initialLanguage?: Language;
}

export function I18nProvider({ children, initialLanguage }: I18nProviderProps) {
  const [language, setLanguageState] = useState<Language>(initialLanguage ?? defaultLanguage);
  const [isHydrated, setIsHydrated] = useState(false);

  // Detect language on client-side hydration
  useEffect(() => {
    if (!isHydrated) {
      const detected = detectLanguage();
      setLanguageState(detected);
      setIsHydrated(true);
    }
  }, [isHydrated]);

  // Update document lang attribute when language changes
  useEffect(() => {
    if (typeof document !== "undefined" && isHydrated) {
      document.documentElement.lang = language;
    }
  }, [language, isHydrated]);

  const setLanguage = useCallback((lang: Language) => {
    if (!supportedLanguages.includes(lang)) {
      console.warn(`Unsupported language: ${lang}`);
      return;
    }

    setLanguageState(lang);

    // Persist to localStorage
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("qrhunt-language", lang);
    }
  }, []);

  const t = createTranslator(language);

  const value: I18nContextValue = {
    language,
    setLanguage,
    t,
    supportedLanguages: supportedLanguages as readonly Language[],
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/**
 * Hook to access the i18n context
 */
export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider");
  }

  return context;
}

/**
 * Hook to get the translation function only
 */
export function useTranslation() {
  const { t, language } = useI18n();
  return { t, language };
}

/**
 * Hook to get the language and setter
 */
export function useLanguage() {
  const { language, setLanguage, supportedLanguages } = useI18n();
  return { language, setLanguage, supportedLanguages };
}
