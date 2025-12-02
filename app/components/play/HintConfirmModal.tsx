import { useTranslation } from "~/i18n/I18nContext";
import { HelpCircle, AlertTriangle } from "../icons";
import { Button } from "../Button";
import { Modal } from "../Modal";
import type { HintInfo } from "./types";

interface HintConfirmModalProps {
  currentHint: HintInfo;
  isRequestingHint: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function HintConfirmModal({
  currentHint,
  isRequestingHint,
  onCancel,
  onConfirm,
}: HintConfirmModalProps) {
  const { t } = useTranslation();

  return (
    <Modal
      isOpen={true}
      onClose={onCancel}
      maxWidth="max-w-md"
      zIndex="z-[100]"
      showCloseButton={false}
      footer={
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isRequestingHint}
            className="flex-1"
          >
            {t("common.cancel")}
          </Button>
          <Button
            variant="accent"
            onClick={onConfirm}
            disabled={isRequestingHint}
            isLoading={isRequestingHint}
            className="flex-1 !bg-amber-500 hover:!bg-amber-600"
          >
            {isRequestingHint ? t("common.loading") : t("pages.play.hints.revealHint")}
          </Button>
        </div>
      }
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
          <HelpCircle size={24} />
        </div>
        <div>
          <h3 className="text-xl font-bold text-primary">{t("pages.play.hints.requestTitle")}</h3>
          <p className="text-sm text-muted">{t("pages.play.hints.cannotUndo")}</p>
        </div>
      </div>

      <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
        <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-semibold mb-1">
          <AlertTriangle size={16} />
          <span>{t("pages.play.hints.pointsPenalty")}</span>
        </div>
        <p className="text-amber-800 dark:text-amber-300">
          {t("pages.play.hints.costExplanation", { points: currentHint.pointsCost })}
        </p>
      </div>
    </Modal>
  );
}
