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
}

export const gameEvents = GameEventEmitter.getInstance();
