import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { initializeDatabase, closeDatabase, getDatabase } from "../../db/database.js";
import { scanService } from "./ScanService.js";
import { gameRepository } from "../repositories/GameRepository.js";
import { nodeRepository } from "../repositories/NodeRepository.js";
import { edgeRepository } from "../repositories/EdgeRepository.js";
import { teamRepository } from "../repositories/TeamRepository.js";

describe("ScanService", () => {
  let gameId: string;
  let teamId: string;
  let startNodeId: string;
  let endNodeId: string;

  beforeEach(async () => {
    process.env.DATA_DIR = "./tests/test-data-scan";
    await initializeDatabase();

    // Create a test game
    const game = gameRepository.create({
      name: "Test Game",
      publicSlug: "test-scan-game",
    });
    gameId = game.id;

    // Activate game
    gameRepository.update(gameId, { status: "active" });

    // Create nodes
    const startNode = nodeRepository.create({
      gameId,
      title: "Start Node",
      isStart: true,
      points: 100,
    });
    startNodeId = startNode.id;

    const endNode = nodeRepository.create({
      gameId,
      title: "End Node",
      isEnd: true,
      points: 200,
    });
    endNodeId = endNode.id;

    // Create edge
    edgeRepository.create({
      gameId,
      fromNodeId: startNodeId,
      toNodeId: endNodeId,
    });

    // Create team
    const team = teamRepository.create({
      gameId,
      name: "Test Team",
    });
    teamId = team.id;
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

  describe("recordScan", () => {
    it("should record valid first scan at start node", () => {
      const startNode = nodeRepository.findById(startNodeId)!;

      const result = scanService.recordScan({
        teamId,
        nodeKey: startNode.nodeKey,
      });

      expect(result.success).toBe(true);
      expect(result.pointsAwarded).toBe(100);
    });

    it("should reject scan at non-start node for first scan", () => {
      const endNode = nodeRepository.findById(endNodeId)!;

      const result = scanService.recordScan({
        teamId,
        nodeKey: endNode.nodeKey,
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain("not a starting QR code");
    });

    it("should allow progression through valid path", () => {
      const startNode = nodeRepository.findById(startNodeId)!;
      const endNode = nodeRepository.findById(endNodeId)!;

      // First scan
      const result1 = scanService.recordScan({
        teamId,
        nodeKey: startNode.nodeKey,
      });
      expect(result1.success).toBe(true);

      // Second scan
      const result2 = scanService.recordScan({
        teamId,
        nodeKey: endNode.nodeKey,
      });
      expect(result2.success).toBe(true);
      expect(result2.isGameComplete).toBe(true);
    });

    it("should reject duplicate scans or out-of-sequence scans", () => {
      const startNode = nodeRepository.findById(startNodeId)!;

      // First scan at start
      scanService.recordScan({ teamId, nodeKey: startNode.nodeKey });

      // Try to scan start again (not reachable from current position since you can only go forward)
      const result = scanService.recordScan({
        teamId,
        nodeKey: startNode.nodeKey,
      });

      expect(result.success).toBe(false);
      // Since start node is not reachable from itself (no self-loop edges), it fails as unreachable
      expect(result.message).toContain("not reachable");
    });

    it("should reject unreachable nodes", () => {
      const startNode = nodeRepository.findById(startNodeId)!;

      // Create disconnected node
      const disconnected = nodeRepository.create({
        gameId,
        title: "Disconnected",
      });

      // Scan start first
      scanService.recordScan({ teamId, nodeKey: startNode.nodeKey });

      // Try to scan disconnected
      const result = scanService.recordScan({
        teamId,
        nodeKey: disconnected.nodeKey,
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain("not reachable");
    });
  });

  describe("getTeamProgress", () => {
    it("should return initial progress for new team", () => {
      const progress = scanService.getTeamProgress(teamId);

      expect(progress).toBeDefined();
      expect(progress!.nodesFound).toBe(0);
      expect(progress!.totalPoints).toBe(0);
      expect(progress!.isFinished).toBe(false);
    });

    it("should track progress after scans", () => {
      const startNode = nodeRepository.findById(startNodeId)!;
      scanService.recordScan({ teamId, nodeKey: startNode.nodeKey });

      const progress = scanService.getTeamProgress(teamId);

      expect(progress!.nodesFound).toBe(1);
      expect(progress!.totalPoints).toBe(100);
      expect(progress!.currentNode?.id).toBe(startNodeId);
    });

    it("should mark finished when end node scanned", () => {
      const startNode = nodeRepository.findById(startNodeId)!;
      const endNode = nodeRepository.findById(endNodeId)!;

      scanService.recordScan({ teamId, nodeKey: startNode.nodeKey });
      scanService.recordScan({ teamId, nodeKey: endNode.nodeKey });

      const progress = scanService.getTeamProgress(teamId);

      expect(progress!.isFinished).toBe(true);
    });
  });

  describe("checkIfWinner", () => {
    it("should identify first finisher as winner", () => {
      const startNode = nodeRepository.findById(startNodeId)!;
      const endNode = nodeRepository.findById(endNodeId)!;

      // Team 1 finishes
      scanService.recordScan({ teamId, nodeKey: startNode.nodeKey });
      scanService.recordScan({ teamId, nodeKey: endNode.nodeKey });

      const result = scanService.checkIfWinner(teamId);

      expect(result.isWinner).toBe(true);
      expect(result.winnerTeamId).toBe(teamId);
    });

    it("should not mark unfinished team as winner", () => {
      const startNode = nodeRepository.findById(startNodeId)!;

      scanService.recordScan({ teamId, nodeKey: startNode.nodeKey });

      const result = scanService.checkIfWinner(teamId);

      expect(result.isWinner).toBe(false);
    });
  });
});
