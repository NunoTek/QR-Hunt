import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, useLoaderData, useNavigate, useSearchParams } from "@remix-run/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Chat } from "~/components/Chat";
import { ClueDisplay } from "~/components/ClueDisplay";
import { GameCountdown } from "~/components/GameCountdown";
import {
  Activity,
  Camera,
  Check,
  CheckCircle,
  Copy,
  HelpCircle,
  Link2,
  List,
  LoaderCircle,
  LogOut,
  MapPin,
  MessageSquare,
  Play, RefreshCw,
  Share2,
  Star,
  Users,
  WifiOff
} from "~/components/icons";
import { Spinner } from "~/components/Loading";
import {
  DefeatScreen,
  FeedbackModal,
  HintConfirmModal,
  type HintInfo,
  VictoryScreen,
} from "~/components/play";
import { QRScanner } from "~/components/QRScanner";
import { RevealAnimation } from "~/components/RevealAnimation";
import { ToastProvider, useToast } from "~/components/Toast";
import { Version } from "~/components/Version";
import { WaitingRoom } from "~/components/WaitingRoom";
import { POLLING } from "~/config/constants";
import { useOfflineMode } from "~/hooks/useOfflineMode";
import { useTranslation } from "~/i18n/I18nContext";
import { playCoinSound, playDefeatSound, playSuccessSound, playVictorySound } from "~/lib/sounds";
import { cacheGameData, clearAuth, getCachedGameData, getToken } from "~/lib/tokenStorage";

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  return [
    { title: data?.gameName ? `${data.gameName} - QR Hunt` : "QR Hunt" },
  ];
};

// Minimal loader - just get gameSlug and base URL (no auth needed)
export async function loader({ request, params }: LoaderFunctionArgs) {
  const { gameSlug } = params;
  const url = new URL(request.url);
  const pendingScan = url.searchParams.get("scan") || undefined;
  const baseUrl = `${url.protocol}//${url.host}`;

  return json({
    gameSlug: gameSlug!,
    baseUrl,
    pendingScan,
    gameName: null as string | null,
  });
}

interface GameData {
  teamId: string;
  teamName: string;
  teamCode: string;
  teamLogoUrl: string | null;
  gameName: string;
  gameLogoUrl: string | null;
  currentNode: {
    id: string;
    title: string;
    content: string | null;
    contentType: string;
    mediaUrl: string | null;
    isEnd: boolean;
  } | null;
  nextClue: {
    id: string;
    title: string;
    content: string | null;
    contentType: string;
    mediaUrl: string | null;
  } | null;
  nextClueHint: HintInfo | null;
  startingClue: {
    id: string;
    title: string;
    content: string | null;
    contentType: string;
    mediaUrl: string | null;
  } | null;
  startingClueHint: HintInfo | null;
  scannedNodes: Array<{
    id: string;
    title: string;
    content: string | null;
    contentType: string;
    mediaUrl: string | null;
    points: number;
    timestamp: string;
    isEnd: boolean;
  }>;
  nodesFound: number;
  totalNodes: number;
  totalPoints: number;
  hintPointsDeducted: number;
  isFinished: boolean;
  isWinner: boolean;
  isRandomMode: boolean;
}

export default function PlayGame() {
  return (
    <ToastProvider>
      <PlayGameContent />
      <Version />
    </ToastProvider>
  );
}

