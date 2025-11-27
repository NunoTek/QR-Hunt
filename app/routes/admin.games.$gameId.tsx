import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, Link, useActionData, useLoaderData, useNavigation, useRevalidator } from "@remix-run/react";
import { useCallback, useRef, useState } from "react";
import { Chat } from "~/components/Chat";
import { QRCodeGenerator } from "~/components/QRCodeGenerator";
import { QRIdentifyScanner } from "~/components/QRIdentifyScanner";
import { ToastProvider, useToast } from "~/components/Toast";
import { getApiUrl } from "~/lib/api";

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  return [{ title: data?.game?.name ? `${data.game.name} - QR Hunt Admin` : "Game - QR Hunt Admin" }];
};

interface Node {
  id: string;
  nodeKey: string;
  title: string;
  content: string | null;
  contentType: string;
  mediaUrl: string | null;
  passwordRequired: boolean;
  isStart: boolean;
  isEnd: boolean;
  points: number;
}

interface Edge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
}

interface Team {
  id: string;
  code: string;
  name: string;
  startNodeId: string | null;
  logoUrl: string | null;
}

interface Game {
  id: string;
  name: string;
  publicSlug: string;
  status: string;
  logoUrl: string | null;
  settings: {
    rankingMode: string;
    basePoints: number;
  };
}

interface LoaderData {
  game: Game;
  nodes: Node[];
  edges: Edge[];
  teams: Team[];
  qrCodes: Array<{
    nodeId: string;
    nodeKey: string;
    title: string;
    url: string;
    isStart: boolean;
    isEnd: boolean;
  }>;
  baseUrl: string;
  adminCode: string;
}

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { gameId } = params;
  const cookieHeader = request.headers.get("Cookie") || "";
  const adminCodeMatch = cookieHeader.match(/admin_code=([^;]+)/);
  const adminCode = adminCodeMatch ? adminCodeMatch[1] : "";

  const baseUrl = getApiUrl();
  const headers = { "x-admin-code": adminCode };

  try {
    const [gameRes, nodesRes, edgesRes, teamsRes, qrRes] = await Promise.all([
      fetch(`${baseUrl}/api/v1/admin/games/${gameId}`, { headers }),
      fetch(`${baseUrl}/api/v1/admin/games/${gameId}/nodes`, { headers }),
      fetch(`${baseUrl}/api/v1/admin/games/${gameId}/edges`, { headers }),
      fetch(`${baseUrl}/api/v1/admin/games/${gameId}/teams`, { headers }),
      fetch(`${baseUrl}/api/v1/admin/games/${gameId}/qrcodes?baseUrl=${encodeURIComponent(baseUrl)}`, { headers }),
    ]);

    if (!gameRes.ok) {
      throw new Response("Game not found", { status: 404 });
    }

    const [gameData, nodesData, edgesData, teamsData, qrData] = await Promise.all([
      gameRes.json(),
      nodesRes.json(),
      edgesRes.json(),
      teamsRes.json(),
      qrRes.json(),
    ]);

    const requestUrl = new URL(request.url);
    const appBaseUrl = `${requestUrl.protocol}//${requestUrl.host}`;

    return json<LoaderData>({
      game: gameData.game,
      nodes: nodesData.nodes || [],
      edges: edgesData.edges || [],
      teams: teamsData.teams || [],
      qrCodes: qrData.qrCodes || [],
      baseUrl: appBaseUrl,
      adminCode,
    });
  } catch {
    throw new Response("Failed to load game", { status: 500 });
  }
}

