import { Form } from "@remix-run/react";
import { Button } from "~/components/Button";
import { ClueDisplay } from "~/components/ClueDisplay";
import { Check, Circle, Eye } from "~/components/icons";
import { Modal } from "~/components/Modal";
import { NodeBadge } from "./NodeBadge";
import { inputClasses, type Node, type NodeFilter } from "./types";

interface NodesTabProps {
  nodes: Node[];
  filteredNodes: Node[];
  nodeFilter: NodeFilter;
  setNodeFilter: (filter: NodeFilter) => void;
  editingNode: Node | null;
  setEditingNode: (node: Node | null) => void;
  previewNode: Node | null;
  setPreviewNode: (node: Node | null) => void;
  isSubmitting: boolean;
  onDelete: (type: "node" | "edge" | "team", id: string, name: string) => void;
  t: (key: string) => string;
}

export function NodesTab({
  nodes,
  filteredNodes,
  nodeFilter,
  setNodeFilter,
  editingNode,
  setEditingNode,
  previewNode,
  setPreviewNode,
  isSubmitting,
  onDelete,
  t,
}: NodesTabProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Nodes Table */}
      <div className="lg:col-span-2 bg-elevated rounded-xl border overflow-hidden shadow-sm">
        {/* Filters */}
        <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <input
              type="text"
              placeholder={t("pages.admin.gameEditor.filters.filterByTitle")}
              value={nodeFilter.title}
              onChange={(e) => setNodeFilter({ ...nodeFilter, title: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-secondary text-primary border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div>
            <select
              value={nodeFilter.activated}
              onChange={(e) => setNodeFilter({ ...nodeFilter, activated: e.target.value as NodeFilter["activated"] })}
              className="w-full px-3 py-2 text-sm bg-secondary text-primary border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="all">{t("pages.admin.gameEditor.filters.allStatus")}</option>
              <option value="activated">{t("pages.admin.gameEditor.filters.activated")}</option>
              <option value="not-activated">{t("pages.admin.gameEditor.filters.notActivated")}</option>
            </select>
          </div>
          <div className="text-sm text-muted self-center">
            {filteredNodes.length} / {nodes.length} {t("pages.admin.gameEditor.tabs.nodes").toLowerCase()}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="min-w-[200px] text-left px-4 py-3 text-xs font-medium text-muted uppercase">{t("pages.admin.gameEditor.nodes.tableHeaders.title")}</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted uppercase">{t("pages.admin.gameEditor.nodes.tableHeaders.key")}</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted uppercase">{t("pages.admin.gameEditor.nodes.tableHeaders.type")}</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted uppercase">{t("pages.admin.gameEditor.nodes.tableHeaders.pts")}</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-muted uppercase">{t("pages.admin.gameEditor.nodes.tableHeaders.activated")}</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredNodes.map((node) => (
                <tr key={node.id} className="hover:bg-secondary group">
                  <td className="min-w-[200px] px-4 py-3 text-primary">
                    <div>
                      <span className="font-medium">{node.title}</span>
                      {node.isStart && <NodeBadge type="start" t={t} />}
                      {node.isEnd && <NodeBadge type="end" t={t} />}
                      {node.hint && (
                        <span className="ml-2 inline-flex px-2 py-0.5 rounded text-xs font-medium bg-[var(--color-info)]/15 text-[var(--color-info)]" title={node.hint}>
                          {t("pages.admin.gameEditor.nodeBadges.hint")}
                        </span>
                      )}
                    </div>
                    {node.adminComment && (
                      <p className="text-xs text-muted mt-0.5 italic">📝 {node.adminComment}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-secondary">{node.nodeKey}</td>
                  <td className="px-4 py-3 text-secondary">{node.contentType}</td>
                  <td className="px-4 py-3 text-secondary">{node.points}</td>
                  <td className="px-4 py-3 text-center">
                    <Form method="post" className="inline">
                      <input type="hidden" name="_action" value="toggleActivated" />
                      <input type="hidden" name="nodeId" value={node.id} />
                      <input type="hidden" name="activated" value={(!node.activated).toString()} />
                      <button
                        type="submit"
                        className={`inline-flex items-center justify-center w-8 h-8 rounded-full transition-colors ${
                          node.activated
                            ? "bg-success/20 text-success hover:bg-success/30"
                            : "bg-muted/20 text-muted hover:bg-muted/30"
                        }`}
                        title={node.activated ? "Click to deactivate" : "Click to activate"}
                      >
                        {node.activated ? (
                          <Check size={16} />
                        ) : (
                          <Circle size={16} />
                        )}
                      </button>
                    </Form>
                  </td>
                  <td className="px-4 py-3 bg-elevated group-hover:bg-secondary">
                    <div className="flex gap-1 justify-end">
                      <Button variant="secondary" size="small" onClick={() => setPreviewNode(node)} title={t("pages.admin.gameEditor.nodes.buttons.preview")}>
                        <Eye size={14} />
                      </Button>
                      <Button variant="secondary" size="small" onClick={() => setEditingNode(node)}>{t("pages.admin.gameEditor.nodes.buttons.edit")}</Button>
                      <Button variant="danger" size="small" onClick={() => onDelete("node", node.id, node.title)}>{t("pages.admin.gameEditor.nodes.buttons.delete")}</Button>
                    </div>
                  </td>
                </tr>
              ))}
              {nodes.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted">{t("pages.admin.gameEditor.nodes.noNodes")}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Node Form */}
      <div className="bg-elevated rounded-xl border p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-primary mb-4">{editingNode ? t("pages.admin.gameEditor.nodes.editNode") : t("pages.admin.gameEditor.nodes.addNode")}</h3>
        <Form method="post" onSubmit={() => setEditingNode(null)} className="space-y-4">
          <input type="hidden" name="_action" value={editingNode ? "updateNode" : "createNode"} />
          {editingNode && <input type="hidden" name="nodeId" value={editingNode.id} />}

          <div>
            <label className="block text-sm font-medium text-secondary mb-1">Title</label>
            <input type="text" name="title" className={inputClasses} required defaultValue={editingNode?.title || ""} key={editingNode?.id || "new"} />
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary mb-1">Content</label>
            <textarea name="content" className={inputClasses} rows={6} defaultValue={editingNode?.content || ""} key={`content-${editingNode?.id || "new"}`} />
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary mb-1">Content Type</label>
            <select name="contentType" className={inputClasses} defaultValue={editingNode?.contentType || "text"} key={`type-${editingNode?.id || "new"}`}>
              <option value="text">Text</option>
              <option value="image">Image</option>
              <option value="video">Video</option>
              <option value="audio">Audio</option>
              <option value="link">Link</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              Media URL
              <span className="ml-2 text-xs text-muted font-normal">(optional)</span>
            </label>
            <input type="url" name="mediaUrl" className={inputClasses} defaultValue={editingNode?.mediaUrl || ""} key={`media-${editingNode?.id || "new"}`} />
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary mb-1">Points</label>
            <input type="number" name="points" className={inputClasses} defaultValue={editingNode?.points || 100} key={`points-${editingNode?.id || "new"}`} />
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              Hint
              <span className="ml-2 text-xs text-muted font-normal">(optional, costs half points)</span>
            </label>
            <textarea name="hint" className={inputClasses} rows={2} placeholder="A hint players can request for half the points..." defaultValue={editingNode?.hint || ""} key={`hint-${editingNode?.id || "new"}`} />
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              Admin Comment
              <span className="ml-2 text-xs text-muted font-normal">(only visible to admins)</span>
            </label>
            <textarea name="adminComment" className={inputClasses} rows={2} placeholder="Internal notes about this node..." defaultValue={editingNode?.adminComment || ""} key={`comment-${editingNode?.id || "new"}`} />
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" name="passwordRequired" id="pwReq" defaultChecked={editingNode?.passwordRequired || false} key={`pwreq-${editingNode?.id || "new"}`} className="rounded bg-secondary border-border" />
            <label htmlFor="pwReq" className="text-sm text-secondary">Password Required</label>
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary mb-1">Password</label>
            <input type="text" name="password" className={inputClasses} placeholder={editingNode ? "(leave empty to keep current)" : ""} />
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm text-secondary">
              <input type="checkbox" name="isStart" defaultChecked={editingNode?.isStart || false} key={`start-${editingNode?.id || "new"}`} className="rounded bg-secondary border-border" />
              Start Node
            </label>
            <label className="flex items-center gap-2 text-sm text-secondary">
              <input type="checkbox" name="isEnd" defaultChecked={editingNode?.isEnd || false} key={`end-${editingNode?.id || "new"}`} className="rounded bg-secondary border-border" />
              End Node
            </label>
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {editingNode ? t("pages.admin.gameEditor.nodes.buttons.update") : t("pages.admin.gameEditor.nodes.buttons.add")}
            </Button>
            {editingNode && (
              <Button variant="secondary" onClick={() => setEditingNode(null)}>
                {t("common.cancel")}
              </Button>
            )}
          </div>
        </Form>
      </div>

      {/* Preview Modal */}
      <Modal
        isOpen={!!previewNode}
        onClose={() => setPreviewNode(null)}
        title={previewNode?.title || "Preview"}
        maxWidth="max-w-2xl"
      >
        {previewNode && (
          <ClueDisplay
            node={{
              id: previewNode.id,
              title: previewNode.title,
              content: previewNode.content,
              contentType: previewNode.contentType,
              mediaUrl: previewNode.mediaUrl,
            }}
          />
        )}
      </Modal>
    </div>
  );
}
