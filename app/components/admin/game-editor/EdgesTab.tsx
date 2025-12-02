import { Form } from "@remix-run/react";
import { Button } from "~/components/Button";
import { inputClasses, type Edge, type Node } from "./types";

interface EdgesTabProps {
  edges: Edge[];
  nodes: Node[];
  isSubmitting: boolean;
  onDelete: (type: "node" | "edge" | "team", id: string, name: string) => void;
}

export function EdgesTab({ edges, nodes, isSubmitting, onDelete }: EdgesTabProps) {
  const getNodeTitle = (nodeId: string) => nodes.find((n) => n.id === nodeId)?.title || "Unknown";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 bg-elevated rounded-xl border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted uppercase">From Node</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-muted uppercase">→</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted uppercase">To Node</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {edges.map((edge) => (
                <tr key={edge.id} className="hover:bg-secondary">
                  <td className="px-4 py-3 text-primary">{getNodeTitle(edge.fromNodeId)}</td>
                  <td className="px-4 py-3 text-center text-muted">→</td>
                  <td className="px-4 py-3 text-primary">{getNodeTitle(edge.toNodeId)}</td>
                  <td className="px-4 py-3">
                    <Button
                      variant="danger"
                      size="small"
                      onClick={() => onDelete("edge", edge.id, `${getNodeTitle(edge.fromNodeId)} → ${getNodeTitle(edge.toNodeId)}`)}
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
              {edges.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-muted">No edges yet. Connect your nodes.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-elevated rounded-xl border p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-primary mb-4">Add Edge</h3>
        <Form method="post" className="space-y-4">
          <input type="hidden" name="_action" value="createEdge" />

          <div>
            <label className="block text-sm font-medium text-secondary mb-1">From Node</label>
            <select name="fromNodeId" className={inputClasses} required>
              <option value="">Select node...</option>
              {nodes.map((node) => (
                <option key={node.id} value={node.id}>{node.title}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary mb-1">To Node</label>
            <select name="toNodeId" className={inputClasses} required>
              <option value="">Select node...</option>
              {nodes.map((node) => (
                <option key={node.id} value={node.id}>{node.title}</option>
              ))}
            </select>
          </div>

          <Button type="submit" variant="primary" disabled={isSubmitting}>Add Edge</Button>
        </Form>
      </div>
    </div>
  );
}
