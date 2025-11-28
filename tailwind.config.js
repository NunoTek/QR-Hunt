/** @type {import('tailwindcss').Config} */
export default {
  content: ["./app/**/*.{js,jsx,ts,tsx}"],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // Brand colors with CSS variables - Primary (Cyan/Teal)
        primary: {
          DEFAULT: "var(--color-primary)",
          dark: "var(--color-primary-dark)",
          light: "var(--color-primary-light)",
          rgb: "rgb(var(--color-primary-rgb) / <alpha-value>)",
        },
        // Accent colors (Purple/Magenta)
        accent: {
          DEFAULT: "var(--color-accent)",
          dark: "var(--color-accent-dark)",
          light: "var(--color-accent-light)",
          rgb: "rgb(var(--color-accent-rgb) / <alpha-value>)",
        },
        success: {
          DEFAULT: "var(--color-success)",
          dark: "var(--color-success-dark)",
          light: "var(--color-success-light)",
          bg: "var(--color-success-bg)",
        },
        warning: {
          DEFAULT: "var(--color-warning)",
          dark: "var(--color-warning-dark)",
          light: "var(--color-warning-light)",
          bg: "var(--color-warning-bg)",
        },
        error: {
          DEFAULT: "var(--color-error)",
          dark: "var(--color-error-dark)",
          light: "var(--color-error-light)",
          bg: "var(--color-error-bg)",
        },
        info: {
          DEFAULT: "var(--color-info)",
          dark: "var(--color-info-dark)",
          bg: "var(--color-info-bg)",
          border: "var(--color-info-border)",
        },
        // Semantic backgrounds
        bg: {
          primary: "var(--bg-primary)",
          secondary: "var(--bg-secondary)",
          tertiary: "var(--bg-tertiary)",
          elevated: "var(--bg-elevated)",
          card: "var(--bg-card)",
          sidebar: "var(--bg-sidebar)",
          overlay: "var(--bg-overlay)",
          glass: "var(--bg-glass)",
        },
        // Semantic text colors
        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          tertiary: "var(--text-tertiary)",
          muted: "var(--text-muted)",
          inverse: "var(--text-inverse)",
          accent: "var(--text-accent)",
        },
        // Border colors
        border: {
          DEFAULT: "var(--border-color)",
          strong: "var(--border-color-strong)",
          subtle: "var(--border-color-subtle)",
        },
      },
      backgroundColor: {
        primary: "var(--bg-primary)",
        secondary: "var(--bg-secondary)",
        tertiary: "var(--bg-tertiary)",
        elevated: "var(--bg-elevated)",
        card: "var(--bg-card)",
        sidebar: "var(--bg-sidebar)",
        overlay: "var(--bg-overlay)",
        glass: "var(--bg-glass)",
      },
      textColor: {
        primary: "var(--text-primary)",
        secondary: "var(--text-secondary)",
        tertiary: "var(--text-tertiary)",
        muted: "var(--text-muted)",
        inverse: "var(--text-inverse)",
        accent: "var(--text-accent)",
      },
      borderColor: {
        DEFAULT: "var(--border-color)",
        strong: "var(--border-color-strong)",
        subtle: "var(--border-color-subtle)",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        DEFAULT: "var(--shadow)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        xl: "var(--shadow-xl)",
        glow: "var(--shadow-glow)",
        "glow-accent": "var(--shadow-glow-accent)",
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        DEFAULT: "var(--radius)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        "2xl": "var(--radius-2xl)",
        full: "var(--radius-full)",
      },
      spacing: {
        1: "var(--space-1)",
        2: "var(--space-2)",
        3: "var(--space-3)",
        4: "var(--space-4)",
        5: "var(--space-5)",
        6: "var(--space-6)",
        8: "var(--space-8)",
        10: "var(--space-10)",
        12: "var(--space-12)",
        16: "var(--space-16)",
        20: "var(--space-20)",
        24: "var(--space-24)",
      },
      transitionDuration: {
        fast: "var(--transition-fast)",
        normal: "var(--transition-normal)",
        slow: "var(--transition-slow)",
      },
      transitionTimingFunction: {
        bounce: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
      fontFamily: {
        sans: "var(--font-sans)",
      },
      maxWidth: {
        container: {
          sm: "var(--container-sm)",
          md: "var(--container-md)",
          lg: "var(--container-lg)",
          xl: "var(--container-xl)",
          "2xl": "var(--container-2xl)",
          "3xl": "var(--container-3xl)",
        },
      },
      screens: {
        sm: "640px",
        md: "768px",
        lg: "1024px",
        xl: "1280px",
        "2xl": "1536px",
        "3xl": "1920px",
      },
      backgroundImage: {
        "gradient-primary": "var(--gradient-primary)",
        "gradient-accent": "var(--gradient-accent)",
        "gradient-success": "var(--gradient-success)",
        "gradient-card": "var(--gradient-card)",
        "gradient-hero": "var(--gradient-hero)",
      },
      keyframes: {
        slideInRight: {
          from: { opacity: "0", transform: "translateX(100%)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        slideOutRight: {
          from: { opacity: "1", transform: "translateX(0)" },
          to: { opacity: "0", transform: "translateX(100%)" },
        },
        slideInDown: {
          from: { opacity: "0", transform: "translateY(-10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        slideInUp: {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        popIn: {
          "0%": { opacity: "0", transform: "scale(0.8)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        bounceIn: {
          "0%": { opacity: "0", transform: "scale(0.3)" },
          "50%": { transform: "scale(1.05)" },
          "70%": { transform: "scale(0.9)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        spin: {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
        pulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        bounce: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-5px)" },
        },
        glow: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(6, 182, 212, 0.2)" },
          "50%": { boxShadow: "0 0 40px rgba(6, 182, 212, 0.4)" },
        },
      },
      animation: {
        "slide-in-right": "slideInRight 0.2s ease",
        "slide-out-right": "slideOutRight 0.3s ease forwards",
        "slide-in-down": "slideInDown 0.2s ease",
        "fade-in": "fadeIn 0.3s ease",
        "slide-up": "slideInUp 0.2s ease",
        "pop-in": "popIn 0.2s ease",
        "bounce-in": "bounceIn 0.6s ease",
        spin: "spin 0.75s linear infinite",
        pulse: "pulse 2s infinite",
        shimmer: "shimmer 1.5s infinite",
        bounce: "bounce 2s infinite",
        glow: "glow 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
