import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { initializeDatabase, closeDatabase, getDatabase } from "@server/db/database.js";
import { gameRepository } from "@server/domain/repositories/GameRepository.js";
import { teamRepository } from "@server/domain/repositories/TeamRepository.js";
import { nodeRepository } from "@server/domain/repositories/NodeRepository.js";
import { gameService } from "@server/domain/services/GameService.js";

describe("Admin API - Game Status", () => {
  let gameId: string;

  beforeEach(async () => {
    process.env.DATA_DIR = "./tests/test-data-admin-status";
    await initializeDatabase();

    // Create test game with required nodes
    const game = gameRepository.create({
      name: "Status Test Game",
      publicSlug: "status-test-game",
    });
    gameId = game.id;

    // Create start and end nodes for a valid game (activated for game to be activatable)
    nodeRepository.create({
      gameId,
      title: "Start Node",
      isStart: true,
      activated: true,
    });

    nodeRepository.create({
      gameId,
      title: "End Node",
      isEnd: true,
      activated: true,
    });
  });

  afterEach(() => {
    const db = getDatabase();
    db.exec("DELETE FROM scans");
    db.exec("DELETE FROM team_sessions");
    db.exec("DELETE FROM edges");
    db.exec("DELETE FROM nodes");
    db.exec("DELETE FROM teams");
    db.exec("DELETE FROM games");
    closeDatabase();
  });

  describe("openGame", () => {
    it("should open a draft game and set status to pending", () => {
      const game = gameRepository.findById(gameId);
      expect(game?.status).toBe("draft");

      const openedGame = gameService.openGame(gameId);
      expect(openedGame?.status).toBe("pending");
    });

    it("should return null for non-existent game", () => {
      const result = gameService.openGame("non-existent-id");
      expect(result).toBeNull();
    });
  });

  describe("activateGame", () => {
    it("should activate a draft game directly", () => {
      const activatedGame = gameService.activateGame(gameId);
      expect(activatedGame?.status).toBe("active");
    });

    it("should activate a pending game", () => {
      // First open the game
      gameService.openGame(gameId);

      // Then activate
      const activatedGame = gameService.activateGame(gameId);
      expect(activatedGame?.status).toBe("active");
    });

    it("should not activate an already active game", () => {
      gameService.activateGame(gameId);

      expect(() => {
        gameService.activateGame(gameId);
      }).toThrow("Can only activate games that are in draft or pending status");
    });
  });

  describe("game status flow", () => {
    it("should follow draft -> pending -> active -> completed flow", () => {
      // Start in draft
      let game = gameRepository.findById(gameId);
      expect(game?.status).toBe("draft");

      // Open to pending
      gameService.openGame(gameId);
      game = gameRepository.findById(gameId);
      expect(game?.status).toBe("pending");

      // Activate
      gameService.activateGame(gameId);
      game = gameRepository.findById(gameId);
      expect(game?.status).toBe("active");

      // Complete
      gameService.completeGame(gameId);
      game = gameRepository.findById(gameId);
      expect(game?.status).toBe("completed");
    });

    it("should allow skipping pending status (draft -> active)", () => {
      let game = gameRepository.findById(gameId);
      expect(game?.status).toBe("draft");

      gameService.activateGame(gameId);
      game = gameRepository.findById(gameId);
      expect(game?.status).toBe("active");
    });
  });
});

