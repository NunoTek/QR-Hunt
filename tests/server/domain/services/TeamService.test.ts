import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { initializeDatabase, closeDatabase, getDatabase } from "@server/db/database.js";
import { teamService } from "@server/domain/services/TeamService.js";
import { teamRepository } from "@server/domain/repositories/TeamRepository.js";
import { gameRepository } from "@server/domain/repositories/GameRepository.js";
import { nodeRepository } from "@server/domain/repositories/NodeRepository.js";

describe("TeamService", () => {
  let gameId: string;

  beforeEach(async () => {
    process.env.DATA_DIR = "./tests/test-data-team-service";
    await initializeDatabase();

    // Create a test game
    const game = gameRepository.create({
      name: "Test Game",
      publicSlug: "test-game",
    });
    gameId = game.id;
  });

  afterEach(() => {
    const db = getDatabase();
    db.exec("DELETE FROM teams");
    db.exec("DELETE FROM nodes");
    db.exec("DELETE FROM games");
    closeDatabase();
  });

  describe("createTeam", () => {
    it("should create a team with specified start node", () => {
      const startNode = nodeRepository.create({
        gameId,
        title: "Start Node",
        isStart: true,
      });

      const team = teamService.createTeam({
        gameId,
        name: "Team Alpha",
        startNodeId: startNode.id,
      });

      expect(team.name).toBe("Team Alpha");
      expect(team.startNodeId).toBe(startNode.id);
      expect(team.gameId).toBe(gameId);
      expect(team.code).toHaveLength(6);
    });

    it("should auto-assign start node when not specified", () => {
      const startNode = nodeRepository.create({
        gameId,
        title: "Start Node",
        isStart: true,
      });

      const team = teamService.createTeam({
        gameId,
        name: "Team Alpha",
      });

      expect(team.startNodeId).toBe(startNode.id);
    });

    it("should handle game with no start nodes", () => {
      // Create non-start node
      nodeRepository.create({
        gameId,
        title: "Regular Node",
        isStart: false,
      });

      const team = teamService.createTeam({
        gameId,
        name: "Team Alpha",
      });

      expect(team.startNodeId).toBeNull();
    });

    it("should distribute teams evenly across start nodes (round-robin)", () => {
      // Create 3 start nodes
      const startNode1 = nodeRepository.create({
        gameId,
        title: "Start 1",
        isStart: true,
      });
      const startNode2 = nodeRepository.create({
        gameId,
        title: "Start 2",
        isStart: true,
      });
      const startNode3 = nodeRepository.create({
        gameId,
        title: "Start 3",
        isStart: true,
      });

      // Create 6 teams - should distribute 2 per start node
      const teams = [];
      for (let i = 1; i <= 6; i++) {
        teams.push(
          teamService.createTeam({
            gameId,
            name: `Team ${i}`,
          })
        );
      }

      // Count assignments per start node
      const assignments = new Map<string, number>();
      for (const team of teams) {
        const count = assignments.get(team.startNodeId!) || 0;
        assignments.set(team.startNodeId!, count + 1);
      }

      // Each start node should have 2 teams
      expect(assignments.get(startNode1.id)).toBe(2);
      expect(assignments.get(startNode2.id)).toBe(2);
      expect(assignments.get(startNode3.id)).toBe(2);
    });

    it("should prefer least-used start node", () => {
      const startNode1 = nodeRepository.create({
        gameId,
        title: "Start 1",
        isStart: true,
      });
      const startNode2 = nodeRepository.create({
        gameId,
        title: "Start 2",
        isStart: true,
      });

      // Manually create a team on start node 1
      teamRepository.create({
        gameId,
        name: "Existing Team",
        startNodeId: startNode1.id,
      });

      // New team should go to start node 2 (less used)
      const newTeam = teamService.createTeam({
        gameId,
        name: "New Team",
      });

      expect(newTeam.startNodeId).toBe(startNode2.id);
    });

    it("should use custom team code when provided", () => {
      const team = teamService.createTeam({
        gameId,
        name: "Team Alpha",
        code: "CUSTOM",
      });

      expect(team.code).toBe("CUSTOM");
    });

    it("should set logo URL when provided", () => {
      const team = teamService.createTeam({
        gameId,
        name: "Team Alpha",
        logoUrl: "https://example.com/logo.png",
      });

      expect(team.logoUrl).toBe("https://example.com/logo.png");
    });
  });

  describe("getTeam", () => {
    it("should return team by id", () => {
      const created = teamService.createTeam({
        gameId,
        name: "Team Alpha",
      });

      const found = teamService.getTeam(created.id);

      expect(found).not.toBeNull();
      expect(found!.name).toBe("Team Alpha");
    });

    it("should return null for non-existent team", () => {
      const found = teamService.getTeam("non-existent-id");

      expect(found).toBeNull();
    });
  });

  describe("getTeamsByGame", () => {
    it("should return all teams for a game", () => {
      teamService.createTeam({ gameId, name: "Team 1" });
      teamService.createTeam({ gameId, name: "Team 2" });
      teamService.createTeam({ gameId, name: "Team 3" });

      const teams = teamService.getTeamsByGame(gameId);

      expect(teams).toHaveLength(3);
      expect(teams.map((t) => t.name)).toContain("Team 1");
      expect(teams.map((t) => t.name)).toContain("Team 2");
      expect(teams.map((t) => t.name)).toContain("Team 3");
    });

    it("should return empty array for game with no teams", () => {
      const teams = teamService.getTeamsByGame(gameId);

      expect(teams).toHaveLength(0);
    });
  });

  describe("updateTeam", () => {
    it("should update team name", () => {
      const team = teamService.createTeam({
        gameId,
        name: "Original Name",
      });

      const updated = teamService.updateTeam(team.id, {
        name: "New Name",
      });

      expect(updated).not.toBeNull();
      expect(updated!.name).toBe("New Name");
    });

    it("should update team code", () => {
      const team = teamService.createTeam({
        gameId,
        name: "Team Alpha",
      });

      const updated = teamService.updateTeam(team.id, {
        code: "NEWCODE",
      });

      expect(updated!.code).toBe("NEWCODE");
    });

    it("should return null for non-existent team", () => {
      const updated = teamService.updateTeam("non-existent", {
        name: "New Name",
      });

      expect(updated).toBeNull();
    });
  });

  describe("deleteTeam", () => {
    it("should delete existing team", () => {
      const team = teamService.createTeam({
        gameId,
        name: "Team Alpha",
      });

      const deleted = teamService.deleteTeam(team.id);

      expect(deleted).toBe(true);
      expect(teamService.getTeam(team.id)).toBeNull();
    });

    it("should return false for non-existent team", () => {
      const deleted = teamService.deleteTeam("non-existent");

      expect(deleted).toBe(false);
    });
  });
});