export async function action({ request, params }: ActionFunctionArgs) {
  const { gameId } = params;
  const cookieHeader = request.headers.get("Cookie") || "";
  const adminCodeMatch = cookieHeader.match(/admin_code=([^;]+)/);
  const adminCode = adminCodeMatch ? adminCodeMatch[1] : "";

  const formData = await request.formData();
  const actionType = formData.get("_action")?.toString();

  const baseUrl = getApiUrl();
  const headers = {
    "Content-Type": "application/json",
    "x-admin-code": adminCode,
  };

  try {
    switch (actionType) {
      case "createNode": {
        const response = await fetch(`${baseUrl}/api/v1/admin/nodes`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            gameId,
            title: formData.get("title"),
            content: formData.get("content") || undefined,
            contentType: formData.get("contentType") || "text",
            mediaUrl: formData.get("mediaUrl") || undefined,
            passwordRequired: formData.get("passwordRequired") === "on",
            password: formData.get("password") || undefined,
            isStart: formData.get("isStart") === "on",
            isEnd: formData.get("isEnd") === "on",
            points: parseInt(formData.get("points")?.toString() || "100", 10),
          }),
        });
        if (!response.ok) {
          const data = await response.json();
          return json({ error: data.error || "Failed to create node" });
        }
        break;
      }

      case "deleteNode": {
        const nodeId = formData.get("nodeId");
        await fetch(`${baseUrl}/api/v1/admin/nodes/${nodeId}`, {
          method: "DELETE",
          headers: { "x-admin-code": adminCode },
        });
        break;
      }

      case "updateNode": {
        const nodeId = formData.get("nodeId");
        const response = await fetch(`${baseUrl}/api/v1/admin/nodes/${nodeId}`, {
          method: "PATCH",
          headers,
          body: JSON.stringify({
            title: formData.get("title"),
            content: formData.get("content") || undefined,
            contentType: formData.get("contentType") || "text",
            mediaUrl: formData.get("mediaUrl") || null,
            passwordRequired: formData.get("passwordRequired") === "on",
            password: formData.get("password") || null,
            isStart: formData.get("isStart") === "on",
            isEnd: formData.get("isEnd") === "on",
            points: parseInt(formData.get("points")?.toString() || "100", 10),
          }),
        });
        if (!response.ok) {
          const data = await response.json();
          return json({ error: data.error || "Failed to update node" });
        }
        break;
      }

      case "createEdge": {
        const response = await fetch(`${baseUrl}/api/v1/admin/edges`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            gameId,
            fromNodeId: formData.get("fromNodeId"),
            toNodeId: formData.get("toNodeId"),
          }),
        });
        if (!response.ok) {
          const data = await response.json();
          return json({ error: data.error || "Failed to create edge" });
        }
        break;
      }

      case "deleteEdge": {
        const edgeId = formData.get("edgeId");
        await fetch(`${baseUrl}/api/v1/admin/edges/${edgeId}`, {
          method: "DELETE",
          headers: { "x-admin-code": adminCode },
        });
        break;
      }

      case "updateEdge": {
        const edgeId = formData.get("edgeId");
        const response = await fetch(`${baseUrl}/api/v1/admin/edges/${edgeId}`, {
          method: "PATCH",
          headers,
          body: JSON.stringify({
            fromNodeId: formData.get("fromNodeId"),
            toNodeId: formData.get("toNodeId"),
          }),
        });
        if (!response.ok) {
          const data = await response.json();
          return json({ error: data.error || "Failed to update edge" });
        }
        break;
      }

      case "createTeam": {
        const response = await fetch(`${baseUrl}/api/v1/admin/teams`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            gameId,
            name: formData.get("teamName"),
            startNodeId: formData.get("startNodeId") || undefined,
            logoUrl: formData.get("logoUrl") || undefined,
          }),
        });
        if (!response.ok) {
          const data = await response.json();
          return json({ error: data.error || "Failed to create team" });
        }
        break;
      }

      case "deleteTeam": {
        const teamId = formData.get("teamId");
        await fetch(`${baseUrl}/api/v1/admin/teams/${teamId}`, {
          method: "DELETE",
          headers: { "x-admin-code": adminCode },
        });
        break;
      }

      case "updateTeam": {
        const teamId = formData.get("teamId");
        const response = await fetch(`${baseUrl}/api/v1/admin/teams/${teamId}`, {
          method: "PATCH",
          headers,
          body: JSON.stringify({
            name: formData.get("teamName"),
            startNodeId: formData.get("startNodeId") || null,
            logoUrl: formData.get("logoUrl") || null,
          }),
        });
        if (!response.ok) {
          const data = await response.json();
          return json({ error: data.error || "Failed to update team" });
        }
        break;
      }

      case "activateGame": {
        const response = await fetch(`${baseUrl}/api/v1/admin/games/${gameId}/activate`, {
          method: "POST",
          headers: { "x-admin-code": adminCode },
        });
        if (!response.ok) {
          const data = await response.json();
          return json({ error: data.error || "Failed to activate game" });
        }
        break;
      }

      case "completeGame": {
        await fetch(`${baseUrl}/api/v1/admin/games/${gameId}/complete`, {
          method: "POST",
          headers: { "x-admin-code": adminCode },
        });
        break;
      }

      case "deleteGame": {
        await fetch(`${baseUrl}/api/v1/admin/games/${gameId}`, {
          method: "DELETE",
          headers: { "x-admin-code": adminCode },
        });
        return redirect("/admin/games");
      }

      case "updateGameLogo": {
        const logoUrl = formData.get("logoUrl")?.toString() || null;
        const response = await fetch(`${baseUrl}/api/v1/admin/games/${gameId}`, {
          method: "PATCH",
          headers,
          body: JSON.stringify({ logoUrl: logoUrl || null }),
        });
        if (!response.ok) {
          const data = await response.json();
          return json({ error: data.error || "Failed to update game logo" });
        }
        break;
      }
    }

    return json({ success: true });
  } catch {
    return json({ error: "Operation failed" });
  }
}

