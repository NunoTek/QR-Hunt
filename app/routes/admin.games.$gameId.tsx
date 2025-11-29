import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, Link, useActionData, useLoaderData, useNavigation, useRevalidator } from "@remix-run/react";
import JSZip from "jszip";
import QRCode from "qrcode";
import { useCallback, useEffect, useRef, useState } from "react";
import { Chat } from "~/components/Chat";
import { ClueDisplay } from "~/components/ClueDisplay";
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
  adminComment: string | null;
  activated: boolean;
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

interface Feedback {
  id: string;
  teamName: string;
  rating: number;
  comment: string | null;
  createdAt: string;
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
    randomMode?: boolean;
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
    activated: boolean;
    adminComment: string | null;
  }>;
  baseUrl: string;
  adminCode: string;
}

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { gameId } = params;
  const cookieHeader = request.headers.get("Cookie") || "";
  const adminCodeMatch = cookieHeader.match(/admin_code=([^;]+)/);
  const adminCode = adminCodeMatch ? adminCodeMatch[1] : "";

  const apiBaseUrl = getApiUrl();
  const headers = { "x-admin-code": adminCode };

  // Get the public-facing URL from the request for QR codes
  const requestUrl = new URL(request.url);
  const appBaseUrl = `${requestUrl.protocol}//${requestUrl.host}`;

  try {
    const [gameRes, nodesRes, edgesRes, teamsRes, qrRes] = await Promise.all([
      fetch(`${apiBaseUrl}/api/v1/admin/games/${gameId}`, { headers }),
      fetch(`${apiBaseUrl}/api/v1/admin/games/${gameId}/nodes`, { headers }),
      fetch(`${apiBaseUrl}/api/v1/admin/games/${gameId}/edges`, { headers }),
      fetch(`${apiBaseUrl}/api/v1/admin/games/${gameId}/teams`, { headers }),
      fetch(`${apiBaseUrl}/api/v1/admin/games/${gameId}/qrcodes?baseUrl=${encodeURIComponent(appBaseUrl)}`, { headers }),
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
            adminComment: formData.get("adminComment") || undefined,
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
            adminComment: formData.get("adminComment") || null,
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

      case "updateRandomMode": {
        const randomMode = formData.get("randomMode") === "on";
        const response = await fetch(`${baseUrl}/api/v1/admin/games/${gameId}`, {
          method: "PATCH",
          headers,
          body: JSON.stringify({ settings: { randomMode } }),
        });
        if (!response.ok) {
          const data = await response.json();
          return json({ error: data.error || "Failed to update random mode" });
        }
        break;
      }

      case "toggleActivated": {
        const nodeId = formData.get("nodeId");
        const activated = formData.get("activated") === "true";
        const response = await fetch(`${baseUrl}/api/v1/admin/nodes/${nodeId}`, {
          method: "PATCH",
          headers,
          body: JSON.stringify({ activated }),
        });
        if (!response.ok) {
          const data = await response.json();
          return json({ error: data.error || "Failed to toggle activation" });
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

      case "setStatus": {
        const newStatus = formData.get("status")?.toString();
        if (!newStatus || !["draft", "active", "completed"].includes(newStatus)) {
          return json({ error: "Invalid status" });
        }
        const response = await fetch(`${baseUrl}/api/v1/admin/games/${gameId}`, {
          method: "PATCH",
          headers,
          body: JSON.stringify({ status: newStatus }),
        });
        if (!response.ok) {
          const data = await response.json();
          return json({ error: data.error || "Failed to update game status" });
        }
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

    return json({ success: true, action: actionType });
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
const btnSecondary = "px-4 py-2 text-secondary border hover:border-strong rounded-lg transition-colors text-sm disabled:opacity-50";
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
  const [activeTab, setActiveTab] = useState<"nodes" | "edges" | "teams" | "qrcodes" | "feedback" | "settings">("nodes");
  const [selectedQR, setSelectedQR] = useState<{ url: string; title: string } | null>(null);
  const [showQRIdentifyScanner, setShowQRIdentifyScanner] = useState(false);
  const [previewNode, setPreviewNode] = useState<Node | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [editingNode, setEditingNode] = useState<Node | null>(null);
  const [editingEdge, setEditingEdge] = useState<Edge | null>(null);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [teamLogoUrl, setTeamLogoUrl] = useState<string>("");
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([]);
  const [feedbackStats, setFeedbackStats] = useState<{ averageRating: number | null; count: number }>({ averageRating: null, count: 0 });
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [downloadingQRCodes, setDownloadingQRCodes] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState({ current: 0, total: 0 });
  const [nodeFilter, setNodeFilter] = useState({ title: "", activated: "all" as "all" | "activated" | "not-activated" });
  const [qrFilter, setQrFilter] = useState({ title: "", activated: "all" as "all" | "activated" | "not-activated" });
  const deleteTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const lastActionDataRef = useRef<typeof actionData | null>(null);
  const feedbackLoadedRef = useRef(false);

  // Function to generate QR code as PNG data URL with optional logo
  const generateQRCodePNG = useCallback(async (url: string, logoUrl?: string | null): Promise<string> => {
    const size = 512; // High resolution
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to get canvas context");

    // Generate QR code to canvas
    await QRCode.toCanvas(canvas, url, {
      width: size,
      margin: 2,
      color: { dark: "#000000", light: "#ffffff" },
      errorCorrectionLevel: "H", // High for logo support
    });

    // Add logo if specified
    if (logoUrl) {
      await new Promise<void>((resolve, reject) => {
        const logo = new Image();
        logo.crossOrigin = "anonymous";
        logo.onload = () => {
          const logoSize = size * 0.2; // 20% of QR code size
          const logoX = (size - logoSize) / 2;
          const logoY = (size - logoSize) / 2;

          // Draw white background for logo
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(logoX - 4, logoY - 4, logoSize + 8, logoSize + 8);

          // Draw logo
          ctx.drawImage(logo, logoX, logoY, logoSize, logoSize);
          resolve();
        };
        logo.onerror = () => reject(new Error("Failed to load logo"));
        logo.src = logoUrl;
      });
    }

    return canvas.toDataURL("image/png");
  }, []);

  // Filter nodes based on title and activated status
  const filteredNodes = data.nodes.filter((node) => {
    const matchesTitle = node.title.toLowerCase().includes(nodeFilter.title.toLowerCase());
    const matchesActivated = nodeFilter.activated === "all" ||
      (nodeFilter.activated === "activated" && node.activated) ||
      (nodeFilter.activated === "not-activated" && !node.activated);
    return matchesTitle && matchesActivated;
  });

  // Filter QR codes based on title and activated status
  const filteredQRCodes = data.qrCodes.filter((qr) => {
    const matchesTitle = qr.title.toLowerCase().includes(qrFilter.title.toLowerCase());
    const matchesActivated = qrFilter.activated === "all" ||
      (qrFilter.activated === "activated" && qr.activated) ||
      (qrFilter.activated === "not-activated" && !qr.activated);
    return matchesTitle && matchesActivated;
  });

  // Handler for activating a node via QR scanner
  const handleActivateNode = useCallback(async (nodeId: string) => {
    const baseUrl = getApiUrl();
    try {
      const response = await fetch(`${baseUrl}/api/v1/admin/nodes/${nodeId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-code": adminCode,
        },
        body: JSON.stringify({ activated: true }),
      });
      if (response.ok) {
        revalidator.revalidate();
      }
    } catch (err) {
      console.error("Failed to activate node:", err);
    }
  }, [adminCode, revalidator]);

  // Function to download all QR codes as a ZIP file
  const downloadAllQRCodes = useCallback(async () => {
    if (data.qrCodes.length === 0) {
      toast.error("No QR codes to download");
      return;
    }

    setDownloadingQRCodes(true);
    setDownloadProgress({ current: 0, total: data.qrCodes.length });

    try {
      const zip = new JSZip();
      const logoUrl = data.game.logoUrl;

      for (let i = 0; i < data.qrCodes.length; i++) {
        const qr = data.qrCodes[i];
        setDownloadProgress({ current: i + 1, total: data.qrCodes.length });

        try {
          const pngDataUrl = await generateQRCodePNG(qr.url, logoUrl);
          // Convert data URL to blob
          const base64Data = pngDataUrl.split(",")[1];
          const fileName = `qr-${qr.title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}.png`;
          zip.file(fileName, base64Data, { base64: true });
        } catch (err) {
          console.error(`Failed to generate QR for ${qr.title}:`, err);
        }
      }

      // Generate and download ZIP
      const blob = await zip.generateAsync({ type: "blob" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${data.game.publicSlug}-qr-codes.zip`;
      link.click();
      URL.revokeObjectURL(link.href);

      toast.success(`Downloaded ${data.qrCodes.length} QR codes`);
    } catch (err) {
      console.error("Failed to create ZIP:", err);
      toast.error("Failed to download QR codes");
    } finally {
      setDownloadingQRCodes(false);
      setDownloadProgress({ current: 0, total: 0 });
    }
  }, [data.qrCodes, data.game.logoUrl, data.game.publicSlug, generateQRCodePNG, toast]);

  // Load feedback when switching to feedback tab
  useEffect(() => {
    if (activeTab === "feedback" && !feedbackLoadedRef.current) {
      feedbackLoadedRef.current = true;
      setFeedbackLoading(true);
      fetch(`/api/v1/feedback/admin/${data.game.id}`, {
        headers: { "x-admin-code": adminCode },
      })
        .then((res) => res.json())
        .then((result) => {
          setFeedbackList(result.feedback || []);
          setFeedbackStats({
            averageRating: result.averageRating,
            count: result.count || 0,
          });
        })
        .catch(() => {
          toast.error("Failed to load feedback");
        })
        .finally(() => {
          setFeedbackLoading(false);
        });
    }
  }, [activeTab, data.game.id, adminCode, toast]);

  // Delete feedback
  const handleDeleteFeedback = async (feedbackId: string, teamName: string) => {
    try {
      const response = await fetch(`/api/v1/feedback/admin/${feedbackId}`, {
        method: "DELETE",
        headers: { "x-admin-code": adminCode },
      });
      if (response.ok) {
        setFeedbackList((prev) => prev.filter((f) => f.id !== feedbackId));
        setFeedbackStats((prev) => ({
          ...prev,
          count: prev.count - 1,
        }));
        toast.success(`Feedback from "${teamName}" deleted`);
      } else {
        toast.error("Failed to delete feedback");
      }
    } catch {
      toast.error("Failed to delete feedback");
    }
  };

  // Show toast notifications for action results
  useEffect(() => {
    if (!actionData || actionData === lastActionDataRef.current) return;
    lastActionDataRef.current = actionData;

    if ("error" in actionData && actionData.error) {
      toast.error(actionData.error);
    } else if ("success" in actionData && actionData.success && "action" in actionData) {
      switch (actionData.action) {
        case "updateGameLogo":
          toast.success("Game logo updated");
          break;
        case "setStatus":
          toast.success("Game status updated");
          break;
        case "activateGame":
          toast.success("Game activated successfully");
          break;
        case "completeGame":
          toast.success("Game marked as completed");
          break;
        case "createNode":
          toast.success("Node created");
          break;
        case "updateNode":
          toast.success("Node updated");
          break;
        case "createEdge":
          toast.success("Edge created");
          break;
        case "updateEdge":
          toast.success("Edge updated");
          break;
        case "createTeam":
          toast.success("Team created");
          break;
        case "updateTeam":
          toast.success("Team updated");
          break;
        case "updateRandomMode":
          toast.success("Random mode updated");
          break;
        case "toggleActivated":
          toast.success("Node activation updated");
          break;
      }
    }
  }, [actionData, toast]);

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
                className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg object-cover"
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
                <button type="submit" className={btnPrimary} disabled={isSubmitting}>
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
        {(["nodes", "edges", "teams", "qrcodes", "feedback", "settings"] as const).map((tab) => (
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
            {tab !== "settings" && tab !== "feedback" && (
              <span className="ml-2 opacity-70">
                ({tab === "nodes" ? data.nodes.length : tab === "edges" ? data.edges.length : tab === "teams" ? data.teams.length : data.qrCodes.length})
              </span>
            )}
            {tab === "feedback" && feedbackStats.count > 0 && (
              <span className="ml-2 opacity-70">({feedbackStats.count})</span>
            )}
          </button>
        ))}
      </div>

      {/* Nodes Tab */}
      {activeTab === "nodes" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Nodes Table */}
          <div className="lg:col-span-2 bg-elevated rounded-xl border overflow-hidden shadow-sm">
            {/* Filters */}
            <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Filter by title..."
                  value={nodeFilter.title}
                  onChange={(e) => setNodeFilter({ ...nodeFilter, title: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-secondary text-primary border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div>
                <select
                  value={nodeFilter.activated}
                  onChange={(e) => setNodeFilter({ ...nodeFilter, activated: e.target.value as "all" | "activated" | "not-activated" })}
                  className="w-full px-3 py-2 text-sm bg-secondary text-primary border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="activated">Activated</option>
                  <option value="not-activated">Not Activated</option>
                </select>
              </div>
              <div className="text-sm text-muted self-center">
                {filteredNodes.length} / {data.nodes.length} nodes
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted uppercase">Title</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted uppercase">Key</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted uppercase">Type</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted uppercase">Pts</th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-muted uppercase">Activated</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredNodes.map((node) => (
                    <tr key={node.id} className="hover:bg-secondary">
                      <td className="px-4 py-3 text-primary">
                        <div>
                          <span className="font-medium">{node.title}</span>
                          {node.isStart && <NodeBadge type="start" />}
                          {node.isEnd && <NodeBadge type="end" />}
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
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M20 6L9 17l-5-5" />
                              </svg>
                            ) : (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                              </svg>
                            )}
                          </button>
                        </Form>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 justify-end">
                          <button onClick={() => setPreviewNode(node)} className={`${btnSecondary} ${btnSmall}`} title="Preview clue">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          </button>
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
          <div className="bg-elevated rounded-xl border p-5 shadow-sm">
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
                <button type="submit" className={btnPrimary} disabled={isSubmitting}>{editingNode ? "Update Node" : "Add Node"}</button>
                <button type="button" className={btnSecondary} onClick={() => setEditingNode(null)}>{editingNode ? "Cancel" : "Clear"}</button>
              </div>
            </Form>
          </div>
        </div>
      )}

      {/* Edges Tab */}
      {activeTab === "edges" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-elevated rounded-xl border overflow-hidden shadow-sm">
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

          <div className="bg-elevated rounded-xl border p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-primary mb-4">{editingEdge ? "Edit Edge" : "Add Edge"}</h3>

            {data.game.settings.randomMode && (
              <div className="p-3 bg-[var(--color-info)]/10 border border-[var(--color-info)]/30 rounded-lg mb-4">
                <p className="text-sm text-[var(--color-info)]">
                  <strong>Random Mode is enabled</strong> for this game. Edges are not used in random mode - each team gets a random next clue from unvisited nodes.
                </p>
              </div>
            )}

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
                <button type="button" className={btnSecondary} onClick={() => setEditingEdge(null)}>{editingEdge ? "Cancel" : "Clear"}</button>
              </div>
            </Form>
          </div>
        </div>
      )}

      {/* Teams Tab */}
      {activeTab === "teams" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-elevated rounded-xl border overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted uppercase">Team</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted uppercase">Code</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted uppercase">Start Node</th>
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
                        <td className="px-4 py-3 text-secondary">{startNode?.title || "Default"}</td>
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

          <div className="bg-elevated rounded-xl border p-5 shadow-sm">
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
        <div className="bg-elevated rounded-xl border overflow-hidden shadow-sm">
          <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-primary">QR Codes</h3>
              <p className="text-secondary text-sm mt-1">Generate, customize, and download QR codes for each node.</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={downloadAllQRCodes}
                disabled={downloadingQRCodes || data.qrCodes.length === 0}
                className={`${btnPrimary} inline-flex items-center gap-2`}
              >
                {downloadingQRCodes ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {downloadProgress.current}/{downloadProgress.total}
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Download All (ZIP)
                  </>
                )}
              </button>
              <button
                onClick={() => setShowQRIdentifyScanner(true)}
                className={`${btnSecondary} inline-flex items-center gap-2`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
                Scan to Identify / Activate
              </button>
            </div>
          </div>
          {/* Filters */}
          <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Filter by title..."
                value={qrFilter.title}
                onChange={(e) => setQrFilter({ ...qrFilter, title: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-secondary text-primary border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div>
              <select
                value={qrFilter.activated}
                onChange={(e) => setQrFilter({ ...qrFilter, activated: e.target.value as "all" | "activated" | "not-activated" })}
                className="w-full px-3 py-2 text-sm bg-secondary text-primary border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="activated">Activated</option>
                <option value="not-activated">Not Activated</option>
              </select>
            </div>
            <div className="text-sm text-muted self-center">
              {filteredQRCodes.length} / {data.qrCodes.length} QR codes
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted uppercase">Node</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted uppercase">URL</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-muted uppercase">Activated</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredQRCodes.map((qr) => (
                  <tr key={qr.nodeId} className="hover:bg-secondary">
                    <td className="px-4 py-3 text-primary">
                      {qr.title}
                      {qr.isStart && <NodeBadge type="start" />}
                      {qr.isEnd && <NodeBadge type="end" />}
                    </td>
                    <td className="px-4 py-3">
                      <code className="text-xs text-secondary break-all">{qr.url}</code>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Form method="post" className="inline">
                        <input type="hidden" name="_action" value="toggleActivated" />
                        <input type="hidden" name="nodeId" value={qr.nodeId} />
                        <input type="hidden" name="activated" value={(!qr.activated).toString()} />
                        <button
                          type="submit"
                          className={`inline-flex items-center justify-center w-8 h-8 rounded-full transition-colors ${
                            qr.activated
                              ? "bg-success/20 text-success hover:bg-success/30"
                              : "bg-muted/20 text-muted hover:bg-muted/30"
                          }`}
                          title={qr.activated ? "Click to deactivate" : "Click to activate"}
                        >
                          {qr.activated ? (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M20 6L9 17l-5-5" />
                            </svg>
                          ) : (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="12" cy="12" r="10" />
                            </svg>
                          )}
                        </button>
                      </Form>
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
                {filteredQRCodes.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-muted">No QR codes match the current filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Feedback Tab */}
      {activeTab === "feedback" && (
        <div className="bg-elevated rounded-xl border overflow-hidden shadow-sm">
          <div className="p-4 border-b border-border">
            <h3 className="text-lg font-semibold text-primary">Team Feedback</h3>
            <p className="text-secondary text-sm mt-1">
              View feedback submitted by teams during or after the game.
            </p>
            {feedbackStats.averageRating !== null && (
              <div className="flex items-center gap-3 mt-3">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span key={star} className="text-lg">
                      {star <= Math.round(feedbackStats.averageRating || 0) ? "⭐" : "☆"}
                    </span>
                  ))}
                </div>
                <span className="text-primary font-semibold">{feedbackStats.averageRating?.toFixed(1)}</span>
                <span className="text-muted">({feedbackStats.count} {feedbackStats.count === 1 ? "review" : "reviews"})</span>
              </div>
            )}
          </div>

          {feedbackLoading ? (
            <div className="p-8 text-center text-muted">Loading feedback...</div>
          ) : feedbackList.length === 0 ? (
            <div className="p-8 text-center text-muted">
              <div className="text-4xl mb-2">📝</div>
              <p>No feedback yet.</p>
              <p className="text-sm mt-1">Teams can submit feedback during or after the game.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {feedbackList.map((fb) => (
                <div key={fb.id} className="p-4 hover:bg-secondary transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-semibold text-primary">{fb.teamName}</span>
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <span key={star} className="text-sm">
                              {star <= fb.rating ? "⭐" : "☆"}
                            </span>
                          ))}
                        </div>
                      </div>
                      {fb.comment && (
                        <p className="text-secondary text-sm">{fb.comment}</p>
                      )}
                      <p className="text-xs text-muted mt-2">
                        {new Date(fb.createdAt).toLocaleDateString()} at {new Date(fb.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteFeedback(fb.id, fb.teamName)}
                      className={`${btnDanger} ${btnSmall}`}
                      title="Delete feedback"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === "settings" && (
        <div className="space-y-6">
          {/* Game Status */}
          <div className="bg-elevated rounded-xl border p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-primary mb-2">Game Status</h3>
            <p className="text-secondary text-sm mb-4">Control the current status of your game.</p>

            <div className="flex items-center gap-4 p-4 rounded-lg border mb-4" style={{
              backgroundColor: data.game.status === "draft" ? "var(--color-warning)" + "10" :
                             data.game.status === "active" ? "var(--color-success)" + "10" :
                             "var(--color-info)" + "10",
              borderColor: data.game.status === "draft" ? "var(--color-warning)" + "30" :
                          data.game.status === "active" ? "var(--color-success)" + "30" :
                          "var(--color-info)" + "30"
            }}>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                data.game.status === "draft" ? "bg-[var(--color-warning)]/20 text-[var(--color-warning)]" :
                data.game.status === "active" ? "bg-[var(--color-success)]/20 text-[var(--color-success)]" :
                "bg-[var(--color-info)]/20 text-[var(--color-info)]"
              }`}>
                {data.game.status === "draft" ? (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                ) : data.game.status === "active" ? (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                ) : (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-primary">
                  {data.game.status === "draft" ? "Draft" :
                   data.game.status === "active" ? "Active" : "Completed"}
                </p>
                <p className="text-sm text-secondary">
                  {data.game.status === "draft" ? "Game is being set up and not yet playable." :
                   data.game.status === "active" ? "Game is live! Teams can join and play." :
                   "Game has ended. Results are final."}
                </p>
              </div>
            </div>

            <p className="text-sm text-muted mb-3">Change the game status:</p>
            <div className="flex flex-wrap gap-3">
              {/* Draft button */}
              <Form method="post" className="inline">
                <input type="hidden" name="_action" value="setStatus" />
                <input type="hidden" name="status" value="draft" />
                <button
                  type="submit"
                  className={`inline-flex items-center gap-2 px-4 py-2 font-medium rounded-lg transition-colors disabled:opacity-50 ${
                    data.game.status === "draft"
                      ? "bg-[var(--color-warning)] text-white cursor-default"
                      : "bg-[var(--color-warning)]/15 text-[var(--color-warning)] border border-[var(--color-warning)]/30 hover:bg-[var(--color-warning)]/25"
                  }`}
                  disabled={isSubmitting || data.game.status === "draft"}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  Draft
                </button>
              </Form>

              {/* Active button */}
              <Form method="post" className="inline">
                <input type="hidden" name="_action" value={data.game.status === "draft" ? "activateGame" : "setStatus"} />
                <input type="hidden" name="status" value="active" />
                <button
                  type="submit"
                  className={`inline-flex items-center gap-2 px-4 py-2 font-medium rounded-lg transition-colors disabled:opacity-50 ${
                    data.game.status === "active"
                      ? "bg-[var(--color-success)] text-white cursor-default"
                      : "bg-[var(--color-success)]/15 text-[var(--color-success)] border border-[var(--color-success)]/30 hover:bg-[var(--color-success)]/25"
                  }`}
                  disabled={isSubmitting || data.game.status === "active" || (data.game.status === "draft" && !canActivate)}
                  title={data.game.status === "draft" && !canActivate ? "Complete setup requirements first" : undefined}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                  Active
                </button>
              </Form>

              {/* Completed button */}
              <Form method="post" className="inline">
                <input type="hidden" name="_action" value={data.game.status === "active" ? "completeGame" : "setStatus"} />
                <input type="hidden" name="status" value="completed" />
                <button
                  type="submit"
                  className={`inline-flex items-center gap-2 px-4 py-2 font-medium rounded-lg transition-colors disabled:opacity-50 ${
                    data.game.status === "completed"
                      ? "bg-[var(--color-info)] text-white cursor-default"
                      : "bg-[var(--color-info)]/15 text-[var(--color-info)] border border-[var(--color-info)]/30 hover:bg-[var(--color-info)]/25"
                  }`}
                  disabled={isSubmitting || data.game.status === "completed"}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  Completed
                </button>
              </Form>
            </div>

            {!canActivate && data.game.status === "draft" && (
              <p className="text-sm text-[var(--color-warning)] mt-3">
                Complete the setup checklist above before activating the game.
              </p>
            )}
          </div>

          {/* Random Mode Setting */}
          <div className="mt-4 bg-elevated rounded-xl border p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-primary mb-2">Clue Order Mode</h3>
            <p className="text-secondary text-sm mb-4">Control how teams receive their next clue after scanning a QR code.</p>

            <Form method="post" className="space-y-4">
              <input type="hidden" name="_action" value="updateRandomMode" />

              <div className="flex items-start gap-4 p-4 rounded-lg border border-border bg-secondary">
                <input
                  type="checkbox"
                  name="randomMode"
                  id="randomMode"
                  defaultChecked={data.game.settings.randomMode || false}
                  className="mt-1 rounded bg-secondary border-border"
                />
                <div>
                  <label htmlFor="randomMode" className="font-medium text-primary cursor-pointer">
                    Random Mode
                  </label>
                  <p className="text-sm text-muted mt-1">
                    When enabled, each team receives a random next clue from unvisited nodes instead of following predefined edges.
                    This creates a unique path for each team.
                  </p>
                </div>
              </div>

              <button type="submit" className={btnPrimary} disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Setting"}
              </button>
            </Form>
          </div>

          {/* Game Logo */}
          <div className="mt-4 bg-elevated rounded-xl border p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-primary mb-2">Game Logo</h3>
            <p className="text-secondary text-sm mb-4">Set a logo for your game. This will be used as the default logo for QR codes.</p>

            {data.game.logoUrl && (
              <img src={data.game.logoUrl} alt="Game Logo" className="max-w-[150px] max-h-[150px] rounded-lg border mb-4" />
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

          {/* Export / Import */}
          <div className="mt-4 bg-elevated rounded-xl border p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-primary mb-2">Export / Import</h3>
            <p className="text-secondary text-sm mb-4">Export your game data to a JSON file, or import from a previous export to overwrite settings, nodes, edges, and teams.</p>

            <div className="flex flex-wrap gap-3">
              <a
                href={`${data.baseUrl}/api/v1/admin/games/${data.game.id}/export`}
                className={`${btnSecondary} cursor-pointer`}
                download={`${data.game.publicSlug}-export.json`}
              >
                <svg className="w-4 h-4 mr-2 inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Export Game
              </a>
              <label className={`${btnSecondary} cursor-pointer`}>
                <svg className="w-4 h-4 mr-2 inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                Import & Overwrite
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      const text = await file.text();
                      const importData = JSON.parse(text);
                      if (!confirm(`This will overwrite all nodes, edges, and teams with data from "${importData.game?.name || 'unknown'}". Continue?`)) {
                        e.target.value = "";
                        return;
                      }
                      const response = await fetch(`${data.baseUrl}/api/v1/admin/games/import`, {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          "x-admin-code": data.adminCode,
                        },
                        body: JSON.stringify({ data: importData, overwrite: true }),
                      });
                      const result = await response.json();
                      if (response.ok) {
                        alert("Import successful! Page will refresh.");
                        window.location.reload();
                      } else {
                        alert(`Import failed: ${result.error}`);
                      }
                    } catch (err) {
                      alert(`Failed to read file: ${err instanceof Error ? err.message : "Unknown error"}`);
                    }
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="mt-4 bg-elevated rounded-xl border border-[var(--color-error)]/50 p-6 shadow-sm">
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
          onActivate={handleActivateNode}
        />
      )}

      {/* Node Preview Modal */}
      {previewNode && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
          <div className="rounded-xl max-w-md w-full shadow-xl animate-fade-in" style={{ backgroundColor: 'var(--bg-elevated)' }}>
            <div className="p-4 border-b border-border flex items-center justify-between" style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <div className="flex items-center gap-2">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--color-primary)]">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                <h3 className="text-lg font-semibold text-primary">Clue Preview</h3>
              </div>
              <button
                onClick={() => setPreviewNode(null)}
                className="text-muted hover:text-primary transition-colors p-1"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              {/* Player View Simulation */}
              <div className="mb-4">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <span className="text-sm text-[var(--color-success)] font-medium">+{previewNode.points} points</span>
                  {previewNode.isStart && <NodeBadge type="start" />}
                  {previewNode.isEnd && <NodeBadge type="end" />}
                </div>
                <ClueDisplay
                  node={previewNode}
                  headerText="Clue Content"
                />
              </div>

              {previewNode.passwordRequired && (
                <div className="bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/30 rounded-lg p-3 mb-4">
                  <p className="text-sm text-[var(--color-warning)] flex items-center gap-2">
                    <span>🔒</span>
                    Password required to unlock this clue
                  </p>
                </div>
              )}

              {/* Admin Note */}
              {previewNode.adminComment && (
                <div className="p-3 bg-[var(--color-info)]/10 border border-[var(--color-info)]/30 rounded-lg">
                  <p className="text-xs text-[var(--color-info)] font-medium mb-1">Admin Note:</p>
                  <p className="text-sm text-secondary italic">{previewNode.adminComment}</p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-border flex justify-end gap-2" style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <button onClick={() => setPreviewNode(null)} className={btnSecondary}>
                Close
              </button>
              <button onClick={() => { setEditingNode(previewNode); setPreviewNode(null); }} className={btnPrimary}>
                Edit Node
              </button>
            </div>
          </div>
        </div>
      )}

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
