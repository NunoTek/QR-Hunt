import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { initializeDatabase, closeDatabase, getDatabase } from "../../db/database.js";
import { gameRepository } from "../../domain/repositories/GameRepository.js";
import { teamRepository } from "../../domain/repositories/TeamRepository.js";
import { nodeRepository } from "../../domain/repositories/NodeRepository.js";
import { edgeRepository } from "../../domain/repositories/EdgeRepository.js";
import { scanService } from "../../domain/services/ScanService.js";
import { authService } from "../../domain/services/AuthService.js";

describe("Scan API", () => {
  let gameId: string;
  let teamId: string;
  let startNodeKey: string;
  let middleNodeKey: string;
  let endNodeKey: string;
  let passwordNodeKey: string;

  beforeEach(async () => {
    process.env.DATA_DIR = "./tests/test-data-scan-api";
    await initializeDatabase();

    // Create test game with time bonus disabled for predictable point values
    const game = gameRepository.create({
      name: "Scan Test Game",
      publicSlug: "scan-test-game",
      settings: {
        rankingMode: "points",
        basePoints: 100,
        timeBonusEnabled: false,
        timeBonusMultiplier: 1.5,
      },
    });
    gameId = game.id;
    gameRepository.update(gameId, { status: "active" });

    // Create nodes
    const startNode = nodeRepository.create({
      gameId,
      title: "Start Clue",
      isStart: true,
      points: 100,
      content: "Find the next clue near the fountain",
    });
    startNodeKey = startNode.nodeKey;

    const middleNode = nodeRepository.create({
      gameId,
      title: "Middle Clue",
      points: 150,
      content: "Look under the big oak tree",
    });
    middleNodeKey = middleNode.nodeKey;

    const passwordNode = nodeRepository.create({
      gameId,
      title: "Password Clue",
      points: 200,
      passwordRequired: true,
      passwordHash: authService.hashPassword("secret123"),
    });
    passwordNodeKey = passwordNode.nodeKey;

    const endNode = nodeRepository.create({
      gameId,
      title: "Finish Line",
      isEnd: true,
      points: 250,
      content: "Congratulations!",
    });
    endNodeKey = endNode.nodeKey;

    // Create edges: start -> middle -> password -> end
    edgeRepository.create({ gameId, fromNodeId: startNode.id, toNodeId: middleNode.id });
    edgeRepository.create({ gameId, fromNodeId: middleNode.id, toNodeId: passwordNode.id });
    edgeRepository.create({ gameId, fromNodeId: passwordNode.id, toNodeId: endNode.id });

    // Create team
    const team = teamRepository.create({ gameId, name: "Scan Test Team" });
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
    it("should successfully scan start node as first scan", () => {
      const result = scanService.recordScan({
        teamId,
        nodeKey: startNodeKey,
      });

      expect(result.success).toBe(true);
      expect(result.pointsAwarded).toBe(100);
      expect(result.node).toBeDefined();
      expect(result.node!.title).toBe("Start Clue");
      expect(result.node!.content).toBe("Find the next clue near the fountain");
    });

    it("should reject non-start node as first scan", () => {
      const result = scanService.recordScan({
        teamId,
        nodeKey: middleNodeKey,
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain("start");
    });

    it("should allow valid path progression", () => {
      // Scan start
      const result1 = scanService.recordScan({ teamId, nodeKey: startNodeKey });
      expect(result1.success).toBe(true);

      // Scan middle
      const result2 = scanService.recordScan({ teamId, nodeKey: middleNodeKey });
      expect(result2.success).toBe(true);
      expect(result2.pointsAwarded).toBe(150);
    });

    it("should allow scanning any node after starting (collect-all mode)", () => {
      // Scan start
      scanService.recordScan({ teamId, nodeKey: startNodeKey });

      // In collect-all mode, any node can be scanned after starting
      const result = scanService.recordScan({ teamId, nodeKey: endNodeKey });

      expect(result.success).toBe(true);
      expect(result.pointsAwarded).toBe(250);
    });

    it("should reject scanning already scanned node", () => {
      // Scan start twice
      scanService.recordScan({ teamId, nodeKey: startNodeKey });
      const result = scanService.recordScan({ teamId, nodeKey: startNodeKey });

      expect(result.success).toBe(false);
      expect(result.message).toContain("already scanned");
    });

    it("should reject invalid node key", () => {
      const result = scanService.recordScan({
        teamId,
        nodeKey: "invalid-key-12345",
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe("Invalid QR code");
    });
  });

  describe("password protected nodes", () => {
    it("should require password for protected nodes", () => {
      // Progress to password node
      scanService.recordScan({ teamId, nodeKey: startNodeKey });
      scanService.recordScan({ teamId, nodeKey: middleNodeKey });

      // Try to scan without password
      const result = scanService.recordScan({
        teamId,
        nodeKey: passwordNodeKey,
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe("Password required");
    });

    it("should accept correct password", () => {
      // Progress to password node
      scanService.recordScan({ teamId, nodeKey: startNodeKey });
      scanService.recordScan({ teamId, nodeKey: middleNodeKey });

      // Scan with correct password
      const result = scanService.recordScan({
        teamId,
        nodeKey: passwordNodeKey,
        password: "secret123",
      });

      expect(result.success).toBe(true);
      expect(result.pointsAwarded).toBe(200);
    });

    it("should reject incorrect password", () => {
      // Progress to password node
      scanService.recordScan({ teamId, nodeKey: startNodeKey });
      scanService.recordScan({ teamId, nodeKey: middleNodeKey });

      // Try with wrong password
      const result = scanService.recordScan({
        teamId,
        nodeKey: passwordNodeKey,
        password: "wrongpassword",
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe("Incorrect password");
    });
  });

  describe("game completion", () => {
    it("should mark game complete when end node is scanned", () => {
      // Complete the game path
      scanService.recordScan({ teamId, nodeKey: startNodeKey });
      scanService.recordScan({ teamId, nodeKey: middleNodeKey });
      scanService.recordScan({ teamId, nodeKey: passwordNodeKey, password: "secret123" });

      const result = scanService.recordScan({ teamId, nodeKey: endNodeKey });

      expect(result.success).toBe(true);
      expect(result.isGameComplete).toBe(true);
      expect(result.pointsAwarded).toBe(250);
    });

    it("should identify winner", () => {
      // Team finishes game
      scanService.recordScan({ teamId, nodeKey: startNodeKey });
      scanService.recordScan({ teamId, nodeKey: middleNodeKey });
      scanService.recordScan({ teamId, nodeKey: passwordNodeKey, password: "secret123" });
      scanService.recordScan({ teamId, nodeKey: endNodeKey });

      const winStatus = scanService.checkIfWinner(teamId);

      expect(winStatus.isWinner).toBe(true);
      expect(winStatus.winnerTeamId).toBe(teamId);
    });
  });

  describe("getTeamProgress", () => {
    it("should return initial state for new team", () => {
      const progress = scanService.getTeamProgress(teamId);

      expect(progress).toBeDefined();
      expect(progress!.nodesFound).toBe(0);
      expect(progress!.totalPoints).toBe(0);
      expect(progress!.isFinished).toBe(false);
      expect(progress!.currentNode).toBeNull();
    });

    it("should return starting clue for team with assigned start node", () => {
      // Assign start node to team
      const startNode = nodeRepository.findByGameId(gameId).find(n => n.isStart);
      teamRepository.update(teamId, { startNodeId: startNode!.id });

      const progress = scanService.getTeamProgress(teamId);

      expect(progress).toBeDefined();
      expect(progress!.team.startNodeId).toBe(startNode!.id);
    });

    it("should track progress correctly", () => {
      scanService.recordScan({ teamId, nodeKey: startNodeKey });
      scanService.recordScan({ teamId, nodeKey: middleNodeKey });

      const progress = scanService.getTeamProgress(teamId);

      expect(progress!.nodesFound).toBe(2);
      expect(progress!.totalPoints).toBe(250); // 100 + 150
      expect(progress!.isFinished).toBe(false);
      expect(progress!.currentNode!.title).toBe("Middle Clue");
    });

    it("should show remaining nodes to find", () => {
      scanService.recordScan({ teamId, nodeKey: startNodeKey });

      const progress = scanService.getTeamProgress(teamId);

      // In collect-all mode, nextNodes shows remaining nodes (3: middle, password, end)
      expect(progress!.nextNodes.length).toBe(3);
    });

    it("should mark finished after end node", () => {
      // Complete game
      scanService.recordScan({ teamId, nodeKey: startNodeKey });
      scanService.recordScan({ teamId, nodeKey: middleNodeKey });
      scanService.recordScan({ teamId, nodeKey: passwordNodeKey, password: "secret123" });
      scanService.recordScan({ teamId, nodeKey: endNodeKey });

      const progress = scanService.getTeamProgress(teamId);

      expect(progress!.isFinished).toBe(true);
      expect(progress!.totalPoints).toBe(700); // 100 + 150 + 200 + 250
    });
  });

  describe("scan metadata", () => {
    it("should record client IP and user agent", () => {
      const result = scanService.recordScan({
        teamId,
        nodeKey: startNodeKey,
        clientIp: "192.168.1.100",
        userAgent: "Test Browser/1.0",
      });

      expect(result.success).toBe(true);

      // Verify by checking scans
      const progress = scanService.getTeamProgress(teamId);
      expect(progress!.scans[0].clientIp).toBe("192.168.1.100");
      expect(progress!.scans[0].userAgent).toBe("Test Browser/1.0");
    });
  });

  describe("multiple teams", () => {
    let team2Id: string;

    beforeEach(() => {
      const team2 = teamRepository.create({ gameId, name: "Team 2" });
      team2Id = team2.id;
    });

    it("should track progress independently for each team", () => {
      // Team 1 completes 2 nodes
      scanService.recordScan({ teamId, nodeKey: startNodeKey });
      scanService.recordScan({ teamId, nodeKey: middleNodeKey });

      // Team 2 completes 1 node
      scanService.recordScan({ teamId: team2Id, nodeKey: startNodeKey });

      const progress1 = scanService.getTeamProgress(teamId);
      const progress2 = scanService.getTeamProgress(team2Id);

      expect(progress1!.nodesFound).toBe(2);
      expect(progress2!.nodesFound).toBe(1);
    });

    it("should allow teams to scan same nodes", () => {
      const result1 = scanService.recordScan({ teamId, nodeKey: startNodeKey });
      const result2 = scanService.recordScan({ teamId: team2Id, nodeKey: startNodeKey });

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
    });

    it("should identify first team to finish as winner", () => {
      // Team 1 finishes first
      scanService.recordScan({ teamId, nodeKey: startNodeKey });
      scanService.recordScan({ teamId, nodeKey: middleNodeKey });
      scanService.recordScan({ teamId, nodeKey: passwordNodeKey, password: "secret123" });
      scanService.recordScan({ teamId, nodeKey: endNodeKey });

      // Team 2 finishes second
      scanService.recordScan({ teamId: team2Id, nodeKey: startNodeKey });
      scanService.recordScan({ teamId: team2Id, nodeKey: middleNodeKey });
      scanService.recordScan({ teamId: team2Id, nodeKey: passwordNodeKey, password: "secret123" });
      scanService.recordScan({ teamId: team2Id, nodeKey: endNodeKey });

      const winner1 = scanService.checkIfWinner(teamId);
      const winner2 = scanService.checkIfWinner(team2Id);

      expect(winner1.isWinner).toBe(true);
      expect(winner2.isWinner).toBe(false);
    });
  });
});
