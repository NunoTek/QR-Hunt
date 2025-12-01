import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "~/i18n/I18nContext";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

export function InstallPrompt() {
  const { t } = useTranslation();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed (standalone mode)
    const standalone = window.matchMedia("(display-mode: standalone)").matches
      || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIsStandalone(standalone);

    if (standalone) return;

    // Check if dismissed recently (within 7 days)
    const dismissed = localStorage.getItem("pwa-install-dismissed");
    if (dismissed) {
      const dismissedTime = parseInt(dismissed, 10);
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      if (Date.now() - dismissedTime < sevenDays) {
        return;
      }
    }

    // Detect iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as Window & { MSStream?: unknown }).MSStream;
    setIsIOS(iOS);

    // For iOS, show manual install instructions after a delay
    if (iOS) {
      const timer = setTimeout(() => setShowPrompt(true), 3000);
      return () => clearTimeout(timer);
    }

    // For Android/desktop, listen for beforeinstallprompt
    const handleBeforeInstall = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Show prompt after a delay
      setTimeout(() => setShowPrompt(true), 3000);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setShowPrompt(false);
    localStorage.setItem("pwa-install-dismissed", Date.now().toString());
  }, []);

  // Don't show if already installed or nothing to show
  if (isStandalone || !showPrompt) return null;

  return (
    <div className="install-prompt animate-slide-up">
      <div className="install-prompt-content">
        <div className="install-prompt-icon">
          <img src="/favicon.svg" alt="QR Hunt" width={40} height={40} />
        </div>
        <div className="install-prompt-text">
          <strong>{t("components.installPrompt.title")}</strong>
          {isIOS ? (
            <p>
              {t("components.installPrompt.iosInstructions", { icon: "" })}
              <span className="install-share-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                  <polyline points="16 6 12 2 8 6" />
                  <line x1="12" y1="2" x2="12" y2="15" />
                </svg>
              </span>
            </p>
          ) : (
            <p>{t("components.installPrompt.addToHomeScreen")}</p>
          )}
        </div>
        <div className="install-prompt-actions">
          {!isIOS && deferredPrompt && (
            <button
              type="button"
              onClick={handleInstall}
              className="install-btn-primary"
            >
              {t("components.installPrompt.install")}
            </button>
          )}
          <button
            type="button"
            onClick={handleDismiss}
            className="install-btn-dismiss"
            aria-label="Dismiss"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      <style>{`
        .install-prompt {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 1rem;
          z-index: 9999;
          pointer-events: none;
        }

        .install-prompt-content {
          display: flex;
          align-items: center;
          gap: 0.875rem;
          padding: 1rem;
          background: var(--bg-elevated);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.15);
          max-width: 480px;
          margin: 0 auto;
          pointer-events: auto;
        }

        .install-prompt-icon {
          flex-shrink: 0;
          width: 40px;
          height: 40px;
          border-radius: var(--radius);
          overflow: hidden;
        }

        .install-prompt-icon img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .install-prompt-text {
          flex: 1;
          min-width: 0;
        }

        .install-prompt-text strong {
          display: block;
          font-size: 0.9375rem;
          color: var(--text-primary);
        }

        .install-prompt-text p {
          margin: 0.25rem 0 0;
          font-size: 0.8125rem;
          color: var(--text-muted);
          line-height: 1.3;
        }

        .install-share-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          vertical-align: middle;
          color: var(--color-primary);
        }

        .install-prompt-actions {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-shrink: 0;
        }

        .install-btn-primary {
          padding: 0.5rem 1rem;
          background: var(--color-primary);
          color: white;
          font-weight: 600;
          font-size: 0.875rem;
          border: none;
          border-radius: var(--radius);
          cursor: pointer;
          transition: opacity var(--transition-fast);
        }

        .install-btn-primary:hover {
          opacity: 0.9;
        }

        .install-btn-dismiss {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          padding: 0;
          background: transparent;
          color: var(--text-muted);
          border: none;
          border-radius: var(--radius);
          cursor: pointer;
          transition: color var(--transition-fast), background var(--transition-fast);
        }

        .install-btn-dismiss:hover {
          color: var(--text-primary);
          background: var(--bg-tertiary);
        }

        @media (max-width: 480px) {
          .install-prompt-content {
            flex-wrap: wrap;
          }

          .install-prompt-text {
            flex: 1 1 calc(100% - 100px);
          }
        }
      `}</style>
    </div>
  );
}