// Reusable components
const StatusBadge = ({ status }: { status: string }) => (
  <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
    status === "active" ? "bg-[var(--color-success)]/15 text-[var(--color-success)]" :
    status === "completed" ? "bg-[var(--color-info)]/15 text-[var(--color-info)]" :
    "bg-[var(--color-warning)]/15 text-[var(--color-warning)]"
  }`}>
    {status}
  </span>
);

const NodeBadge = ({ type }: { type: "start" | "end" }) => (
  <span className={`ml-2 inline-flex px-2 py-0.5 rounded text-xs font-medium ${
    type === "start" ? "bg-[var(--color-success)]/15 text-[var(--color-success)]" : "bg-[var(--color-error)]/15 text-[var(--color-error)]"
  }`}>
    {type === "start" ? "Start" : "End"}
  </span>
);

const inputClasses = "w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent text-sm";
const btnPrimary = "px-4 py-2 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] text-white font-medium rounded-lg hover:opacity-90 transition-all text-sm disabled:opacity-50 shadow-sm";
const btnSecondary = "px-4 py-2 text-secondary border border-border hover:border-strong rounded-lg transition-colors text-sm disabled:opacity-50";
const btnDanger = "px-4 py-2 bg-[var(--color-error)]/15 text-[var(--color-error)] border border-[var(--color-error)]/30 hover:bg-[var(--color-error)]/25 rounded-lg transition-colors text-sm disabled:opacity-50";
const btnSmall = "px-2 py-1 text-xs rounded";

export default function AdminGameDetail() {
  return (
    <ToastProvider>
      <AdminGameDetailContent />
    </ToastProvider>
  );
}

function AdminGameDetailContent() {
  const data = useLoaderData<typeof loader>();
  const adminCode = data.adminCode;
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const revalidator = useRevalidator();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<"nodes" | "edges" | "teams" | "qrcodes" | "settings">("nodes");
  const [selectedQR, setSelectedQR] = useState<{ url: string; title: string } | null>(null);
  const [showQRIdentifyScanner, setShowQRIdentifyScanner] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [editingNode, setEditingNode] = useState<Node | null>(null);
  const [editingEdge, setEditingEdge] = useState<Edge | null>(null);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [teamLogoUrl, setTeamLogoUrl] = useState<string>("");
  const deleteTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const handleDelete = useCallback(
    async (type: "node" | "edge" | "team", id: string, name: string) => {
      const baseUrl = getApiUrl();
      const headers = { "x-admin-code": adminCode };

      const timerId = setTimeout(async () => {
        try {
          let endpoint = "";
          if (type === "node") endpoint = `${baseUrl}/api/v1/admin/nodes/${id}`;
          if (type === "edge") endpoint = `${baseUrl}/api/v1/admin/edges/${id}`;
          if (type === "team") endpoint = `${baseUrl}/api/v1/admin/teams/${id}`;

          await fetch(endpoint, { method: "DELETE", headers });
          deleteTimersRef.current.delete(`${type}-${id}`);
          revalidator.revalidate();
        } catch {
          toast.error(`Failed to delete ${type}`);
        }
      }, 20000);

      deleteTimersRef.current.set(`${type}-${id}`, timerId);

      const typeLabel = type === "node" ? "Node" : type === "edge" ? "Edge" : "Team";
      toast.warning(`${typeLabel} "${name}" will be deleted in 20s`, 20000, {
        label: "Undo",
        onClick: () => {
          const timer = deleteTimersRef.current.get(`${type}-${id}`);
          if (timer) {
            clearTimeout(timer);
            deleteTimersRef.current.delete(`${type}-${id}`);
            toast.info(`${typeLabel} deletion cancelled`);
          }
        },
      });
    },
    [toast, revalidator, adminCode]
  );

  const isSubmitting = navigation.state === "submitting";

  const copyTeamShareInfo = async (team: Team) => {
    const joinLink = `${data.baseUrl}/join?game=${data.game.publicSlug}`;
    const shareText = `Join ${team.name} in ${data.game.name}!\n\nJoin Link: ${joinLink}\nTeam Code: ${team.code}`;

    try {
      await navigator.clipboard.writeText(shareText);
      toast.success(`Share info for "${team.name}" copied!`);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const hasNodes = data.nodes.length > 0;
  const hasStartNode = data.nodes.some(n => n.isStart);
  const hasEndNode = data.nodes.some(n => n.isEnd);
  const canActivate = hasNodes && hasStartNode && hasEndNode;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link to="/admin/games" className="text-muted hover:text-[var(--color-primary)] text-sm transition-colors">
          ← Back to games
        </Link>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mt-2">
          <div className="flex items-center gap-4">
            {data.game.logoUrl && (
              <img
                src={data.game.logoUrl}
                alt={`${data.game.name} logo`}
                className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg object-cover border border-border"
              />
            )}
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-primary">{data.game.name}</h1>
              <p className="text-secondary">/{data.game.publicSlug}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <StatusBadge status={data.game.status} />

            {data.game.status === "draft" && (
              <Form method="post" className="inline">
                <input type="hidden" name="_action" value="activateGame" />
                <button
                  type="submit"
                  className={`${btnPrimary} ${!canActivate ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={isSubmitting || !canActivate}
                  title={!canActivate ? "Game needs at least one node, one start node, and one end node" : ""}
                >
                  Activate Game
                </button>
              </Form>
            )}

            {data.game.status === "active" && (
              <Form method="post" className="inline">
                <input type="hidden" name="_action" value="completeGame" />
                <button type="submit" className={btnSecondary} disabled={isSubmitting}>
                  Complete Game
                </button>
              </Form>
            )}

            <Link to={`/leaderboard/${data.game.publicSlug}`} target="_blank" className={btnSecondary}>
              View Leaderboard
            </Link>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {"error" in (actionData || {}) && (actionData as { error?: string })?.error && (
        <div className="flex items-center gap-3 bg-[var(--color-error)]/10 border border-[var(--color-error)]/30 text-[var(--color-error)] px-4 py-3 rounded-xl mb-4">
          <span>⚠</span>
          <span>{(actionData as { error: string }).error}</span>
        </div>
      )}

      {/* Activation Requirements Warning */}
      {data.game.status === "draft" && !canActivate && (
        <div className="bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/30 text-[var(--color-warning)] px-4 py-3 rounded-xl mb-4">
          <strong>Game cannot be activated yet. Please ensure:</strong>
          <ul className="mt-2 ml-5 list-disc">
            {!hasNodes && <li>At least one node exists</li>}
            {hasNodes && !hasStartNode && <li>At least one node is marked as a <strong>Start</strong> node</li>}
            {hasNodes && !hasEndNode && <li>At least one node is marked as an <strong>End</strong> node</li>}
          </ul>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-border pb-3 flex-wrap">
        {(["nodes", "edges", "teams", "qrcodes", "settings"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === tab
                ? "bg-[var(--color-primary)] text-white"
                : "text-muted hover:text-primary hover:bg-secondary"
            }`}
          >
            {tab === "qrcodes" ? "QR Codes" : tab.charAt(0).toUpperCase() + tab.slice(1)}
            {tab !== "settings" && (
              <span className="ml-2 opacity-70">
                ({tab === "nodes" ? data.nodes.length : tab === "edges" ? data.edges.length : tab === "teams" ? data.teams.length : data.qrCodes.length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Nodes Tab */}
      {activeTab === "nodes" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Nodes Table */}
          <div className="lg:col-span-2 bg-elevated rounded-xl border border-border overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted uppercase">Title</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted uppercase hidden sm:table-cell">Key</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted uppercase hidden md:table-cell">Type</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted uppercase">Pts</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.nodes.map((node) => (
                    <tr key={node.id} className="hover:bg-secondary">
                      <td className="px-4 py-3 text-primary">
                        <span className="font-medium">{node.title}</span>
                        {node.isStart && <NodeBadge type="start" />}
                        {node.isEnd && <NodeBadge type="end" />}
                      </td>
                      <td className="px-4 py-3 text-secondary hidden sm:table-cell">{node.nodeKey}</td>
                      <td className="px-4 py-3 text-secondary hidden md:table-cell">{node.contentType}</td>
                      <td className="px-4 py-3 text-secondary">{node.points}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 justify-end">
                          <button onClick={() => setEditingNode(node)} className={`${btnSecondary} ${btnSmall}`}>Edit</button>
                          <button onClick={() => handleDelete("node", node.id, node.title)} className={`${btnDanger} ${btnSmall}`}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {data.nodes.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-muted">No nodes yet. Add your first node.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add/Edit Node Form */}
          <div className="bg-elevated rounded-xl border border-border p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-primary mb-4">{editingNode ? "Edit Node" : "Add Node"}</h3>
            <Form method="post" onSubmit={() => setEditingNode(null)} className="space-y-4">
              <input type="hidden" name="_action" value={editingNode ? "updateNode" : "createNode"} />
              {editingNode && <input type="hidden" name="nodeId" value={editingNode.id} />}

              <div>
                <label className="block text-sm font-medium text-secondary mb-1">Title</label>
                <input type="text" name="title" className={inputClasses} required defaultValue={editingNode?.title || ""} key={editingNode?.id || "new"} />
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary mb-1">Content</label>
                <textarea name="content" className={inputClasses} rows={3} defaultValue={editingNode?.content || ""} key={`content-${editingNode?.id || "new"}`} />
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
                <label className="block text-sm font-medium text-secondary mb-1">Media URL</label>
                <input type="url" name="mediaUrl" className={inputClasses} defaultValue={editingNode?.mediaUrl || ""} key={`media-${editingNode?.id || "new"}`} />
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary mb-1">Points</label>
                <input type="number" name="points" className={inputClasses} defaultValue={editingNode?.points || 100} key={`points-${editingNode?.id || "new"}`} />
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
                <button type="submit" className={btnPrimary} disabled={isSubmitting}>{editingNode ? "Update Node" : "Add Node"}</button>
                {editingNode && <button type="button" className={btnSecondary} onClick={() => setEditingNode(null)}>Cancel</button>}
              </div>
            </Form>
          </div>
        </div>
      )}

      {/* Edges Tab */}
      {activeTab === "edges" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-elevated rounded-xl border border-border overflow-hidden shadow-sm">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted uppercase">From</th>
                  <th className="px-4 py-3 text-muted">→</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted uppercase">To</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.edges.map((edge) => {
                  const fromNode = data.nodes.find((n) => n.id === edge.fromNodeId);
                  const toNode = data.nodes.find((n) => n.id === edge.toNodeId);
                  return (
                    <tr key={edge.id} className="hover:bg-secondary">
                      <td className="px-4 py-3 text-primary">{fromNode?.title || "Unknown"}</td>
                      <td className="px-4 py-3 text-muted">→</td>
                      <td className="px-4 py-3 text-primary">{toNode?.title || "Unknown"}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 justify-end">
                          <button onClick={() => setEditingEdge(edge)} className={`${btnSecondary} ${btnSmall}`}>Edit</button>
                          <button onClick={() => handleDelete("edge", edge.id, `${fromNode?.title} → ${toNode?.title}`)} className={`${btnDanger} ${btnSmall}`}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {data.edges.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-muted">No edges yet. Connect your nodes.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="bg-elevated rounded-xl border border-border p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-primary mb-4">{editingEdge ? "Edit Edge" : "Add Edge"}</h3>
            <Form method="post" onSubmit={() => setEditingEdge(null)} className="space-y-4">
              <input type="hidden" name="_action" value={editingEdge ? "updateEdge" : "createEdge"} />
              {editingEdge && <input type="hidden" name="edgeId" value={editingEdge.id} />}

              <div>
                <label className="block text-sm font-medium text-secondary mb-1">From Node</label>
                <select name="fromNodeId" className={inputClasses} required defaultValue={editingEdge?.fromNodeId || ""} key={`from-${editingEdge?.id || "new"}`}>
                  <option value="">Select...</option>
                  {data.nodes.map((node) => <option key={node.id} value={node.id}>{node.title}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary mb-1">To Node</label>
                <select name="toNodeId" className={inputClasses} required defaultValue={editingEdge?.toNodeId || ""} key={`to-${editingEdge?.id || "new"}`}>
                  <option value="">Select...</option>
                  {data.nodes.map((node) => <option key={node.id} value={node.id}>{node.title}</option>)}
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button type="submit" className={btnPrimary} disabled={isSubmitting}>{editingEdge ? "Update Edge" : "Add Edge"}</button>
                {editingEdge && <button type="button" className={btnSecondary} onClick={() => setEditingEdge(null)}>Cancel</button>}
              </div>
            </Form>
          </div>
        </div>
      )}

      {/* Teams Tab */}
      {activeTab === "teams" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-elevated rounded-xl border border-border overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted uppercase">Team</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted uppercase">Code</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted uppercase hidden sm:table-cell">Start Node</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.teams.map((team) => {
                    const startNode = data.nodes.find((n) => n.id === team.startNodeId);
                    return (
                      <tr key={team.id} className="hover:bg-secondary">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {team.logoUrl && <img src={team.logoUrl} alt="" className="w-6 h-6 rounded object-cover" />}
                            <span className="text-primary font-medium">{team.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <code className="bg-secondary px-2 py-1 rounded text-[var(--color-primary)] text-sm">{team.code}</code>
                        </td>
                        <td className="px-4 py-3 text-secondary hidden sm:table-cell">{startNode?.title || "Default"}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1 justify-end">
                            <button onClick={() => copyTeamShareInfo(team)} className={`${btnSecondary} ${btnSmall}`}>Share</button>
                            <button onClick={() => setEditingTeam(team)} className={`${btnSecondary} ${btnSmall}`}>Edit</button>
                            <button onClick={() => handleDelete("team", team.id, team.name)} className={`${btnDanger} ${btnSmall}`}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {data.teams.length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-muted">No teams yet. Create team codes.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-elevated rounded-xl border border-border p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-primary mb-4">{editingTeam ? "Edit Team" : "Add Team"}</h3>
            <Form method="post" onSubmit={() => { setEditingTeam(null); setTeamLogoUrl(""); }} className="space-y-4">
              <input type="hidden" name="_action" value={editingTeam ? "updateTeam" : "createTeam"} />
              {editingTeam && <input type="hidden" name="teamId" value={editingTeam.id} />}

              <div>
                <label className="block text-sm font-medium text-secondary mb-1">Team Name</label>
                <input type="text" name="teamName" className={inputClasses} required defaultValue={editingTeam?.name || ""} key={`name-${editingTeam?.id || "new"}`} />
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary mb-1">Start Node</label>
                <select name="startNodeId" className={inputClasses} defaultValue={editingTeam?.startNodeId || ""} key={`start-${editingTeam?.id || "new"}`}>
                  <option value="">Default (any start node)</option>
                  {data.nodes.filter((n) => n.isStart).map((node) => <option key={node.id} value={node.id}>{node.title}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary mb-1">Logo URL</label>
                <input
                  type="url"
                  name="logoUrl"
                  className={inputClasses}
                  placeholder="https://example.com/logo.png"
                  value={editingTeam ? (teamLogoUrl || editingTeam.logoUrl || "") : teamLogoUrl}
                  onChange={(e) => setTeamLogoUrl(e.target.value)}
                  key={`logo-${editingTeam?.id || "new"}`}
                />
              </div>

              {(teamLogoUrl || editingTeam?.logoUrl) && (
                <img
                  src={teamLogoUrl || editingTeam?.logoUrl || ""}
                  alt="Team logo preview"
                  className="w-16 h-16 rounded-lg object-cover border border-border"
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                  onLoad={(e) => { e.currentTarget.style.display = "block"; }}
                />
              )}

              <div className="flex gap-2 pt-2">
                <button type="submit" className={btnPrimary} disabled={isSubmitting}>{editingTeam ? "Update Team" : "Add Team"}</button>
                {editingTeam && <button type="button" className={btnSecondary} onClick={() => { setEditingTeam(null); setTeamLogoUrl(""); }}>Cancel</button>}
              </div>
            </Form>
          </div>
        </div>
      )}

      {/* QR Codes Tab */}
      {activeTab === "qrcodes" && (
        <div className="bg-elevated rounded-xl border border-border overflow-hidden shadow-sm">
          <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-primary">QR Codes</h3>
              <p className="text-secondary text-sm mt-1">Generate, customize, and download QR codes for each node.</p>
            </div>
            <button
              onClick={() => setShowQRIdentifyScanner(true)}
              className={`${btnSecondary} inline-flex items-center gap-2`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              Scan to Identify
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted uppercase">Node</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted uppercase hidden md:table-cell">URL</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.qrCodes.map((qr) => (
                  <tr key={qr.nodeId} className="hover:bg-secondary">
                    <td className="px-4 py-3 text-primary">
                      {qr.title}
                      {qr.isStart && <NodeBadge type="start" />}
                      {qr.isEnd && <NodeBadge type="end" />}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <code className="text-xs text-secondary break-all">{qr.url}</code>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => setSelectedQR({ url: qr.url, title: qr.title })} className={btnPrimary}>Generate QR</button>
                        <button onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(qr.url);
                            toast.success("URL copied to clipboard!");
                          } catch {
                            toast.error("Failed to copy URL");
                          }
                        }} className={`${btnSecondary} hidden sm:inline-flex`}>Copy URL</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {data.qrCodes.length === 0 && (
                  <tr><td colSpan={3} className="px-4 py-8 text-center text-muted">No nodes yet. Add nodes first to generate QR codes.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === "settings" && (
        <div className="bg-elevated rounded-xl border border-border p-6 max-w-xl shadow-sm">
          <h3 className="text-lg font-semibold text-primary mb-2">Game Logo</h3>
          <p className="text-secondary text-sm mb-4">Set a logo for your game. This will be used as the default logo for QR codes.</p>

          {data.game.logoUrl && (
            <img src={data.game.logoUrl} alt="Game Logo" className="max-w-[150px] max-h-[150px] rounded-lg border border-border mb-4" />
          )}

          <Form method="post" className="space-y-4">
            <input type="hidden" name="_action" value="updateGameLogo" />
            <div>
              <label className="block text-sm font-medium text-secondary mb-1">Logo URL</label>
              <input type="url" name="logoUrl" className={inputClasses} placeholder="https://example.com/logo.png" defaultValue={data.game.logoUrl || ""} />
            </div>
            <button type="submit" className={btnPrimary} disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Save Logo"}</button>
          </Form>
        </div>
      )}

      {/* QR Code Generator Modal */}
      {selectedQR && (
        <QRCodeGenerator
          url={selectedQR.url}
          title={selectedQR.title}
          logoUrl={data.game.logoUrl || ""}
          onClose={() => setSelectedQR(null)}
        />
      )}

      {/* QR Identify Scanner Modal */}
      {showQRIdentifyScanner && (
        <QRIdentifyScanner
          nodes={data.qrCodes}
          onClose={() => setShowQRIdentifyScanner(false)}
        />
      )}

      {/* Danger Zone */}
      <div className="mt-8 bg-elevated rounded-xl border border-[var(--color-error)]/50 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-[var(--color-error)] mb-2">Danger Zone</h3>
        <p className="text-secondary text-sm mb-4">
          Deleting this game will permanently remove all nodes, edges, teams, and scan data. This action cannot be undone.
        </p>
        <button
          type="button"
          onClick={() => setShowDeleteModal(true)}
          className={btnDanger}
          disabled={isSubmitting}
        >
          Delete Game
        </button>
      </div>

      {/* Delete Game Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
          <div className="rounded-xl max-w-md w-full shadow-xl" style={{ backgroundColor: 'var(--bg-elevated)' }}>
            <div className="p-6 border-b border-border" style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[var(--color-error)]/15 flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-error)" strokeWidth="2">
                    <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[var(--color-error)]">Delete Game</h3>
                  <p className="text-sm text-muted">This action cannot be undone</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <p className="text-secondary text-sm mb-4">
                This will permanently delete <strong className="text-primary">{data.game.name}</strong> and all associated data including:
              </p>
              <ul className="text-sm text-muted mb-6 space-y-1">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-error)]" />
                  All {data.nodes.length} nodes and QR codes
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-error)]" />
                  All {data.edges.length} edges
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-error)]" />
                  All {data.teams.length} teams and their progress
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-error)]" />
                  All scan history and chat messages
                </li>
              </ul>

              <label className="block text-sm font-medium text-secondary mb-2">
                Type <span className="font-mono text-primary bg-secondary px-1.5 py-0.5 rounded">{data.game.name}</span> to confirm:
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Enter game name"
                className={inputClasses}
                autoFocus
              />
            </div>

            <div className="p-4 border-t border-border flex gap-3 justify-end" style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText("");
                }}
                className={btnSecondary}
              >
                Cancel
              </button>
              <Form method="post" className="inline">
                <input type="hidden" name="_action" value="deleteGame" />
                <button
                  type="submit"
                  disabled={deleteConfirmText !== data.game.name || isSubmitting}
                  className="px-4 py-2 bg-[var(--color-error)] text-white font-medium rounded-lg hover:bg-[var(--color-error)]/90 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Deleting..." : "Delete Forever"}
                </button>
              </Form>
            </div>
          </div>
        </div>
      )}

      {/* Chat Component */}
      <Chat
        isAdmin={true}
        gameSlug={data.game.publicSlug}
        gameId={data.game.id}
        adminCode={adminCode}
        teams={data.teams}
      />
    </div>
  );
}
