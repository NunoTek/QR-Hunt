import { Form } from "@remix-run/react";
import { Button } from "~/components/Button";
import { inputClasses, type Edge, type Node, type Game } from "./types";

interface EdgesTabProps {
  edges: Edge[];
  nodes: Node[];
  game: Game;
  editingEdge: Edge | null;
  setEditingEdge: (edge: Edge | null) => void;
  isSubmitting: boolean;
  onDelete: (type: "node" | "edge" | "team", id: string, name: string) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

export function EdgesTab({
  edges,
  nodes,
  game,
  editingEdge,
  setEditingEdge,
  isSubmitting,
  onDelete,
  t,
}: EdgesTabProps) {

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 bg-elevated rounded-xl border overflow-hidden shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-4 py-3 text-xs font-medium text-muted uppercase">{t("pages.admin.gameEditor.edges.tableHeaders.from")}</th>
              <th className="px-4 py-3 text-muted">→</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted uppercase">{t("pages.admin.gameEditor.edges.tableHeaders.to")}</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {edges.map((edge) => {
              const fromNode = nodes.find((n) => n.id === edge.fromNodeId);
              const toNode = nodes.find((n) => n.id === edge.toNodeId);
              return (
                <tr key={edge.id} className="hover:bg-secondary">
                  <td className="px-4 py-3 text-primary">{fromNode?.title || t("pages.admin.gameEditor.edges.unknown")}</td>
                  <td className="px-4 py-3 text-muted">→</td>
                  <td className="px-4 py-3 text-primary">{toNode?.title || t("pages.admin.gameEditor.edges.unknown")}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 justify-end">
                      <Button variant="secondary" size="small" onClick={() => setEditingEdge(edge)}>{t("pages.admin.gameEditor.edges.buttons.edit")}</Button>
                      <Button variant="danger" size="small" onClick={() => onDelete("edge", edge.id, `${fromNode?.title} → ${toNode?.title}`)}>{t("pages.admin.gameEditor.edges.buttons.delete")}</Button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {edges.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-muted">{t("pages.admin.gameEditor.edges.noEdges")}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="bg-elevated rounded-xl border p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-primary mb-4">{editingEdge ? t("pages.admin.gameEditor.edges.editEdge") : t("pages.admin.gameEditor.edges.addEdge")}</h3>

        {game.settings.randomMode && (
          <div className="p-3 bg-[var(--color-info)]/10 border border-[var(--color-info)]/30 rounded-lg mb-4">
            <p className="text-sm text-[var(--color-info)]">
              {t("pages.admin.gameEditor.edges.randomModeInfo")}
            </p>
          </div>
        )}

        <Form method="post" onSubmit={() => setEditingEdge(null)} className="space-y-4">
          <input type="hidden" name="_action" value={editingEdge ? "updateEdge" : "createEdge"} />
          {editingEdge && <input type="hidden" name="edgeId" value={editingEdge.id} />}

          <div>
            <label className="block text-sm font-medium text-secondary mb-1">{t("pages.admin.gameEditor.edges.form.fromNode")}</label>
            <select name="fromNodeId" className={inputClasses} required defaultValue={editingEdge?.fromNodeId || ""} key={`from-${editingEdge?.id || "new"}`}>
              <option value="">{t("pages.admin.gameEditor.edges.form.select")}</option>
              {nodes.map((node) => <option key={node.id} value={node.id}>{node.title}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary mb-1">{t("pages.admin.gameEditor.edges.form.toNode")}</label>
            <select name="toNodeId" className={inputClasses} required defaultValue={editingEdge?.toNodeId || ""} key={`to-${editingEdge?.id || "new"}`}>
              <option value="">{t("pages.admin.gameEditor.edges.form.select")}</option>
              {nodes.map((node) => <option key={node.id} value={node.id}>{node.title}</option>)}
            </select>
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="submit" variant="primary" disabled={isSubmitting}>{editingEdge ? t("pages.admin.gameEditor.edges.buttons.update") : t("pages.admin.gameEditor.edges.buttons.add")}</Button>
            <Button variant="secondary" onClick={() => setEditingEdge(null)}>{editingEdge ? t("pages.admin.gameEditor.edges.buttons.cancel") : t("pages.admin.gameEditor.edges.buttons.clear")}</Button>
          </div>
        </Form>
      </div>
    </div>
  );
}
