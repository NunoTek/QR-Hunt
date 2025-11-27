import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { initializeDatabase, closeDatabase, getDatabase } from "../../db/database.js";
import { gameService } from "./GameService.js";
import { nodeRepository } from "../repositories/NodeRepository.js";
import { teamRepository } from "../repositories/TeamRepository.js";

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

    it("should activate valid game", () => {
      const game = gameService.createGame({
        name: "Valid Game",
        publicSlug: "valid-game",
      });

      nodeRepository.create({
        gameId: game.id,
        title: "Start",
        isStart: true,
      });

      nodeRepository.create({
        gameId: game.id,
        title: "End",
        isEnd: true,
      });

      const activated = gameService.activateGame(game.id);
      expect(activated?.status).toBe("active");
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
