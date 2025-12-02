import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Padding size */
  padding?: "none" | "sm" | "md" | "lg";
  /** Border radius size */
  rounded?: "md" | "lg" | "xl" | "2xl";
  /** Whether to show shadow */
  shadow?: boolean;
  /** Whether to show border */
  border?: boolean;
  /** Accent border color (left border) */
  accent?: "primary" | "success" | "warning" | "error" | "none";
  /** Click handler (makes card interactive) */
  onClick?: () => void;
  /** HTML element to render as */
  as?: "div" | "article" | "section";
}

const paddingClasses = {
  none: "",
  sm: "p-3 sm:p-4",
  md: "p-4 sm:p-5",
  lg: "p-5 sm:p-6",
} as const;

const roundedClasses = {
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
  "2xl": "rounded-2xl",
} as const;

const accentClasses = {
  none: "",
  primary: "border-l-4 border-l-[var(--color-primary)]",
  success: "border-l-4 border-l-[var(--color-success)]",
  warning: "border-l-4 border-l-[var(--color-warning)]",
  error: "border-l-4 border-l-[var(--color-error)]",
} as const;

export function Card({
  children,
  className = "",
  padding = "md",
  rounded = "xl",
  shadow = true,
  border = true,
  accent = "none",
  onClick,
  as: Component = "div",
}: CardProps) {
  const baseClasses = "bg-elevated";
  const paddingClass = paddingClasses[padding];
  const roundedClass = roundedClasses[rounded];
  const shadowClass = shadow ? "shadow-sm" : "";
  const borderClass = border ? "border" : "";
  const accentClass = accentClasses[accent];
  const interactiveClass = onClick
    ? "cursor-pointer transition-all hover:shadow-md hover:border-[var(--border-color-strong)]"
    : "";

  return (
    <Component
      className={`${baseClasses} ${paddingClass} ${roundedClass} ${shadowClass} ${borderClass} ${accentClass} ${interactiveClass} ${className}`.trim()}
      onClick={onClick}
    >
      {children}
    </Component>
  );
}

interface CardHeaderProps {
  children: ReactNode;
  className?: string;
}

export function CardHeader({ children, className = "" }: CardHeaderProps) {
  return (
    <div className={`flex items-center justify-between mb-4 ${className}`}>
      {children}
    </div>
  );
}

interface CardTitleProps {
  children: ReactNode;
  className?: string;
  as?: "h1" | "h2" | "h3" | "h4";
}

export function CardTitle({ children, className = "", as: Component = "h3" }: CardTitleProps) {
  return (
    <Component className={`font-bold text-primary ${className}`}>
      {children}
    </Component>
  );
}

interface CardContentProps {
  children: ReactNode;
  className?: string;
}

export function CardContent({ children, className = "" }: CardContentProps) {
  return <div className={className}>{children}</div>;
}

interface CardFooterProps {
  children: ReactNode;
  className?: string;
}

export function CardFooter({ children, className = "" }: CardFooterProps) {
  return (
    <div className={`flex items-center gap-3 mt-4 pt-4 border-t border-border ${className}`}>
      {children}
    </div>
  );
}
