import { useCallback, useEffect, useRef, useState } from "react";
import { useLanguage, useTranslation } from "~/i18n/I18nContext";
import { languages, type Language } from "~/i18n";

interface LanguageSelectorProps {
  variant?: "dropdown" | "inline";
  showLabel?: boolean;
}

const languageFlags: Record<Language, string> = {
  en: "🇺🇸",
  fr: "🇫🇷",
  pt: "🇵🇹",
};

export function LanguageSelector({ variant = "dropdown", showLabel = false }: LanguageSelectorProps) {
  const { language, setLanguage, supportedLanguages } = useLanguage();
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Close dropdown on Escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen]);

  const handleLanguageChange = useCallback(
    (lang: Language) => {
      setLanguage(lang);
      setIsOpen(false);
    },
    [setLanguage]
  );

  if (variant === "inline") {
    return (
      <div className="language-selector-inline">
        {showLabel && <span className="language-label">{t("components.languageSelector.title")}:</span>}
        <div className="language-buttons">
          {supportedLanguages.map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => handleLanguageChange(lang)}
              className={`language-btn ${language === lang ? "active" : ""}`}
              aria-pressed={language === lang}
              title={languages[lang]}
            >
              <span className="language-flag">{languageFlags[lang]}</span>
              <span className="language-code">{lang.toUpperCase()}</span>
            </button>
          ))}
        </div>

        <style>{`
          .language-selector-inline {
            display: flex;
            align-items: center;
            gap: 0.75rem;
          }

          .language-label {
            font-size: 0.875rem;
            color: var(--text-secondary);
          }

          .language-buttons {
            display: flex;
            gap: 0.25rem;
          }

          .language-btn {
            display: flex;
            align-items: center;
            gap: 0.25rem;
            padding: 0.375rem 0.5rem;
            border: 1px solid var(--border-color);
            border-radius: var(--radius);
            background: var(--bg-secondary);
            color: var(--text-secondary);
            font-size: 0.75rem;
            cursor: pointer;
            transition: all var(--transition-fast);
          }

          .language-btn:hover {
            border-color: var(--color-primary);
            color: var(--text-primary);
          }

          .language-btn.active {
            background: var(--color-primary);
            border-color: var(--color-primary);
            color: white;
          }

          .language-flag {
            font-size: 0.875rem;
          }

          .language-code {
            font-weight: 500;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="language-selector" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="language-trigger"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={t("components.languageSelector.title")}
      >
        <span className="language-code">{language.toUpperCase()}</span>
        <svg
          className={`language-chevron ${isOpen ? "open" : ""}`}
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polyline points="6 15 12 9 18 15" />
        </svg>
      </button>

      {isOpen && (
        <div className="language-dropdown" role="listbox" aria-label={t("components.languageSelector.title")}>
          {supportedLanguages.map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => handleLanguageChange(lang)}
              className={`language-option ${language === lang ? "active" : ""}`}
              role="option"
              aria-selected={language === lang}
            >
              <span className="language-flag">{languageFlags[lang]}</span>
              <span className="language-name">{languages[lang]}</span>
              {language === lang && (
                <svg
                  className="language-check"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}

      <style>{`
        .language-selector {
          position: fixed;
          bottom: 1rem;
          left: 1rem;
          z-index: 100;
        }

        .language-trigger {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.5rem 0.625rem;
          border: 1px solid var(--border-color);
          border-radius: var(--radius);
          background: var(--bg-secondary);
          color: var(--text-primary);
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .language-trigger:hover {
          border-color: var(--color-primary);
        }

        .language-code {
          font-weight: 600;
        }

        .language-chevron {
          transition: transform var(--transition-fast);
          color: var(--text-muted);
        }

        .language-chevron.open {
          transform: rotate(180deg);
        }

        .language-dropdown {
          position: absolute;
          bottom: 100%;
          left: 0;
          margin-bottom: 0.25rem;
          min-width: 150px;
          padding: 0.25rem;
          background: var(--bg-elevated);
          border: 1px solid var(--border-color);
          border-radius: var(--radius);
          box-shadow: var(--shadow-md);
          z-index: 1000;
          animation: dropdown-fade-up 0.15s ease-out;
        }

        @keyframes dropdown-fade-up {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .language-option {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          width: 100%;
          padding: 0.625rem 0.75rem;
          border: none;
          border-radius: var(--radius-sm);
          background: transparent;
          color: var(--text-primary);
          font-size: 0.875rem;
          text-align: left;
          cursor: pointer;
          transition: background var(--transition-fast);
        }

        .language-option:hover {
          background: var(--bg-tertiary);
        }

        .language-option.active {
          background: var(--color-primary)/10;
          color: var(--color-primary);
        }

        .language-option .language-name {
          flex: 1;
        }

        .language-flag {
          font-size: 1rem;
        }

        .language-check {
          color: var(--color-primary);
        }
      `}</style>
    </div>
  );
}
