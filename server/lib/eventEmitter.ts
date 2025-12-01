import { EventEmitter } from "events";

// Team connection tracking
interface TeamConnection {
  teamId: string;
  teamName: string;
  lastHeartbeat: number;
  isConnected: boolean;
}

// Connection timeout in milliseconds (15 seconds)
const CONNECTION_TIMEOUT_MS = 15000;

// Global event emitter for real-time updates
class GameEventEmitter extends EventEmitter {
  private static instance: GameEventEmitter;
  private teamConnections: Map<string, Map<string, TeamConnection>> = new Map(); // gameSlug -> teamId -> connection
  private cleanupInterval: NodeJS.Timeout | null = null;

  private constructor() {
    super();
    this.setMaxListeners(1000); // Allow many concurrent SSE connections
    this.startConnectionCleanup();
  }

  // Periodically check for disconnected teams
  private startConnectionCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      this.teamConnections.forEach((teams, gameSlug) => {
        teams.forEach((connection, teamId) => {
          if (connection.isConnected && now - connection.lastHeartbeat > CONNECTION_TIMEOUT_MS) {
            connection.isConnected = false;
            this.emitTeamConnectionStatus(gameSlug, {
              teamId,
              teamName: connection.teamName,
              isConnected: false,
            });
          }
        });
      });
    }, 5000); // Check every 5 seconds
  }

  static getInstance(): GameEventEmitter {
    if (!GameEventEmitter.instance) {
      GameEventEmitter.instance = new GameEventEmitter();
    }
    return GameEventEmitter.instance;
  }

  emitLeaderboardUpdate(gameSlug: string, data: unknown): void {
    this.emit(`leaderboard:${gameSlug}`, data);
  }

  onLeaderboardUpdate(gameSlug: string, callback: (data: unknown) => void): void {
    this.on(`leaderboard:${gameSlug}`, callback);
  }

  offLeaderboardUpdate(gameSlug: string, callback: (data: unknown) => void): void {
    this.off(`leaderboard:${gameSlug}`, callback);
  }

  emitScan(gameSlug: string, teamName: string, nodeName: string, points: number): void {
    this.emit(`scan:${gameSlug}`, { teamName, nodeName, points, timestamp: new Date().toISOString() });
  }

  onScan(gameSlug: string, callback: (data: { teamName: string; nodeName: string; points: number; timestamp: string }) => void): void {
    this.on(`scan:${gameSlug}`, callback);
  }

  offScan(gameSlug: string, callback: (data: { teamName: string; nodeName: string; points: number; timestamp: string }) => void): void {
    this.off(`scan:${gameSlug}`, callback);
  }

  emitChat(gameSlug: string, message: unknown): void {
    this.emit(`chat:${gameSlug}`, message);
  }

  onChat(gameSlug: string, callback: (message: unknown) => void): void {
    this.on(`chat:${gameSlug}`, callback);
  }

  offChat(gameSlug: string, callback: (message: unknown) => void): void {
    this.off(`chat:${gameSlug}`, callback);
  }

  // Game status events (for waiting room)
  emitGameStatus(gameSlug: string, status: string): void {
    this.emit(`gamestatus:${gameSlug}`, { status, timestamp: new Date().toISOString() });
  }

  onGameStatus(gameSlug: string, callback: (data: { status: string; timestamp: string }) => void): void {
    this.on(`gamestatus:${gameSlug}`, callback);
  }

  offGameStatus(gameSlug: string, callback: (data: { status: string; timestamp: string }) => void): void {
    this.off(`gamestatus:${gameSlug}`, callback);
  }

  // Team joined events (for waiting room)
  emitTeamJoined(gameSlug: string, team: { id: string; name: string; logoUrl: string | null }): void {
    this.emit(`teamjoined:${gameSlug}`, { ...team, joinedAt: new Date().toISOString() });
  }

  onTeamJoined(gameSlug: string, callback: (data: { id: string; name: string; logoUrl: string | null; joinedAt: string }) => void): void {
    this.on(`teamjoined:${gameSlug}`, callback);
  }

  offTeamJoined(gameSlug: string, callback: (data: { id: string; name: string; logoUrl: string | null; joinedAt: string }) => void): void {
    this.off(`teamjoined:${gameSlug}`, callback);
  }

  // Team connection/heartbeat management
  teamHeartbeat(gameSlug: string, teamId: string, teamName: string): void {
    if (!this.teamConnections.has(gameSlug)) {
      this.teamConnections.set(gameSlug, new Map());
    }
    const teams = this.teamConnections.get(gameSlug)!;
    const existing = teams.get(teamId);
    const wasDisconnected = !existing || !existing.isConnected;

    teams.set(teamId, {
      teamId,
      teamName,
      lastHeartbeat: Date.now(),
      isConnected: true,
    });

    // Emit connection status if team just reconnected
    if (wasDisconnected) {
      this.emitTeamConnectionStatus(gameSlug, { teamId, teamName, isConnected: true });
    }
  }

  getTeamConnections(gameSlug: string): Array<{ teamId: string; teamName: string; isConnected: boolean }> {
    const teams = this.teamConnections.get(gameSlug);
    if (!teams) return [];
    return Array.from(teams.values()).map((t) => ({
      teamId: t.teamId,
      teamName: t.teamName,
      isConnected: t.isConnected,
    }));
  }

  clearGameConnections(gameSlug: string): void {
    this.teamConnections.delete(gameSlug);
  }

  // Team connection status events
  emitTeamConnectionStatus(gameSlug: string, data: { teamId: string; teamName: string; isConnected: boolean }): void {
    this.emit(`teamconnection:${gameSlug}`, { ...data, timestamp: new Date().toISOString() });
  }

  onTeamConnectionStatus(
    gameSlug: string,
    callback: (data: { teamId: string; teamName: string; isConnected: boolean; timestamp: string }) => void
  ): void {
    this.on(`teamconnection:${gameSlug}`, callback);
  }

  offTeamConnectionStatus(
    gameSlug: string,
    callback: (data: { teamId: string; teamName: string; isConnected: boolean; timestamp: string }) => void
  ): void {
    this.off(`teamconnection:${gameSlug}`, callback);
  }
}

export const gameEvents = GameEventEmitter.getInstance();