function PlayGameContent() {
  const loaderData = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useTranslation();

  // Auth and data state
  const [isLoading, setIsLoading] = useState(true);
  const [token, setTokenState] = useState<string | null>(null);
  const [data, setData] = useState<GameData | null>(null);

  // Game phase state: waiting (draft), countdown, playing (active)
  const [gamePhase, setGamePhase] = useState<"loading" | "waiting" | "countdown" | "playing">("loading");
  const [isRevealed, setIsRevealed] = useState(false);

  // UI state
  const [autoScanResult, setAutoScanResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isAutoScanning, setIsAutoScanning] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [existingFeedback, setExistingFeedback] = useState<{ rating: number; comment: string | null } | null>(null);
  const [activeTab, setActiveTab] = useState<"clue" | "scan" | "progress" | "team" | "chat">("clue");
  const [isShuffling, setIsShuffling] = useState(false);
  const [currentClue, setCurrentClue] = useState<GameData["nextClue"] | null>(null);
  const [currentHint, setCurrentHint] = useState<HintInfo | null>(null);
  const [showHintConfirm, setShowHintConfirm] = useState(false);
  const [isRequestingHint, setIsRequestingHint] = useState(false);

  const toast = useToast();
  const soundPlayedRef = useRef(false);
  const feedbackLoadedRef = useRef(false);
  const dataLoadedRef = useRef(false);

  // Offline mode support
  const { isOffline, pendingCount, isSyncing, cacheCurrentState: _cacheCurrentState } = useOfflineMode({
    gameSlug: loaderData.gameSlug,
    onSyncComplete: () => {
      toast.success("Synced pending scans!");
      window.location.reload();
    },
  });

  // Load auth and data on mount (client-side only)
  useEffect(() => {
    if (dataLoadedRef.current) return;
    dataLoadedRef.current = true;

    const storedToken = getToken();
    if (!storedToken) {
      // No token - redirect to join
      const pendingScan = loaderData.pendingScan;
      navigate(`/join?game=${loaderData.gameSlug}${pendingScan ? `&scan=${pendingScan}` : ""}`, { replace: true });
      return;
    }

    setTokenState(storedToken);

    // Fetch all data with Authorization header
    const fetchData = async () => {
      try {
        const headers = { Authorization: `Bearer ${storedToken}` };

        // Parallel fetch: me, game, progress
        const [meRes, gameRes, progressRes] = await Promise.all([
          fetch("/api/v1/auth/me", { headers }),
          fetch(`/api/v1/game/${loaderData.gameSlug}`),
          fetch("/api/v1/scan/progress", { headers }),
        ]);

        if (!meRes.ok) {
          // Invalid token - clear and redirect
          clearAuth();
          navigate(`/join?game=${loaderData.gameSlug}`, { replace: true });
          return;
        }

        const [meData, gameData, progressData] = await Promise.all([
          meRes.json(),
          gameRes.ok ? gameRes.json() : null,
          progressRes.ok ? progressRes.json() : {
            currentNode: null,
            nextClue: null,
            startingClue: null,
            scannedNodes: [],
            nodesFound: 0,
            totalNodes: 0,
            totalPoints: 0,
            isFinished: false,
            isWinner: false,
            isRandomMode: false,
          },
        ]);

        if (!gameData) {
          toast.error("Game not found");
          navigate("/", { replace: true });
          return;
        }

        const gameDataObj: GameData = {
          teamId: meData.team.id,
          teamName: meData.team.name,
          teamCode: meData.team.code,
          teamLogoUrl: meData.team.logoUrl || null,
          gameName: gameData.name,
          gameLogoUrl: gameData.logoUrl || null,
          currentNode: progressData.currentNode,
          nextClue: progressData.nextClue || null,
          nextClueHint: progressData.nextClueHint || null,
          startingClue: progressData.startingClue || null,
          startingClueHint: progressData.startingClueHint || null,
          scannedNodes: progressData.scannedNodes || [],
          nodesFound: progressData.nodesFound,
          totalNodes: progressData.totalNodes,
          totalPoints: progressData.totalPoints,
          hintPointsDeducted: progressData.hintPointsDeducted || 0,
          isFinished: progressData.isFinished,
          isWinner: progressData.isWinner,
          isRandomMode: progressData.isRandomMode || false,
        };

        setData(gameDataObj);
        setCurrentClue(progressData.nextClue || null);
        // Set hint info based on whether we have a next clue or starting clue
        if (progressData.nextClue && progressData.nextClueHint) {
          setCurrentHint(progressData.nextClueHint);
        } else if (progressData.startingClue && progressData.startingClueHint) {
          setCurrentHint(progressData.startingClueHint);
        }
        setIsLoading(false);

        // Set game phase based on status
        if (gameData.status === "draft") {
          setGamePhase("waiting");
        } else {
          setGamePhase("playing");
          setIsRevealed(true);
        }

        // Cache data for offline mode
        cacheGameData({
          gameSlug: loaderData.gameSlug,
          teamName: gameDataObj.teamName,
          progress: {
            nodesFound: gameDataObj.nodesFound,
            totalPoints: gameDataObj.totalPoints,
            isFinished: gameDataObj.isFinished,
            nextClue: gameDataObj.nextClue ? {
              title: gameDataObj.nextClue.title,
              content: gameDataObj.nextClue.content,
              contentType: gameDataObj.nextClue.contentType,
              mediaUrl: gameDataObj.nextClue.mediaUrl,
            } : null,
          },
          gameName: gameDataObj.gameName,
        });
      } catch {
        // Check for cached data when offline
        const cached = getCachedGameData();
        if (cached && cached.gameSlug === loaderData.gameSlug) {
          toast.info("You're offline. Showing cached data.");
          setIsLoading(false);
          return;
        }
        toast.error("Failed to load game data");
        clearAuth();
        navigate(`/join?game=${loaderData.gameSlug}`, { replace: true });
      }
    };

    fetchData();
  }, [loaderData.gameSlug, loaderData.pendingScan, navigate, toast]);

  // Update currentClue when data changes
  useEffect(() => {
    if (data?.nextClue) {
      setCurrentClue(data.nextClue);
    }
  }, [data?.nextClue]);

  // Send heartbeat when in waiting room
  useEffect(() => {
    if (gamePhase !== "waiting" || !data) return;

    const sendHeartbeat = async () => {
      try {
        await fetch(`/api/v1/game/${loaderData.gameSlug}/heartbeat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            teamId: data.teamId,
            teamName: data.teamName,
          }),
        });
      } catch {
        // Silently fail - heartbeat is best-effort
      }
    };

    // Send initial heartbeat
    sendHeartbeat();

    // Send heartbeat at regular interval
    const interval = setInterval(sendHeartbeat, POLLING.HEARTBEAT_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [gamePhase, data, loaderData.gameSlug]);

  // Shuffle to get a new random clue
  const shuffleClue = useCallback(async () => {
    if (!data?.isRandomMode || isShuffling || !token) return;

    setIsShuffling(true);
    try {
      const response = await fetch("/api/v1/scan/shuffle-clue", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      const result = await response.json();
      if (result.success && result.newClue) {
        setCurrentClue(result.newClue);
        // Update hint info for the new clue
        if (result.newClueHint) {
          setCurrentHint(result.newClueHint);
        } else {
          setCurrentHint(null);
        }
        toast.success("Got a new clue!");
      } else {
        toast.error(result.message || "Failed to get new clue");
      }
    } catch {
      toast.error("Failed to get new clue");
    } finally {
      setIsShuffling(false);
    }
  }, [data?.isRandomMode, isShuffling, token, toast]);

  // Request a hint for the current clue
  const requestHint = useCallback(async (nodeId: string) => {
    if (isRequestingHint || !token) return;

    setIsRequestingHint(true);
    try {
      const response = await fetch("/api/v1/scan/hint", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ nodeId }),
      });

      const result = await response.json();
      if (result.success) {
        setCurrentHint({
          hasHint: true,
          hintUsed: true,
          hintText: result.hint,
          pointsDeducted: result.pointsDeducted,
          pointsCost: result.pointsDeducted,
        });
        setShowHintConfirm(false);
        if (!result.alreadyUsed) {
          toast.info(`Hint revealed! -${result.pointsDeducted} points`);
          // Update total points in data
          if (data) {
            setData({
              ...data,
              totalPoints: data.totalPoints - result.pointsDeducted,
              hintPointsDeducted: data.hintPointsDeducted + result.pointsDeducted,
            });
          }
        }
      } else {
        toast.error(result.message || "Failed to get hint");
        setShowHintConfirm(false);
      }
    } catch {
      toast.error("Failed to get hint");
      setShowHintConfirm(false);
    } finally {
      setIsRequestingHint(false);
    }
  }, [isRequestingHint, token, toast, data]);

  // Generate share link
  const shareLink = data ? `${loaderData.baseUrl}/join?game=${loaderData.gameSlug}&teamCode=${data.teamCode}` : "";

  const copyToClipboard = useCallback(async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  }, [toast]);

  const shareWithNavigator = useCallback(async () => {
    if (!data) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${data.teamName} in ${data.gameName}!`,
          text: `Join our team in ${data.gameName}!\n\nGame ID: ${loaderData.gameSlug}\nTeam Code: ${data.teamCode}`,
          url: shareLink,
        });
      } catch {
        // User cancelled or share failed - ignore
      }
    } else {
      copyToClipboard(shareLink, "link");
    }
  }, [data, loaderData.gameSlug, shareLink, copyToClipboard]);

  // Load existing feedback on mount
  useEffect(() => {
    if (!feedbackLoadedRef.current && token) {
      feedbackLoadedRef.current = true;
      fetch("/api/v1/feedback", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((result) => {
          if (result.feedback) {
            setExistingFeedback(result.feedback);
            setFeedbackRating(result.feedback.rating);
            setFeedbackComment(result.feedback.comment || "");
            setFeedbackSubmitted(true);
          }
        })
        .catch(() => {
          // Ignore errors loading feedback
        });
    }
  }, [token]);

  // Submit feedback
  const submitFeedback = useCallback(async () => {
    if (feedbackRating === 0 || !token) {
      toast.error("Please select a rating");
      return;
    }

    setIsSubmittingFeedback(true);
    try {
      const response = await fetch("/api/v1/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          rating: feedbackRating,
          comment: feedbackComment || undefined,
        }),
      });

      const result = await response.json();
      if (result.success) {
        setFeedbackSubmitted(true);
        setExistingFeedback({ rating: feedbackRating, comment: feedbackComment || null });
        toast.success(existingFeedback ? "Feedback updated!" : "Thank you for your feedback!");
        setShowFeedback(false);
      } else {
        toast.error(result.error || "Failed to submit feedback");
      }
    } catch {
      toast.error("Failed to submit feedback");
    } finally {
      setIsSubmittingFeedback(false);
    }
  }, [feedbackRating, feedbackComment, token, existingFeedback, toast]);

  // Play victory or defeat sound on finished screen
  useEffect(() => {
    if (data?.isFinished && !soundPlayedRef.current) {
      soundPlayedRef.current = true;
      setTimeout(() => {
        if (data.isWinner) {
          playVictorySound();
        } else {
          playDefeatSound();
        }
      }, 300);
    }
  }, [data?.isFinished, data?.isWinner]);

  // Auto-scan if there's a pending scan from QR code redirect
  useEffect(() => {
    const pendingScan = searchParams.get("scan");
    if (pendingScan && token && data) {
      setIsAutoScanning(true);
      setSearchParams({}, { replace: true });

      fetch("/api/v1/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ nodeKey: pendingScan }),
      })
        .then((res) => res.json())
        .then((result) => {
          setAutoScanResult(result);
          if (result.success) {
            playSuccessSound();
            if (result.pointsAwarded) {
              setTimeout(() => playCoinSound(), 200);
            }
            toast.success(result.message);
            if (result.pointsAwarded) {
              toast.success(`+${result.pointsAwarded} points!`);
            }
            setTimeout(() => {
              window.location.reload();
            }, 1500);
          } else {
            toast.error(result.message);
            setIsAutoScanning(false);
          }
        })
        .catch(() => {
          setAutoScanResult({ success: false, message: "Failed to record scan" });
          toast.error("Failed to record scan");
          setIsAutoScanning(false);
        });
    }
  }, [searchParams, setSearchParams, token, data, toast]);

  // Signout handler - must be before early returns
  const handleSignout = useCallback(() => {
    clearAuth();
    navigate("/join", { replace: true });
  }, [navigate]);

  // Loading state
  if (isLoading || !data || !token) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--bg-primary)]">
        <Spinner size="lg" />
        <p className="text-muted mt-4">{t("pages.play.loading")}</p>
      </div>
    );
  }

  // Show victory screen
  if (data.isFinished && data.isWinner) {
    return (
      <>
        <VictoryScreen
          teamName={data.teamName}
          nodesFound={data.nodesFound}
          totalNodes={data.totalNodes}
          totalPoints={data.totalPoints}
          gameSlug={loaderData.gameSlug}
          feedbackSubmitted={feedbackSubmitted}
          onShowFeedback={() => setShowFeedback(true)}
        />
        {showFeedback && (
          <FeedbackModal
            feedbackRating={feedbackRating}
            setFeedbackRating={setFeedbackRating}
            feedbackComment={feedbackComment}
            setFeedbackComment={setFeedbackComment}
            isSubmittingFeedback={isSubmittingFeedback}
            feedbackSubmitted={feedbackSubmitted}
            submitFeedback={submitFeedback}
            setShowFeedback={setShowFeedback}
          />
        )}
      </>
    );
  }

  // Show defeat screen
  if (data.isFinished && !data.isWinner) {
    return (
      <>
        <DefeatScreen
          teamName={data.teamName}
          nodesFound={data.nodesFound}
          totalNodes={data.totalNodes}
          totalPoints={data.totalPoints}
          gameSlug={loaderData.gameSlug}
          feedbackSubmitted={feedbackSubmitted}
          onShowFeedback={() => setShowFeedback(true)}
        />
        {showFeedback && (
          <FeedbackModal
            feedbackRating={feedbackRating}
            setFeedbackRating={setFeedbackRating}
            feedbackComment={feedbackComment}
            setFeedbackComment={setFeedbackComment}
            isSubmittingFeedback={isSubmittingFeedback}
            feedbackSubmitted={feedbackSubmitted}
            submitFeedback={submitFeedback}
            setShowFeedback={setShowFeedback}
          />
        )}
      </>
    );
  }

  // Waiting room - show when game is in draft mode
  if (gamePhase === "waiting") {
    return (
      <WaitingRoom
        gameName={data.gameName}
        gameLogoUrl={data.gameLogoUrl}
        gameSlug={loaderData.gameSlug}
        mode="player"
        teamName={data.teamName}
        teamLogoUrl={data.teamLogoUrl}
        onGameStart={() => {
          setGamePhase("countdown");
        }}
      />
    );
  }

  // Countdown - show when transitioning from waiting to playing
  if (gamePhase === "countdown") {
    return (
      <GameCountdown
        duration={3}
        onComplete={() => {
          setGamePhase("playing");
          setIsRevealed(true);
        }}
      />
    );
  }

  // Tab definitions
  const tabs = [
    { id: "clue" as const, label: t("pages.play.tabs.clue"), icon: <MapPin size={18} /> },
    { id: "scan" as const, label: t("pages.play.tabs.scan"), icon: <Camera size={18} /> },
    { id: "progress" as const, label: t("pages.play.tabs.progress"), icon: <CheckCircle size={18} /> },
    { id: "team" as const, label: t("pages.play.tabs.team"), icon: <Users size={18} /> },
    { id: "chat" as const, label: t("pages.play.tabs.chat"), icon: <MessageSquare size={18} /> },
  ];

  return (
    <RevealAnimation isRevealed={isRevealed} effect="blur">
    <div className="min-h-screen bg-[var(--bg-primary)] py-6 px-4 flex justify-center">
      {/* Offline indicator */}
      {isOffline && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white text-center py-2 px-4 text-sm font-medium flex items-center justify-center gap-2">
          <WifiOff size={16} />
          <span>You're offline - showing cached data</span>
          {pendingCount > 0 && <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">{pendingCount} pending</span>}
        </div>
      )}

      {/* Syncing indicator */}
      {isSyncing && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-blue-500 text-white text-center py-2 px-4 text-sm font-medium flex items-center justify-center gap-2">
          <LoaderCircle size={16} className="animate-spin" />
          <span>Syncing pending scans...</span>
        </div>
      )}

      <div className="w-full max-w-2xl">
        {/* Auto-scan loading overlay */}
        {isAutoScanning && !autoScanResult && (
          <div className="fixed inset-0 bg-black/70 flex flex-col items-center justify-center z-50">
            <Spinner size="lg" />
            <p className="text-white mt-4">{t("pages.play.processingQR")}</p>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex flex-col gap-1">
            <div className="inline-flex items-center gap-2 text-sm text-secondary">
              {data.gameLogoUrl && <img src={data.gameLogoUrl} alt={`${data.gameName} logo`} style={{ width: "20px", height: "20px", borderRadius: "4px", objectFit: "cover" }} />}
              <span className="w-2 h-2 rounded-full bg-[var(--color-success)] animate-pulse" />
              <span>{data.gameName}</span>
            </div>
            <div className="flex items-center gap-2">
              {data.teamLogoUrl && <img src={data.teamLogoUrl} alt={`${data.teamName} logo`} className="w-8 h-8 rounded-lg object-cover" />}
              <h1 className="text-2xl sm:text-3xl font-bold text-primary">{data.teamName}</h1>
            </div>
          </div>

          <div className={`${isOffline || isSyncing ? "top-14" : "top-4"} right-4 z-40 flex flex-col items-center px-4 py-2 bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-dark)] rounded-xl text-white shadow-lg transition-all`}>
            <span className="text-2xl font-extrabold leading-none">{data.totalPoints}</span>
            <span className="text-xs opacity-90">{t("pages.play.points")}</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border mb-4 sm:mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 inline-flex items-center justify-center gap-1.5 px-1 sm:px-3 py-2 text-xs sm:text-sm font-medium transition-all border-b-2 -mb-px ${
                activeTab === tab.id
                  ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                  : "border-transparent text-muted hover:text-secondary hover:border-border"
              }`}
              title={tab.label}
            >
              {tab.icon}
              <span className="hidden sm:flex">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Clue Tab */}
        {activeTab === "clue" && (
          <>
            {currentClue ? (
              <div className="mb-6">
                <div className="p-6 bg-elevated rounded-lg border shadow-sm">
                  <div className="flex items-center gap-4 mb-5">
                    <div className={`flex items-center justify-center w-12 h-12 rounded-full text-white flex-shrink-0 ${data.scannedNodes.length === 0 ? "bg-gradient-to-br from-[var(--color-success)] to-emerald-700" : "bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-dark)]"}`}>
                      {data.scannedNodes.length === 0 ? (
                        <Play size={24} />
                      ) : (
                        <MapPin size={24} />
                      )}
                    </div>
                    <div className="flex-1">
                      <h2 className="text-xl font-bold text-primary m-0">{currentClue.title}</h2>
                      <p className="text-muted text-sm m-0">{data.scannedNodes.length === 0 ? t("pages.play.clueTab.startingClue") : t("pages.play.clueTab.nextClue")}</p>
                    </div>
                    {data.isRandomMode && data.totalNodes - data.nodesFound > 1 && (
                      <button type="button" onClick={shuffleClue} disabled={isShuffling} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-secondary bg-tertiary hover:bg-secondary border border-border rounded-lg transition-colors disabled:opacity-50" title="Get a different random clue">
                        <RefreshCw size={14} className={isShuffling ? "animate-spin" : ""} />
                        <span className="hidden sm:flex">{isShuffling ? "..." : t("pages.play.clueTab.tryAnother")}</span>
                      </button>
                    )}
                  </div>
                  <ClueDisplay node={currentClue} hideTitle />

                  {/* Hint Section */}
                  {currentHint?.hasHint && (
                    <div className="mt-4 pt-4 border-t border-border">
                      {currentHint.hintUsed && currentHint.hintText ? (
                        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-semibold mb-2">
                            <HelpCircle size={18} />
                            <span>{t("pages.play.hint")} (-{currentHint.pointsDeducted} {t("pages.play.points")})</span>
                          </div>
                          <p className="text-amber-800 dark:text-amber-300">{currentHint.hintText}</p>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setShowHintConfirm(true)}
                          className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded-lg transition-colors"
                        >
                          <HelpCircle size={18} />
                          <span>{t("pages.play.hints.needHint")} ({t("pages.play.hints.pointsCost", { points: currentHint.pointsCost })})</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Button to go to Scan tab */}
                <button
                  type="button"
                  onClick={() => setActiveTab("scan")}
                  className="w-full mt-4 inline-flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] text-white font-semibold rounded-xl hover:opacity-90 transition-all shadow-lg"
                >
                  <Camera size={24} />
                  <span>{t("pages.play.clueTab.scanQRCode")}</span>
                </button>
              </div>
            ) : (
              <div className="p-8 bg-elevated rounded-lg border shadow-sm text-center mb-6">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-dark)] text-white mb-4">
                  <Play size={48} />
                </div>
                <h2 className="text-2xl font-bold text-primary mb-2">{t("pages.play.clueTab.readyToBegin")}</h2>
                <p className="text-muted mb-4">{t("pages.play.clueTab.scanFirstQR")}</p>
                <button
                  type="button"
                  onClick={() => setActiveTab("scan")}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] text-white font-semibold rounded-xl hover:opacity-90 transition-all shadow-lg"
                >
                  <Camera size={20} />
                  <span>{t("pages.play.clueTab.openScanner")}</span>
                </button>
              </div>
            )}

            {/* Quick Progress Summary */}
            <div className="p-4 bg-gradient-to-br from-bg-secondary to-bg-elevated rounded-lg border shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-[var(--color-primary)]">{data.nodesFound}</span>
                    <span className="text-sm text-secondary">/ {data.totalNodes}</span>
                  </div>
                  <span className="text-sm text-muted">{t("pages.play.clueTab.qrCodesFound")}</span>
                </div>
                <Link to={`/leaderboard/${loaderData.gameSlug}`} className="inline-flex items-center gap-1 text-sm text-secondary hover:text-primary transition-colors">
                  <List size={14} />
                  {t("pages.leaderboard.title")}
                </Link>
              </div>
              {data.nodesFound > 0 && data.nodesFound < data.totalNodes && <p className="text-sm text-secondary mt-2">{t("pages.play.clueTab.moreToFind", { count: data.totalNodes - data.nodesFound })}</p>}
              {data.nodesFound >= data.totalNodes && !data.isFinished && <p className="text-sm text-[var(--color-success)] mt-2 font-medium">{t("pages.play.clueTab.allFoundFinish")}</p>}
            </div>
          </>
        )}

        {/* Scan Tab */}
        {activeTab === "scan" && (
          <>
            <div className="p-6 bg-elevated rounded-lg border shadow-sm mb-4">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-dark)] text-white flex-shrink-0">
                  <Camera size={24} />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-primary m-0">{t("pages.play.clueTab.scanQRCode")}</h2>
                  <p className="text-muted text-sm m-0">{t("pages.play.clueTab.pointAtCamera")}</p>
                </div>
              </div>
              <QRScanner
                gameSlug={loaderData.gameSlug}
                token={token}
                autoStart
                onScanSuccess={() => {
                  // Switch to clue tab after successful scan
                  setTimeout(() => setActiveTab("clue"), 1500);
                }}
              />
            </div>

            {/* Button to check clue */}
            <button
              type="button"
              onClick={() => setActiveTab("clue")}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-secondary text-primary border hover:border-strong rounded-lg transition-colors"
            >
              <MapPin size={16} />
              <span>{t("pages.play.viewCurrentClue")}</span>
            </button>
          </>
        )}

        {/* Progress Tab */}
        {activeTab === "progress" && (
          <>
            <div className="p-6 bg-gradient-to-br from-bg-secondary to-bg-elevated rounded-lg border shadow-sm mb-6">
              <div className="flex items-center gap-2 text-secondary mb-4">
                <CheckCircle size={20} />
                <span className="font-semibold">{t("pages.play.progressTab.yourProgress")}</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-extrabold text-[var(--color-primary)]">{data.nodesFound}</span>
                  <span className="text-lg text-secondary">/ {data.totalNodes}</span>
                </div>
                <span className="text-sm text-muted mt-1">{t("pages.play.clueTab.qrCodesFound")}</span>
                {data.nodesFound > 0 && data.nodesFound < data.totalNodes && <span className="text-sm text-secondary mt-2">{t("pages.play.clueTab.moreToFind", { count: data.totalNodes - data.nodesFound })}</span>}
                {data.nodesFound >= data.totalNodes && !data.isFinished && <span className="text-sm text-[var(--color-success)] mt-2 font-medium">{t("pages.play.clueTab.allFoundFinish")}</span>}
              </div>
            </div>

            {data.scannedNodes.length > 0 ? (
              <div className="p-6 bg-elevated rounded-lg border shadow-sm">
                <div className="flex items-center gap-2 text-secondary mb-4 font-semibold">
                  <Activity size={20} />
                  <span>{t("pages.play.progressTab.yourJourney")}</span>
                </div>
                <div className="flex flex-col gap-2">
                  {data.scannedNodes.map((node, index) => (
                    <div key={node.id} className="flex items-center gap-4 p-3 bg-secondary rounded-lg border border-border">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--color-primary)] text-white font-bold text-sm flex-shrink-0">{index + 1}</div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-primary truncate">{node.title}</div>
                        <div className="text-sm text-[var(--color-success)] font-semibold">+{node.points} {t("pages.play.points")}</div>
                      </div>
                      <div className="text-[var(--color-success)] flex-shrink-0">
                        <Check size={20} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-8 bg-elevated rounded-lg border shadow-sm text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-tertiary text-muted mb-4">
                  <Activity size={32} />
                </div>
                <h3 className="text-lg font-semibold text-primary mb-2">{t("pages.play.progressTab.noQRCodesYet")}</h3>
                <p className="text-muted">{t("pages.play.progressTab.startHunt")}</p>
              </div>
            )}

            <div className="mt-6">
              <Link to={`/leaderboard/${loaderData.gameSlug}`} className="flex items-center justify-center gap-2 px-4 py-3 bg-elevated text-secondary border hover:border-strong rounded-lg transition-colors">
                <List size={16} />
                {t("pages.play.viewLeaderboard")}
              </Link>
            </div>
          </>
        )}

        {/* Team Tab */}
        {activeTab === "team" && (
          <>
            <div className="p-6 bg-elevated rounded-lg border shadow-sm mb-6">
              <div className="flex items-center gap-4">
                {data.teamLogoUrl ? (
                  <img src={data.teamLogoUrl} alt={`${data.teamName} logo`} className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover flex-shrink-0" />
                ) : (
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-dark)] flex items-center justify-center text-white text-xl sm:text-2xl font-bold flex-shrink-0">
                    {data.teamName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg sm:text-xl font-bold text-primary truncate">{data.teamName}</h2>
                  <p className="text-muted text-sm">Code: <span className="font-mono font-bold">{data.teamCode}</span></p>
                </div>
                <button
                  type="button"
                  onClick={handleSignout}
                  className="flex-shrink-0 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm text-[var(--color-error)] border border-[var(--color-error)]/30 hover:bg-[var(--color-error)]/10 rounded-lg transition-colors"
                  title="Sign Out"
                >
                  <LogOut size={16} />
                  <span>{t("pages.play.teamTab.signOut")}</span>
                </button>
              </div>
            </div>

            <div className="p-6 bg-elevated rounded-lg border shadow-sm mb-6">
              <div className="flex items-center gap-2 font-semibold text-primary mb-1">
                <Users size={20} />
                <span>{t("pages.play.teamTab.inviteTeammates")}</span>
              </div>
              <p className="text-sm text-muted mb-4">{t("pages.play.teamTab.shareDetails")}</p>

              <div className="flex flex-col gap-3 mb-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-muted uppercase tracking-wide">{t("pages.play.teamTab.gameId")}</label>
                  <div className="flex items-center gap-2 p-3 bg-secondary border rounded-lg">
                    <span className="flex-1 text-sm text-primary break-all">{loaderData.gameSlug}</span>
                    <button type="button" className="flex items-center justify-center w-8 h-8 bg-tertiary rounded-lg hover:bg-[var(--color-primary)] hover:text-white transition-colors flex-shrink-0" onClick={() => copyToClipboard(loaderData.gameSlug, "gameSlug")}>
                      {copiedField === "gameSlug" ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-muted uppercase tracking-wide">{t("pages.play.teamTab.teamCode")}</label>
                  <div className="flex items-center gap-2 p-3 bg-secondary border rounded-lg">
                    <span className="flex-1 font-mono text-xl font-bold tracking-wider text-primary">{data.teamCode}</span>
                    <button type="button" className="flex items-center justify-center w-8 h-8 bg-tertiary rounded-lg hover:bg-[var(--color-primary)] hover:text-white transition-colors flex-shrink-0" onClick={() => copyToClipboard(data.teamCode, "teamCode")}>
                      {copiedField === "teamCode" ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button type="button" className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] text-white font-medium rounded-lg hover:opacity-90 transition-colors shadow-md" onClick={shareWithNavigator}>
                  <Share2 size={16} />
                  {t("pages.play.teamTab.shareInviteLink")}
                </button>
                <button type="button" className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-secondary border hover:border-strong rounded-lg transition-colors" onClick={() => copyToClipboard(shareLink, "link")}>
                  {copiedField === "link" ? <><Check size={16} />{t("pages.play.teamTab.copied")}</> : <><Link2 size={16} />{t("pages.play.teamTab.copyLink")}</>}
                </button>
              </div>
            </div>

            <div className="p-6 bg-elevated rounded-lg border shadow-sm">
              <div className="flex items-center gap-2 font-semibold text-primary mb-1">
                <Star size={20} />
                <span>{t("pages.play.teamTab.feedback")}</span>
              </div>
              <p className="text-sm text-muted mb-4">{t("pages.play.teamTab.feedbackDescription")}</p>
              <button type="button" onClick={() => setShowFeedback(true)} className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-secondary text-primary border hover:border-strong rounded-lg transition-colors">
                <Star size={16} />
                {feedbackSubmitted ? t("pages.play.feedback.update") : t("pages.play.feedback.leave")}
              </button>
            </div>
          </>
        )}

        {/* Chat Tab */}
        {activeTab === "chat" && (
          <div className="bg-elevated rounded-lg border shadow-sm overflow-hidden" style={{ height: "calc(100vh - 220px)", minHeight: "400px" }}>
            <Chat gameSlug={loaderData.gameSlug} token={token} currentTeamId={data.teamId} embedded />
          </div>
        )}
      </div>

      {showFeedback && (
        <FeedbackModal
          feedbackRating={feedbackRating}
          setFeedbackRating={setFeedbackRating}
          feedbackComment={feedbackComment}
          setFeedbackComment={setFeedbackComment}
          isSubmittingFeedback={isSubmittingFeedback}
          feedbackSubmitted={feedbackSubmitted}
          submitFeedback={submitFeedback}
          setShowFeedback={setShowFeedback}
        />
      )}

      {/* Hint Confirmation Modal */}
      {showHintConfirm && currentHint && (currentClue || data?.startingClue) && (
        <HintConfirmModal
          currentHint={currentHint}
          isRequestingHint={isRequestingHint}
          onCancel={() => setShowHintConfirm(false)}
          onConfirm={() => {
            const nodeId = currentClue?.id || data?.startingClue?.id;
            if (nodeId) requestHint(nodeId);
          }}
        />
      )}
    </div>
    </RevealAnimation>
  );
}
