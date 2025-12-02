import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, Link, useActionData, useLoaderData, useNavigation, useRevalidator } from "@remix-run/react";
import JSZip from "jszip";
import QRCode from "qrcode";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  type Edge,
  type Feedback,
  type Game,
  inputClasses,
  type Node,
  type Team,
} from "~/components/admin/game-editor";
import { NodeBadge } from "~/components/admin/game-editor/NodeBadge";
import { StatusBadge } from "~/components/admin/game-editor/StatusBadge";
import { Button } from "~/components/Button";
import { Chat } from "~/components/Chat";
import { ClueDisplay } from "~/components/ClueDisplay";
import { Camera, Check, CheckCircle, Circle, Clock, Close, Download, Edit, Eye, Loader, Play, Trash, Upload } from "~/components/icons";
import { QRCodeGenerator } from "~/components/QRCodeGenerator";
import { QRIdentifyScanner } from "~/components/QRIdentifyScanner";
import { ToastProvider, useToast } from "~/components/Toast";
import { useTranslation } from "~/i18n/I18nContext";
import { getApiUrl } from "~/lib/api";

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  return [{ title: data?.game?.name ? `${data.game.name} - QR Hunt Admin` : "Game - QR Hunt Admin" }];
};

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
            hint: formData.get("hint") || undefined,
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
            hint: formData.get("hint") || null,
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

      case "updateRankingMode": {
        const rankingMode = formData.get("rankingMode")?.toString();
        if (rankingMode && ["points", "nodes", "time"].includes(rankingMode)) {
          const response = await fetch(`${baseUrl}/api/v1/admin/games/${gameId}`, {
            method: "PATCH",
            headers,
            body: JSON.stringify({ settings: { rankingMode } }),
          });
          if (!response.ok) {
            const data = await response.json();
            return json({ error: data.error || "Failed to update ranking mode" });
          }
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

      case "openGame": {
        const response = await fetch(`${baseUrl}/api/v1/admin/games/${gameId}/open`, {
          method: "POST",
          headers: { "x-admin-code": adminCode },
        });
        if (!response.ok) {
          const data = await response.json();
          return json({ error: data.error || "Failed to open game" });
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
        if (!newStatus || !["draft", "pending", "active", "completed"].includes(newStatus)) {
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
  const { t } = useTranslation();
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
  const [formResetKey, setFormResetKey] = useState(0);
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
          toast.success(t("pages.admin.gameEditor.toasts.gameLogoUpdated"));
          break;
        case "setStatus":
          toast.success(t("pages.admin.gameEditor.toasts.gameStatusUpdated"));
          break;
        case "openGame":
          toast.success(t("pages.admin.gameEditor.toasts.gameOpened"));
          break;
        case "activateGame":
          toast.success(t("pages.admin.gameEditor.toasts.gameActivated"));
          break;
        case "completeGame":
          toast.success(t("pages.admin.gameEditor.toasts.gameCompleted"));
          break;
        case "createNode":
          toast.success(t("pages.admin.gameEditor.toasts.nodeCreated"));
          break;
        case "updateNode":
          toast.success(t("pages.admin.gameEditor.toasts.nodeUpdated"));
          break;
        case "createEdge":
          toast.success(t("pages.admin.gameEditor.toasts.edgeCreated"));
          break;
        case "updateEdge":
          toast.success(t("pages.admin.gameEditor.toasts.edgeUpdated"));
          break;
        case "createTeam":
          toast.success(t("pages.admin.gameEditor.toasts.teamCreated"));
          break;
        case "updateTeam":
          toast.success(t("pages.admin.gameEditor.toasts.teamUpdated"));
          break;
        case "updateRandomMode":
          toast.success(t("pages.admin.gameEditor.toasts.randomModeUpdated"));
          break;
        case "updateRankingMode":
          toast.success(t("pages.admin.gameEditor.toasts.rankingModeUpdated"));
          break;
        case "toggleActivated":
          toast.success(t("pages.admin.gameEditor.toasts.nodeActivationUpdated"));
          break;
      }
    }
  }, [actionData, toast, t]);

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
          toast.error(t("pages.admin.gameEditor.toasts.deleteFailed", { type }));
        }
      }, 20000);

      deleteTimersRef.current.set(`${type}-${id}`, timerId);

      const typeLabel = type === "node" ? t("pages.admin.gameEditor.tabs.nodes") : type === "edge" ? t("pages.admin.gameEditor.tabs.edges") : t("pages.admin.gameEditor.tabs.teams");
      toast.warning(t("pages.admin.gameEditor.toasts.deleteScheduled", { type: typeLabel, name }), 20000, {
        label: t("common.cancel"),
        onClick: () => {
          const timer = deleteTimersRef.current.get(`${type}-${id}`);
          if (timer) {
            clearTimeout(timer);
            deleteTimersRef.current.delete(`${type}-${id}`);
            toast.info(t("pages.admin.gameEditor.toasts.deleteCancelled", { type: typeLabel }));
          }
        },
      });
    },
    [toast, revalidator, adminCode, t]
  );

  const isSubmitting = navigation.state === "submitting";

  const copyTeamShareInfo = async (team: Team) => {
    const joinLink = `${data.baseUrl}/join?game=${data.game.publicSlug}&teamCode=${team.code}`;
    const shareText = `Join ${team.name} in ${data.game.name}!\n\nJoin Link: ${joinLink}\nTeam Code: ${team.code}`;

    try {
      await navigator.clipboard.writeText(shareText);
      toast.success(t("pages.admin.gameEditor.toasts.shareInfoCopied", { teamName: team.name }));
    } catch {
      toast.error(t("pages.admin.gameEditor.toasts.copyFailed"));
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
          {t("pages.admin.gameEditor.backToGames")}
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
            <StatusBadge status={data.game.status} t={t} />

            {data.game.status === "draft" && (
              <Form method="post" className="inline">
                <input type="hidden" name="_action" value="openGame" />
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isSubmitting || !canActivate}
                  title={!canActivate ? t("pages.admin.gameEditor.activationWarning.title") : ""}
                >
                  {t("pages.admin.gameEditor.openGame")}
                </Button>
              </Form>
            )}

            {data.game.status === "pending" && (
              <Form method="post" className="inline">
                <input type="hidden" name="_action" value="activateGame" />
                <Button type="submit" variant="primary" disabled={isSubmitting}>
                  {t("pages.admin.gameEditor.startGame")}
                </Button>
              </Form>
            )}

            {data.game.status === "active" && (
              <Form method="post" className="inline">
                <input type="hidden" name="_action" value="completeGame" />
                <Button type="submit" variant="primary" disabled={isSubmitting}>
                  {t("pages.admin.gameEditor.completeGame")}
                </Button>
              </Form>
            )}

            <Button as="link" to={`/leaderboard/${data.game.publicSlug}`} variant="secondary" target="_blank">
              {t("pages.admin.gameEditor.viewLeaderboard")}
            </Button>
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
          <strong>{t("pages.admin.gameEditor.activationWarning.title")}</strong>
          <ul className="mt-2 ml-5 list-disc">
            {!hasNodes && <li>{t("pages.admin.gameEditor.activationWarning.needsNodes")}</li>}
            {hasNodes && !hasStartNode && <li>{t("pages.admin.gameEditor.activationWarning.needsStartNode")}</li>}
            {hasNodes && !hasEndNode && <li>{t("pages.admin.gameEditor.activationWarning.needsEndNode")}</li>}
          </ul>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-border pb-3 flex-wrap">
        {(["nodes", "qrcodes", "edges", "teams", "feedback", "settings"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === tab
                ? "bg-[var(--color-primary)] text-white"
                : "text-muted hover:text-primary hover:bg-secondary"
            }`}
          >
            {t(`pages.admin.gameEditor.tabs.${tab}`)}
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
                  placeholder={t("pages.admin.gameEditor.filters.filterByTitle")}
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
                  <option value="all">{t("pages.admin.gameEditor.filters.allStatus")}</option>
                  <option value="activated">{t("pages.admin.gameEditor.filters.activated")}</option>
                  <option value="not-activated">{t("pages.admin.gameEditor.filters.notActivated")}</option>
                </select>
              </div>
              <div className="text-sm text-muted self-center">
                {filteredNodes.length} / {data.nodes.length} {t("pages.admin.gameEditor.tabs.nodes").toLowerCase()}
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
                          <Button variant="danger" size="small" onClick={() => handleDelete("node", node.id, node.title)}>{t("pages.admin.gameEditor.nodes.buttons.delete")}</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {data.nodes.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-muted">{t("pages.admin.gameEditor.nodes.noNodes")}</td></tr>
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
                <input type="text" name="title" className={inputClasses} required defaultValue={editingNode?.title || ""} key={editingNode?.id || `new-${formResetKey}`} />
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary mb-1">Content</label>
                <textarea name="content" className={inputClasses} rows={6} defaultValue={editingNode?.content || ""} key={`content-${editingNode?.id || `new-${formResetKey}`}`} />
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary mb-1">Content Type</label>
                <select name="contentType" className={inputClasses} defaultValue={editingNode?.contentType || "text"} key={`type-${editingNode?.id || `new-${formResetKey}`}`}>
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
                <input type="url" name="mediaUrl" className={inputClasses} defaultValue={editingNode?.mediaUrl || ""} key={`media-${editingNode?.id || `new-${formResetKey}`}`} />
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary mb-1">Points</label>
                <input type="number" name="points" className={inputClasses} defaultValue={editingNode?.points || 100} key={`points-${editingNode?.id || `new-${formResetKey}`}`} />
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary mb-1">
                  Hint
                  <span className="ml-2 text-xs text-muted font-normal">(optional, costs half points)</span>
                </label>
                <textarea name="hint" className={inputClasses} rows={2} placeholder="A hint players can request for half the points..." defaultValue={editingNode?.hint || ""} key={`hint-${editingNode?.id || `new-${formResetKey}`}`} />
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary mb-1">
                  Admin Comment
                  <span className="ml-2 text-xs text-muted font-normal">(only visible to admins)</span>
                </label>
                <textarea name="adminComment" className={inputClasses} rows={2} placeholder="Internal notes about this node..." defaultValue={editingNode?.adminComment || ""} key={`comment-${editingNode?.id || `new-${formResetKey}`}`} />
              </div>

              <div className="flex items-center gap-2">
                <input type="checkbox" name="passwordRequired" id="pwReq" defaultChecked={editingNode?.passwordRequired || false} key={`pwreq-${editingNode?.id || `new-${formResetKey}`}`} className="rounded bg-secondary border-border" />
                <label htmlFor="pwReq" className="text-sm text-secondary">Password Required</label>
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary mb-1">Password</label>
                <input type="text" name="password" className={inputClasses} placeholder={editingNode ? "(leave empty to keep current)" : ""} key={`password-${editingNode?.id || `new-${formResetKey}`}`} />
              </div>

              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm text-secondary">
                  <input type="checkbox" name="isStart" defaultChecked={editingNode?.isStart || false} key={`start-${editingNode?.id || `new-${formResetKey}`}`} className="rounded bg-secondary border-border" />
                  Start Node
                </label>
                <label className="flex items-center gap-2 text-sm text-secondary">
                  <input type="checkbox" name="isEnd" defaultChecked={editingNode?.isEnd || false} key={`end-${editingNode?.id || `new-${formResetKey}`}`} className="rounded bg-secondary border-border" />
                  End Node
                </label>
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="submit" variant="primary" disabled={isSubmitting}>{editingNode ? "Update Node" : "Add Node"}</Button>
                <Button variant="secondary" onClick={() => { setEditingNode(null); setFormResetKey(k => k + 1); }}>{editingNode ? "Cancel" : "Clear"}</Button>
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
                          <Button variant="secondary" size="small" onClick={() => setEditingEdge(edge)}>Edit</Button>
                          <Button variant="danger" size="small" onClick={() => handleDelete("edge", edge.id, `${fromNode?.title} → ${toNode?.title}`)}>Delete</Button>
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
                <Button type="submit" variant="primary" disabled={isSubmitting}>{editingEdge ? "Update Edge" : "Add Edge"}</Button>
                <Button variant="secondary" onClick={() => setEditingEdge(null)}>{editingEdge ? "Cancel" : "Clear"}</Button>
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
              <Button
                variant="primary"
                onClick={downloadAllQRCodes}
                disabled={downloadingQRCodes || data.qrCodes.length === 0}
                leftIcon={downloadingQRCodes ? <Loader size={16} /> : <Download size={16} />}
              >
                {downloadingQRCodes ? `${downloadProgress.current}/${downloadProgress.total}` : "Download All (ZIP)"}
              </Button>
              <Button
                variant="secondary"
                onClick={() => setShowQRIdentifyScanner(true)}
                leftIcon={<Camera size={16} />}
              >
                Scan to Identify / Activate
              </Button>
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
                  <th className="min-w-[200px] text-left px-4 py-3 text-xs font-medium text-muted uppercase">URL</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-muted uppercase">Activated</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredQRCodes.map((qr) => (
                  <tr key={qr.nodeId} className="hover:bg-secondary">
                    <td className="px-4 py-3 text-primary">
                      {qr.title}
                      {qr.isStart && <NodeBadge type="start" t={t} />}
                      {qr.isEnd && <NodeBadge type="end" t={t} />}
                    </td>
                    <td className="min-w-[200px] px-4 py-3">
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
                            <Check size={16} />
                          ) : (
                            <Circle size={16} />
                          )}
                        </button>
                      </Form>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 justify-end">
                        <Button variant="primary" onClick={() => setSelectedQR({ url: qr.url, title: qr.title })}>Generate QR</Button>
                        <Button variant="secondary" className="hidden sm:flex" onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(qr.url);
                            toast.success("URL copied to clipboard!");
                          } catch {
                            toast.error("Failed to copy URL");
                          }
                        }}>Copy URL</Button>
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
                            <Button variant="secondary" size="small" onClick={() => copyTeamShareInfo(team)}>Share</Button>
                            <Button variant="secondary" size="small" onClick={() => setEditingTeam(team)}>Edit</Button>
                            <Button variant="danger" size="small" onClick={() => handleDelete("team", team.id, team.name)}>Delete</Button>
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
                <Button type="submit" variant="primary" disabled={isSubmitting}>{editingTeam ? "Update Team" : "Add Team"}</Button>
                {editingTeam && <Button variant="secondary" onClick={() => { setEditingTeam(null); setTeamLogoUrl(""); }}>Cancel</Button>}
              </div>
            </Form>
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
                    <Button
                      variant="danger"
                      size="small"
                      onClick={() => handleDeleteFeedback(fb.id, fb.teamName)}
                      title="Delete feedback"
                    >
                      Delete
                    </Button>
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
                             data.game.status === "pending" ? "var(--color-primary)" + "10" :
                             data.game.status === "active" ? "var(--color-success)" + "10" :
                             "var(--color-info)" + "10",
              borderColor: data.game.status === "draft" ? "var(--color-warning)" + "30" :
                          data.game.status === "pending" ? "var(--color-primary)" + "30" :
                          data.game.status === "active" ? "var(--color-success)" + "30" :
                          "var(--color-info)" + "30"
            }}>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                data.game.status === "draft" ? "bg-[var(--color-warning)]/20 text-[var(--color-warning)]" :
                data.game.status === "pending" ? "bg-[var(--color-primary)]/20 text-[var(--color-primary)]" :
                data.game.status === "active" ? "bg-[var(--color-success)]/20 text-[var(--color-success)]" :
                "bg-[var(--color-info)]/20 text-[var(--color-info)]"
              }`}>
                {data.game.status === "draft" ? (
                  <Edit size={24} />
                ) : data.game.status === "pending" ? (
                  <Clock size={24} />
                ) : data.game.status === "active" ? (
                  <Play size={24} />
                ) : (
                  <CheckCircle size={24} />
                )}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-primary">
                  {data.game.status === "draft" ? "Draft" :
                   data.game.status === "pending" ? "Pending" :
                   data.game.status === "active" ? "Active" : "Completed"}
                </p>
                <p className="text-sm text-secondary">
                  {data.game.status === "draft" ? "Game is being set up and not yet playable." :
                   data.game.status === "pending" ? "Teams can join and wait in the waiting room." :
                   data.game.status === "active" ? "Game is live! Teams can play." :
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
                  <Edit size={18} />
                  Draft
                </button>
              </Form>

              {/* Pending button */}
              <Form method="post" className="inline">
                <input type="hidden" name="_action" value={data.game.status === "draft" ? "openGame" : "setStatus"} />
                <input type="hidden" name="status" value="pending" />
                <button
                  type="submit"
                  className={`inline-flex items-center gap-2 px-4 py-2 font-medium rounded-lg transition-colors disabled:opacity-50 ${
                    data.game.status === "pending"
                      ? "bg-[var(--color-primary)] text-white cursor-default"
                      : "bg-[var(--color-primary)]/15 text-[var(--color-primary)] border border-[var(--color-primary)]/30 hover:bg-[var(--color-primary)]/25"
                  }`}
                  disabled={isSubmitting || data.game.status === "pending" || (data.game.status === "draft" && !canActivate)}
                  title={data.game.status === "draft" && !canActivate ? "Complete setup requirements first" : undefined}
                >
                  <Clock size={18} />
                  Pending
                </button>
              </Form>

              {/* Active button */}
              <Form method="post" className="inline">
                <input type="hidden" name="_action" value={(data.game.status === "draft" || data.game.status === "pending") ? "activateGame" : "setStatus"} />
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
                  <Play size={18} />
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
                  <CheckCircle size={18} />
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

          {/* Ranking Mode Setting */}
          <div className="mt-4 bg-elevated rounded-xl border p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-primary mb-2">{t("pages.admin.newGame.form.rankingMode")}</h3>
            <p className="text-secondary text-sm mb-4">{t("pages.admin.gameEditor.settings.rankingModeDescription")}</p>

            <Form method="post" className="space-y-4">
              <input type="hidden" name="_action" value="updateRankingMode" />

              <div className="space-y-2">
                {(["points", "nodes", "time"] as const).map((mode) => (
                  <label
                    key={mode}
                    className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all ${
                      data.game.settings.rankingMode === mode
                        ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5"
                        : "border-border bg-secondary hover:border-[var(--color-primary)]/50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="rankingMode"
                      value={mode}
                      defaultChecked={data.game.settings.rankingMode === mode}
                      className="text-[var(--color-primary)]"
                    />
                    <div>
                      <span className="font-medium text-primary">{t(`pages.admin.newGame.form.rankingModes.${mode}`)}</span>
                    </div>
                  </label>
                ))}
              </div>

              <Button type="submit" variant="primary" disabled={isSubmitting}>
                {isSubmitting ? t("common.saving") : t("common.save")}
              </Button>
            </Form>
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

              <Button type="submit" variant="primary" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Setting"}
              </Button>
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
              <Button type="submit" variant="primary" disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Save Logo"}</Button>
            </Form>
          </div>

          {/* Export / Import */}
          <div className="mt-4 bg-elevated rounded-xl border p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-primary mb-2">Export / Import</h3>
            <p className="text-secondary text-sm mb-4">Export your game data to a JSON file, or import from a previous export to overwrite settings, nodes, edges, and teams.</p>

            <div className="flex flex-wrap gap-3">
              <Button
                as="a"
                href={`${data.baseUrl}/api/v1/admin/games/${data.game.id}/export`}
                variant="secondary"
                download={`${data.game.publicSlug}-export.json`}
                leftIcon={<Download size={16} />}
              >
                Export Game
              </Button>
              <label className="btn btn-secondary cursor-pointer">
                <Upload size={16} className="mr-2 inline-block" />
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
            <Button
              variant="danger"
              onClick={() => setShowDeleteModal(true)}
              disabled={isSubmitting}
            >
              Delete Game
            </Button>
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
                <Eye size={20} className="text-[var(--color-primary)]" />
                <h3 className="text-lg font-semibold text-primary">Clue Preview</h3>
              </div>
              <button
                onClick={() => setPreviewNode(null)}
                className="text-muted hover:text-primary transition-colors p-1"
              >
                <Close size={20} />
              </button>
            </div>

            <div className="p-6">
              {/* Player View Simulation */}
              <div className="mb-4">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <span className="text-sm text-[var(--color-success)] font-medium">{t("pages.admin.gameEditor.preview.points", { points: previewNode.points })}</span>
                  {previewNode.isStart && <NodeBadge type="start" t={t} />}
                  {previewNode.isEnd && <NodeBadge type="end" t={t} />}
                </div>
                <ClueDisplay
                  node={previewNode}
                  headerText={t("pages.admin.gameEditor.preview.clueContent")}
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

              {previewNode.hint && (
                <div className="bg-[var(--color-info)]/10 border border-[var(--color-info)]/30 rounded-lg p-3 mb-4">
                  <p className="text-xs text-[var(--color-info)] font-medium mb-1">Hint Available (costs {Math.floor(previewNode.points / 2)} pts):</p>
                  <p className="text-sm text-secondary">{previewNode.hint}</p>
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
              <Button variant="secondary" onClick={() => setPreviewNode(null)}>
                Close
              </Button>
              <Button variant="primary" onClick={() => { setEditingNode(previewNode); setPreviewNode(null); }}>
                Edit Node
              </Button>
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
                  <Trash size={20} stroke="var(--color-error)" />
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
              <Button
                variant="secondary"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText("");
                }}
              >
                Cancel
              </Button>
              <Form method="post" className="inline">
                <input type="hidden" name="_action" value="deleteGame" />
                <Button
                  type="submit"
                  variant="danger"
                  disabled={deleteConfirmText !== data.game.name || isSubmitting}
                >
                  {isSubmitting ? "Deleting..." : "Delete Forever"}
                </Button>
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
