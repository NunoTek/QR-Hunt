import { useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "system";
  const stored = localStorage.getItem("theme");
  if (stored === "light" || stored === "dark" || stored === "system") {
    return stored;
  }
  return "system";
}

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  const effectiveTheme = theme === "system" ? getSystemTheme() : theme;

  if (theme === "system") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", effectiveTheme);
  }

  // Update meta theme-color for mobile browsers
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute(
      "content",
      effectiveTheme === "dark" ? "#09090b" : "#6366f1"
    );
  }
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");
  const [mounted, setMounted] = useState(false);

  // Initialize theme on mount
  useEffect(() => {
    setMounted(true);
    const stored = getStoredTheme();
    setTheme(stored);
    applyTheme(stored);

    // Listen for system theme changes
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (getStoredTheme() === "system") {
        applyTheme("system");
      }
    };
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const cycleTheme = () => {
    const nextTheme: Theme = theme === "system" ? "light" : theme === "light" ? "dark" : "system";
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
    applyTheme(nextTheme);
  };

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <button
        className="fixed bottom-3 right-3 sm:bottom-4 sm:right-4 z-[100] w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-color)] shadow-md sm:shadow-lg flex items-center justify-center transition-all"
        aria-label="Toggle theme"
        title="Toggle theme"
      >
        <svg className="w-5 h-5 text-[var(--text-primary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="5" />
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        </svg>
      </button>
    );
  }

  const effectiveTheme = theme === "system" ? getSystemTheme() : theme;

  return (
    <button
      className="fixed bottom-3 right-3 sm:bottom-4 sm:right-4 z-[100] w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-color)] shadow-md sm:shadow-lg flex items-center justify-center transition-all hover:scale-110 hover:shadow-xl"
      onClick={cycleTheme}
      aria-label={`Current theme: ${theme}. Click to change.`}
      title={`Theme: ${theme} (${effectiveTheme})`}
    >
      {theme === "system" ? (
        // Computer/system icon
        <svg className="w-5 h-5 text-[var(--text-primary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <path d="M8 21h8M12 17v4" />
        </svg>
      ) : effectiveTheme === "dark" ? (
        // Moon icon
        <svg className="w-5 h-5 text-[var(--text-primary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      ) : (
        // Sun icon
        <svg className="w-5 h-5 text-[var(--text-primary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="5" />
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        </svg>
      )}
    </button>
  );
}
