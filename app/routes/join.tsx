import type { MetaFunction } from "@remix-run/node";
import { useNavigate, useSearchParams } from "@remix-run/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Spinner } from "~/components/Loading";
import { useToast } from "~/components/Toast";
import { Version } from "~/components/Version";
import { useTranslation } from "~/i18n/I18nContext";
import { clearAuth, getGameSlug, getToken, setGameSlug, setToken } from "~/lib/tokenStorage";

export const meta: MetaFunction = () => {
  return [
    { title: "Join Game - QR Hunt" },
  ];
};

const CODE_LENGTH = 6;

function TeamCodeInput({
  value,
  onChange,
  onComplete,
  disabled
}: {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (completeCode: string) => void;
  disabled: boolean;
}) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  const handleChange = (index: number, inputValue: string) => {
    const char = inputValue.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!char) return;

    const newValue = value.split('');
    newValue[index] = char[0];
    const updatedValue = newValue.join('').slice(0, CODE_LENGTH);
    onChange(updatedValue);

    if (index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    } else if (updatedValue.length === CODE_LENGTH && onComplete) {
      onComplete(updatedValue);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const newValue = value.split('');
      if (newValue[index]) {
        newValue[index] = '';
        onChange(newValue.join(''));
      } else if (index > 0) {
        newValue[index - 1] = '';
        onChange(newValue.join(''));
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CODE_LENGTH);
    onChange(pastedData);
    const nextIndex = Math.min(pastedData.length, CODE_LENGTH - 1);
    inputRefs.current[nextIndex]?.focus();

    if (pastedData.length === CODE_LENGTH && onComplete) {
      onComplete(pastedData);
    }
  };

  return (
    <div className="flex gap-2 sm:gap-3 justify-center">
      {Array.from({ length: CODE_LENGTH }).map((_, index) => (
        <input
          key={index}
          ref={(el) => { inputRefs.current[index] = el; }}
          type="text"
          inputMode="text"
          maxLength={1}
          value={value[index] || ''}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          onFocus={() => setFocusedIndex(index)}
          onBlur={() => setFocusedIndex(null)}
          className={`
            w-10 h-12 sm:w-12 sm:h-14 md:w-14 md:h-16
            text-center text-xl sm:text-2xl font-bold font-mono
            border-2 rounded-lg
            bg-tertiary text-primary uppercase
            transition-all duration-fast
            focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]
            disabled:opacity-50 disabled:cursor-not-allowed
            ${value[index] ? 'border-[var(--color-primary)] bg-secondary' : 'border-border'}
            ${focusedIndex === index ? 'scale-105 border-[var(--color-primary)]' : ''}
          `}
          disabled={disabled}
          autoCapitalize="characters"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />
      ))}
    </div>
  );
}

