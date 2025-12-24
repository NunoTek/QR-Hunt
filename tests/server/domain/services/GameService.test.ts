import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { initializeDatabase, closeDatabase, getDatabase } from "@server/db/database.js";
import { gameService } from "@server/domain/services/GameService.js";
import { nodeRepository } from "@server/domain/repositories/NodeRepository.js";
import { teamRepository } from "@server/domain/repositories/TeamRepository.js";

describe("GameService", () => {
  beforeEach(async () => {
    process.env.DATA_DIR = "./tests/test-data-game";
    await initializeDatabase();
  });

  afterEach(() => {
    const db = getDatabase();
    db.exec("DELETE FROM scans");
    db.exec("DELETE FROM edges");
    db.exec("DELETE FROM nodes");
    db.exec("DELETE FROM teams");
    db.exec("DELETE FROM games");
    closeDatabase();
  });

  describe("createGame", () => {
    it("should create a new game with default settings", () => {
      const game = gameService.createGame({
        name: "Test Game",
        publicSlug: "test-game",
      });

      expect(game).toBeDefined();
      expect(game.name).toBe("Test Game");
      expect(game.publicSlug).toBe("test-game");
      expect(game.status).toBe("draft");
      expect(game.settings.rankingMode).toBe("points");
    });

    it("should throw error for duplicate slug", () => {
      gameService.createGame({ name: "Game 1", publicSlug: "same-slug" });

      expect(() => {
        gameService.createGame({ name: "Game 2", publicSlug: "same-slug" });
      }).toThrow('Game with slug "same-slug" already exists');
    });

    it("should allow custom settings", () => {
      const game = gameService.createGame({
        name: "Custom Game",
        publicSlug: "custom-game",
        settings: {
          rankingMode: "time",
          basePoints: 200,
        },
      });

      expect(game.settings.rankingMode).toBe("time");
      expect(game.settings.basePoints).toBe(200);
    });
  });

  describe("openGame", () => {
    it("should not open game without nodes", () => {
      const game = gameService.createGame({
        name: "Empty Game",
        publicSlug: "empty-game-open",
      });

      expect(() => {
        gameService.openGame(game.id);
      }).toThrow("Cannot activate game without any nodes");
    });

    it("should not open game without start node", () => {
      const game = gameService.createGame({
        name: "No Start",
        publicSlug: "no-start-open",
      });

      nodeRepository.create({
        gameId: game.id,
        title: "Middle Node",
        isStart: false,
        isEnd: true,
      });

      expect(() => {
        gameService.openGame(game.id);
      }).toThrow("Cannot activate game without at least one start node");
    });

    it("should not open game without end node", () => {
      const game = gameService.createGame({
        name: "No End",
        publicSlug: "no-end-open",
      });

      nodeRepository.create({
        gameId: game.id,
        title: "Start Node",
        isStart: true,
        isEnd: false,
      });

      expect(() => {
        gameService.openGame(game.id);
      }).toThrow("Cannot activate game without at least one end node");
    });

    it("should open valid game and set status to pending", () => {
      const game = gameService.createGame({
        name: "Valid Game",
        publicSlug: "valid-game-open",
      });

      nodeRepository.create({
        gameId: game.id,
        title: "Start",
        isStart: true,
        activated: true,
      });

      nodeRepository.create({
        gameId: game.id,
        title: "End",
        isEnd: true,
        activated: true,
      });

      const opened = gameService.openGame(game.id);
      expect(opened?.status).toBe("pending");
    });
  });

  describe("activateGame", () => {
    it("should not activate game without nodes", () => {
      const game = gameService.createGame({
        name: "Empty Game",
        publicSlug: "empty-game",
      });

      expect(() => {
        gameService.activateGame(game.id);
      }).toThrow("Cannot activate game without any nodes");
    });

    it("should not activate game without start node", () => {
      const game = gameService.createGame({
        name: "No Start",
        publicSlug: "no-start",
      });

      nodeRepository.create({
        gameId: game.id,
        title: "Middle Node",
        isStart: false,
        isEnd: true,
      });

      expect(() => {
        gameService.activateGame(game.id);
      }).toThrow("Cannot activate game without at least one start node");
    });

    it("should not activate game without end node", () => {
      const game = gameService.createGame({
        name: "No End",
        publicSlug: "no-end",
      });

      nodeRepository.create({
        gameId: game.id,
        title: "Start Node",
        isStart: true,
        isEnd: false,
      });

      expect(() => {
        gameService.activateGame(game.id);
      }).toThrow("Cannot activate game without at least one end node");
    });

    it("should not activate game without activated nodes", () => {
      const game = gameService.createGame({
        name: "No Activated",
        publicSlug: "no-activated",
      });

      nodeRepository.create({
        gameId: game.id,
        title: "Start Node",
        isStart: true,
        activated: false,
      });

      nodeRepository.create({
        gameId: game.id,
        title: "End Node",
        isEnd: true,
        activated: false,
      });

      expect(() => {
        gameService.activateGame(game.id);
      }).toThrow("Cannot activate game without at least one activated node");
    });

    it("should activate valid game from draft status", () => {
      const game = gameService.createGame({
        name: "Valid Game",
        publicSlug: "valid-game",
      });

      nodeRepository.create({
        gameId: game.id,
        title: "Start",
        isStart: true,
        activated: true,
      });

      nodeRepository.create({
        gameId: game.id,
        title: "End",
        isEnd: true,
        activated: true,
      });

      const activated = gameService.activateGame(game.id);
      expect(activated?.status).toBe("active");
    });

    it("should activate valid game from pending status", () => {
      const game = gameService.createGame({
        name: "Pending Game",
        publicSlug: "pending-game",
      });

      nodeRepository.create({
        gameId: game.id,
        title: "Start",
        isStart: true,
        activated: true,
      });

      nodeRepository.create({
        gameId: game.id,
        title: "End",
        isEnd: true,
        activated: true,
      });

      // First open the game (set to pending)
      const opened = gameService.openGame(game.id);
      expect(opened?.status).toBe("pending");

      // Then activate it
      const activated = gameService.activateGame(game.id);
      expect(activated?.status).toBe("active");
    });

    it("should not activate game that is already active", () => {
      const game = gameService.createGame({
        name: "Already Active",
        publicSlug: "already-active",
      });

      nodeRepository.create({
        gameId: game.id,
        title: "Start",
        isStart: true,
        activated: true,
      });

      nodeRepository.create({
        gameId: game.id,
        title: "End",
        isEnd: true,
        activated: true,
      });

      // First activate
      gameService.activateGame(game.id);

      // Try to activate again
      expect(() => {
        gameService.activateGame(game.id);
      }).toThrow("Can only activate games that are in draft or pending status");
    });

    it("should not activate completed game", () => {
      const game = gameService.createGame({
        name: "Completed Game",
        publicSlug: "completed-game",
      });

      nodeRepository.create({
        gameId: game.id,
        title: "Start",
        isStart: true,
        activated: true,
      });

      nodeRepository.create({
        gameId: game.id,
        title: "End",
        isEnd: true,
        activated: true,
      });

      // Activate then complete
      gameService.activateGame(game.id);
      gameService.completeGame(game.id);

      // Try to activate again
      expect(() => {
        gameService.activateGame(game.id);
      }).toThrow("Can only activate games that are in draft or pending status");
    });
  });

  describe("getLeaderboard", () => {
    it("should return empty array for game without teams", () => {
      const game = gameService.createGame({
        name: "Empty Leaderboard",
        publicSlug: "empty-lb",
      });

      const leaderboard = gameService.getLeaderboard(game.id);
      expect(leaderboard).toEqual([]);
    });

    it("should return teams with correct ranking", () => {
      const game = gameService.createGame({
        name: "Ranked Game",
        publicSlug: "ranked-game",
      });

      teamRepository.create({ gameId: game.id, name: "Team A" });
      teamRepository.create({ gameId: game.id, name: "Team B" });

      const leaderboard = gameService.getLeaderboard(game.id);
      expect(leaderboard.length).toBe(2);
      expect(leaderboard[0].rank).toBe(1);
      expect(leaderboard[1].rank).toBe(2);
    });
  });
});
