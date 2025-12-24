import { Form } from "@remix-run/react";
import { Button } from "~/components/Button";
import { Trash } from "~/components/icons";
import { inputClasses, type Game, type Node, type Edge, type Team } from "./types";

interface DeleteGameModalProps {
  game: Game;
  nodes: Node[];
  edges: Edge[];
  teams: Team[];
  isOpen: boolean;
  onClose: () => void;
  deleteConfirmText: string;
  setDeleteConfirmText: (text: string) => void;
  isSubmitting: boolean;
  t: (key: string, params?: Record<string, string | number>) => string;
}

export function DeleteGameModal({
  game,
  nodes,
  edges,
  teams,
  isOpen,
  onClose,
  deleteConfirmText,
  setDeleteConfirmText,
  isSubmitting,
  t,
}: DeleteGameModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
      <div className="rounded-xl max-w-md w-full shadow-xl" style={{ backgroundColor: 'var(--bg-elevated)' }}>
        <div className="p-6 border-b border-border" style={{ backgroundColor: 'var(--bg-secondary)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--color-error)]/15 flex items-center justify-center">
              <Trash size={20} stroke="var(--color-error)" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[var(--color-error)]">{t("pages.admin.gameEditor.deleteModal.title")}</h3>
              <p className="text-sm text-muted">{t("pages.admin.gameEditor.deleteModal.subtitle")}</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <p className="text-secondary text-sm mb-4">
            {t("pages.admin.gameEditor.deleteModal.description", { name: game.name })}
          </p>
          <ul className="text-sm text-muted mb-6 space-y-1">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-error)]" />
              {t("pages.admin.gameEditor.deleteModal.items.nodes", { count: nodes.length })}
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-error)]" />
              {t("pages.admin.gameEditor.deleteModal.items.edges", { count: edges.length })}
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-error)]" />
              {t("pages.admin.gameEditor.deleteModal.items.teams", { count: teams.length })}
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-error)]" />
              {t("pages.admin.gameEditor.deleteModal.items.history")}
            </li>
          </ul>

          <label className="block text-sm font-medium text-secondary mb-2">
            {t("pages.admin.gameEditor.deleteModal.confirmLabel", { name: game.name })}
          </label>
          <input
            type="text"
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            placeholder={t("pages.admin.gameEditor.deleteModal.confirmPlaceholder")}
            className={inputClasses}
            autoFocus
          />
        </div>

        <div className="p-4 border-t border-border flex gap-3 justify-end" style={{ backgroundColor: 'var(--bg-secondary)' }}>
          <Button
            variant="secondary"
            onClick={() => {
              onClose();
              setDeleteConfirmText("");
            }}
          >
            {t("pages.admin.gameEditor.deleteModal.cancel")}
          </Button>
          <Form method="post" className="inline">
            <input type="hidden" name="_action" value="deleteGame" />
            <Button
              type="submit"
              variant="danger"
              disabled={deleteConfirmText !== game.name || isSubmitting}
            >
              {isSubmitting ? t("pages.admin.gameEditor.deleteModal.deleting") : t("pages.admin.gameEditor.deleteModal.deleteForever")}
            </Button>
          </Form>
        </div>
      </div>
    </div>
  );
}