describe("Admin API - Team Creation", () => {
  let gameId: string;
  let startNode1Id: string;
  let startNode2Id: string;
  let startNode3Id: string;

  beforeEach(async () => {
    process.env.DATA_DIR = "./tests/test-data-admin-api";
    await initializeDatabase();

    // Create test game
    const game = gameRepository.create({
      name: "Admin Test Game",
      publicSlug: "admin-test-game",
    });
    gameId = game.id;

    // Create multiple start nodes for testing distribution
    const startNode1 = nodeRepository.create({
      gameId,
      title: "Start Node 1",
      isStart: true,
      content: "First starting clue",
    });
    startNode1Id = startNode1.id;

    const startNode2 = nodeRepository.create({
      gameId,
      title: "Start Node 2",
      isStart: true,
      content: "Second starting clue",
    });
    startNode2Id = startNode2.id;

    const startNode3 = nodeRepository.create({
      gameId,
      title: "Start Node 3",
      isStart: true,
      content: "Third starting clue",
    });
    startNode3Id = startNode3.id;

    // Create end node (required for valid game)
    nodeRepository.create({
      gameId,
      title: "End Node",
      isEnd: true,
    });
  });

  afterEach(() => {
    const db = getDatabase();
    db.exec("DELETE FROM scans");
    db.exec("DELETE FROM team_sessions");
    db.exec("DELETE FROM edges");
    db.exec("DELETE FROM nodes");
    db.exec("DELETE FROM teams");
    db.exec("DELETE FROM games");
    closeDatabase();
  });

  describe("auto-assign start nodes", () => {
    it("should find start nodes for a game", () => {
      const startNodes = nodeRepository.findStartNodes(gameId);

      expect(startNodes.length).toBe(3);
      expect(startNodes.every(n => n.isStart)).toBe(true);
    });

    it("should distribute teams evenly across start nodes", () => {
      // Manually simulate the auto-assign logic
      const getAutoAssignedStartNode = () => {
        const startNodes = nodeRepository.findStartNodes(gameId);
        if (startNodes.length === 0) return null;

        const existingTeams = teamRepository.findByGameId(gameId);
        const startNodeUsage = new Map<string, number>();

        // Initialize usage count
        for (const node of startNodes) {
          startNodeUsage.set(node.id, 0);
        }

        // Count usage
        for (const team of existingTeams) {
          if (team.startNodeId && startNodeUsage.has(team.startNodeId)) {
            startNodeUsage.set(team.startNodeId, startNodeUsage.get(team.startNodeId)! + 1);
          }
        }

        // Find least used
        let minUsage = Infinity;
        let leastUsedNodeId = startNodes[0].id;
        for (const [nodeId, usage] of startNodeUsage) {
          if (usage < minUsage) {
            minUsage = usage;
            leastUsedNodeId = nodeId;
          }
        }

        return leastUsedNodeId;
      };

      // Create teams and track their assignments
      const assignedNodes: string[] = [];

      // Create 6 teams (should be 2 per start node)
      for (let i = 0; i < 6; i++) {
        const assignedStartNodeId = getAutoAssignedStartNode()!;
        const team = teamRepository.create({
          gameId,
          name: `Team ${i + 1}`,
          startNodeId: assignedStartNodeId,
        });
        assignedNodes.push(team.startNodeId!);
      }

      // Count distribution
      const nodeCounts = assignedNodes.reduce((acc, nodeId) => {
        acc[nodeId] = (acc[nodeId] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Each start node should have 2 teams
      expect(nodeCounts[startNode1Id]).toBe(2);
      expect(nodeCounts[startNode2Id]).toBe(2);
      expect(nodeCounts[startNode3Id]).toBe(2);
    });

    it("should assign first team to first start node when all are unused", () => {
      const startNodes = nodeRepository.findStartNodes(gameId);
      const startNodeUsage = new Map<string, number>();

      for (const node of startNodes) {
        startNodeUsage.set(node.id, 0);
      }

      let minUsage = Infinity;
      let leastUsedNodeId = startNodes[0].id;
      for (const [nodeId, usage] of startNodeUsage) {
        if (usage < minUsage) {
          minUsage = usage;
          leastUsedNodeId = nodeId;
        }
      }

      // First team should get the first start node (when all have 0 usage)
      expect(leastUsedNodeId).toBe(startNode1Id);
    });

    it("should handle single start node gracefully", () => {
      // Delete extra start nodes
      const db = getDatabase();
      db.exec(`DELETE FROM nodes WHERE id IN ('${startNode2Id}', '${startNode3Id}')`);

      const startNodes = nodeRepository.findStartNodes(gameId);
      expect(startNodes.length).toBe(1);

      // All teams should get the same start node
      const team1 = teamRepository.create({ gameId, name: "Team 1", startNodeId: startNodes[0].id });
      const team2 = teamRepository.create({ gameId, name: "Team 2", startNodeId: startNodes[0].id });

      expect(team1.startNodeId).toBe(startNode1Id);
      expect(team2.startNodeId).toBe(startNode1Id);
    });

    it("should allow manual start node assignment to override auto-assign", () => {
      const team = teamRepository.create({
        gameId,
        name: "Manual Team",
        startNodeId: startNode2Id, // Explicitly set
      });

      expect(team.startNodeId).toBe(startNode2Id);
    });
  });
});
