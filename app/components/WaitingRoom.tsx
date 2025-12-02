import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "~/i18n/I18nContext";
import "./WaitingRoom.css";

interface WaitingTeam {
  id: string;
  name: string;
  logoUrl: string | null;
  joinedAt: string;
  isConnected?: boolean;
}

interface WaitingRoomProps {
  gameName: string;
  gameLogoUrl: string | null;
  gameSlug: string;
  mode: "player" | "spectator";
  teamName?: string;
  teamLogoUrl?: string | null;
  onGameStart: () => void;
}

export function WaitingRoom({
  gameName,
  gameLogoUrl,
  gameSlug,
  mode,
  teamName,
  teamLogoUrl,
  onGameStart,
}: WaitingRoomProps) {
  const { t } = useTranslation();
  const [teams, setTeams] = useState<WaitingTeam[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [dots, setDots] = useState("");
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Animated dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // SSE connection for game status and team updates
  const connectSSE = useCallback(() => {
    if (eventSourceRef.current) return;

    const eventSource = new EventSource(`/api/v1/game/${gameSlug}/status/stream`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
    };

    eventSource.addEventListener("status", (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.status === "active") {
          onGameStart();
        }
      } catch (e) {
        console.error("Failed to parse status event", e);
      }
    });

    eventSource.addEventListener("teams", (event) => {
      try {
        const data = JSON.parse(event.data);
        setTeams(data.teams || []);
      } catch (e) {
        console.error("Failed to parse teams event", e);
      }
    });

    eventSource.addEventListener("team_joined", (event) => {
      try {
        const newTeam = JSON.parse(event.data) as WaitingTeam;
        setTeams((prev) => {
          // Avoid duplicates
          if (prev.some((t) => t.id === newTeam.id)) return prev;
          return [...prev, { ...newTeam, isConnected: true }];
        });
      } catch (e) {
        console.error("Failed to parse team_joined event", e);
      }
    });

    eventSource.addEventListener("team_connection", (event) => {
      try {
        const data = JSON.parse(event.data) as { teamId: string; isConnected: boolean };
        setTeams((prev) =>
          prev.map((t) => (t.id === data.teamId ? { ...t, isConnected: data.isConnected } : t))
        );
      } catch (e) {
        console.error("Failed to parse team_connection event", e);
      }
    });

    eventSource.onerror = () => {
      setIsConnected(false);
      eventSource.close();
      eventSourceRef.current = null;

      // Reconnect after 3 seconds
      reconnectTimeoutRef.current = setTimeout(connectSSE, 3000);
    };
  }, [gameSlug, onGameStart]);

  useEffect(() => {
    connectSSE();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connectSSE]);

  // Reconnect when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && !eventSourceRef.current) {
        connectSSE();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [connectSSE]);

  return (
    <div className="waiting-room">
      {/* Animated background */}
      <div className="waiting-bg">
        <div className="waiting-bg-circle c1" />
        <div className="waiting-bg-circle c2" />
        <div className="waiting-bg-circle c3" />
      </div>

      <div className="waiting-content">
        {/* Game logo and name */}
        <div className="waiting-header animate-fade-in">
          {gameLogoUrl ? (
            <img src={gameLogoUrl} alt={gameName} className="waiting-game-logo" />
          ) : (
            <div className="waiting-game-logo-placeholder">
              <span>🎯</span>
            </div>
          )}
          <h1 className="waiting-game-name">{gameName}</h1>
        </div>

        {/* Status message */}
        <div className="waiting-status animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <div className="waiting-pulse-ring">
            <div className="waiting-pulse-dot" />
          </div>
          <p className="waiting-message">
            {t("components.waitingRoom.waitingForGame")}{dots}
          </p>
        </div>

        {/* Player info (if in player mode) */}
        {mode === "player" && teamName && (
          <div className="waiting-player-card animate-fade-in" style={{ animationDelay: "0.2s" }}>
            <div className="waiting-player-badge">
              {teamLogoUrl ? (
                <img src={teamLogoUrl} alt={teamName} />
              ) : (
                <span>{teamName.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="waiting-player-info">
              <span className="waiting-player-label">{t("components.waitingRoom.yourTeam")}</span>
              <span className="waiting-player-name">{teamName}</span>
            </div>
            <div className="waiting-player-status">
              <span className="waiting-ready-badge">{t("components.waitingRoom.ready")}</span>
            </div>
          </div>
        )}

        {/* Teams list */}
        <div className="waiting-teams animate-fade-in" style={{ animationDelay: "0.3s" }}>
          <h3 className="waiting-teams-title">
            <span className="waiting-teams-icon">👥</span>
            {t("components.waitingRoom.teamsReady")} ({teams.filter(t => t.isConnected !== false).length} {t("components.waitingRoom.of")} {teams.length})
          </h3>
          <div className="waiting-teams-list">
            {teams.length === 0 ? (
              <p className="waiting-teams-empty">{t("components.waitingRoom.noTeamsYet")}</p>
            ) : (
              teams.map((team, index) => (
                <div
                  key={team.id}
                  className={`waiting-team-item animate-pop-in ${team.isConnected === false ? "disconnected" : ""}`}
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="waiting-team-status-dot">
                    <span className={`status-dot ${team.isConnected !== false ? "online" : "offline"}`} />
                  </div>
                  <div className="waiting-team-avatar">
                    {team.logoUrl ? (
                      <img src={team.logoUrl} alt={team.name} />
                    ) : (
                      <span>{team.name.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <span className="waiting-team-name">{team.name}</span>
                  {team.name === teamName && (
                    <span className="waiting-team-you">{t("components.waitingRoom.you")}</span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Connection status */}
        <div className="waiting-connection">
          <span className={`waiting-connection-dot ${isConnected ? "connected" : ""}`} />
          <span className="waiting-connection-text">
            {isConnected ? t("components.waitingRoom.connected") : t("components.waitingRoom.connecting")}
          </span>
        </div>
      </div>
    </div>
  );
}
