import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Check, Close, AlertTriangle, Info } from "./icons";
import { Z_CLASS } from "~/config/constants";

export type ToastType = "success" | "error" | "info" | "warning";

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  action?: ToastAction;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (message: string, type?: ToastType, duration?: number, action?: ToastAction) => void;
  removeToast: (id: string) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number, action?: ToastAction) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback(
    (message: string, type: ToastType = "info", duration = 4000, action?: ToastAction) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const toast: Toast = { id, message, type, duration, action };
      setToasts((prev) => [...prev, toast]);

      if (duration > 0) {
        setTimeout(() => removeToast(id), duration);
      }
    },
    [removeToast]
  );

  const success = useCallback(
    (message: string, duration?: number) => addToast(message, "success", duration),
    [addToast]
  );

  const error = useCallback(
    (message: string, duration?: number) => addToast(message, "error", duration ?? 6000),
    [addToast]
  );

  const info = useCallback(
    (message: string, duration?: number) => addToast(message, "info", duration),
    [addToast]
  );

  const warning = useCallback(
    (message: string, duration?: number, action?: ToastAction) => addToast(message, "warning", duration ?? 5000, action),
    [addToast]
  );

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, info, warning }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

function ToastContainer({ toasts, removeToast }: { toasts: Toast[]; removeToast: (id: string) => void }) {
  if (toasts.length === 0) return null;

  return (
    <div className={`fixed top-4 right-4 ${Z_CLASS.TOAST} flex flex-col gap-3 max-w-sm sm:max-w-md md:max-w-lg pointer-events-none`}>
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const [isExiting, setIsExiting] = useState(false);

  const handleClose = useCallback(() => {
    setIsExiting(true);
    setTimeout(onClose, 300);
  }, [onClose]);

  useEffect(() => {
    if (toast.duration && toast.duration > 0) {
      const exitTimer = setTimeout(() => setIsExiting(true), toast.duration - 300);
      return () => clearTimeout(exitTimer);
    }
  }, [toast.duration]);

  const icons = {
    success: <Check size={20} className="flex-shrink-0" />,
    error: <Close size={20} className="flex-shrink-0" />,
    warning: <AlertTriangle size={20} className="flex-shrink-0" />,
    info: <Info size={20} className="flex-shrink-0" />,
  };

  const borderColors = {
    success: "border-l-success",
    error: "border-l-error",
    warning: "border-l-warning",
    info: "border-l-primary",
  };

  const textColors = {
    success: "text-success",
    error: "text-error",
    warning: "text-warning",
    info: "text-primary",
  };

  return (
    <div className={`flex items-center gap-3 p-4 px-5 bg-[var(--bg-elevated)] border border-[var(--border-color)] rounded-lg shadow-xl pointer-events-auto border-l-4 ${borderColors[toast.type]} ${isExiting ? "animate-[slideOutRight_0.3s_ease_forwards]" : "animate-[slideInRight_0.2s_ease]"}`}>
      <div className="flex items-center gap-3 flex-1">
        <span className={textColors[toast.type]}>{icons[toast.type]}</span>
        <span className="text-sm font-medium text-primary">{toast.message}</span>
      </div>
      <div className="flex items-center gap-2">
        {toast.action && (
          <button
            className="px-3 py-1 text-sm font-medium bg-tertiary text-primary rounded hover:bg-secondary transition-colors"
            onClick={() => {
              toast.action!.onClick();
              handleClose();
            }}
          >
            {toast.action.label}
          </button>
        )}
        <button
          className="flex items-center justify-center w-6 h-6 p-0 bg-transparent border-0 cursor-pointer text-muted hover:text-secondary transition-colors flex-shrink-0"
          onClick={handleClose}
          aria-label="Close"
        >
          <Close size={16} />
        </button>
      </div>
    </div>
  );
}
