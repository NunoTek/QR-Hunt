import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { StatusBadge } from "~/components/admin/game-editor/StatusBadge";
import { GameCountdown } from "~/components/GameCountdown";
import { ArrowLeft, BarChart, ChevronDown, ChevronUp, Clock, RefreshCw } from "~/components/icons";
import {
  type FeedbackData,
  type LeaderboardData,
  type LeaderboardEntry,
  type PerformanceData,
  type RankChange,
  FeedbackSection,
} from "~/components/leaderboard";
import "~/components/leaderboard/leaderboard.css";
import { Spinner } from "~/components/Loading";
import { RevealAnimation } from "~/components/RevealAnimation";
import { useToast } from "~/components/Toast";
import { WaitingRoom } from "~/components/WaitingRoom";
import { useTranslation } from "~/i18n/I18nContext";
import { getApiUrl } from "~/lib/api";
import { playNotificationSound, playRankDownSound, playRankUpSound } from "~/lib/sounds";

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  return [
    { title: data?.game?.name ? `Leaderboard - ${data.game.name}` : "Leaderboard - QR Hunt" },
  ];
};

interface LoaderData {
  game: {
    id: string;
    name: string;
    slug: string;
    status: string;
    logoUrl: string | null;
  };
  leaderboard: LeaderboardEntry[];
  updatedAt: string;
  streamUrl: string;
}

export async function loader({ params, request }: LoaderFunctionArgs) {
  const { gameSlug } = params;
  const baseUrl = getApiUrl();

  const response = await fetch(`${baseUrl}/api/v1/game/${gameSlug}/leaderboard`);

  if (!response.ok) {
    throw new Response("Game not found", { status: 404 });
  }

  const data = await response.json();

  // Get the origin for SSE URL (use request origin for client-side connection)
  const url = new URL(request.url);
  const streamUrl = `${url.origin}/api/v1/game/${gameSlug}/leaderboard/stream`;

  return json<LoaderData>({ ...data, streamUrl });
}

