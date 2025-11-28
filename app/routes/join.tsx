import type { ActionFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, useActionData, useNavigation, useSearchParams } from "@remix-run/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Spinner } from "~/components/Loading";
import { getApiUrl } from "~/lib/api";

export const meta: MetaFunction = () => {
  return [
    { title: "Join Game - QR Hunt" },
  ];
};

interface ActionData {
  error?: string;
  fieldErrors?: {
    gameSlug?: string[];
    teamCode?: string[];
  };
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const gameSlug = formData.get("gameSlug")?.toString().trim().toLowerCase();
  const teamCode = formData.get("teamCode")?.toString().trim().toUpperCase();

  const fieldErrors: ActionData["fieldErrors"] = {};

  if (!gameSlug) {
    fieldErrors.gameSlug = ["Game ID is required"];
  }
  if (!teamCode) {
    fieldErrors.teamCode = ["Team code is required"];
  }

  if (Object.keys(fieldErrors).length > 0) {
    return json<ActionData>({ fieldErrors }, { status: 400 });
  }

  const baseUrl = getApiUrl();

  try {
    const response = await fetch(`${baseUrl}/api/v1/auth/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameSlug, teamCode }),
    });

    const data = await response.json();

    if (!response.ok) {
      return json<ActionData>({ error: data.error || "Failed to join game" }, { status: 400 });
    }

    const headers = new Headers();
    headers.append(
      "Set-Cookie",
      `team_token=${data.token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${48 * 60 * 60}`
    );

    return redirect(`/play/${gameSlug}`, { headers });
  } catch {
    return json<ActionData>({ error: "Failed to connect to server" }, { status: 500 });
  }
}

const CODE_LENGTH = 6;

function TeamCodeInput({
  value,
  onChange,
  onComplete,
  disabled
}: {
  value: string;
  onChange: (value: string) => void;
  onComplete?: () => void;
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
      // Last character entered, trigger complete
      onComplete();
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

    // If pasted data completes the code, trigger complete
    if (pastedData.length === CODE_LENGTH && onComplete) {
      onComplete();
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
      <input type="hidden" name="teamCode" value={value} />
    </div>
  );
}

export default function JoinGame() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const [searchParams] = useSearchParams();
  const isSubmitting = navigation.state === "submitting";
  const prefillGame = searchParams.get("game") || "";
  const [teamCode, setTeamCode] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const submitTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced auto-submit when code is complete
  const handleCodeComplete = useCallback(() => {
    // Clear any existing timeout
    if (submitTimeoutRef.current) {
      clearTimeout(submitTimeoutRef.current);
    }

    // Debounce the submit by 300ms
    submitTimeoutRef.current = setTimeout(() => {
      if (formRef.current && !isSubmitting) {
        formRef.current.requestSubmit();
      }
    }, 300);
  }, [isSubmitting]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (submitTimeoutRef.current) {
        clearTimeout(submitTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-bg-primary via-bg-secondary to-bg-primary">
      <div className="w-full max-w-md bg-elevated rounded-2xl shadow-2xl p-6 sm:p-8 border animate-fade-in">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="flex items-center justify-center gap-2 mb-3 sm:mb-4">
            <span className="text-4xl sm:text-5xl" aria-label="Target">🎯</span>
            <span className="text-2xl sm:text-3xl font-bold text-primary">QR Hunt</span>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-primary mb-2">Join a Game</h1>
          <p className="text-tertiary text-sm sm:text-base">Enter your game ID and team code to start playing</p>
        </div>

        {/* Error Alert */}
        {actionData?.error && (
          <div className="flex items-center gap-3 bg-[var(--color-error)]/10 border border-[var(--color-error)]/30 text-[var(--color-error)] px-4 py-3 rounded-xl mb-4 sm:mb-6 animate-slide-in-down">
            <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span className="text-sm">{actionData.error}</span>
          </div>
        )}

        <Form ref={formRef} method="post" className="space-y-5 sm:space-y-6">
          {/* Game ID Field */}
          <div>
            <label htmlFor="gameSlug" className="flex items-center gap-2 text-sm font-medium text-secondary mb-2">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              </svg>
              Game ID
            </label>
            <input
              type="text"
              id="gameSlug"
              name="gameSlug"
              className="w-full px-4 py-3 bg-secondary border rounded-xl text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"
              placeholder="e.g., summer-hunt-2024"
              defaultValue={prefillGame}
              autoComplete="off"
              disabled={isSubmitting}
            />
            {actionData?.fieldErrors?.gameSlug && (
              <p className="mt-2 text-sm text-[var(--color-error)]">{actionData.fieldErrors.gameSlug[0]}</p>
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
              Team Code
            </label>
            <TeamCodeInput
              value={teamCode}
              onChange={setTeamCode}
              onComplete={handleCodeComplete}
              disabled={isSubmitting}
            />
            <p className="mt-3 text-xs sm:text-sm text-muted text-center">
              Your team code was provided by the game organizer
            </p>
            {actionData?.fieldErrors?.teamCode && (
              <p className="mt-2 text-sm text-[var(--color-error)] text-center">{actionData.fieldErrors.teamCode[0]}</p>
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
                <span>Joining...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                  <polyline points="10 17 15 12 10 7" />
                  <line x1="15" y1="12" x2="3" y2="12" />
                </svg>
                Join Game
              </>
            )}
          </button>
        </Form>

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
            Back to home
          </a>
        </div>
      </div>
    </div>
  );
}
