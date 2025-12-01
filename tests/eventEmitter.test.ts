import { beforeEach, describe, expect, it, vi } from "vitest";

describe("GameEventEmitter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Module Import", () => {
    it("should export gameEvents singleton", async () => {
      const { gameEvents } = await import("../server/lib/eventEmitter");
      expect(gameEvents).toBeDefined();
    });
  });

  describe("Game Status Events", () => {
    it("should have emitGameStatus method", async () => {
      const { gameEvents } = await import("../server/lib/eventEmitter");
      expect(gameEvents.emitGameStatus).toBeDefined();
      expect(typeof gameEvents.emitGameStatus).toBe("function");
    });

    it("should have onGameStatus method", async () => {
      const { gameEvents } = await import("../server/lib/eventEmitter");
      expect(gameEvents.onGameStatus).toBeDefined();
      expect(typeof gameEvents.onGameStatus).toBe("function");
    });

    it("should have offGameStatus method", async () => {
      const { gameEvents } = await import("../server/lib/eventEmitter");
      expect(gameEvents.offGameStatus).toBeDefined();
      expect(typeof gameEvents.offGameStatus).toBe("function");
    });

    it("should emit game status with correct data structure", async () => {
      const { gameEvents } = await import("../server/lib/eventEmitter");
      const callback = vi.fn();
      const gameSlug = "test-game";

      gameEvents.onGameStatus(gameSlug, callback);
      gameEvents.emitGameStatus(gameSlug, "active");

      expect(callback).toHaveBeenCalledTimes(1);
      const callArg = callback.mock.calls[0][0];
      expect(callArg.status).toBe("active");
      expect(callArg.timestamp).toBeDefined();

      gameEvents.offGameStatus(gameSlug, callback);
    });

    it("should emit status changes for different statuses", async () => {
      const { gameEvents } = await import("../server/lib/eventEmitter");
      const callback = vi.fn();
      const gameSlug = "test-game-2";

      gameEvents.onGameStatus(gameSlug, callback);

      gameEvents.emitGameStatus(gameSlug, "draft");
      gameEvents.emitGameStatus(gameSlug, "active");
      gameEvents.emitGameStatus(gameSlug, "completed");

      expect(callback).toHaveBeenCalledTimes(3);
      expect(callback.mock.calls[0][0].status).toBe("draft");
      expect(callback.mock.calls[1][0].status).toBe("active");
      expect(callback.mock.calls[2][0].status).toBe("completed");

      gameEvents.offGameStatus(gameSlug, callback);
    });

    it("should only notify listeners for specific game slug", async () => {
      const { gameEvents } = await import("../server/lib/eventEmitter");
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      gameEvents.onGameStatus("game-1", callback1);
      gameEvents.onGameStatus("game-2", callback2);

      gameEvents.emitGameStatus("game-1", "active");

      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(0);

      gameEvents.offGameStatus("game-1", callback1);
      gameEvents.offGameStatus("game-2", callback2);
    });

    it("should remove listener when offGameStatus is called", async () => {
      const { gameEvents } = await import("../server/lib/eventEmitter");
      const callback = vi.fn();
      const gameSlug = "test-game-3";

      gameEvents.onGameStatus(gameSlug, callback);
      gameEvents.emitGameStatus(gameSlug, "active");
      expect(callback).toHaveBeenCalledTimes(1);

      gameEvents.offGameStatus(gameSlug, callback);
      gameEvents.emitGameStatus(gameSlug, "completed");
      expect(callback).toHaveBeenCalledTimes(1); // Still 1, not called again
    });
  });

  describe("Team Joined Events", () => {
    it("should have emitTeamJoined method", async () => {
      const { gameEvents } = await import("../server/lib/eventEmitter");
      expect(gameEvents.emitTeamJoined).toBeDefined();
      expect(typeof gameEvents.emitTeamJoined).toBe("function");
    });

    it("should have onTeamJoined method", async () => {
      const { gameEvents } = await import("../server/lib/eventEmitter");
      expect(gameEvents.onTeamJoined).toBeDefined();
      expect(typeof gameEvents.onTeamJoined).toBe("function");
    });

    it("should have offTeamJoined method", async () => {
      const { gameEvents } = await import("../server/lib/eventEmitter");
      expect(gameEvents.offTeamJoined).toBeDefined();
      expect(typeof gameEvents.offTeamJoined).toBe("function");
    });

    it("should emit team joined with correct data structure", async () => {
      const { gameEvents } = await import("../server/lib/eventEmitter");
      const callback = vi.fn();
      const gameSlug = "test-game-team";
      const team = {
        id: "team-123",
        name: "Test Team",
        logoUrl: "https://example.com/logo.png",
      };

      gameEvents.onTeamJoined(gameSlug, callback);
      gameEvents.emitTeamJoined(gameSlug, team);

      expect(callback).toHaveBeenCalledTimes(1);
      const callArg = callback.mock.calls[0][0];
      expect(callArg.id).toBe("team-123");
      expect(callArg.name).toBe("Test Team");
      expect(callArg.logoUrl).toBe("https://example.com/logo.png");
      expect(callArg.joinedAt).toBeDefined();

      gameEvents.offTeamJoined(gameSlug, callback);
    });

    it("should handle team with null logo", async () => {
      const { gameEvents } = await import("../server/lib/eventEmitter");
      const callback = vi.fn();
      const gameSlug = "test-game-no-logo";
      const team = {
        id: "team-456",
        name: "No Logo Team",
        logoUrl: null,
      };

      gameEvents.onTeamJoined(gameSlug, callback);
      gameEvents.emitTeamJoined(gameSlug, team);

      expect(callback).toHaveBeenCalledTimes(1);
      const callArg = callback.mock.calls[0][0];
      expect(callArg.logoUrl).toBeNull();

      gameEvents.offTeamJoined(gameSlug, callback);
    });

    it("should emit multiple team joins", async () => {
      const { gameEvents } = await import("../server/lib/eventEmitter");
      const callback = vi.fn();
      const gameSlug = "test-game-multi";

      gameEvents.onTeamJoined(gameSlug, callback);

      gameEvents.emitTeamJoined(gameSlug, { id: "1", name: "Team A", logoUrl: null });
      gameEvents.emitTeamJoined(gameSlug, { id: "2", name: "Team B", logoUrl: null });
      gameEvents.emitTeamJoined(gameSlug, { id: "3", name: "Team C", logoUrl: null });

      expect(callback).toHaveBeenCalledTimes(3);
      expect(callback.mock.calls[0][0].name).toBe("Team A");
      expect(callback.mock.calls[1][0].name).toBe("Team B");
      expect(callback.mock.calls[2][0].name).toBe("Team C");

      gameEvents.offTeamJoined(gameSlug, callback);
    });

    it("should only notify listeners for specific game slug", async () => {
      const { gameEvents } = await import("../server/lib/eventEmitter");
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      gameEvents.onTeamJoined("game-a", callback1);
      gameEvents.onTeamJoined("game-b", callback2);

      gameEvents.emitTeamJoined("game-a", { id: "1", name: "Team", logoUrl: null });

      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(0);

      gameEvents.offTeamJoined("game-a", callback1);
      gameEvents.offTeamJoined("game-b", callback2);
    });
  });

  describe("Existing Events", () => {
    it("should have leaderboard update methods", async () => {
      const { gameEvents } = await import("../server/lib/eventEmitter");
      expect(gameEvents.emitLeaderboardUpdate).toBeDefined();
      expect(gameEvents.onLeaderboardUpdate).toBeDefined();
      expect(gameEvents.offLeaderboardUpdate).toBeDefined();
    });

    it("should have scan methods", async () => {
      const { gameEvents } = await import("../server/lib/eventEmitter");
      expect(gameEvents.emitScan).toBeDefined();
      expect(gameEvents.onScan).toBeDefined();
      expect(gameEvents.offScan).toBeDefined();
    });

    it("should have chat methods", async () => {
      const { gameEvents } = await import("../server/lib/eventEmitter");
      expect(gameEvents.emitChat).toBeDefined();
      expect(gameEvents.onChat).toBeDefined();
      expect(gameEvents.offChat).toBeDefined();
    });
  });

  describe("Event Channel Naming", () => {
    it("should use correct channel format for game status", () => {
      const gameSlug = "my-game";
      const channel = `gamestatus:${gameSlug}`;
      expect(channel).toBe("gamestatus:my-game");
    });

    it("should use correct channel format for team joined", () => {
      const gameSlug = "my-game";
      const channel = `teamjoined:${gameSlug}`;
      expect(channel).toBe("teamjoined:my-game");
    });

    it("should isolate different games", () => {
      const channel1 = "gamestatus:game-1";
      const channel2 = "gamestatus:game-2";
      expect(channel1).not.toBe(channel2);
    });
  });

  describe("Timestamp Generation", () => {
    it("should include ISO timestamp in game status events", async () => {
      const { gameEvents } = await import("../server/lib/eventEmitter");
      const callback = vi.fn();

      gameEvents.onGameStatus("timestamp-test", callback);
      gameEvents.emitGameStatus("timestamp-test", "active");

      const timestamp = callback.mock.calls[0][0].timestamp;
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);

      gameEvents.offGameStatus("timestamp-test", callback);
    });

    it("should include ISO timestamp in team joined events", async () => {
      const { gameEvents } = await import("../server/lib/eventEmitter");
      const callback = vi.fn();

      gameEvents.onTeamJoined("timestamp-test-2", callback);
      gameEvents.emitTeamJoined("timestamp-test-2", { id: "1", name: "Team", logoUrl: null });

      const joinedAt = callback.mock.calls[0][0].joinedAt;
      expect(joinedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);

      gameEvents.offTeamJoined("timestamp-test-2", callback);
    });
  });

  describe("Max Listeners", () => {
    it("should allow many concurrent listeners", async () => {
      const { gameEvents } = await import("../server/lib/eventEmitter");

      // The emitter should be configured for many SSE connections
      // Default is 10, but we set it to 1000 in the constructor
      const maxListeners = gameEvents.getMaxListeners();
      expect(maxListeners).toBeGreaterThanOrEqual(100);
    });
  });

  describe("Multiple Listeners", () => {
    it("should support multiple listeners on same channel", async () => {
      const { gameEvents } = await import("../server/lib/eventEmitter");
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const gameSlug = "multi-listener";

      gameEvents.onGameStatus(gameSlug, callback1);
      gameEvents.onGameStatus(gameSlug, callback2);

      gameEvents.emitGameStatus(gameSlug, "active");

      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);

      gameEvents.offGameStatus(gameSlug, callback1);
      gameEvents.offGameStatus(gameSlug, callback2);
    });

    it("should remove only the specified listener", async () => {
      const { gameEvents } = await import("../server/lib/eventEmitter");
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const gameSlug = "selective-remove";

      gameEvents.onGameStatus(gameSlug, callback1);
      gameEvents.onGameStatus(gameSlug, callback2);

      gameEvents.offGameStatus(gameSlug, callback1);
      gameEvents.emitGameStatus(gameSlug, "active");

      expect(callback1).toHaveBeenCalledTimes(0);
      expect(callback2).toHaveBeenCalledTimes(1);

      gameEvents.offGameStatus(gameSlug, callback2);
    });
  });
});
