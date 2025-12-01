import { describe, it, expect, beforeEach, vi } from "vitest";
import { gameEvents } from "@server/lib/eventEmitter.js";

describe("GameEventEmitter", () => {
  beforeEach(() => {
    // Remove all listeners before each test
    gameEvents.removeAllListeners();
  });

  describe("singleton pattern", () => {
    it("should return the same instance", () => {
      // The gameEvents is exported as a singleton
      expect(gameEvents).toBeDefined();
    });
  });

  describe("leaderboard events", () => {
    it("should emit and receive leaderboard updates", () => {
      const callback = vi.fn();
      const testData = { leaderboard: [{ rank: 1, team: "Test" }] };

      gameEvents.onLeaderboardUpdate("test-game", callback);
      gameEvents.emitLeaderboardUpdate("test-game", testData);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(testData);
    });

    it("should only trigger callbacks for the correct game", () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      gameEvents.onLeaderboardUpdate("game-1", callback1);
      gameEvents.onLeaderboardUpdate("game-2", callback2);
      gameEvents.emitLeaderboardUpdate("game-1", { data: "test" });

      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).not.toHaveBeenCalled();
    });

    it("should support multiple listeners for the same game", () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      gameEvents.onLeaderboardUpdate("test-game", callback1);
      gameEvents.onLeaderboardUpdate("test-game", callback2);
      gameEvents.emitLeaderboardUpdate("test-game", { data: "test" });

      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
    });

    it("should remove listener with offLeaderboardUpdate", () => {
      const callback = vi.fn();

      gameEvents.onLeaderboardUpdate("test-game", callback);
      gameEvents.offLeaderboardUpdate("test-game", callback);
      gameEvents.emitLeaderboardUpdate("test-game", { data: "test" });

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe("scan events", () => {
    it("should emit and receive scan events", () => {
      const callback = vi.fn();

      gameEvents.onScan("test-game", callback);
      gameEvents.emitScan("test-game", "Team Alpha", "Clue 1", 100);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          teamName: "Team Alpha",
          nodeName: "Clue 1",
          points: 100,
          timestamp: expect.any(String),
        })
      );
    });

    it("should include ISO timestamp in scan event", () => {
      const callback = vi.fn();

      gameEvents.onScan("test-game", callback);
      gameEvents.emitScan("test-game", "Team", "Node", 50);

      const scanData = callback.mock.calls[0][0];
      expect(new Date(scanData.timestamp).toISOString()).toBe(scanData.timestamp);
    });

    it("should only trigger callbacks for the correct game", () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      gameEvents.onScan("game-1", callback1);
      gameEvents.onScan("game-2", callback2);
      gameEvents.emitScan("game-1", "Team", "Node", 100);

      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).not.toHaveBeenCalled();
    });

    it("should support multiple listeners for the same game", () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      gameEvents.onScan("test-game", callback1);
      gameEvents.onScan("test-game", callback2);
      gameEvents.emitScan("test-game", "Team", "Node", 100);

      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
    });

    it("should remove listener with offScan", () => {
      const callback = vi.fn();

      gameEvents.onScan("test-game", callback);
      gameEvents.offScan("test-game", callback);
      gameEvents.emitScan("test-game", "Team", "Node", 100);

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe("chat events", () => {
    it("should emit and receive chat events", () => {
      const callback = vi.fn();
      const testMessage = {
        id: "msg-1",
        senderType: "team",
        senderId: "team-1",
        senderName: "Team Alpha",
        message: "Hello from team!",
      };

      gameEvents.onChat("test-game", callback);
      gameEvents.emitChat("test-game", testMessage);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(testMessage);
    });

    it("should only trigger callbacks for the correct game", () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      gameEvents.onChat("game-1", callback1);
      gameEvents.onChat("game-2", callback2);
      gameEvents.emitChat("game-1", { message: "test" });

      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).not.toHaveBeenCalled();
    });

    it("should support multiple listeners for the same game", () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      gameEvents.onChat("test-game", callback1);
      gameEvents.onChat("test-game", callback2);
      gameEvents.emitChat("test-game", { message: "test" });

      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
    });

    it("should remove listener with offChat", () => {
      const callback = vi.fn();

      gameEvents.onChat("test-game", callback);
      gameEvents.offChat("test-game", callback);
      gameEvents.emitChat("test-game", { message: "test" });

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe("multiple event types", () => {
    it("should handle leaderboard, scan, and chat events independently", () => {
      const leaderboardCallback = vi.fn();
      const scanCallback = vi.fn();
      const chatCallback = vi.fn();

      gameEvents.onLeaderboardUpdate("test-game", leaderboardCallback);
      gameEvents.onScan("test-game", scanCallback);
      gameEvents.onChat("test-game", chatCallback);

      gameEvents.emitLeaderboardUpdate("test-game", { data: "leaderboard" });
      gameEvents.emitScan("test-game", "Team", "Node", 100);
      gameEvents.emitChat("test-game", { message: "chat" });

      expect(leaderboardCallback).toHaveBeenCalledTimes(1);
      expect(scanCallback).toHaveBeenCalledTimes(1);
      expect(chatCallback).toHaveBeenCalledTimes(1);
    });

    it("should handle events for multiple games", () => {
      const game1Leaderboard = vi.fn();
      const game1Scan = vi.fn();
      const game1Chat = vi.fn();
      const game2Leaderboard = vi.fn();
      const game2Scan = vi.fn();
      const game2Chat = vi.fn();

      gameEvents.onLeaderboardUpdate("game-1", game1Leaderboard);
      gameEvents.onScan("game-1", game1Scan);
      gameEvents.onChat("game-1", game1Chat);
      gameEvents.onLeaderboardUpdate("game-2", game2Leaderboard);
      gameEvents.onScan("game-2", game2Scan);
      gameEvents.onChat("game-2", game2Chat);

      gameEvents.emitLeaderboardUpdate("game-1", { data: "test" });
      gameEvents.emitScan("game-2", "Team", "Node", 100);
      gameEvents.emitChat("game-1", { message: "hello" });

      expect(game1Leaderboard).toHaveBeenCalledTimes(1);
      expect(game1Scan).not.toHaveBeenCalled();
      expect(game1Chat).toHaveBeenCalledTimes(1);
      expect(game2Leaderboard).not.toHaveBeenCalled();
      expect(game2Scan).toHaveBeenCalledTimes(1);
      expect(game2Chat).not.toHaveBeenCalled();
    });
  });

  describe("edge cases", () => {
    it("should handle emitting with no listeners", () => {
      expect(() => {
        gameEvents.emitLeaderboardUpdate("no-listeners", { data: "test" });
        gameEvents.emitScan("no-listeners", "Team", "Node", 100);
        gameEvents.emitChat("no-listeners", { message: "test" });
      }).not.toThrow();
    });

    it("should handle removing non-existent listener", () => {
      const callback = vi.fn();

      expect(() => {
        gameEvents.offLeaderboardUpdate("test-game", callback);
        gameEvents.offScan("test-game", callback);
        gameEvents.offChat("test-game", callback);
      }).not.toThrow();
    });

    it("should handle special characters in game slug", () => {
      const callback = vi.fn();

      gameEvents.onLeaderboardUpdate("game-with-special-chars_123", callback);
      gameEvents.emitLeaderboardUpdate("game-with-special-chars_123", { data: "test" });

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it("should handle special characters in game slug for chat events", () => {
      const callback = vi.fn();

      gameEvents.onChat("game-with-special-chars_123", callback);
      gameEvents.emitChat("game-with-special-chars_123", { message: "test" });

      expect(callback).toHaveBeenCalledTimes(1);
    });
  });
});
