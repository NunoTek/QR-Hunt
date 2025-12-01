import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { HintUsageRepository } from "@server/domain/repositories/HintUsageRepository.js";
import { gameRepository } from "@server/domain/repositories/GameRepository.js";
import { teamRepository } from "@server/domain/repositories/TeamRepository.js";
import { nodeRepository } from "@server/domain/repositories/NodeRepository.js";
import { getDatabase, initializeDatabase, closeDatabase } from "@server/db/database.js";

describe("HintUsageRepository", () => {
  let hintUsageRepo: HintUsageRepository;
  let gameId: string;
  let teamId: string;
  let nodeId: string;
  let nodeId2: string;

  beforeEach(async () => {
    process.env.DATA_DIR = "./tests/test-data-hint-usage";
    await initializeDatabase();
    hintUsageRepo = new HintUsageRepository();

    // Create test game
    const game = gameRepository.create({
      name: "Hint Usage Test Game",
      publicSlug: "hint-usage-test-game",
    });
    gameId = game.id;

    // Create test team
    const team = teamRepository.create({
      gameId,
      name: "Test Team",
    });
    teamId = team.id;

    // Create test nodes
    const node = nodeRepository.create({
      gameId,
      title: "Test Node",
      hint: "This is a test hint",
      points: 100,
    });
    nodeId = node.id;

    const node2 = nodeRepository.create({
      gameId,
      title: "Test Node 2",
      hint: "Another hint",
      points: 50,
    });
    nodeId2 = node2.id;
  });

  afterEach(() => {
    const db = getDatabase();
    db.exec("DELETE FROM hint_usages");
    db.exec("DELETE FROM nodes");
    db.exec("DELETE FROM teams");
    db.exec("DELETE FROM games");
    closeDatabase();
  });

  describe("create", () => {
    it("should create a hint usage record", () => {
      const hintUsage = hintUsageRepo.create({
        gameId,
        teamId,
        nodeId,
        pointsDeducted: 50,
      });

      expect(hintUsage).toBeDefined();
      expect(hintUsage.id).toBeDefined();
      expect(hintUsage.gameId).toBe(gameId);
      expect(hintUsage.teamId).toBe(teamId);
      expect(hintUsage.nodeId).toBe(nodeId);
      expect(hintUsage.pointsDeducted).toBe(50);
      expect(hintUsage.createdAt).toBeDefined();
    });

    it("should enforce unique constraint on team and node", () => {
      hintUsageRepo.create({
        gameId,
        teamId,
        nodeId,
        pointsDeducted: 50,
      });

      // Attempting to create another hint usage for same team/node should fail
      expect(() => {
        hintUsageRepo.create({
          gameId,
          teamId,
          nodeId,
          pointsDeducted: 50,
        });
      }).toThrow();
    });

    it("should allow same team to use hints on different nodes", () => {
      const usage1 = hintUsageRepo.create({
        gameId,
        teamId,
        nodeId,
        pointsDeducted: 50,
      });

      const usage2 = hintUsageRepo.create({
        gameId,
        teamId,
        nodeId: nodeId2,
        pointsDeducted: 25,
      });

      expect(usage1.nodeId).toBe(nodeId);
      expect(usage2.nodeId).toBe(nodeId2);
    });
  });

  describe("findById", () => {
    it("should find hint usage by id", () => {
      const created = hintUsageRepo.create({
        gameId,
        teamId,
        nodeId,
        pointsDeducted: 50,
      });

      const found = hintUsageRepo.findById(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.teamId).toBe(teamId);
      expect(found?.nodeId).toBe(nodeId);
    });

    it("should return null for non-existent id", () => {
      const found = hintUsageRepo.findById("non-existent-id");
      expect(found).toBeNull();
    });
  });

  describe("findByTeamAndNode", () => {
    it("should find hint usage by team and node", () => {
      hintUsageRepo.create({
        gameId,
        teamId,
        nodeId,
        pointsDeducted: 50,
      });

      const found = hintUsageRepo.findByTeamAndNode(teamId, nodeId);

      expect(found).toBeDefined();
      expect(found?.teamId).toBe(teamId);
      expect(found?.nodeId).toBe(nodeId);
      expect(found?.pointsDeducted).toBe(50);
    });

    it("should return null when no hint usage exists", () => {
      const found = hintUsageRepo.findByTeamAndNode(teamId, nodeId);
      expect(found).toBeNull();
    });

    it("should return null for different team/node combination", () => {
      hintUsageRepo.create({
        gameId,
        teamId,
        nodeId,
        pointsDeducted: 50,
      });

      const found = hintUsageRepo.findByTeamAndNode(teamId, nodeId2);
      expect(found).toBeNull();
    });
  });

  describe("findByTeamId", () => {
    it("should find all hint usages for a team", () => {
      hintUsageRepo.create({
        gameId,
        teamId,
        nodeId,
        pointsDeducted: 50,
      });

      hintUsageRepo.create({
        gameId,
        teamId,
        nodeId: nodeId2,
        pointsDeducted: 25,
      });

      const usages = hintUsageRepo.findByTeamId(teamId);

      expect(usages).toHaveLength(2);
      expect(usages[0].teamId).toBe(teamId);
      expect(usages[1].teamId).toBe(teamId);
    });

    it("should return empty array when no hint usages exist", () => {
      const usages = hintUsageRepo.findByTeamId(teamId);
      expect(usages).toEqual([]);
    });

    it("should return usages ordered by created_at", () => {
      const usage1 = hintUsageRepo.create({
        gameId,
        teamId,
        nodeId,
        pointsDeducted: 50,
      });

      const usage2 = hintUsageRepo.create({
        gameId,
        teamId,
        nodeId: nodeId2,
        pointsDeducted: 25,
      });

      const usages = hintUsageRepo.findByTeamId(teamId);

      expect(usages[0].id).toBe(usage1.id);
      expect(usages[1].id).toBe(usage2.id);
    });
  });

  describe("findByGameId", () => {
    it("should find all hint usages for a game", () => {
      // Create another team
      const team2 = teamRepository.create({
        gameId,
        name: "Test Team 2",
      });

      hintUsageRepo.create({
        gameId,
        teamId,
        nodeId,
        pointsDeducted: 50,
      });

      hintUsageRepo.create({
        gameId,
        teamId: team2.id,
        nodeId: nodeId2,
        pointsDeducted: 25,
      });

      const usages = hintUsageRepo.findByGameId(gameId);

      expect(usages).toHaveLength(2);
      expect(usages.every((u) => u.gameId === gameId)).toBe(true);
    });

    it("should return empty array when no hint usages exist for game", () => {
      const usages = hintUsageRepo.findByGameId(gameId);
      expect(usages).toEqual([]);
    });
  });

  describe("getTotalPointsDeductedForTeam", () => {
    it("should return total points deducted for a team", () => {
      hintUsageRepo.create({
        gameId,
        teamId,
        nodeId,
        pointsDeducted: 50,
      });

      hintUsageRepo.create({
        gameId,
        teamId,
        nodeId: nodeId2,
        pointsDeducted: 25,
      });

      const total = hintUsageRepo.getTotalPointsDeductedForTeam(teamId);
      expect(total).toBe(75);
    });

    it("should return 0 when no hint usages exist", () => {
      const total = hintUsageRepo.getTotalPointsDeductedForTeam(teamId);
      expect(total).toBe(0);
    });

    it("should only count points for the specified team", () => {
      const team2 = teamRepository.create({
        gameId,
        name: "Test Team 2",
      });

      hintUsageRepo.create({
        gameId,
        teamId,
        nodeId,
        pointsDeducted: 50,
      });

      hintUsageRepo.create({
        gameId,
        teamId: team2.id,
        nodeId: nodeId2,
        pointsDeducted: 100,
      });

      const totalTeam1 = hintUsageRepo.getTotalPointsDeductedForTeam(teamId);
      const totalTeam2 = hintUsageRepo.getTotalPointsDeductedForTeam(team2.id);

      expect(totalTeam1).toBe(50);
      expect(totalTeam2).toBe(100);
    });
  });

  describe("delete", () => {
    it("should delete a hint usage record", () => {
      const created = hintUsageRepo.create({
        gameId,
        teamId,
        nodeId,
        pointsDeducted: 50,
      });

      const result = hintUsageRepo.delete(created.id);

      expect(result).toBe(true);
      expect(hintUsageRepo.findById(created.id)).toBeNull();
    });

    it("should return false when deleting non-existent record", () => {
      const result = hintUsageRepo.delete("non-existent-id");
      expect(result).toBe(false);
    });

    it("should update total points deducted after deletion", () => {
      const usage1 = hintUsageRepo.create({
        gameId,
        teamId,
        nodeId,
        pointsDeducted: 50,
      });

      hintUsageRepo.create({
        gameId,
        teamId,
        nodeId: nodeId2,
        pointsDeducted: 25,
      });

      expect(hintUsageRepo.getTotalPointsDeductedForTeam(teamId)).toBe(75);

      hintUsageRepo.delete(usage1.id);

      expect(hintUsageRepo.getTotalPointsDeductedForTeam(teamId)).toBe(25);
    });
  });

  describe("cascade delete", () => {
    it("should delete hint usages when game is deleted", () => {
      hintUsageRepo.create({
        gameId,
        teamId,
        nodeId,
        pointsDeducted: 50,
      });

      expect(hintUsageRepo.findByGameId(gameId)).toHaveLength(1);

      gameRepository.delete(gameId);

      expect(hintUsageRepo.findByGameId(gameId)).toHaveLength(0);
    });

    it("should delete hint usages when team is deleted", () => {
      hintUsageRepo.create({
        gameId,
        teamId,
        nodeId,
        pointsDeducted: 50,
      });

      expect(hintUsageRepo.findByTeamId(teamId)).toHaveLength(1);

      teamRepository.delete(teamId);

      expect(hintUsageRepo.findByTeamId(teamId)).toHaveLength(0);
    });

    it("should delete hint usages when node is deleted", () => {
      hintUsageRepo.create({
        gameId,
        teamId,
        nodeId,
        pointsDeducted: 50,
      });

      expect(hintUsageRepo.findByTeamAndNode(teamId, nodeId)).not.toBeNull();

      nodeRepository.delete(nodeId);

      expect(hintUsageRepo.findByTeamAndNode(teamId, nodeId)).toBeNull();
    });
  });
});
