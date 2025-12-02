import { useEffect, useCallback, type ReactNode } from "react";
import { Close } from "./icons";

interface ModalProps {
  /** Whether the modal is visible */
  isOpen: boolean;
  /** Called when the modal should close */
  onClose: () => void;
  /** Modal title (optional) */
  title?: string;
  /** Modal content */
  children: ReactNode;
  /** Additional CSS classes for the modal container */
  className?: string;
  /** Maximum width class (default: max-w-lg) */
  maxWidth?: string;
  /** Whether to show the close button (default: true) */
  showCloseButton?: boolean;
  /** Whether clicking the backdrop closes the modal (default: true) */
  closeOnBackdrop?: boolean;
  /** Whether pressing Escape closes the modal (default: true) */
  closeOnEscape?: boolean;
  /** Z-index class (default: z-[1000]) */
  zIndex?: string;
  /** Footer content (optional) */
  footer?: ReactNode;
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  className = "",
  maxWidth = "max-w-lg",
  showCloseButton = true,
  closeOnBackdrop = true,
  closeOnEscape = true,
  zIndex = "z-[1000]",
  footer,
}: ModalProps) {
  // Handle escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (closeOnEscape && e.key === "Escape") {
        onClose();
      }
    },
    [closeOnEscape, onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      // Prevent body scroll when modal is open
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 bg-black/50 flex items-center justify-center ${zIndex} p-3 sm:p-4`}
      onClick={closeOnBackdrop ? onClose : undefined}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "modal-title" : undefined}
    >
      <div
        className={`bg-elevated rounded-xl ${maxWidth} w-full max-h-[90vh] overflow-hidden shadow-xl border border-border animate-pop-in ${className}`}
        style={{ backgroundColor: 'var(--bg-elevated)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-border" style={{ backgroundColor: 'var(--bg-secondary)' }}>
            {title && (
              <h2 id="modal-title" className="text-lg sm:text-xl font-bold text-primary">
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-secondary transition-colors text-tertiary hover:text-primary ml-auto"
                aria-label="Close modal"
              >
                <Close size={20} />
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className="px-4 sm:px-6 py-4 sm:py-5 overflow-y-auto" style={{ maxHeight: "calc(90vh - 140px)" }}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-border bg-secondary/50">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Confirmation modal variant
 */
interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
  isLoading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger",
  isLoading = false,
}: ConfirmModalProps) {
  const variantStyles = {
    danger: "bg-[var(--color-error)] hover:bg-[var(--color-error)]/90",
    warning: "bg-[var(--color-warning)] hover:bg-[var(--color-warning)]/90",
    info: "bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)]",
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidth="max-w-md"
      footer={
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-border hover:bg-secondary transition-colors text-secondary"
            disabled={isLoading}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg text-white transition-colors ${variantStyles[variant]} disabled:opacity-50`}
            disabled={isLoading}
          >
            {isLoading ? "..." : confirmText}
          </button>
        </div>
      }
    >
      <p className="text-secondary">{message}</p>
    </Modal>
  );
}
