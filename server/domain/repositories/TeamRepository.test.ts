import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { initializeDatabase, closeDatabase, getDatabase } from "../../db/database.js";
import { teamRepository } from "./TeamRepository.js";
import { gameRepository } from "./GameRepository.js";

describe("TeamRepository", () => {
  let gameId: string;

  beforeEach(async () => {
    process.env.DATA_DIR = "./tests/test-data-team-repo";
    await initializeDatabase();

    // Create a test game
    const game = gameRepository.create({
      name: "Test Game",
      publicSlug: "test-game-team",
    });
    gameId = game.id;
  });

  afterEach(() => {
    const db = getDatabase();
    db.exec("DELETE FROM teams");
    db.exec("DELETE FROM games");
    closeDatabase();
  });

  describe("create", () => {
    it("should create a team with auto-generated code", () => {
      const team = teamRepository.create({
        gameId,
        name: "Test Team",
      });

      expect(team).toBeDefined();
      expect(team.id).toBeDefined();
      expect(team.gameId).toBe(gameId);
      expect(team.name).toBe("Test Team");
      expect(team.code).toMatch(/^[A-Z2-9]{6}$/);
      expect(team.startNodeId).toBeNull();
    });

    it("should create a team with custom code", () => {
      const team = teamRepository.create({
        gameId,
        name: "Custom Code Team",
        code: "ABC123",
      });

      expect(team.code).toBe("ABC123");
    });

    it("should create a team with start node", () => {
      const team = teamRepository.create({
        gameId,
        name: "Start Node Team",
        startNodeId: "node-123",
      });

      expect(team.startNodeId).toBe("node-123");
    });
  });

  describe("findById", () => {
    it("should find existing team by id", () => {
      const created = teamRepository.create({
        gameId,
        name: "Find Me",
      });

      const found = teamRepository.findById(created.id);

      expect(found).toBeDefined();
      expect(found!.id).toBe(created.id);
      expect(found!.name).toBe("Find Me");
    });

    it("should return null for non-existent id", () => {
      const found = teamRepository.findById("non-existent");
      expect(found).toBeNull();
    });
  });

  describe("findByCode", () => {
    it("should find team by game and code", () => {
      const team = teamRepository.create({
        gameId,
        name: "Code Team",
        code: "TEAM01",
      });

      const found = teamRepository.findByCode(gameId, "TEAM01");

      expect(found).toBeDefined();
      expect(found!.id).toBe(team.id);
    });

    it("should be case-insensitive", () => {
      teamRepository.create({
        gameId,
        name: "Case Team",
        code: "MYCODE",
      });

      const found = teamRepository.findByCode(gameId, "mycode");
      expect(found).toBeDefined();
      expect(found!.code).toBe("MYCODE");
    });

    it("should return null for wrong game", () => {
      teamRepository.create({
        gameId,
        name: "Wrong Game",
        code: "WRONG1",
      });

      const found = teamRepository.findByCode("different-game", "WRONG1");
      expect(found).toBeNull();
    });
  });

  describe("findByCodeGlobal", () => {
    it("should find team by code across all games", () => {
      const team = teamRepository.create({
        gameId,
        name: "Global Team",
        code: "GLOBAL",
      });

      const found = teamRepository.findByCodeGlobal("GLOBAL");

      expect(found).toBeDefined();
      expect(found!.id).toBe(team.id);
    });

    it("should be case-insensitive", () => {
      teamRepository.create({
        gameId,
        name: "Case Global",
        code: "GLOBALC",
      });

      const found = teamRepository.findByCodeGlobal("globalc");
      expect(found).toBeDefined();
    });
  });

  describe("findByGameId", () => {
    it("should return empty array when no teams", () => {
      const teams = teamRepository.findByGameId(gameId);
      expect(teams).toEqual([]);
    });

    it("should return all teams for game", () => {
      teamRepository.create({ gameId, name: "Team A" });
      teamRepository.create({ gameId, name: "Team B" });
      teamRepository.create({ gameId, name: "Team C" });

      const teams = teamRepository.findByGameId(gameId);

      expect(teams.length).toBe(3);
    });

    it("should only return teams for specified game", () => {
      teamRepository.create({ gameId, name: "Right Game" });

      const otherGame = gameRepository.create({
        name: "Other",
        publicSlug: "other-game",
      });
      teamRepository.create({ gameId: otherGame.id, name: "Other Game Team" });

      const teams = teamRepository.findByGameId(gameId);

      expect(teams.length).toBe(1);
      expect(teams[0].name).toBe("Right Game");
    });

    it("should return teams ordered by created_at asc", () => {
      teamRepository.create({ gameId, name: "First" });
      teamRepository.create({ gameId, name: "Second" });
      teamRepository.create({ gameId, name: "Third" });

      const teams = teamRepository.findByGameId(gameId);

      expect(teams[0].name).toBe("First");
      expect(teams[1].name).toBe("Second");
      expect(teams[2].name).toBe("Third");
    });
  });

  describe("update", () => {
    it("should update team name", () => {
      const team = teamRepository.create({
        gameId,
        name: "Original Name",
      });

      const updated = teamRepository.update(team.id, { name: "New Name" });

      expect(updated).toBeDefined();
      expect(updated!.name).toBe("New Name");
    });

    it("should update team code", () => {
      const team = teamRepository.create({
        gameId,
        name: "Code Update",
        code: "OLD123",
      });

      const updated = teamRepository.update(team.id, { code: "NEW456" });

      expect(updated!.code).toBe("NEW456");
    });

    it("should convert code to uppercase", () => {
      const team = teamRepository.create({
        gameId,
        name: "Uppercase Test",
      });

      const updated = teamRepository.update(team.id, { code: "lower" });

      expect(updated!.code).toBe("LOWER");
    });

    it("should update start node id", () => {
      const team = teamRepository.create({
        gameId,
        name: "Start Update",
      });

      const updated = teamRepository.update(team.id, { startNodeId: "node-abc" });

      expect(updated!.startNodeId).toBe("node-abc");
    });

    it("should allow setting start node to null", () => {
      const team = teamRepository.create({
        gameId,
        name: "Null Start",
        startNodeId: "existing-node",
      });

      const updated = teamRepository.update(team.id, { startNodeId: null });

      expect(updated!.startNodeId).toBeNull();
    });

    it("should return null for non-existent team", () => {
      const updated = teamRepository.update("non-existent", { name: "Updated" });
      expect(updated).toBeNull();
    });
  });

  describe("delete", () => {
    it("should delete existing team", () => {
      const team = teamRepository.create({
        gameId,
        name: "Delete Me",
      });

      const result = teamRepository.delete(team.id);

      expect(result).toBe(true);
      expect(teamRepository.findById(team.id)).toBeNull();
    });

    it("should return false for non-existent team", () => {
      const result = teamRepository.delete("non-existent");
      expect(result).toBe(false);
    });
  });

  describe("logoUrl", () => {
    it("should create a team with null logoUrl by default", () => {
      const team = teamRepository.create({
        gameId,
        name: "No Logo Team",
      });

      expect(team.logoUrl).toBeNull();
    });

    it("should create a team with logoUrl", () => {
      const team = teamRepository.create({
        gameId,
        name: "Logo Team",
        logoUrl: "https://example.com/team-logo.png",
      });

      expect(team.logoUrl).toBe("https://example.com/team-logo.png");
    });

    it("should update logoUrl", () => {
      const team = teamRepository.create({
        gameId,
        name: "Update Logo Team",
      });

      const updated = teamRepository.update(team.id, {
        logoUrl: "https://example.com/new-team-logo.png",
      });

      expect(updated!.logoUrl).toBe("https://example.com/new-team-logo.png");
    });

    it("should set logoUrl to null", () => {
      const team = teamRepository.create({
        gameId,
        name: "Remove Logo Team",
        logoUrl: "https://example.com/old-team-logo.png",
      });

      const updated = teamRepository.update(team.id, { logoUrl: null });

      expect(updated!.logoUrl).toBeNull();
    });
  });
});
