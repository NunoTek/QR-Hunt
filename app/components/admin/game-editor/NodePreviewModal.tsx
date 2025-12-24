import { Button } from "~/components/Button";
import { ClueDisplay } from "~/components/ClueDisplay";
import { Close, Eye } from "~/components/icons";
import { NodeBadge } from "./NodeBadge";
import { type Node } from "./types";

interface NodePreviewModalProps {
  node: Node | null;
  onClose: () => void;
  onEdit: (node: Node) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

export function NodePreviewModal({ node, onClose, onEdit, t }: NodePreviewModalProps) {
  if (!node) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
      <div className="rounded-xl max-w-md w-full shadow-xl animate-fade-in" style={{ backgroundColor: 'var(--bg-elevated)' }}>
        <div className="p-4 border-b border-border flex items-center justify-between" style={{ backgroundColor: 'var(--bg-secondary)' }}>
          <div className="flex items-center gap-2">
            <Eye size={20} className="text-[var(--color-primary)]" />
            <h3 className="text-lg font-semibold text-primary">{t("pages.admin.gameEditor.preview.title")}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-muted hover:text-primary transition-colors p-1"
          >
            <Close size={20} />
          </button>
        </div>

        <div className="p-6">
          {/* Player View Simulation */}
          <div className="mb-4">
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="text-sm text-[var(--color-success)] font-medium">
                {t("pages.admin.gameEditor.preview.points", { points: node.points })}
              </span>
              {node.isStart && <NodeBadge type="start" t={t} />}
              {node.isEnd && <NodeBadge type="end" t={t} />}
            </div>
            <ClueDisplay
              node={node}
              headerText={t("pages.admin.gameEditor.preview.clueContent")}
            />
          </div>

          {node.passwordRequired && (
            <div className="bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/30 rounded-lg p-3 mb-4">
              <p className="text-sm text-[var(--color-warning)] flex items-center gap-2">
                <span>🔒</span>
                {t("pages.admin.gameEditor.preview.passwordRequired")}
              </p>
            </div>
          )}

          {node.hint && (
            <div className="bg-[var(--color-info)]/10 border border-[var(--color-info)]/30 rounded-lg p-3 mb-4">
              <p className="text-xs text-[var(--color-info)] font-medium mb-1">
                {t("pages.admin.gameEditor.preview.hintAvailable", { points: Math.floor(node.points / 2) })}
              </p>
              <p className="text-sm text-secondary">{node.hint}</p>
            </div>
          )}

          {/* Admin Note */}
          {node.adminComment && (
            <div className="p-3 bg-[var(--color-info)]/10 border border-[var(--color-info)]/30 rounded-lg">
              <p className="text-xs text-[var(--color-info)] font-medium mb-1">{t("pages.admin.gameEditor.preview.adminNote")}</p>
              <p className="text-sm text-secondary italic">{node.adminComment}</p>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-border flex justify-end gap-2" style={{ backgroundColor: 'var(--bg-secondary)' }}>
          <Button variant="secondary" onClick={onClose}>
            {t("pages.admin.gameEditor.preview.close")}
          </Button>
          <Button variant="primary" onClick={() => { onEdit(node); onClose(); }}>
            {t("pages.admin.gameEditor.preview.editNode")}
          </Button>
        </div>
      </div>
    </div>
  );
}
