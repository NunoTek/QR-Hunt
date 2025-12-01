import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, useLoaderData, useNavigate, useSearchParams } from "@remix-run/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Chat } from "~/components/Chat";
import { ClueDisplay } from "~/components/ClueDisplay";
import { GameCountdown } from "~/components/GameCountdown";
import { Spinner } from "~/components/Loading";
import { QRScanner } from "~/components/QRScanner";
import { RevealAnimation } from "~/components/RevealAnimation";
import { ToastProvider, useToast } from "~/components/Toast";
import { Version } from "~/components/Version";
import { WaitingRoom } from "~/components/WaitingRoom";
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

interface HintInfo {
  hasHint: boolean;
  hintUsed: boolean;
  hintText: string | null;
  pointsDeducted: number;
  pointsCost: number;
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
  const shareLink = data ? `${loaderData.baseUrl}/join?game=${loaderData.gameSlug}` : "";

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
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-[var(--color-primary)]/10 to-[var(--color-success)]/10 relative overflow-hidden">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 50 }).map((_, i) => (
            <div key={i} className="absolute -top-2.5 w-2.5 h-2.5 opacity-80 animate-[confetti-fall_3s_linear_infinite]" style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              backgroundColor: ['#fbbf24', '#f59e0b', '#ef4444', '#10b981', '#6366f1'][Math.floor(Math.random() * 5)]
            }} />
          ))}
        </div>
        <div className="text-6xl mb-4">👑</div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-center mb-2 text-[var(--color-primary)]">{t("pages.play.victory.title")}</h1>
        <p className="text-xl text-center text-secondary mb-4">{t("pages.play.victory.congratulations", { teamName: data.teamName })}</p>
        <p className="mt-4 text-muted">{t("pages.play.victory.finishedFirst")}</p>

        <div className="p-6 bg-elevated rounded-lg border shadow-sm mt-6 max-w-[300px] w-full">
          <div className="flex items-center justify-center gap-8">
            <div className="flex flex-col items-center">
              <span className="text-3xl font-extrabold text-[var(--color-primary)]">{data.nodesFound}/{data.totalNodes}</span>
              <span className="text-sm text-muted">{t("pages.play.victory.qrCodes")}</span>
            </div>
            <div className="w-px h-12 bg-border" />
            <div className="flex flex-col items-center">
              <span className="text-3xl font-extrabold text-[var(--color-primary)]">{data.totalPoints}</span>
              <span className="text-sm text-muted">{t("pages.play.victory.totalPoints")}</span>
            </div>
          </div>
        </div>

        <Link to={`/leaderboard/${loaderData.gameSlug}`} className="inline-flex items-center justify-center gap-2 px-6 py-3 text-base font-medium bg-[var(--color-primary)] rounded-lg hover:opacity-90 transition-colors mt-6 shadow-md" style={{ color: "white" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 6L21 6" /><path d="M8 12L21 12" /><path d="M8 18L21 18" />
            <path d="M3 6L3.01 6" /><path d="M3 12L3.01 12" /><path d="M3 18L3.01 18" />
          </svg>
          {t("pages.play.viewLeaderboard")}
        </Link>

        <button type="button" onClick={() => setShowFeedback(true)} className="inline-flex items-center justify-center gap-2 px-4 py-2 text-secondary border hover:border-strong rounded-lg transition-colors mt-4">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
          {feedbackSubmitted ? t("pages.play.feedback.update") : t("pages.play.feedback.leave")}
        </button>

        {showFeedback && <FeedbackModal {...{ feedbackRating, setFeedbackRating, feedbackComment, setFeedbackComment, isSubmittingFeedback, feedbackSubmitted, submitFeedback, setShowFeedback }} />}

        <style>{`
          @keyframes confetti-fall {
            0% { transform: translateY(0) rotate(0deg); opacity: 1; }
            100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
          }
        `}</style>
      </div>
    );
  }

  // Show defeat screen
  if (data.isFinished && !data.isWinner) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-bg-secondary to-bg-primary">
        <div className="text-6xl mb-4">🏁</div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-center mb-2 text-[var(--color-primary)]">{t("pages.play.gameComplete.title")}</h1>
        <p className="text-xl text-center text-secondary">{t("pages.play.gameComplete.wellPlayed", { teamName: data.teamName })}</p>

        <div className="p-6 bg-elevated rounded-lg border shadow-sm mt-6 max-w-[300px] w-full">
          <div className="flex items-center justify-center gap-8">
            <div className="flex flex-col items-center">
              <span className="text-3xl font-extrabold text-[var(--color-primary)]">{data.nodesFound}/{data.totalNodes}</span>
              <span className="text-sm text-muted">{t("pages.play.victory.qrCodes")}</span>
            </div>
            <div className="w-px h-12 bg-border" />
            <div className="flex flex-col items-center">
              <span className="text-3xl font-extrabold text-[var(--color-primary)]">{data.totalPoints}</span>
              <span className="text-sm text-muted">{t("pages.play.victory.totalPoints")}</span>
            </div>
          </div>
        </div>

        <Link to={`/leaderboard/${loaderData.gameSlug}`} className="inline-flex items-center justify-center gap-2 px-6 py-3 text-base font-medium bg-[var(--color-primary)] rounded-lg hover:opacity-90 transition-colors mt-6 shadow-md" style={{ color: "white" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 6L21 6" /><path d="M8 12L21 12" /><path d="M8 18L21 18" />
            <path d="M3 6L3.01 6" /><path d="M3 12L3.01 12" /><path d="M3 18L3.01 18" />
          </svg>
          {t("pages.play.viewLeaderboard")}
        </Link>

        <button type="button" onClick={() => setShowFeedback(true)} className="inline-flex items-center justify-center gap-2 px-4 py-2 text-secondary border hover:border-strong rounded-lg transition-colors mt-4">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
          {feedbackSubmitted ? t("pages.play.feedback.update") : t("pages.play.feedback.leave")}
        </button>

        {showFeedback && <FeedbackModal {...{ feedbackRating, setFeedbackRating, feedbackComment, setFeedbackComment, isSubmittingFeedback, feedbackSubmitted, submitFeedback, setShowFeedback }} />}
      </div>
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
    { id: "clue" as const, label: t("pages.play.tabs.clue"), icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="10" r="3" /><path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 7 8 11.7z" /></svg> },
    { id: "scan" as const, label: t("pages.play.tabs.scan"), icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg> },
    { id: "progress" as const, label: t("pages.play.tabs.progress"), icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg> },
    { id: "team" as const, label: t("pages.play.tabs.team"), icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg> },
    { id: "chat" as const, label: t("pages.play.tabs.chat"), icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg> },
  ];

  return (
    <RevealAnimation isRevealed={isRevealed} effect="blur">
    <div className="min-h-screen bg-[var(--bg-primary)] py-6 px-4 flex justify-center">
      {/* Offline indicator */}
      {isOffline && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white text-center py-2 px-4 text-sm font-medium flex items-center justify-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="1" y1="1" x2="23" y2="23" />
            <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
            <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
            <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
            <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
            <line x1="12" y1="20" x2="12.01" y2="20" />
          </svg>
          <span>You're offline - showing cached data</span>
          {pendingCount > 0 && <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">{pendingCount} pending</span>}
        </div>
      )}

      {/* Syncing indicator */}
      {isSyncing && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-blue-500 text-white text-center py-2 px-4 text-sm font-medium flex items-center justify-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
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
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                      ) : (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="10" r="3" /><path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 7 8 11.7z" /></svg>
                      )}
                    </div>
                    <div className="flex-1">
                      <h2 className="text-xl font-bold text-primary m-0">{currentClue.title}</h2>
                      <p className="text-muted text-sm m-0">{data.scannedNodes.length === 0 ? t("pages.play.clueTab.startingClue") : t("pages.play.clueTab.nextClue")}</p>
                    </div>
                    {data.isRandomMode && data.totalNodes - data.nodesFound > 1 && (
                      <button type="button" onClick={shuffleClue} disabled={isShuffling} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-secondary bg-tertiary hover:bg-secondary border border-border rounded-lg transition-colors disabled:opacity-50" title="Get a different random clue">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={isShuffling ? "animate-spin" : ""}><path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16" /></svg>
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
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="12" cy="12" r="10" />
                              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                              <line x1="12" y1="17" x2="12.01" y2="17" />
                            </svg>
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
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                            <line x1="12" y1="17" x2="12.01" y2="17" />
                          </svg>
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
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
                  <span>{t("pages.play.clueTab.scanQRCode")}</span>
                </button>
              </div>
            ) : (
              <div className="p-8 bg-elevated rounded-lg border shadow-sm text-center mb-6">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-dark)] text-white mb-4">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                </div>
                <h2 className="text-2xl font-bold text-primary mb-2">{t("pages.play.clueTab.readyToBegin")}</h2>
                <p className="text-muted mb-4">{t("pages.play.clueTab.scanFirstQR")}</p>
                <button
                  type="button"
                  onClick={() => setActiveTab("scan")}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] text-white font-semibold rounded-xl hover:opacity-90 transition-all shadow-lg"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
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
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 6L21 6" /><path d="M8 12L21 12" /><path d="M8 18L21 18" /><path d="M3 6L3.01 6" /><path d="M3 12L3.01 12" /><path d="M3 18L3.01 18" /></svg>
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
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
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
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="10" r="3" /><path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 7 8 11.7z" /></svg>
              <span>{t("pages.play.viewCurrentClue")}</span>
            </button>
          </>
        )}

        {/* Progress Tab */}
        {activeTab === "progress" && (
          <>
            <div className="p-6 bg-gradient-to-br from-bg-secondary to-bg-elevated rounded-lg border shadow-sm mb-6">
              <div className="flex items-center gap-2 text-secondary mb-4">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
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
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
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
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-8 bg-elevated rounded-lg border shadow-sm text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-tertiary text-muted mb-4">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
                </div>
                <h3 className="text-lg font-semibold text-primary mb-2">{t("pages.play.progressTab.noQRCodesYet")}</h3>
                <p className="text-muted">{t("pages.play.progressTab.startHunt")}</p>
              </div>
            )}

            <div className="mt-6">
              <Link to={`/leaderboard/${loaderData.gameSlug}`} className="flex items-center justify-center gap-2 px-4 py-3 bg-elevated text-secondary border hover:border-strong rounded-lg transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 6L21 6" /><path d="M8 12L21 12" /><path d="M8 18L21 18" /><path d="M3 6L3.01 6" /><path d="M3 12L3.01 12" /><path d="M3 18L3.01 18" /></svg>
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
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  <span>{t("pages.play.teamTab.signOut")}</span>
                </button>
              </div>
            </div>

            <div className="p-6 bg-elevated rounded-lg border shadow-sm mb-6">
              <div className="flex items-center gap-2 font-semibold text-primary mb-1">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                <span>{t("pages.play.teamTab.inviteTeammates")}</span>
              </div>
              <p className="text-sm text-muted mb-4">{t("pages.play.teamTab.shareDetails")}</p>

              <div className="flex flex-col gap-3 mb-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-muted uppercase tracking-wide">{t("pages.play.teamTab.gameId")}</label>
                  <div className="flex items-center gap-2 p-3 bg-secondary border rounded-lg">
                    <span className="flex-1 text-sm text-primary break-all">{loaderData.gameSlug}</span>
                    <button type="button" className="flex items-center justify-center w-8 h-8 bg-tertiary rounded-lg hover:bg-[var(--color-primary)] hover:text-white transition-colors flex-shrink-0" onClick={() => copyToClipboard(loaderData.gameSlug, "gameSlug")}>
                      {copiedField === "gameSlug" ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg> : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-muted uppercase tracking-wide">{t("pages.play.teamTab.teamCode")}</label>
                  <div className="flex items-center gap-2 p-3 bg-secondary border rounded-lg">
                    <span className="flex-1 font-mono text-xl font-bold tracking-wider text-primary">{data.teamCode}</span>
                    <button type="button" className="flex items-center justify-center w-8 h-8 bg-tertiary rounded-lg hover:bg-[var(--color-primary)] hover:text-white transition-colors flex-shrink-0" onClick={() => copyToClipboard(data.teamCode, "teamCode")}>
                      {copiedField === "teamCode" ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg> : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button type="button" className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] text-white font-medium rounded-lg hover:opacity-90 transition-colors shadow-md" onClick={shareWithNavigator}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>
                  {t("pages.play.teamTab.shareInviteLink")}
                </button>
                <button type="button" className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-secondary border hover:border-strong rounded-lg transition-colors" onClick={() => copyToClipboard(shareLink, "link")}>
                  {copiedField === "link" ? <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>{t("pages.play.teamTab.copied")}</> : <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>{t("pages.play.teamTab.copyLink")}</>}
                </button>
              </div>
            </div>

            <div className="p-6 bg-elevated rounded-lg border shadow-sm">
              <div className="flex items-center gap-2 font-semibold text-primary mb-1">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                <span>{t("pages.play.teamTab.feedback")}</span>
              </div>
              <p className="text-sm text-muted mb-4">{t("pages.play.teamTab.feedbackDescription")}</p>
              <button type="button" onClick={() => setShowFeedback(true)} className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-secondary text-primary border hover:border-strong rounded-lg transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
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

      {showFeedback && <FeedbackModal {...{ feedbackRating, setFeedbackRating, feedbackComment, setFeedbackComment, isSubmittingFeedback, feedbackSubmitted, submitFeedback, setShowFeedback }} />}

      {/* Hint Confirmation Modal */}
      {showHintConfirm && currentHint && (currentClue || data?.startingClue) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-[var(--bg-elevated)] rounded-xl shadow-2xl max-w-md w-full p-6 animate-fade-in border border-[var(--border-color)]">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-primary">{t("pages.play.hints.requestTitle")}</h3>
                <p className="text-sm text-muted">{t("pages.play.hints.cannotUndo")}</p>
              </div>
            </div>

            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg mb-4">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-semibold mb-1">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <span>{t("pages.play.hints.pointsPenalty")}</span>
              </div>
              <p className="text-amber-800 dark:text-amber-300">
                {t("pages.play.hints.costExplanation", { points: currentHint.pointsCost })}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowHintConfirm(false)}
                disabled={isRequestingHint}
                className="flex-1 px-4 py-2.5 border rounded-lg text-secondary hover:border-strong transition-colors disabled:opacity-50"
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                onClick={() => {
                  const nodeId = currentClue?.id || data?.startingClue?.id;
                  if (nodeId) requestHint(nodeId);
                }}
                disabled={isRequestingHint}
                className="flex-1 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {isRequestingHint ? t("common.loading") : t("pages.play.hints.revealHint")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </RevealAnimation>
  );
}

