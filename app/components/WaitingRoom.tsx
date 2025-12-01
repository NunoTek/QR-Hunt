import { useCallback, useEffect, useRef, useState } from "react";

interface WaitingTeam {
  id: string;
  name: string;
  logoUrl: string | null;
  joinedAt: string;
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
          return [...prev, newTeam];
        });
      } catch (e) {
        console.error("Failed to parse team_joined event", e);
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
            Waiting for the game to start{dots}
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
              <span className="waiting-player-label">Your Team</span>
              <span className="waiting-player-name">{teamName}</span>
            </div>
            <div className="waiting-player-status">
              <span className="waiting-ready-badge">Ready</span>
            </div>
          </div>
        )}

        {/* Teams list */}
        <div className="waiting-teams animate-fade-in" style={{ animationDelay: "0.3s" }}>
          <h3 className="waiting-teams-title">
            <span className="waiting-teams-icon">👥</span>
            Teams Ready ({teams.length})
          </h3>
          <div className="waiting-teams-list">
            {teams.length === 0 ? (
              <p className="waiting-teams-empty">No teams have joined yet</p>
            ) : (
              teams.map((team, index) => (
                <div
                  key={team.id}
                  className="waiting-team-item animate-pop-in"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="waiting-team-avatar">
                    {team.logoUrl ? (
                      <img src={team.logoUrl} alt={team.name} />
                    ) : (
                      <span>{team.name.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <span className="waiting-team-name">{team.name}</span>
                  {team.name === teamName && (
                    <span className="waiting-team-you">You</span>
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
            {isConnected ? "Connected" : "Connecting..."}
          </span>
        </div>
      </div>

      <style>{`
        .waiting-room {
          position: fixed;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-primary);
          z-index: 1000;
          overflow: hidden;
        }

        .waiting-bg {
          position: absolute;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
        }

        .waiting-bg-circle {
          position: absolute;
          border-radius: 50%;
          background: var(--color-primary);
          opacity: 0.1;
          animation: float 20s ease-in-out infinite;
        }

        .waiting-bg-circle.c1 {
          width: 400px;
          height: 400px;
          top: -100px;
          right: -100px;
          animation-delay: 0s;
        }

        .waiting-bg-circle.c2 {
          width: 300px;
          height: 300px;
          bottom: -50px;
          left: -50px;
          animation-delay: -7s;
        }

        .waiting-bg-circle.c3 {
          width: 200px;
          height: 200px;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          animation-delay: -14s;
        }

        @keyframes float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -30px) scale(1.05); }
          66% { transform: translate(-20px, 20px) scale(0.95); }
        }

        .waiting-content {
          position: relative;
          width: 100%;
          max-width: 400px;
          padding: 1.5rem;
          text-align: center;
        }

        .waiting-header {
          margin-bottom: 2rem;
        }

        .waiting-game-logo {
          width: 80px;
          height: 80px;
          border-radius: 1rem;
          object-fit: cover;
          margin: 0 auto 1rem;
          box-shadow: 0 8px 32px rgba(99, 102, 241, 0.3);
        }

        .waiting-game-logo-placeholder {
          width: 80px;
          height: 80px;
          border-radius: 1rem;
          background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1rem;
          font-size: 2.5rem;
          box-shadow: 0 8px 32px rgba(99, 102, 241, 0.3);
        }

        .waiting-game-name {
          font-size: 1.75rem;
          font-weight: 800;
          color: var(--text-primary);
          margin: 0;
        }

        .waiting-status {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .waiting-pulse-ring {
          position: relative;
          width: 60px;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .waiting-pulse-ring::before,
        .waiting-pulse-ring::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 50%;
          border: 2px solid var(--color-primary);
          animation: pulse-ring 2s ease-out infinite;
        }

        .waiting-pulse-ring::after {
          animation-delay: 1s;
        }

        @keyframes pulse-ring {
          0% { transform: scale(0.5); opacity: 1; }
          100% { transform: scale(1.5); opacity: 0; }
        }

        .waiting-pulse-dot {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: var(--color-primary);
          animation: pulse-dot 2s ease-in-out infinite;
        }

        @keyframes pulse-dot {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.2); }
        }

        .waiting-message {
          font-size: 1.125rem;
          color: var(--text-secondary);
          margin: 0;
          min-width: 280px;
        }

        .waiting-player-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: var(--bg-elevated);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          margin-bottom: 1.5rem;
        }

        .waiting-player-badge {
          width: 48px;
          height: 48px;
          border-radius: var(--radius);
          background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
          font-weight: 700;
          color: white;
          overflow: hidden;
        }

        .waiting-player-badge img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .waiting-player-info {
          flex: 1;
          text-align: left;
        }

        .waiting-player-label {
          display: block;
          font-size: 0.75rem;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .waiting-player-name {
          display: block;
          font-size: 1rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .waiting-ready-badge {
          padding: 0.25rem 0.75rem;
          background: var(--color-success);
          color: white;
          font-size: 0.75rem;
          font-weight: 600;
          border-radius: 9999px;
          text-transform: uppercase;
        }

        .waiting-teams {
          background: var(--bg-elevated);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          padding: 1rem;
        }

        .waiting-teams-title {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0 0 1rem;
        }

        .waiting-teams-icon {
          font-size: 1rem;
        }

        .waiting-teams-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          justify-content: center;
          max-height: 200px;
          overflow-y: auto;
        }

        .waiting-teams-empty {
          color: var(--text-muted);
          font-size: 0.875rem;
          margin: 0;
        }

        .waiting-team-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0.75rem;
          background: var(--bg-tertiary);
          border-radius: var(--radius);
        }

        .waiting-team-avatar {
          width: 24px;
          height: 24px;
          border-radius: 4px;
          background: var(--color-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: 600;
          color: white;
          overflow: hidden;
        }

        .waiting-team-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .waiting-team-name {
          font-size: 0.8125rem;
          font-weight: 500;
          color: var(--text-primary);
        }

        .waiting-team-you {
          padding: 0.125rem 0.375rem;
          background: var(--color-primary);
          color: white;
          font-size: 0.625rem;
          font-weight: 600;
          border-radius: 4px;
          text-transform: uppercase;
        }

        .waiting-connection {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          margin-top: 1.5rem;
        }

        .waiting-connection-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--color-warning);
          transition: background 0.3s;
        }

        .waiting-connection-dot.connected {
          background: var(--color-success);
        }

        .waiting-connection-text {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
      `}</style>
    </div>
  );
}
