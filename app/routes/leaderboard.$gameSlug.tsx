import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import { useEffect, useState, useCallback, useRef } from "react";
import { getApiUrl } from "~/lib/api";
import { Spinner } from "~/components/Loading";
import { useToast } from "~/components/Toast";
import { playNotificationSound } from "~/lib/sounds";

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  return [
    { title: data?.game?.name ? `Leaderboard - ${data.game.name}` : "Leaderboard - QR Hunt" },
  ];
};

interface LeaderboardEntry {
  rank: number;
  teamName: string;
  teamLogoUrl: string | null;
  nodesFound: number;
  totalPoints: number;
  isFinished: boolean;
  currentClue: string | null;
}

interface LeaderboardData {
  game: {
    id: string;
    name: string;
    slug: string;
    status: string;
    logoUrl: string | null;
  };
  leaderboard: LeaderboardEntry[];
  updatedAt: string;
}

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
  const eventSourceRef = useRef<EventSource | null>(null);
  const toast = useToast();

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
        setData(newData);
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
  }, [data.game.slug, data.game.status, toast]);

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
        setData(newData);
      }
    } catch (e) {
      console.error("Failed to refresh", e);
    }
    setTimeout(() => setIsRefreshing(false), 500);
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

  return (
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
                {isConnected ? "Live Updates" : data.game.status === "active" ? "Connecting..." : "Leaderboard"}
              </p>
            </div>
          </div>
          <span className={`badge ${data.game.status === "active" ? "badge-success" : data.game.status === "completed" ? "badge-info" : "badge-warning"}`}>
            {data.game.status}
          </span>
        </div>

        {/* Live scan notification */}
        {lastScan && (
          <div className="scan-notification animate-pop-in">
            <span className="scan-icon">🎯</span>
            <span><strong>{lastScan.teamName}</strong> found a clue! <span className="points">+{lastScan.points}</span></span>
          </div>
        )}

        {/* Leaderboard */}
        {data.leaderboard.length === 0 ? (
          <div className="card empty-state">
            <div className="empty-state-icon">🏁</div>
            <h3 className="empty-state-title">No teams yet</h3>
            <p className="empty-state-description">
              Teams will appear here once they start scanning QR codes.
            </p>
          </div>
        ) : (
          <div className="leaderboard-list">
            {data.leaderboard.map((entry, index) => (
              <div
                key={`${entry.teamName}-${entry.rank}`}
                className={`leaderboard-item ${entry.isFinished ? "finished" : ""} ${index === 0 ? "first-place" : ""} ${lastScan?.teamName === entry.teamName ? "just-scored" : ""}`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="rank-badge" style={getRankStyle(entry.rank, entry.isFinished)}>
                  {entry.rank === 1 && entry.isFinished ? "👑" : `#${entry.rank}`}
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
                      <span className="badge badge-success">Finished!</span>
                    ) : (
                      <span className="current-clue">{entry.currentClue || "Not started"}</span>
                    )}
                  </span>
                </div>

                <div className="team-stats">
                  <div className="stat-box">
                    <span className="stat-num">{entry.nodesFound}</span>
                    <span className="stat-lbl">clues</span>
                  </div>
                  <div className="stat-box points">
                    <span className="stat-num">{entry.totalPoints}</span>
                    <span className="stat-lbl">pts</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="leaderboard-footer mt-6">
          <p className="text-muted text-center" style={{ fontSize: "0.875rem" }}>
            Last updated: {new Date(data.updatedAt).toLocaleTimeString()}
            {isConnected && " (real-time)"}
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
                  <span>Refreshing...</span>
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M23 4v6h-6" />
                    <path d="M1 20v-6h6" />
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                  </svg>
                  Refresh
                </>
              )}
            </button>
          </div>

          <div className="text-center mt-4">
            <Link to="/" className="back-link">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              Back to home
            </Link>
          </div>
        </div>
      </div>

      <style>{`
        .leaderboard-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: 0.75rem;
        }
        .leaderboard-title {
          font-size: 1.5rem;
          font-weight: 800;
          color: var(--text-primary);
        }
        .leaderboard-subtitle {
          display: flex;
          align-items: center;
          color: var(--text-muted);
          font-size: 0.875rem;
        }
        .pulse-dot.connected {
          animation: pulse-glow 2s infinite;
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4); }
          50% { box-shadow: 0 0 0 8px rgba(34, 197, 94, 0); }
        }
        .scan-notification {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.875rem 1rem;
          background: var(--color-info-bg);
          border: 1px solid var(--color-info-border);
          border-radius: var(--radius-lg);
          margin-bottom: 1rem;
          font-size: 0.875rem;
          color: var(--text-primary);
        }
        .scan-icon {
          font-size: 1.25rem;
        }
        .scan-notification .points {
          color: var(--color-primary);
          font-weight: 700;
        }
        .leaderboard-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .leaderboard-item {
          display: flex;
          align-items: center;
          gap: 0.875rem;
          padding: 0.875rem 1rem;
          background: var(--bg-elevated);
          border-radius: var(--radius-lg);
          border: 1px solid var(--border-color);
          box-shadow: var(--shadow);
          animation: slideInUp var(--transition-normal) ease backwards;
          transition: transform var(--transition-fast), box-shadow var(--transition-fast), background var(--transition-fast), border-color var(--transition-fast);
        }
        .leaderboard-item:hover {
          transform: translateX(4px);
          box-shadow: var(--shadow-md);
          border-color: var(--border-color-strong);
        }
        .leaderboard-item.first-place {
          border: 2px solid var(--color-warning);
        }
        .leaderboard-item.finished {
          background: var(--color-success-bg);
        }
        .leaderboard-item.just-scored {
          animation: highlight-pulse 1s ease;
        }
        @keyframes highlight-pulse {
          0% { background: var(--color-info-bg); transform: scale(1.02); }
          100% { background: var(--bg-elevated); transform: scale(1); }
        }
        .rank-badge {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 2.25rem;
          height: 2.25rem;
          border-radius: 50%;
          font-weight: 700;
          font-size: 0.75rem;
          flex-shrink: 0;
        }
        .team-info {
          flex: 1;
          min-width: 0;
        }
        .team-name-lb {
          display: block;
          font-weight: 600;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-size: 0.9375rem;
        }
        .team-status {
          display: block;
          margin-top: 0.125rem;
        }
        .current-clue {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        .team-stats {
          display: flex;
          gap: 0.875rem;
          flex-shrink: 0;
        }
        .stat-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          min-width: 2.75rem;
        }
        .stat-box.points {
          background: var(--bg-tertiary);
          padding: 0.5rem 0.75rem;
          border-radius: var(--radius);
        }
        .stat-num {
          font-size: 1.0625rem;
          font-weight: 700;
          color: var(--text-primary);
          line-height: 1;
        }
        .stat-box.points .stat-num {
          color: var(--color-primary);
        }
        .stat-lbl {
          font-size: 0.625rem;
          text-transform: uppercase;
          color: var(--text-muted);
          letter-spacing: 0.05em;
        }
        .back-link {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--text-muted);
          font-size: 0.875rem;
          transition: color var(--transition-fast);
        }
        .back-link:hover {
          color: var(--color-primary);
          text-decoration: none;
        }

        /* Tablet (640px+) */
        @media (min-width: 640px) {
          .leaderboard-title {
            font-size: 1.75rem;
          }
          .leaderboard-item {
            padding: 1rem 1.25rem;
            gap: 1rem;
          }
          .rank-badge {
            width: 2.5rem;
            height: 2.5rem;
            font-size: 0.875rem;
          }
          .team-name-lb {
            font-size: 1rem;
          }
          .stat-num {
            font-size: 1.125rem;
          }
          .team-stats {
            gap: 1rem;
          }
          .stat-box {
            min-width: 3rem;
          }
          .scan-notification {
            padding: 1rem 1.25rem;
            font-size: 0.9375rem;
          }
          .scan-icon {
            font-size: 1.5rem;
          }
        }

        /* Desktop (1024px+) */
        @media (min-width: 1024px) {
          .leaderboard-title {
            font-size: 2rem;
          }
          .leaderboard-item {
            padding: 1.25rem 1.5rem;
          }
          .stat-num {
            font-size: 1.25rem;
          }
        }

        /* Mobile adjustments for team stats */
        @media (max-width: 639px) {
          .leaderboard-item {
            flex-wrap: wrap;
          }
          .team-info {
            flex: 1 1 calc(100% - 3.5rem);
            order: 1;
          }
          .team-stats {
            order: 2;
            width: 100%;
            justify-content: flex-end;
            margin-top: 0.5rem;
            padding-top: 0.5rem;
            border-top: 1px solid var(--border-color);
          }
        }
      `}</style>
    </div>
  );
}