// Extracted feedback modal component
function FeedbackModal({ feedbackRating, setFeedbackRating, feedbackComment, setFeedbackComment, isSubmittingFeedback, feedbackSubmitted, submitFeedback, setShowFeedback }: {
  feedbackRating: number;
  setFeedbackRating: (v: number) => void;
  feedbackComment: string;
  setFeedbackComment: (v: string) => void;
  isSubmittingFeedback: boolean;
  feedbackSubmitted: boolean;
  submitFeedback: () => void;
  setShowFeedback: (v: boolean) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-[var(--bg-elevated)] rounded-xl shadow-2xl max-w-md w-full p-6 animate-fade-in border border-[var(--border-color)]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-primary">{t("pages.play.feedback.title")}</h3>
          <button type="button" onClick={() => setShowFeedback(false)} className="text-muted hover:text-primary transition-colors">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
        <div className="flex justify-center gap-2 mb-4">
          {[1, 2, 3, 4, 5].map((star) => (
            <button key={star} type="button" onClick={() => setFeedbackRating(star)} className="text-4xl transition-transform hover:scale-110">
              {star <= feedbackRating ? "⭐" : "☆"}
            </button>
          ))}
        </div>
        <textarea value={feedbackComment} onChange={(e) => setFeedbackComment(e.target.value)} placeholder={t("pages.play.feedback.placeholder")} className="w-full p-3 border rounded-lg bg-secondary text-primary resize-none h-24 mb-4" maxLength={1000} />
        <div className="flex gap-3">
          <button type="button" onClick={() => setShowFeedback(false)} className="flex-1 px-4 py-2 border rounded-lg text-secondary hover:border-strong transition-colors">{t("common.cancel")}</button>
          <button type="button" onClick={submitFeedback} disabled={isSubmittingFeedback || feedbackRating === 0} className="flex-1 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90 transition-colors disabled:opacity-50">
            {isSubmittingFeedback ? t("pages.play.feedback.submitting") : feedbackSubmitted ? t("pages.play.feedback.updateBtn") : t("pages.play.feedback.submitBtn")}
          </button>
        </div>
      </div>
    </div>
  );
}
