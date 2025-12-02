import { Z_CLASS } from "~/config/constants";

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Spinner({ size = "md", className = "" }: SpinnerProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  };

  return (
    <div className={`inline-block ${sizeClasses[size]} ${className}`}>
      <div className="w-full h-full border-4 border-solid rounded-full border-t-primary border-r-primary border-b-transparent border-l-transparent animate-spin" />
    </div>
  );
}

interface LoadingOverlayProps {
  message?: string;
}

export function LoadingOverlay({ message = "Loading..." }: LoadingOverlayProps) {
  return (
    <div className={`fixed inset-0 ${Z_CLASS.CRITICAL} flex items-center justify-center bg-overlay backdrop-blur-sm`}>
      <div className="flex flex-col items-center gap-4 p-6 sm:p-8 bg-elevated rounded-xl shadow-xl">
        <Spinner size="lg" />
        <p className="text-sm sm:text-base font-medium text-primary">{message}</p>
      </div>
    </div>
  );
}

interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  loadingText?: string;
  children: React.ReactNode;
}

export function LoadingButton({
  loading = false,
  loadingText,
  children,
  disabled,
  className = "",
  ...props
}: LoadingButtonProps) {
  return (
    <button 
      className={`inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`} 
      disabled={disabled || loading} 
      {...props}
    >
      {loading ? (
        <>
          <Spinner size="sm" />
          <span>{loadingText || children}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}

interface SkeletonProps {
  className?: string;
  width?: string;
  height?: string;
}

export function Skeleton({ className = "", width, height }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-tertiary rounded ${className}`}
      style={{ width, height }}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="p-5 sm:p-6 bg-elevated rounded-lg border shadow-sm">
      <Skeleton height="1.5rem" width="60%" className="mb-4" />
      <Skeleton height="1rem" width="100%" className="mb-2" />
      <Skeleton height="1rem" width="80%" className="mb-2" />
      <Skeleton height="1rem" width="90%" />
    </div>
  );
}

export function TableRowSkeleton({ cols = 4 }: { cols?: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i}>
          <Skeleton height="1rem" width={i === 0 ? "80%" : "60%"} />
        </td>
      ))}
    </tr>
  );
}
