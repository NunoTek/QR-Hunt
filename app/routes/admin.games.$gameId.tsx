import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useActionData, useLoaderData, useNavigation, useRevalidator } from "@remix-run/react";
import JSZip from "jszip";
import QRCode from "qrcode";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AnalyticsTab,
  DeleteGameModal,
  type Edge,
  EdgesTab,
  type Feedback,
  FeedbackTab,
  type Game,
  GameHeader,
  type Node,
  type NodeFilter,
  NodePreviewModal,
  NodesTab,
  type QRCode as QRCodeType,
  type QRFilter,
  QRCodesTab,
  SettingsTab,
  TeamsTab,
  type TabType,
  type Team,
  type AnalyticsData,
} from "~/components/admin/game-editor";
import { Chat } from "~/components/Chat";
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
  qrCodes: QRCodeType[];
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

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType | "analytics">("nodes");

  // Modal states
  const [selectedQR, setSelectedQR] = useState<{ url: string; title: string } | null>(null);
  const [showQRIdentifyScanner, setShowQRIdentifyScanner] = useState(false);
  const [previewNode, setPreviewNode] = useState<Node | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // Edit states
  const [editingNode, setEditingNode] = useState<Node | null>(null);
  const [editingEdge, setEditingEdge] = useState<Edge | null>(null);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [teamLogoUrl, setTeamLogoUrl] = useState<string>("");

  // Filter states
  const [nodeFilter, setNodeFilter] = useState<NodeFilter>({ title: "", activated: "all" });
  const [qrFilter, setQrFilter] = useState<QRFilter>({ title: "", activated: "all" });

  // Feedback state
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([]);
  const [feedbackStats, setFeedbackStats] = useState<{ averageRating: number | null; count: number }>({ averageRating: null, count: 0 });
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  // Analytics state
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Download state
  const [downloadingQRCodes, setDownloadingQRCodes] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState({ current: 0, total: 0 });

  // Refs
  const deleteTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const lastActionDataRef = useRef<typeof actionData | null>(null);
  const feedbackLoadedRef = useRef(false);
  const analyticsLoadedRef = useRef(false);

  const isSubmitting = navigation.state === "submitting";

  // Computed values
  const hasNodes = data.nodes.length > 0;
  const hasStartNode = data.nodes.some(n => n.isStart);
  const hasEndNode = data.nodes.some(n => n.isEnd);
  const canActivate = hasNodes && hasStartNode && hasEndNode;

  // Filtered data
  const filteredNodes = data.nodes.filter((node) => {
    const matchesTitle = node.title.toLowerCase().includes(nodeFilter.title.toLowerCase());
    const matchesActivated = nodeFilter.activated === "all" ||
      (nodeFilter.activated === "activated" && node.activated) ||
      (nodeFilter.activated === "not-activated" && !node.activated);
    return matchesTitle && matchesActivated;
  });

  const filteredQRCodes = data.qrCodes.filter((qr) => {
    const matchesTitle = qr.title.toLowerCase().includes(qrFilter.title.toLowerCase());
    const matchesActivated = qrFilter.activated === "all" ||
      (qrFilter.activated === "activated" && qr.activated) ||
      (qrFilter.activated === "not-activated" && !qr.activated);
    return matchesTitle && matchesActivated;
  });

  // QR Code generation
  const generateQRCodePNG = useCallback(async (url: string, logoUrl?: string | null): Promise<string> => {
    const size = 512;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to get canvas context");

    await QRCode.toCanvas(canvas, url, {
      width: size,
      margin: 2,
      color: { dark: "#000000", light: "#ffffff" },
      errorCorrectionLevel: "H",
    });

    if (logoUrl) {
      await new Promise<void>((resolve, reject) => {
        const logo = new Image();
        logo.crossOrigin = "anonymous";
        logo.onload = () => {
          const logoSize = size * 0.2;
          const logoX = (size - logoSize) / 2;
          const logoY = (size - logoSize) / 2;
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(logoX - 4, logoY - 4, logoSize + 8, logoSize + 8);
          ctx.drawImage(logo, logoX, logoY, logoSize, logoSize);
          resolve();
        };
        logo.onerror = () => reject(new Error("Failed to load logo"));
        logo.src = logoUrl;
      });
    }

    return canvas.toDataURL("image/png");
  }, []);

  // Handlers
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
          const base64Data = pngDataUrl.split(",")[1];
          const fileName = `qr-${qr.title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}.png`;
          zip.file(fileName, base64Data, { base64: true });
        } catch (err) {
          console.error(`Failed to generate QR for ${qr.title}:`, err);
        }
      }

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

  const handleCopyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("URL copied to clipboard!");
    } catch {
      toast.error("Failed to copy URL");
    }
  };

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

  // Effects
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

  useEffect(() => {
    if (activeTab === "analytics" && !analyticsLoadedRef.current) {
      analyticsLoadedRef.current = true;
      setAnalyticsLoading(true);
      fetch(`/api/v1/admin/games/${data.game.id}/analytics`, {
        headers: { "x-admin-code": adminCode },
      })
        .then((res) => res.json())
        .then((result) => {
          setAnalyticsData(result.analytics || null);
        })
        .catch(() => {
          toast.error("Failed to load analytics");
        })
        .finally(() => {
          setAnalyticsLoading(false);
        });
    }
  }, [activeTab, data.game.id, adminCode, toast]);

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

  return (
    <div>
      {/* Header */}
      <GameHeader
        game={data.game}
        canActivate={canActivate}
        isSubmitting={isSubmitting}
        t={t}
      />

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
        {(["nodes", "qrcodes", "edges", "teams", "feedback", "analytics", "settings"] as const).map((tab) => (
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
            {tab !== "settings" && tab !== "feedback" && tab !== "analytics" && (
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

      {/* Tab Content */}
      {activeTab === "nodes" && (
        <NodesTab
          nodes={data.nodes}
          filteredNodes={filteredNodes}
          nodeFilter={nodeFilter}
          setNodeFilter={setNodeFilter}
          editingNode={editingNode}
          setEditingNode={setEditingNode}
          previewNode={previewNode}
          setPreviewNode={setPreviewNode}
          isSubmitting={isSubmitting}
          onDelete={handleDelete}
          t={t}
        />
      )}

      {activeTab === "edges" && (
        <EdgesTab
          edges={data.edges}
          nodes={data.nodes}
          game={data.game}
          editingEdge={editingEdge}
          setEditingEdge={setEditingEdge}
          isSubmitting={isSubmitting}
          onDelete={handleDelete}
          t={t}
        />
      )}

      {activeTab === "qrcodes" && (
        <QRCodesTab
          qrCodes={data.qrCodes}
          filteredQRCodes={filteredQRCodes}
          qrFilter={qrFilter}
          setQRFilter={setQrFilter}
          onSelectQR={setSelectedQR}
          onCopyUrl={handleCopyUrl}
          onDownloadAll={downloadAllQRCodes}
          onOpenScanner={() => setShowQRIdentifyScanner(true)}
          downloadingQRCodes={downloadingQRCodes}
          downloadProgress={downloadProgress}
          t={t}
        />
      )}

      {activeTab === "teams" && (
        <TeamsTab
          teams={data.teams}
          nodes={data.nodes}
          editingTeam={editingTeam}
          setEditingTeam={setEditingTeam}
          teamLogoUrl={teamLogoUrl}
          setTeamLogoUrl={setTeamLogoUrl}
          isSubmitting={isSubmitting}
          onDelete={handleDelete}
          onCopyShareInfo={copyTeamShareInfo}
          t={t}
        />
      )}

      {activeTab === "feedback" && (
        <FeedbackTab
          feedbackList={feedbackList}
          feedbackStats={feedbackStats}
          feedbackLoading={feedbackLoading}
          onDeleteFeedback={handleDeleteFeedback}
          t={t}
        />
      )}

      {activeTab === "analytics" && (
        <AnalyticsTab
          analyticsData={analyticsData}
          analyticsLoading={analyticsLoading}
          t={t}
        />
      )}

      {activeTab === "settings" && (
        <SettingsTab
          game={data.game}
          canActivate={canActivate}
          isSubmitting={isSubmitting}
          baseUrl={data.baseUrl}
          adminCode={adminCode}
          onShowDeleteModal={() => setShowDeleteModal(true)}
          t={t}
        />
      )}

      {/* Modals */}
      {selectedQR && (
        <QRCodeGenerator
          url={selectedQR.url}
          title={selectedQR.title}
          logoUrl={data.game.logoUrl || ""}
          onClose={() => setSelectedQR(null)}
        />
      )}

      {showQRIdentifyScanner && (
        <QRIdentifyScanner
          nodes={data.qrCodes}
          onClose={() => setShowQRIdentifyScanner(false)}
          onActivate={handleActivateNode}
        />
      )}

      <NodePreviewModal
        node={previewNode}
        onClose={() => setPreviewNode(null)}
        onEdit={setEditingNode}
        t={t}
      />

      <DeleteGameModal
        game={data.game}
        nodes={data.nodes}
        edges={data.edges}
        teams={data.teams}
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        deleteConfirmText={deleteConfirmText}
        setDeleteConfirmText={setDeleteConfirmText}
        isSubmitting={isSubmitting}
        t={t}
      />

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
