import en from "./en.json";
import fr from "./fr.json";
import pt from "./pt.json";

export type Language = "en" | "fr" | "pt";

export const languages: Record<Language, string> = {
  en: "English",
  fr: "Français",
  pt: "Português",
};

export const translations = {
  en,
  fr,
  pt,
} as const;

export type Translations = typeof en;

export const defaultLanguage: Language = "en";
export const supportedLanguages: Language[] = ["en", "fr", "pt"];

/**
 * Detects the user's preferred language from browser settings
 * Falls back to English if no match is found
 */
export function detectLanguage(): Language {
  if (typeof window === "undefined") {
    return defaultLanguage;
  }

  // Check localStorage first
  const stored = localStorage.getItem("qrhunt-language");
  if (stored && supportedLanguages.includes(stored as Language)) {
    return stored as Language;
  }

  // Check browser languages
  const browserLanguages = navigator.languages || [navigator.language];

  for (const lang of browserLanguages) {
    // Get the primary language code (e.g., "en" from "en-US")
    const primaryLang = lang.split("-")[0].toLowerCase();

    if (supportedLanguages.includes(primaryLang as Language)) {
      return primaryLang as Language;
    }
  }

  return defaultLanguage;
}

/**
 * Gets a nested value from an object using a dot-notation path
 */
function getNestedValue(obj: Record<string, unknown>, path: string): string | string[] | undefined {
  const keys = path.split(".");
  let current: unknown = obj;

  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }

  if (typeof current === "string") {
    return current;
  }

  if (Array.isArray(current) && current.every(item => typeof item === "string")) {
    return current as string[];
  }

  return undefined;
}

/**
 * Interpolates variables in a translation string
 * e.g., "Hello {{name}}" with { name: "World" } => "Hello World"
 */
function interpolate(str: string, params: Record<string, string | number>): string {
  return str.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    return params[key]?.toString() ?? `{{${key}}}`;
  });
}

/**
 * Creates a translation function for a specific language
 */
export function createTranslator(language: Language) {
  const currentTranslations = translations[language];
  const fallbackTranslations = translations[defaultLanguage];

  function t(key: string, params?: Record<string, string | number>): string;
  function t(key: string, params?: Record<string, string | number>, asArray?: false): string;
  function t(key: string, params: Record<string, string | number> | undefined, asArray: true): string[];
  function t(key: string, params?: Record<string, string | number>, asArray?: boolean): string | string[] {
    // Try current language first
    let value = getNestedValue(currentTranslations as unknown as Record<string, unknown>, key);

    // Fallback to default language
    if (value === undefined) {
      value = getNestedValue(fallbackTranslations as unknown as Record<string, unknown>, key);
    }

    // Return key if no translation found
    if (value === undefined) {
      console.warn(`Missing translation for key: ${key}`);
      return asArray ? [key] : key;
    }

    // If it's an array, return it directly (no interpolation for arrays)
    if (Array.isArray(value)) {
      return value;
    }

    // Interpolate if params provided
    if (params) {
      return interpolate(value, params);
    }

    return value;
  }

  return t;
}

export type TranslationFunction = ReturnType<typeof createTranslator>;
