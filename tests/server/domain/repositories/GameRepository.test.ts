import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { initializeDatabase, closeDatabase, getDatabase } from "@server/db/database.js";
import { gameRepository } from "@server/domain/repositories/GameRepository.js";

describe("GameRepository", () => {
  beforeEach(async () => {
    process.env.DATA_DIR = "./tests/test-data-game-repo";
    await initializeDatabase();
  });

  afterEach(() => {
    const db = getDatabase();
    db.exec("DELETE FROM games");
    closeDatabase();
  });

  describe("create", () => {
    it("should create a game with default settings", () => {
      const game = gameRepository.create({
        name: "Test Game",
        publicSlug: "test-game",
      });

      expect(game).toBeDefined();
      expect(game.id).toBeDefined();
      expect(game.name).toBe("Test Game");
      expect(game.publicSlug).toBe("test-game");
      expect(game.status).toBe("draft");
      expect(game.settings).toEqual({
        rankingMode: "points",
        basePoints: 100,
        timeBonusEnabled: true,
        timeBonusMultiplier: 1.5,
        randomMode: false,
        autoStartEnabled: false,
        expectedTeamCount: 0,
        scanCooldownMs: 0,
      });
    });

    it("should create a game with custom settings", () => {
      const game = gameRepository.create({
        name: "Custom Game",
        publicSlug: "custom-game",
        settings: {
          rankingMode: "time",
          basePoints: 50,
          timeBonusEnabled: false,
        },
      });

      expect(game.settings.rankingMode).toBe("time");
      expect(game.settings.basePoints).toBe(50);
      expect(game.settings.timeBonusEnabled).toBe(false);
      expect(game.settings.timeBonusMultiplier).toBe(1.5); // Default preserved
    });
  });

  describe("findById", () => {
    it("should find existing game by id", () => {
      const created = gameRepository.create({
        name: "Find Me",
        publicSlug: "find-me",
      });

      const found = gameRepository.findById(created.id);

      expect(found).toBeDefined();
      expect(found!.id).toBe(created.id);
      expect(found!.name).toBe("Find Me");
    });

    it("should return null for non-existent id", () => {
      const found = gameRepository.findById("non-existent");
      expect(found).toBeNull();
    });
  });

  describe("findBySlug", () => {
    it("should find existing game by slug", () => {
      gameRepository.create({
        name: "Slug Game",
        publicSlug: "slug-game",
      });

      const found = gameRepository.findBySlug("slug-game");

      expect(found).toBeDefined();
      expect(found!.publicSlug).toBe("slug-game");
    });

    it("should return null for non-existent slug", () => {
      const found = gameRepository.findBySlug("non-existent");
      expect(found).toBeNull();
    });
  });

  describe("findAll", () => {
    it("should return empty array when no games", () => {
      const games = gameRepository.findAll();
      expect(games).toEqual([]);
    });

    it("should return all games", () => {
      gameRepository.create({ name: "Game 1", publicSlug: "game-1" });
      gameRepository.create({ name: "Game 2", publicSlug: "game-2" });
      gameRepository.create({ name: "Game 3", publicSlug: "game-3" });

      const games = gameRepository.findAll();

      expect(games.length).toBe(3);
      // Just verify all 3 games are returned
      const names = games.map(g => g.name).sort();
      expect(names).toEqual(["Game 1", "Game 2", "Game 3"]);
    });
  });

  describe("findByStatus", () => {
    it("should return only games with matching status", () => {
      gameRepository.create({ name: "Draft", publicSlug: "draft" });
      const game2 = gameRepository.create({ name: "Active", publicSlug: "active" });

      gameRepository.update(game2.id, { status: "active" });

      const draftGames = gameRepository.findByStatus("draft");
      const activeGames = gameRepository.findByStatus("active");

      expect(draftGames.length).toBe(1);
      expect(draftGames[0].name).toBe("Draft");
      expect(activeGames.length).toBe(1);
      expect(activeGames[0].name).toBe("Active");
    });
  });

  describe("update", () => {
    it("should update game name", () => {
      const game = gameRepository.create({
        name: "Original",
        publicSlug: "original",
      });

      const updated = gameRepository.update(game.id, { name: "Updated" });

      expect(updated).toBeDefined();
      expect(updated!.name).toBe("Updated");
    });

    it("should update game status", () => {
      const game = gameRepository.create({
        name: "Status Test",
        publicSlug: "status-test",
      });

      const updated = gameRepository.update(game.id, { status: "active" });

      expect(updated!.status).toBe("active");
    });

    it("should update game settings", () => {
      const game = gameRepository.create({
        name: "Settings Test",
        publicSlug: "settings-test",
      });

      const newSettings = {
        rankingMode: "time" as const,
        basePoints: 200,
        timeBonusEnabled: false,
        timeBonusMultiplier: 2.0,
        randomMode: false,
        autoStartEnabled: false,
        expectedTeamCount: 0,
        scanCooldownMs: 0,
      };

      const updated = gameRepository.update(game.id, { settings: newSettings });

      expect(updated!.settings).toEqual(newSettings);
    });

    it("should return null for non-existent game", () => {
      const updated = gameRepository.update("non-existent", { name: "Updated" });
      expect(updated).toBeNull();
    });

    it("should update multiple fields at once", () => {
      const game = gameRepository.create({
        name: "Multi Update",
        publicSlug: "multi-update",
      });

      const updated = gameRepository.update(game.id, {
        name: "New Name",
        publicSlug: "new-slug",
        status: "completed",
      });

      expect(updated!.name).toBe("New Name");
      expect(updated!.publicSlug).toBe("new-slug");
      expect(updated!.status).toBe("completed");
    });
  });

  describe("delete", () => {
    it("should delete existing game", () => {
      const game = gameRepository.create({
        name: "Delete Me",
        publicSlug: "delete-me",
      });

      const result = gameRepository.delete(game.id);

      expect(result).toBe(true);
      expect(gameRepository.findById(game.id)).toBeNull();
    });

    it("should return false for non-existent game", () => {
      const result = gameRepository.delete("non-existent");
      expect(result).toBe(false);
    });
  });

  describe("logoUrl", () => {
    it("should create a game with null logoUrl by default", () => {
      const game = gameRepository.create({
        name: "No Logo Game",
        publicSlug: "no-logo-game",
      });

      expect(game.logoUrl).toBeNull();
    });

    it("should create a game with logoUrl", () => {
      const game = gameRepository.create({
        name: "Logo Game",
        publicSlug: "logo-game",
        logoUrl: "https://example.com/logo.png",
      });

      expect(game.logoUrl).toBe("https://example.com/logo.png");
    });

    it("should update logoUrl", () => {
      const game = gameRepository.create({
        name: "Update Logo",
        publicSlug: "update-logo",
      });

      const updated = gameRepository.update(game.id, {
        logoUrl: "https://example.com/new-logo.png",
      });

      expect(updated!.logoUrl).toBe("https://example.com/new-logo.png");
    });

    it("should set logoUrl to null", () => {
      const game = gameRepository.create({
        name: "Remove Logo",
        publicSlug: "remove-logo",
        logoUrl: "https://example.com/old-logo.png",
      });

      const updated = gameRepository.update(game.id, { logoUrl: null });

      expect(updated!.logoUrl).toBeNull();
    });
  });
});
