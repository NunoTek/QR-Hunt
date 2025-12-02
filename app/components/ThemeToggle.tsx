import { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "./icons";

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
        className="theme-toggle"
        aria-label="Toggle theme"
        title="Toggle theme"
      >
        <Sun size={20} className="text-[var(--text-primary)]" />
      </button>
    );
  }

  const effectiveTheme = theme === "system" ? getSystemTheme() : theme;

  return (
    <>
      <button
        className="theme-toggle"
        onClick={cycleTheme}
        aria-label={`Current theme: ${theme}. Click to change.`}
        title={`Theme: ${theme} (${effectiveTheme})`}
      >
        {theme === "system" ? (
          <Monitor size={20} className="text-[var(--text-primary)]" />
        ) : effectiveTheme === "dark" ? (
          <Moon size={20} className="text-[var(--text-primary)]" />
        ) : (
          <Sun size={20} className="text-[var(--text-primary)]" />
        )}
      </button>
      <style>{`
        .theme-toggle {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 2.5rem;
          height: 2.5rem;
          padding: 0;
          border: 1px solid var(--border-color);
          border-radius: var(--radius);
          background: var(--bg-secondary);
          color: var(--text-primary);
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        .theme-toggle:hover {
          border-color: var(--color-primary);
          transform: scale(1.05);
        }
      `}</style>
    </>
  );
}
