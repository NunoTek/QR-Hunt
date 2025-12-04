import { useState } from "react";
import { Button } from "~/components/Button";
import { Trash } from "~/components/icons";

interface DeleteGameConfirmModalProps {
  gameName: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const inputClasses = "w-full px-3 py-2 bg-secondary text-primary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent";

export function DeleteGameConfirmModal({
  gameName,
  isOpen,
  onClose,
  onConfirm,
  isDeleting,
  t,
}: DeleteGameConfirmModalProps) {
  const [confirmText, setConfirmText] = useState("");

  if (!isOpen) return null;

  const handleClose = () => {
    setConfirmText("");
    onClose();
  };

  const handleConfirm = () => {
    if (confirmText === gameName) {
      onConfirm();
      setConfirmText("");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
      <div className="rounded-xl max-w-md w-full shadow-xl" style={{ backgroundColor: 'var(--bg-elevated)' }}>
        <div className="p-6 border-b border-border" style={{ backgroundColor: 'var(--bg-secondary)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--color-error)]/15 flex items-center justify-center">
              <Trash size={20} stroke="var(--color-error)" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[var(--color-error)]">{t("pages.admin.deleteGameModal.title")}</h3>
              <p className="text-sm text-muted">{t("pages.admin.deleteGameModal.subtitle")}</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <p className="text-secondary text-sm mb-4">
            {t("pages.admin.deleteGameModal.description", { name: gameName })}
          </p>
          <ul className="text-sm text-muted mb-6 space-y-1">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-error)]" />
              {t("pages.admin.deleteGameModal.items.nodes")}
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-error)]" />
              {t("pages.admin.deleteGameModal.items.edges")}
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-error)]" />
              {t("pages.admin.deleteGameModal.items.teams")}
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-error)]" />
              {t("pages.admin.deleteGameModal.items.history")}
            </li>
          </ul>

          <label className="block text-sm font-medium text-secondary mb-2">
            {t("pages.admin.deleteGameModal.confirmLabel", { name: gameName })}
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={t("pages.admin.deleteGameModal.confirmPlaceholder")}
            className={inputClasses}
            autoFocus
          />
        </div>

        <div className="p-4 border-t border-border flex gap-3 justify-end" style={{ backgroundColor: 'var(--bg-secondary)' }}>
          <Button
            variant="secondary"
            onClick={handleClose}
            disabled={isDeleting}
          >
            {t("pages.admin.deleteGameModal.cancel")}
          </Button>
          <Button
            variant="danger"
            onClick={handleConfirm}
            disabled={confirmText !== gameName || isDeleting}
          >
            {isDeleting ? t("pages.admin.deleteGameModal.deleting") : t("pages.admin.deleteGameModal.deleteForever")}
          </Button>
        </div>
      </div>
    </div>
  );
}
