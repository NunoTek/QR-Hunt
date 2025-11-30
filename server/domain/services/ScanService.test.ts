import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { initializeDatabase, closeDatabase, getDatabase } from "../../db/database.js";
import { scanService } from "./ScanService.js";
import { gameRepository } from "../repositories/GameRepository.js";
import { nodeRepository } from "../repositories/NodeRepository.js";
import { edgeRepository } from "../repositories/EdgeRepository.js";
import { teamRepository } from "../repositories/TeamRepository.js";
import { hintUsageRepository as _hintUsageRepository } from "../repositories/HintUsageRepository.js";

describe("ScanService", () => {
  let gameId: string;
  let teamId: string;
  let startNodeId: string;
  let endNodeId: string;

  beforeEach(async () => {
    process.env.DATA_DIR = "./tests/test-data-scan";
    await initializeDatabase();

    // Create a test game with time bonus disabled for predictable point values
    const game = gameRepository.create({
      name: "Test Game",
      publicSlug: "test-scan-game",
      settings: {
        timeBonusEnabled: false,
        timeBonusMultiplier: 1.5,
      },
    });
    gameId = game.id;

    // Activate game
    gameRepository.update(gameId, { status: "active" });

    // Create nodes (activated for testing)
    const startNode = nodeRepository.create({
      gameId,
      title: "Start Node",
      isStart: true,
      points: 100,
    });
    nodeRepository.update(startNode.id, { activated: true });
    startNodeId = startNode.id;

    const endNode = nodeRepository.create({
      gameId,
      title: "End Node",
      isEnd: true,
      points: 200,
    });
    nodeRepository.update(endNode.id, { activated: true });
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
    db.exec("DELETE FROM hint_usages");
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
      expect(result.message).toContain("start");
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

    it("should reject duplicate scans", () => {
      const startNode = nodeRepository.findById(startNodeId)!;

      // First scan at start
      scanService.recordScan({ teamId, nodeKey: startNode.nodeKey });

      // Try to scan start again
      const result = scanService.recordScan({
        teamId,
        nodeKey: startNode.nodeKey,
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain("already scanned");
    });

    it("should allow scanning any node after starting (collect-all mode)", () => {
      const startNode = nodeRepository.findById(startNodeId)!;

      // Create another activated node (not connected by edge)
      const extraNode = nodeRepository.create({
        gameId,
        title: "Extra Node",
        points: 50,
      });
      nodeRepository.update(extraNode.id, { activated: true });

      // Scan start first
      scanService.recordScan({ teamId, nodeKey: startNode.nodeKey });

      // Should be able to scan any node in collect-all mode
      const result = scanService.recordScan({
        teamId,
        nodeKey: extraNode.nodeKey,
      });

      expect(result.success).toBe(true);
      expect(result.pointsAwarded).toBe(50);
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

  describe("activated nodes filtering", () => {
    it("should not include non-activated nodes in nextNodes", () => {
      const startNode = nodeRepository.findById(startNodeId)!;

      // Create a non-activated node
      const hiddenNode = nodeRepository.create({
        gameId,
        title: "Hidden Node",
        points: 500,
      });
      // Don't activate it

      // Scan start node
      scanService.recordScan({ teamId, nodeKey: startNode.nodeKey });

      const progress = scanService.getTeamProgress(teamId);

      // nextNodes should only contain the activated end node, not the hidden node
      expect(progress!.nextNodes.length).toBe(1);
      expect(progress!.nextNodes[0].id).toBe(endNodeId);
      expect(progress!.nextNodes.find((n) => n.id === hiddenNode.id)).toBeUndefined();
    });

    it("should not show non-activated node as nextClue", () => {
      // Create a non-activated node connected to start
      const hiddenNode = nodeRepository.create({
        gameId,
        title: "Hidden Clue",
        points: 300,
      });
      // Don't activate it
      edgeRepository.create({ gameId, fromNodeId: startNodeId, toNodeId: hiddenNode.id });

      const startNode = nodeRepository.findById(startNodeId)!;
      scanService.recordScan({ teamId, nodeKey: startNode.nodeKey });

      const progress = scanService.getTeamProgress(teamId);

      // nextClue should not be the hidden node
      expect(progress!.nextClue?.id).not.toBe(hiddenNode.id);
    });

    it("should allow scanning non-activated nodes but not require them for completion", () => {
      const startNode = nodeRepository.findById(startNodeId)!;
      const endNode = nodeRepository.findById(endNodeId)!;

      // Create a non-activated node
      const bonusNode = nodeRepository.create({
        gameId,
        title: "Bonus Node",
        points: 1000,
      });
      // Don't activate it

      // Scan start
      scanService.recordScan({ teamId, nodeKey: startNode.nodeKey });

      // Scan bonus (non-activated) - should work
      const bonusScan = scanService.recordScan({ teamId, nodeKey: bonusNode.nodeKey });
      expect(bonusScan.success).toBe(true);
      expect(bonusScan.pointsAwarded).toBe(1000);

      // Scan end
      const endScan = scanService.recordScan({ teamId, nodeKey: endNode.nodeKey });
      expect(endScan.success).toBe(true);
      expect(endScan.isGameComplete).toBe(true); // Complete without needing bonus node
    });

    it("should only count activated nodes for game completion", () => {
      const startNode = nodeRepository.findById(startNodeId)!;
      const endNode = nodeRepository.findById(endNodeId)!;

      // Create a non-activated middle node
      const _middleNode = nodeRepository.create({
        gameId,
        title: "Middle Node",
        points: 150,
      });
      // Don't activate it

      // Scan only activated nodes
      scanService.recordScan({ teamId, nodeKey: startNode.nodeKey });
      const result = scanService.recordScan({ teamId, nodeKey: endNode.nodeKey });

      // Should be complete even though middle node wasn't scanned
      expect(result.isGameComplete).toBe(true);

      const progress = scanService.getTeamProgress(teamId);
      expect(progress!.isFinished).toBe(true);
    });

    it("should determine winner based only on activated nodes", () => {
      const startNode = nodeRepository.findById(startNodeId)!;
      const endNode = nodeRepository.findById(endNodeId)!;

      // Create a non-activated node
      nodeRepository.create({
        gameId,
        title: "Extra Node",
        points: 100,
      });
      // Don't activate it

      // Complete game with just activated nodes
      scanService.recordScan({ teamId, nodeKey: startNode.nodeKey });
      scanService.recordScan({ teamId, nodeKey: endNode.nodeKey });

      const result = scanService.checkIfWinner(teamId);
      expect(result.isWinner).toBe(true);
    });

    it("should show correct remaining count excluding non-activated nodes", () => {
      const startNode = nodeRepository.findById(startNodeId)!;

      // Create 2 non-activated nodes
      nodeRepository.create({ gameId, title: "Hidden 1", points: 100 });
      nodeRepository.create({ gameId, title: "Hidden 2", points: 100 });

      // Scan start
      const result = scanService.recordScan({ teamId, nodeKey: startNode.nodeKey });

      // Message should say "1 more to find" (only the activated end node)
      expect(result.message).toContain("1 more");
    });
  });

  describe("requestHint", () => {
    let nodeWithHint: string;
    let nodeWithoutHint: string;

    beforeEach(() => {
      // Create a node with a hint
      const hintNode = nodeRepository.create({
        gameId,
        title: "Node With Hint",
        hint: "This is the hint text",
        points: 100,
      });
      nodeRepository.update(hintNode.id, { activated: true });
      nodeWithHint = hintNode.id;

      // Create a node without a hint
      const noHintNode = nodeRepository.create({
        gameId,
        title: "Node Without Hint",
        points: 80,
      });
      nodeRepository.update(noHintNode.id, { activated: true });
      nodeWithoutHint = noHintNode.id;
    });

    it("should return hint and deduct half points", () => {
      const result = scanService.requestHint(teamId, nodeWithHint);

      expect(result.success).toBe(true);
      expect(result.hint).toBe("This is the hint text");
      expect(result.pointsDeducted).toBe(50); // half of 100
      expect(result.alreadyUsed).toBe(false);
    });

    it("should return alreadyUsed true on second request", () => {
      // First request
      scanService.requestHint(teamId, nodeWithHint);

      // Second request
      const result = scanService.requestHint(teamId, nodeWithHint);

      expect(result.success).toBe(true);
      expect(result.hint).toBe("This is the hint text");
      expect(result.pointsDeducted).toBe(50);
      expect(result.alreadyUsed).toBe(true);
    });

    it("should fail when node has no hint", () => {
      const result = scanService.requestHint(teamId, nodeWithoutHint);

      expect(result.success).toBe(false);
      expect(result.message).toContain("No hint available");
    });

    it("should fail for non-existent team", () => {
      const result = scanService.requestHint("non-existent-team", nodeWithHint);

      expect(result.success).toBe(false);
      expect(result.message).toContain("Team not found");
    });

    it("should fail for non-existent node", () => {
      const result = scanService.requestHint(teamId, "non-existent-node");

      expect(result.success).toBe(false);
      expect(result.message).toContain("Node not found");
    });

    it("should fail when game is not active", () => {
      gameRepository.update(gameId, { status: "draft" });

      const result = scanService.requestHint(teamId, nodeWithHint);

      expect(result.success).toBe(false);
      expect(result.message).toContain("not active");
    });

    it("should fail when node belongs to different game", () => {
      // Create another game
      const otherGame = gameRepository.create({
        name: "Other Game",
        publicSlug: "other-game",
      });
      gameRepository.update(otherGame.id, { status: "active" });

      // Create node in other game
      const otherNode = nodeRepository.create({
        gameId: otherGame.id,
        title: "Other Node",
        hint: "Other hint",
        points: 100,
      });

      const result = scanService.requestHint(teamId, otherNode.id);

      expect(result.success).toBe(false);
      expect(result.message).toContain("does not belong");
    });

    it("should calculate points correctly for different point values", () => {
      // Create node with odd points
      const oddNode = nodeRepository.create({
        gameId,
        title: "Odd Points Node",
        hint: "Odd hint",
        points: 75, // Half is 37.5, should floor to 37
      });

      const result = scanService.requestHint(teamId, oddNode.id);

      expect(result.success).toBe(true);
      expect(result.pointsDeducted).toBe(37);
    });
  });

  describe("getHintUsage", () => {
    let nodeWithHint: string;

    beforeEach(() => {
      const hintNode = nodeRepository.create({
        gameId,
        title: "Hint Node",
        hint: "Test hint",
        points: 100,
      });
      nodeWithHint = hintNode.id;
    });

    it("should return null when no hint used", () => {
      const usage = scanService.getHintUsage(teamId, nodeWithHint);
      expect(usage).toBeNull();
    });

    it("should return hint usage after requesting hint", () => {
      scanService.requestHint(teamId, nodeWithHint);

      const usage = scanService.getHintUsage(teamId, nodeWithHint);

      expect(usage).not.toBeNull();
      expect(usage?.teamId).toBe(teamId);
      expect(usage?.nodeId).toBe(nodeWithHint);
      expect(usage?.pointsDeducted).toBe(50);
    });
  });

  describe("getTotalHintPointsDeducted", () => {
    let node1: string;
    let node2: string;

    beforeEach(() => {
      const hintNode1 = nodeRepository.create({
        gameId,
        title: "Hint Node 1",
        hint: "Hint 1",
        points: 100,
      });
      node1 = hintNode1.id;

      const hintNode2 = nodeRepository.create({
        gameId,
        title: "Hint Node 2",
        hint: "Hint 2",
        points: 50,
      });
      node2 = hintNode2.id;
    });

    it("should return 0 when no hints used", () => {
      const total = scanService.getTotalHintPointsDeducted(teamId);
      expect(total).toBe(0);
    });

    it("should return total points deducted for all hints used", () => {
      scanService.requestHint(teamId, node1); // 50 points
      scanService.requestHint(teamId, node2); // 25 points

      const total = scanService.getTotalHintPointsDeducted(teamId);
      expect(total).toBe(75);
    });

    it("should not double count repeated hint requests", () => {
      scanService.requestHint(teamId, node1);
      scanService.requestHint(teamId, node1); // Request again

      const total = scanService.getTotalHintPointsDeducted(teamId);
      expect(total).toBe(50); // Only counted once
    });
  });
});