export default function JoinGame() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefillGame = searchParams.get("game") || "";
  const pendingScan = searchParams.get("scan") || "";
  const { t } = useTranslation();

  const [gameSlugInput, setGameSlugInput] = useState(prefillGame);
  const [teamCode, setTeamCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ gameSlug?: string; teamCode?: string }>({});

  // Existing session state
  const [existingSession, setExistingSession] = useState<{
    teamName: string;
    gameSlug: string;
    gameName: string;
  } | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  const submitTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sessionCheckedRef = useRef(false);
  const toast = useToast();

  // Check for existing session on mount
  useEffect(() => {
    if (sessionCheckedRef.current) return;
    sessionCheckedRef.current = true;

    const checkExistingSession = async () => {
      const token = getToken();
      const storedGameSlug = getGameSlug();

      if (!token || !storedGameSlug) {
        setCheckingSession(false);
        return;
      }

      try {
        // Validate the token
        const [meRes, gameRes] = await Promise.all([
          fetch("/api/v1/auth/me", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`/api/v1/game/${storedGameSlug}`),
        ]);

        if (meRes.ok && gameRes.ok) {
          const [meData, gameData] = await Promise.all([
            meRes.json(),
            gameRes.json(),
          ]);

          setExistingSession({
            teamName: meData.team.name,
            gameSlug: storedGameSlug,
            gameName: gameData.name,
          });
        } else {
          // Invalid session, clear it
          clearAuth();
        }
      } catch {
        // Network error, keep session data but don't show prompt
        clearAuth();
      }
      setCheckingSession(false);
    };

    checkExistingSession();
  }, []);

  const handleResumeGame = useCallback(() => {
    if (existingSession) {
      const playUrl = pendingScan
        ? `/play/${existingSession.gameSlug}?scan=${pendingScan}`
        : `/play/${existingSession.gameSlug}`;
      navigate(playUrl);
    }
  }, [existingSession, navigate, pendingScan]);

  const handleJoinDifferent = useCallback(() => {
    clearAuth();
    setExistingSession(null);
  }, []);

  // Handle form submission - client-side API call
  // codeOverride allows passing the code directly to avoid stale closure issues
  const handleSubmit = useCallback(async (e?: React.FormEvent, codeOverride?: string) => {
    e?.preventDefault();

    const gameSlug = gameSlugInput.trim().toLowerCase();
    const code = (codeOverride ?? teamCode).trim().toUpperCase();

    // Validate
    const errors: typeof fieldErrors = {};
    if (!gameSlug) errors.gameSlug = t("pages.join.errors.gameIdRequired");
    if (!code || code.length !== CODE_LENGTH) errors.teamCode = t("pages.join.errors.teamCodeLength");

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/v1/auth/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameSlug, teamCode: code }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || t("pages.join.errors.joinFailed"));
        toast.error(data.error || t("pages.join.errors.joinFailed"));
        setIsSubmitting(false);
        return;
      }

      // Store token in localStorage (no cookies!)
      setToken(data.token);
      setGameSlug(gameSlug);

      // Navigate to play page with pending scan if any
      const playUrl = pendingScan
        ? `/play/${gameSlug}?scan=${pendingScan}`
        : `/play/${gameSlug}`;
      navigate(playUrl);
    } catch {
      setError(t("pages.join.errors.connectionFailed"));
      toast.error(t("pages.join.errors.connectionFailed"));
      setIsSubmitting(false);
    }
  }, [gameSlugInput, teamCode, navigate, toast, pendingScan, t]);

  // Debounced auto-submit when code is complete
  const handleCodeComplete = useCallback((completeCode: string) => {
    if (submitTimeoutRef.current) {
      clearTimeout(submitTimeoutRef.current);
    }
    submitTimeoutRef.current = setTimeout(() => {
      if (!isSubmitting) {
        handleSubmit(undefined, completeCode);
      }
    }, 300);
  }, [isSubmitting, handleSubmit]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (submitTimeoutRef.current) {
        clearTimeout(submitTimeoutRef.current);
      }
    };
  }, []);

  // Loading state while checking session
  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-bg-primary via-bg-secondary to-bg-primary">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" />
          <p className="text-muted">{t("pages.join.checkingSession")}</p>
        </div>
        <Version />
      </div>
    );
  }

  // Existing session prompt
  if (existingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-bg-primary via-bg-secondary to-bg-primary">
        <div className="w-full max-w-md bg-elevated rounded-2xl shadow-2xl p-6 sm:p-8 border animate-fade-in">
          {/* Header */}
          <div className="text-center mb-6 sm:mb-8">
            <div className="flex items-center justify-center gap-2 mb-3 sm:mb-4">
              <span className="text-4xl sm:text-5xl" aria-label="Target">🎯</span>
              <span className="text-2xl sm:text-3xl font-bold text-primary">{t("common.appName")}</span>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-primary mb-2">{t("pages.join.welcomeBack")}</h1>
            <p className="text-tertiary text-sm sm:text-base">{t("pages.join.alreadyLoggedIn")}</p>
          </div>

          {/* Current Session Card */}
          <div className="p-5 bg-gradient-to-br from-[var(--color-primary)]/10 to-[var(--color-primary)]/5 rounded-xl border border-[var(--color-primary)]/20 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-dark)] flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                {existingSession.teamName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-primary text-lg truncate">{existingSession.teamName}</h3>
                <p className="text-sm text-secondary truncate">{existingSession.gameName}</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleResumeGame}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 sm:py-4 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] text-white font-semibold rounded-xl hover:opacity-90 transition-all shadow-lg"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              {t("pages.join.resumeGame")}
            </button>

            <button
              type="button"
              onClick={handleJoinDifferent}
              className="w-full mt-4 flex items-center justify-center gap-2 px-6 py-3 text-secondary border hover:border-strong rounded-xl transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <polyline points="10 17 15 12 10 7" />
                <line x1="15" y1="12" x2="3" y2="12" />
              </svg>
              {t("pages.join.joinDifferent")}
            </button>
          </div>

          {/* Info text */}
          <p className="mt-6 text-xs text-muted text-center">
            {t("pages.join.joinDifferentWarning")}
          </p>

          {/* Back Link */}
          <div className="mt-8 text-center mt-5 sm:mt-6">
            <a
              href="/"
              className="inline-flex items-center gap-2 text-tertiary hover:text-[var(--color-primary)] text-sm transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              {t("pages.join.backToHome")}
            </a>
          </div>
        </div>
        <Version />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-bg-primary via-bg-secondary to-bg-primary">
      <div className="w-full max-w-md bg-elevated rounded-2xl shadow-2xl p-6 sm:p-8 border animate-fade-in">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="flex items-center justify-center gap-2 mb-3 sm:mb-4">
            <span className="text-4xl sm:text-5xl" aria-label="Target">🎯</span>
            <span className="text-2xl sm:text-3xl font-bold text-primary">{t("common.appName")}</span>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-primary mb-2">{t("pages.join.title")}</h1>
          <p className="text-tertiary text-sm sm:text-base">{t("pages.join.subtitle")}</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="flex items-center gap-3 bg-[var(--color-error)]/10 border border-[var(--color-error)]/30 text-[var(--color-error)] px-4 py-3 rounded-xl mb-4 sm:mb-6 animate-slide-in-down">
            <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span className="text-sm">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
          {/* Game ID Field */}
          <div>
            <label htmlFor="gameSlug" className="flex items-center gap-2 text-sm font-medium text-secondary mb-2">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              </svg>
              {t("pages.join.form.gameId")}
            </label>
            <input
              type="text"
              id="gameSlug"
              value={gameSlugInput}
              onChange={(e) => setGameSlugInput(e.target.value)}
              className="w-full px-4 py-3 bg-secondary border rounded-xl text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"
              placeholder={t("pages.join.form.gameIdPlaceholder")}
              autoComplete="off"
              disabled={isSubmitting}
            />
            {fieldErrors.gameSlug && (
              <p className="mt-2 text-sm text-[var(--color-error)]">{fieldErrors.gameSlug}</p>
            )}
          </div>

          {/* Team Code Field */}
          <div className="mt-4">
            <label className="flex items-center gap-2 text-sm font-medium text-secondary mb-3">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              {t("pages.join.form.teamCode")}
            </label>
            <TeamCodeInput
              value={teamCode}
              onChange={(val) => {
                setTeamCode(val);
                if (fieldErrors.teamCode) {
                  setFieldErrors((prev) => ({ ...prev, teamCode: undefined }));
                }
              }}
              onComplete={handleCodeComplete}
              disabled={isSubmitting}
            />
            <p className="mt-3 text-xs sm:text-sm text-muted text-center">
              {t("pages.join.form.teamCodeHint")}
            </p>
            {fieldErrors.teamCode && (
              <p className="mt-2 text-sm text-[var(--color-error)] text-center">{fieldErrors.teamCode}</p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full mt-4 flex items-center justify-center gap-2 px-6 py-3 sm:py-4 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] text-white font-semibold rounded-xl hover:opacity-90 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed min-h-[3rem]"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Spinner size="sm" />
                <span>{t("pages.join.form.joining")}</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                  <polyline points="10 17 15 12 10 7" />
                  <line x1="15" y1="12" x2="3" y2="12" />
                </svg>
                {t("pages.join.form.joinButton")}
              </>
            )}
          </button>
        </form>

        {/* Back Link */}
        <div className="mt-8 text-center mt-5 sm:mt-6">
          <a
            href="/"
            className="inline-flex items-center gap-2 text-tertiary hover:text-[var(--color-primary)] text-sm transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            {t("pages.join.backToHome")}
          </a>
        </div>
      </div>
      <Version />
    </div>
  );
}