export default function Leaderboard() {
  const loaderData = useLoaderData<typeof loader>();
  const [data, setData] = useState<LeaderboardData>(loaderData);
  const [isConnected, setIsConnected] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastScan, setLastScan] = useState<{ teamName: string; points: number } | null>(null);
  const [feedbackData, setFeedbackData] = useState<FeedbackData | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [rankChanges, setRankChanges] = useState<Map<string, RankChange>>(new Map());
  const [activeTab, setActiveTab] = useState<"leaderboard" | "performance">("leaderboard");
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null);
  const [isLoadingPerformance, setIsLoadingPerformance] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const feedbackLoadedRef = useRef(false);
  const performanceLoadedRef = useRef(false);
  const previousRanksRef = useRef<Map<string, number>>(new Map());
  const toast = useToast();
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Game phase state for waiting room and countdown
  const [gamePhase, setGamePhase] = useState<"waiting" | "countdown" | "playing">(
    loaderData.game.status === "draft" ? "waiting" : "playing"
  );
  const [isRevealed, setIsRevealed] = useState(loaderData.game.status !== "draft");

  // Handle back navigation - go back in history if available, otherwise go home
  const handleBack = useCallback(() => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/");
    }
  }, [navigate]);

  // Initialize previous ranks on mount only
  useEffect(() => {
    if (previousRanksRef.current.size === 0) {
      const ranks = new Map<string, number>();
      loaderData.leaderboard.forEach((entry) => {
        ranks.set(entry.teamName, entry.rank);
      });
      previousRanksRef.current = ranks;
    }
  }, [loaderData.leaderboard]);

  // Detect rank changes and trigger animations/sounds
  const handleLeaderboardUpdate = useCallback((newData: LeaderboardData) => {
    const newChanges = new Map<string, RankChange>();
    let hasRankUp = false;
    let hasRankDown = false;

    newData.leaderboard.forEach((entry) => {
      const prevRank = previousRanksRef.current.get(entry.teamName);
      if (prevRank !== undefined && prevRank !== entry.rank) {
        const positions = Math.abs(prevRank - entry.rank);
        if (entry.rank < prevRank) {
          newChanges.set(entry.teamName, { teamName: entry.teamName, direction: "up", positions });
          hasRankUp = true;
        } else {
          newChanges.set(entry.teamName, { teamName: entry.teamName, direction: "down", positions });
          hasRankDown = true;
        }
      }
    });

    // Play sounds for rank changes
    if (hasRankUp) {
      playRankUpSound();
    } else if (hasRankDown) {
      playRankDownSound();
    }

    // Update rank changes for animations
    if (newChanges.size > 0) {
      setRankChanges(newChanges);
      // Clear rank changes after animation
      setTimeout(() => setRankChanges(new Map()), 2000);
    }

    // Update previous ranks
    const ranks = new Map<string, number>();
    newData.leaderboard.forEach((entry) => {
      ranks.set(entry.teamName, entry.rank);
    });
    previousRanksRef.current = ranks;

    setData(newData);
  }, []);

  // Load feedback for active and completed games
  useEffect(() => {
    if (!feedbackLoadedRef.current) {
      feedbackLoadedRef.current = true;
      fetch(`/api/v1/feedback/game/${data.game.slug}`)
        .then((res) => res.json())
        .then((result) => {
          setFeedbackData(result);
          // Auto-show feedback section if there's any feedback
          if (result.count > 0) {
            setShowFeedback(true);
          }
        })
        .catch(() => {
          // Ignore errors
        });
    }
  }, [data.game.slug]);

  // Load performance data when tab is switched
  useEffect(() => {
    if (activeTab === "performance" && !performanceLoadedRef.current) {
      performanceLoadedRef.current = true;
      setIsLoadingPerformance(true);
      fetch(`/api/v1/game/${data.game.slug}/performance`)
        .then((res) => {
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
          }
          return res.json();
        })
        .then((result) => {
          if (result && result.teams) {
            setPerformanceData(result);
          }
        })
        .catch((err) => {
          console.error("Failed to load performance data:", err);
        })
        .finally(() => {
          setIsLoadingPerformance(false);
        });
    }
  }, [activeTab, data.game.slug]);

  const connectSSE = useCallback(() => {
    if (data.game.status !== "active") return;
    if (eventSourceRef.current) return;

    const eventSource = new EventSource(`/api/v1/game/${data.game.slug}/leaderboard/stream`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
    };

    eventSource.addEventListener("leaderboard", (event) => {
      try {
        const newData = JSON.parse(event.data) as LeaderboardData;
        handleLeaderboardUpdate(newData);
      } catch (e) {
        console.error("Failed to parse leaderboard data", e);
      }
    });

    eventSource.addEventListener("scan", (event) => {
      try {
        const scanData = JSON.parse(event.data) as { teamName: string; nodeName: string; points: number };
        setLastScan({ teamName: scanData.teamName, points: scanData.points });

        // Play notification sound
        playNotificationSound();

        toast.info(`${scanData.teamName} found a clue! +${scanData.points} pts`);

        // Clear the scan notification after animation
        setTimeout(() => setLastScan(null), 3000);
      } catch (e) {
        console.error("Failed to parse scan data", e);
      }
    });

    eventSource.onerror = () => {
      setIsConnected(false);
      eventSource.close();
      eventSourceRef.current = null;

      // Reconnect after 5 seconds
      setTimeout(connectSSE, 5000);
    };
  }, [data.game.slug, data.game.status, toast, handleLeaderboardUpdate]);

  useEffect(() => {
    connectSSE();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [connectSSE]);

  // Reconnect when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && !eventSourceRef.current && data.game.status === "active") {
        connectSSE();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [connectSSE, data.game.status]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch(`/api/v1/game/${data.game.slug}/leaderboard`);
      if (response.ok) {
        const newData = await response.json();
        handleLeaderboardUpdate(newData);
      }
    } catch (e) {
      console.error("Failed to refresh", e);
    }
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Get rank change class for animation
  const getRankChangeClass = (teamName: string): string => {
    const change = rankChanges.get(teamName);
    if (!change) return "";
    return change.direction === "up" ? "rank-up" : "rank-down";
  };

  // Get rank change indicator
  const getRankChangeIndicator = (teamName: string): React.ReactNode => {
    const change = rankChanges.get(teamName);
    if (!change) return null;
    return (
      <span className={`rank-change-indicator ${change.direction}`}>
        {change.direction === "up" ? (
          <>
            <ChevronUp size={12} strokeWidth={3} />
            <span>{change.positions}</span>
          </>
        ) : (
          <>
            <ChevronDown size={12} strokeWidth={3} />
            <span>{change.positions}</span>
          </>
        )}
      </span>
    );
  };

  const getRankStyle = (rank: number, isFinished: boolean) => {
    if (rank === 1 && isFinished) {
      return {
        background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
        color: "#92400e",
        border: "2px solid #fbbf24",
      };
    }
    if (rank === 1) {
      return {
        background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
        color: "#92400e",
      };
    }
    if (rank === 2) {
      return {
        background: "linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)",
        color: "#374151",
      };
    }
    if (rank === 3) {
      return {
        background: "linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%)",
        color: "#9a3412",
      };
    }
    return {
      background: "var(--color-gray-100)",
      color: "var(--color-gray-600)",
    };
  };

  // Show waiting room when game is in draft mode
  if (gamePhase === "waiting") {
    return (
      <WaitingRoom
        gameName={data.game.name}
        gameLogoUrl={data.game.logoUrl}
        gameSlug={data.game.slug}
        mode="spectator"
        onGameStart={() => {
          setGamePhase("countdown");
        }}
      />
    );
  }

  // Show countdown when transitioning from waiting to playing
  if (gamePhase === "countdown") {
    return (
      <GameCountdown
        duration={3}
        onComplete={() => {
          setGamePhase("playing");
          setIsRevealed(true);
          // Update game status in data
          setData((prev) => ({
            ...prev,
            game: { ...prev.game, status: "active" },
          }));
        }}
      />
    );
  }

  return (
    <RevealAnimation isRevealed={isRevealed} effect="blur">
    <div className="min-h-screen bg-gradient-to-b from-[var(--bg-secondary)] to-[var(--bg-primary)] py-6 px-4 flex justify-center">
      <div className="w-full max-w-3xl">
        {/* Header */}
        <div className="leaderboard-header mb-6">
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            {data.game.logoUrl && (
              <img
                src={data.game.logoUrl}
                alt={`${data.game.name} logo`}
                style={{ width: "48px", height: "48px", borderRadius: "var(--radius)", objectFit: "cover" }}
              />
            )}
            <div>
              <h1 className="leaderboard-title">{data.game.name}</h1>
              <p className="leaderboard-subtitle">
                <span
                  className={`pulse-dot mr-2 ${isConnected ? "connected" : ""}`}
                  style={{ background: isConnected ? "var(--color-success)" : data.game.status === "active" ? "var(--color-warning)" : "var(--color-gray-400)" }}
                />
                {isConnected ? t("pages.leaderboard.live") : data.game.status === "active" ? t("common.loading") : t("pages.leaderboard.title")}
              </p>
            </div>
          </div>
          <StatusBadge status={data.game.status} t={t} />
        </div>

        {/* Live scan notification */}
        {lastScan && (
          <div className="scan-notification animate-pop-in">
            <span className="scan-icon">🎯</span>
            <span><strong>{lastScan.teamName}</strong> found a clue! <span className="points">+{lastScan.points}</span></span>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-border mb-4">
          <button
            type="button"
            onClick={() => setActiveTab("leaderboard")}
            className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-all border-b-2 -mb-px ${
              activeTab === "leaderboard"
                ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                : "border-transparent text-muted hover:text-secondary hover:border-border"
            }`}
          >
            <BarChart size={18} />
            <span>{t("pages.leaderboard.title")}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("performance")}
            className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-all border-b-2 -mb-px ${
              activeTab === "performance"
                ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                : "border-transparent text-muted hover:text-secondary hover:border-border"
            }`}
          >
            <BarChart size={18} />
            <span>{t("pages.leaderboard.performance")}</span>
          </button>
        </div>

        {/* Leaderboard Tab */}
        {activeTab === "leaderboard" && data.leaderboard.length === 0 ? (
          <div className="card empty-state">
            <div className="empty-state-icon">🏁</div>
            <h3 className="empty-state-title">{t("pages.leaderboard.noTeams")}</h3>
            <p className="empty-state-description">
              {t("pages.leaderboard.noTeamsDescription")}
            </p>
          </div>
        ) : activeTab === "leaderboard" ? (
          <div className="leaderboard-list">
            {data.leaderboard.map((entry, index) => (
              <div
                key={`${entry.teamName}-${entry.rank}`}
                className={`leaderboard-item ${entry.isFinished ? "finished" : ""} ${index === 0 ? "first-place" : ""} ${lastScan?.teamName === entry.teamName ? "just-scored" : ""} ${getRankChangeClass(entry.teamName)}`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="rank-badge-container">
                  <div className="rank-badge" style={getRankStyle(entry.rank, entry.isFinished)}>
                    {entry.rank === 1 && entry.isFinished ? "👑" : `#${entry.rank}`}
                  </div>
                  {getRankChangeIndicator(entry.teamName)}
                </div>

                <div className="team-info">
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    {entry.teamLogoUrl && (
                      <img
                        src={entry.teamLogoUrl}
                        alt={`${entry.teamName} logo`}
                        style={{ width: "28px", height: "28px", borderRadius: "4px", objectFit: "cover", flexShrink: 0 }}
                      />
                    )}
                    <span className="team-name-lb">{entry.teamName}</span>
                  </div>
                  <span className="team-status">
                    {entry.isFinished ? (
                      <span className="badge badge-success">{t("pages.leaderboard.finished")}</span>
                    ) : (
                      <span className="current-clue">{entry.currentClue || t("pages.leaderboard.notStarted")}</span>
                    )}
                  </span>
                </div>

                <div className="team-stats">
                  <div className="stat-box clues">
                    <span className="stat-num">{entry.nodesFound}</span>
                    <span className="stat-lbl">{t("pages.leaderboard.clues")}</span>
                  </div>
                  <div className="stat-box points">
                    <span className="stat-num">{entry.totalPoints}</span>
                    <span className="stat-lbl">{t("common.points")}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Performance Tab */
          <div className="performance-tab">
            {isLoadingPerformance ? (
              <div className="flex items-center justify-center py-12">
                <Spinner size="lg" />
              </div>
            ) : !performanceData || performanceData.teams.length === 0 ? (
              <div className="card empty-state">
                <div className="empty-state-icon">📊</div>
                <h3 className="empty-state-title">{t("pages.leaderboard.noPerformanceData")}</h3>
                <p className="empty-state-description">{t("pages.leaderboard.noPerformanceDataDescription")}</p>
              </div>
            ) : (() => {
              // Check if any team has scan data
              const teamsWithScans = performanceData.teams.filter((t) => t.clueTimings.length > 0);
              const hasAnyScans = teamsWithScans.length > 0;

              // Team colors - consistent across charts
              const teamColors = performanceData.teams.map((_, idx) =>
                `hsl(${(idx * 137.5) % 360}, 65%, 55%)`
              );

              return (
                <div className="space-y-4">
                  {/* Chart Legend */}
                  <div className="flex flex-wrap gap-2 sm:gap-3 p-3 sm:p-4 bg-elevated rounded-lg border">
                    {performanceData.teams.map((team, idx) => (
                      <div key={team.teamId} className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: teamColors[idx] }}
                        />
                        <span className="text-xs sm:text-sm text-secondary">{team.teamName}</span>
                      </div>
                    ))}
                  </div>

                  {!hasAnyScans ? (
                    <div className="bg-elevated rounded-lg border p-6 text-center">
                      <div className="text-3xl mb-2">⏳</div>
                      <p className="text-muted">{t("pages.leaderboard.noScansYet")}</p>
                    </div>
                  ) : (
                    <>
                      {/* Time per Clue Chart */}
                      <div className="bg-elevated rounded-lg border p-3 sm:p-4">
                        <h3 className="text-base sm:text-lg font-semibold text-primary mb-3 sm:mb-4 flex items-center gap-2">
                          <Clock size={18} />
                          {t("pages.leaderboard.timePerClue")}
                        </h3>
                        {performanceData.nodes.length === 0 ? (
                          <p className="text-muted text-sm text-center py-4">{t("pages.leaderboard.noCluesFound")}</p>
                        ) : (
                          <div className="space-y-4">
                            {performanceData.nodes.map((node) => {
                              const teamsWithTiming = performanceData.teams
                                .map((team, idx) => ({
                                  ...team,
                                  colorIdx: idx,
                                  timing: team.clueTimings.find((c) => c.nodeId === node.id),
                                }))
                                .filter((t) => t.timing);

                              if (teamsWithTiming.length === 0) return null;

                              const maxTime = Math.max(...teamsWithTiming.map((t) => t.timing?.timeFromPrevious || 0));

                              return (
                                <div key={node.id} className="space-y-2">
                                  <div className="text-xs sm:text-sm font-medium text-primary">{node.title}</div>
                                  <div className="space-y-1.5">
                                    {teamsWithTiming
                                      .sort((a, b) => (a.timing?.timeFromPrevious || 0) - (b.timing?.timeFromPrevious || 0))
                                      .map((team, rankIdx) => {
                                        const time = team.timing?.timeFromPrevious || 0;
                                        const width = maxTime > 0 ? (time / maxTime) * 100 : 0;

                                        return (
                                          <div key={team.teamId} className="flex items-center gap-2">
                                            <div className="w-14 sm:w-20 text-xs text-muted truncate flex items-center gap-1">
                                              {rankIdx === 0 && <span>🥇</span>}
                                              {rankIdx === 1 && <span>🥈</span>}
                                              {rankIdx === 2 && <span>🥉</span>}
                                              <span className="truncate">{team.teamName}</span>
                                            </div>
                                            <div className="flex-1 h-6 bg-tertiary rounded-md overflow-hidden">
                                              <div
                                                className="h-full rounded-md transition-all duration-500 flex items-center px-2"
                                                style={{
                                                  width: `${Math.max(width, 15)}%`,
                                                  backgroundColor: teamColors[team.colorIdx],
                                                }}
                                              >
                                                <span className="text-xs font-semibold text-white drop-shadow-sm whitespace-nowrap">
                                                  {time >= 60 ? `${Math.floor(time / 60)}m ${time % 60}s` : `${time}s`}
                                                </span>
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Total Time Comparison */}
                      <div className="bg-elevated rounded-lg border p-3 sm:p-4">
                        <h3 className="text-base sm:text-lg font-semibold text-primary mb-3 sm:mb-4 flex items-center gap-2">
                          <Clock size={18} />
                          {t("pages.leaderboard.totalTime")}
                        </h3>
                        {teamsWithScans.length === 0 ? (
                          <p className="text-muted text-sm text-center py-4">{t("pages.leaderboard.noTimesRecorded")}</p>
                        ) : (
                          <div className="space-y-2">
                            {teamsWithScans
                              .sort((a, b) => a.totalTime - b.totalTime)
                              .map((team, rankIdx) => {
                                const originalIdx = performanceData.teams.findIndex((t) => t.teamId === team.teamId);
                                const maxTime = Math.max(...teamsWithScans.map((t) => t.totalTime));
                                const width = maxTime > 0 ? (team.totalTime / maxTime) * 100 : 0;
                                const minutes = Math.floor(team.totalTime / 60);
                                const seconds = team.totalTime % 60;

                                return (
                                  <div key={team.teamId} className="flex items-center gap-2 sm:gap-3">
                                    <div className="w-6 sm:w-8 text-center flex-shrink-0">
                                      {rankIdx === 0 && <span className="text-lg">🥇</span>}
                                      {rankIdx === 1 && <span className="text-lg">🥈</span>}
                                      {rankIdx === 2 && <span className="text-lg">🥉</span>}
                                      {rankIdx > 2 && <span className="text-sm font-bold text-muted">#{rankIdx + 1}</span>}
                                    </div>
                                    <div className="w-16 sm:w-24 text-xs sm:text-sm font-medium text-secondary truncate">{team.teamName}</div>
                                    <div className="flex-1 h-7 sm:h-8 bg-tertiary rounded-md overflow-hidden">
                                      <div
                                        className="h-full rounded-md transition-all duration-500 flex items-center px-2"
                                        style={{
                                          width: `${Math.max(width, 15)}%`,
                                          backgroundColor: rankIdx === 0 ? "var(--color-success)" : teamColors[originalIdx],
                                        }}
                                      >
                                        <span className="text-xs sm:text-sm font-bold text-white drop-shadow-sm whitespace-nowrap">
                                          {minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })()}
          </div>
        )}       

        {/* Footer */}
        <div className="leaderboard-footer mt-6">
          <p className="text-muted text-center" style={{ fontSize: "0.875rem" }}>
            {t("pages.leaderboard.lastUpdated")}: {new Date(data.updatedAt).toLocaleTimeString()}
            {isConnected && ` (${t("pages.leaderboard.realTime")})`}
          </p>

          <div className="flex justify-center gap-3 mt-4">
            <button
              onClick={handleRefresh}
              className="btn btn-secondary"
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <>
                  <Spinner size="sm" />
                  <span>{t("pages.leaderboard.refreshing")}</span>
                </>
              ) : (
                <>
                  <RefreshCw size={16} />
                  {t("pages.leaderboard.refresh")}
                </>
              )}
            </button>
          </div>

          <div className="text-center mt-4">
            <button type="button" onClick={handleBack} className="back-link">
              <ArrowLeft size={16} />
              {t("common.back")}
            </button>
          </div>
        </div>

        {/* Feedback Section - Show for active and completed games */}
        {feedbackData && (
          <FeedbackSection
            feedbackData={feedbackData}
            showFeedback={showFeedback}
            onToggle={() => setShowFeedback(!showFeedback)}
          />
        )}
      </div>
    </div>
    </RevealAnimation>
  );
}
