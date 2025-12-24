import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { initializeDatabase, closeDatabase, getDatabase } from "@server/db/database.js";
import { gameRepository } from "@server/domain/repositories/GameRepository.js";
import { teamRepository } from "@server/domain/repositories/TeamRepository.js";
import { nodeRepository } from "@server/domain/repositories/NodeRepository.js";
import { edgeRepository } from "@server/domain/repositories/EdgeRepository.js";
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

describe("Admin API - CSV Import", () => {
  let gameId: string;

  beforeEach(async () => {
    process.env.DATA_DIR = "./tests/test-data-admin-api";
    await initializeDatabase();

    // Create test game
    const game = gameRepository.create({
      name: "CSV Import Test Game",
      publicSlug: "csv-import-test-game",
    });
    gameId = game.id;
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

  describe("CSV node import", () => {
    it("should create nodes from CSV data", () => {
      // Simulate CSV import data
      const csvNodes = [
        { title: "Start Clue", content: "Welcome to the hunt!", isstart: "true", isend: "false", points: "100" },
        { title: "Middle Clue", content: "Keep going!", isstart: "false", isend: "false", points: "150" },
        { title: "End Clue", content: "Congratulations!", isstart: "false", isend: "true", points: "200" },
      ];

      // Create nodes
      const titleToId = new Map<string, string>();
      for (const nodeData of csvNodes) {
        const nodeKey = nodeData.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
          .substring(0, 50) + "-" + Date.now().toString(36);

        const node = nodeRepository.create({
          gameId,
          nodeKey,
          title: nodeData.title,
          content: nodeData.content,
          contentType: "text",
          isStart: nodeData.isstart === "true",
          isEnd: nodeData.isend === "true",
          points: parseInt(nodeData.points, 10),
        });
        titleToId.set(nodeData.title, node.id);
      }

      // Verify nodes were created
      const nodes = nodeRepository.findByGameId(gameId);
      expect(nodes.length).toBe(3);

      const startNode = nodes.find(n => n.title === "Start Clue");
      expect(startNode).toBeDefined();
      expect(startNode?.isStart).toBe(true);
      expect(startNode?.points).toBe(100);

      const endNode = nodes.find(n => n.title === "End Clue");
      expect(endNode).toBeDefined();
      expect(endNode?.isEnd).toBe(true);
      expect(endNode?.points).toBe(200);
    });

    it("should create edges based on 'next' column", () => {
      // Create nodes first
      const node1 = nodeRepository.create({
        gameId,
        nodeKey: "start-clue",
        title: "Start Clue",
        isStart: true,
      });

      const node2 = nodeRepository.create({
        gameId,
        nodeKey: "middle-clue",
        title: "Middle Clue",
      });

      const node3 = nodeRepository.create({
        gameId,
        nodeKey: "end-clue",
        title: "End Clue",
        isEnd: true,
      });

      // Simulate edge data from CSV "next" column
      const csvEdges = [
        { from: "Start Clue", to: "Middle Clue" },
        { from: "Middle Clue", to: "End Clue" },
      ];

      // Build title to ID mapping
      const titleToId = new Map<string, string>();
      titleToId.set("Start Clue", node1.id);
      titleToId.set("Middle Clue", node2.id);
      titleToId.set("End Clue", node3.id);

      // Create edges
      for (const edgeData of csvEdges) {
        const fromNodeId = titleToId.get(edgeData.from);
        const toNodeId = titleToId.get(edgeData.to);

        if (fromNodeId && toNodeId) {
          edgeRepository.create({
            gameId,
            fromNodeId,
            toNodeId,
          });
        }
      }

      // Verify edges were created
      const edges = edgeRepository.findByGameId(gameId);
      expect(edges.length).toBe(2);

      const edge1 = edges.find(e => e.fromNodeId === node1.id);
      expect(edge1).toBeDefined();
      expect(edge1?.toNodeId).toBe(node2.id);

      const edge2 = edges.find(e => e.fromNodeId === node2.id);
      expect(edge2).toBeDefined();
      expect(edge2?.toNodeId).toBe(node3.id);
    });

    it("should handle empty content gracefully", () => {
      const node = nodeRepository.create({
        gameId,
        nodeKey: "empty-content",
        title: "Node with no content",
        content: undefined,
        contentType: "text",
      });

      expect(node.title).toBe("Node with no content");
      expect(node.content).toBeNull();
    });

    it("should use default points when not specified", () => {
      const node = nodeRepository.create({
        gameId,
        nodeKey: "default-points",
        title: "Node without points",
        points: 100, // Default value
      });

      expect(node.points).toBe(100);
    });

    it("should handle hints in CSV data", () => {
      const node = nodeRepository.create({
        gameId,
        nodeKey: "node-with-hint",
        title: "Clue with hint",
        content: "Find the treasure!",
        hint: "Look near the big tree",
        points: 150,
      });

      expect(node.hint).toBe("Look near the big tree");
    });

    it("should not create edges for non-existent nodes", () => {
      const node1 = nodeRepository.create({
        gameId,
        nodeKey: "only-node",
        title: "Only Node",
        isStart: true,
      });

      // Simulate edge data pointing to non-existent node
      const csvEdges = [
        { from: "Only Node", to: "Non-existent Node" },
      ];

      // Build title to ID mapping
      const titleToId = new Map<string, string>();
      titleToId.set("Only Node", node1.id);

      // Try to create edges - should skip non-existent
      let edgesCreated = 0;
      for (const edgeData of csvEdges) {
        const fromNodeId = titleToId.get(edgeData.from);
        const toNodeId = titleToId.get(edgeData.to);

        if (fromNodeId && toNodeId) {
          edgeRepository.create({
            gameId,
            fromNodeId,
            toNodeId,
          });
          edgesCreated++;
        }
      }

      // No edges should be created
      expect(edgesCreated).toBe(0);
      const edges = edgeRepository.findByGameId(gameId);
      expect(edges.length).toBe(0);
    });
  });
});
