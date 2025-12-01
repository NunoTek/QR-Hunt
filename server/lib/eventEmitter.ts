import { EventEmitter } from "events";

// Global event emitter for real-time updates
class GameEventEmitter extends EventEmitter {
  private static instance: GameEventEmitter;

  private constructor() {
    super();
    this.setMaxListeners(1000); // Allow many concurrent SSE connections
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
}

export const gameEvents = GameEventEmitter.getInstance();
