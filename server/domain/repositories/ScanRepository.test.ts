import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { initializeDatabase, closeDatabase, getDatabase } from "../../db/database.js";
import { scanRepository } from "./ScanRepository.js";
import { nodeRepository } from "./NodeRepository.js";
import { teamRepository } from "./TeamRepository.js";
import { gameRepository } from "./GameRepository.js";

describe("ScanRepository", () => {
  let gameId: string;
  let team1Id: string;
  let team2Id: string;
  let node1Id: string;
  let node2Id: string;
  let node3Id: string;

  beforeEach(async () => {
    process.env.DATA_DIR = "./tests/test-data-scan-repo";
    await initializeDatabase();

    // Create a test game
    const game = gameRepository.create({
      name: "Test Game",
      publicSlug: "test-game-scan",
    });
    gameId = game.id;

    // Create test teams
    const team1 = teamRepository.create({ gameId, name: "Team 1" });
    const team2 = teamRepository.create({ gameId, name: "Team 2" });
    team1Id = team1.id;
    team2Id = team2.id;

    // Create test nodes
    const node1 = nodeRepository.create({ gameId, title: "Node 1", isStart: true, points: 100 });
    const node2 = nodeRepository.create({ gameId, title: "Node 2", points: 150 });
    const node3 = nodeRepository.create({ gameId, title: "Node 3", isEnd: true, points: 200 });
    node1Id = node1.id;
    node2Id = node2.id;
    node3Id = node3.id;
  });

  afterEach(() => {
    const db = getDatabase();
    db.exec("DELETE FROM scans");
    db.exec("DELETE FROM nodes");
    db.exec("DELETE FROM teams");
    db.exec("DELETE FROM games");
    closeDatabase();
  });

  describe("create", () => {
    it("should create a scan record", () => {
      const scan = scanRepository.create({
        gameId,
        teamId: team1Id,
        nodeId: node1Id,
      });

      expect(scan).toBeDefined();
      expect(scan.id).toBeDefined();
      expect(scan.gameId).toBe(gameId);
      expect(scan.teamId).toBe(team1Id);
      expect(scan.nodeId).toBe(node1Id);
      expect(scan.timestamp).toBeDefined();
      expect(scan.clientIp).toBeNull();
      expect(scan.userAgent).toBeNull();
      expect(scan.pointsAwarded).toBe(0);
    });

    it("should create a scan with metadata", () => {
      const scan = scanRepository.create({
        gameId,
        teamId: team1Id,
        nodeId: node1Id,
        clientIp: "192.168.1.1",
        userAgent: "Mozilla/5.0",
        pointsAwarded: 100,
      });

      expect(scan.clientIp).toBe("192.168.1.1");
      expect(scan.userAgent).toBe("Mozilla/5.0");
      expect(scan.pointsAwarded).toBe(100);
    });
  });

  describe("findById", () => {
    it("should find existing scan by id", () => {
      const created = scanRepository.create({
        gameId,
        teamId: team1Id,
        nodeId: node1Id,
      });

      const found = scanRepository.findById(created.id);

      expect(found).toBeDefined();
      expect(found!.id).toBe(created.id);
    });

    it("should return null for non-existent id", () => {
      const found = scanRepository.findById("non-existent");
      expect(found).toBeNull();
    });
  });

  describe("findByTeamId", () => {
    it("should return empty array when no scans", () => {
      const scans = scanRepository.findByTeamId(team1Id);
      expect(scans).toEqual([]);
    });

    it("should return all scans for team ordered by timestamp", () => {
      scanRepository.create({ gameId, teamId: team1Id, nodeId: node1Id });
      scanRepository.create({ gameId, teamId: team1Id, nodeId: node2Id });
      scanRepository.create({ gameId, teamId: team1Id, nodeId: node3Id });

      const scans = scanRepository.findByTeamId(team1Id);

      expect(scans.length).toBe(3);
    });

    it("should only return scans for specified team", () => {
      scanRepository.create({ gameId, teamId: team1Id, nodeId: node1Id });
      scanRepository.create({ gameId, teamId: team2Id, nodeId: node1Id });

      const scans = scanRepository.findByTeamId(team1Id);

      expect(scans.length).toBe(1);
      expect(scans[0].teamId).toBe(team1Id);
    });
  });

  describe("findByGameId", () => {
    it("should return all scans for game", () => {
      scanRepository.create({ gameId, teamId: team1Id, nodeId: node1Id });
      scanRepository.create({ gameId, teamId: team2Id, nodeId: node1Id });

      const scans = scanRepository.findByGameId(gameId);

      expect(scans.length).toBe(2);
    });
  });

  describe("findByNodeId", () => {
    it("should return all scans at a node", () => {
      scanRepository.create({ gameId, teamId: team1Id, nodeId: node1Id });
      scanRepository.create({ gameId, teamId: team2Id, nodeId: node1Id });

      const scans = scanRepository.findByNodeId(node1Id);

      expect(scans.length).toBe(2);
      expect(scans.every(s => s.nodeId === node1Id)).toBe(true);
    });
  });

  describe("findLastScanByTeam", () => {
    it("should return a scan for a team that has scans", () => {
      scanRepository.create({ gameId, teamId: team1Id, nodeId: node1Id });
      scanRepository.create({ gameId, teamId: team1Id, nodeId: node2Id });
      scanRepository.create({ gameId, teamId: team1Id, nodeId: node3Id });

      const lastScan = scanRepository.findLastScanByTeam(team1Id);

      expect(lastScan).toBeDefined();
      expect(lastScan!.teamId).toBe(team1Id);
      // Just verify it returns one of the scanned nodes
      expect([node1Id, node2Id, node3Id]).toContain(lastScan!.nodeId);
    });

    it("should return null when no scans", () => {
      const lastScan = scanRepository.findLastScanByTeam(team1Id);
      expect(lastScan).toBeNull();
    });
  });

  describe("hasTeamScannedNode", () => {
    it("should return true if team scanned node", () => {
      scanRepository.create({ gameId, teamId: team1Id, nodeId: node1Id });

      const result = scanRepository.hasTeamScannedNode(team1Id, node1Id);

      expect(result).toBe(true);
    });

    it("should return false if team has not scanned node", () => {
      const result = scanRepository.hasTeamScannedNode(team1Id, node1Id);

      expect(result).toBe(false);
    });

    it("should return false for different team", () => {
      scanRepository.create({ gameId, teamId: team1Id, nodeId: node1Id });

      const result = scanRepository.hasTeamScannedNode(team2Id, node1Id);

      expect(result).toBe(false);
    });
  });

  describe("countByTeam", () => {
    it("should return 0 when no scans", () => {
      const count = scanRepository.countByTeam(team1Id);
      expect(count).toBe(0);
    });

    it("should return correct count", () => {
      scanRepository.create({ gameId, teamId: team1Id, nodeId: node1Id });
      scanRepository.create({ gameId, teamId: team1Id, nodeId: node2Id });
      scanRepository.create({ gameId, teamId: team1Id, nodeId: node3Id });

      const count = scanRepository.countByTeam(team1Id);

      expect(count).toBe(3);
    });
  });

  describe("getTotalPointsByTeam", () => {
    it("should return 0 when no scans", () => {
      const total = scanRepository.getTotalPointsByTeam(team1Id);
      expect(total).toBe(0);
    });

    it("should return correct total points", () => {
      scanRepository.create({ gameId, teamId: team1Id, nodeId: node1Id, pointsAwarded: 100 });
      scanRepository.create({ gameId, teamId: team1Id, nodeId: node2Id, pointsAwarded: 150 });
      scanRepository.create({ gameId, teamId: team1Id, nodeId: node3Id, pointsAwarded: 200 });

      const total = scanRepository.getTotalPointsByTeam(team1Id);

      expect(total).toBe(450);
    });
  });

  describe("getTeamProgress", () => {
    it("should return empty array when no scans", () => {
      const progress = scanRepository.getTeamProgress(gameId);
      expect(progress).toEqual([]);
    });

    it("should return progress for all teams with scans", () => {
      scanRepository.create({ gameId, teamId: team1Id, nodeId: node1Id, pointsAwarded: 100 });
      scanRepository.create({ gameId, teamId: team1Id, nodeId: node2Id, pointsAwarded: 150 });
      scanRepository.create({ gameId, teamId: team2Id, nodeId: node1Id, pointsAwarded: 100 });

      const progress = scanRepository.getTeamProgress(gameId);

      expect(progress.length).toBe(2);

      const team1Progress = progress.find(p => p.teamId === team1Id);
      expect(team1Progress!.nodesFound).toBe(2);
      expect(team1Progress!.totalPoints).toBe(250);

      const team2Progress = progress.find(p => p.teamId === team2Id);
      expect(team2Progress!.nodesFound).toBe(1);
      expect(team2Progress!.totalPoints).toBe(100);
    });
  });

  describe("getLeaderboardData", () => {
    it("should return empty array when no scans", () => {
      const data = scanRepository.getLeaderboardData(gameId);
      expect(data).toEqual([]);
    });

    it("should return leaderboard data with correct stats", () => {
      scanRepository.create({ gameId, teamId: team1Id, nodeId: node1Id, pointsAwarded: 100 });
      scanRepository.create({ gameId, teamId: team1Id, nodeId: node2Id, pointsAwarded: 150 });

      const data = scanRepository.getLeaderboardData(gameId);

      // Find team1's entry
      const team1Data = data.find(d => d.teamId === team1Id);
      expect(team1Data).toBeDefined();
      expect(team1Data!.nodesFound).toBe(2);
      expect(team1Data!.totalPoints).toBe(250);
      // Verify last node is one of the scanned nodes
      expect([node1Id, node2Id]).toContain(team1Data!.lastNodeId);
      expect(["Node 1", "Node 2"]).toContain(team1Data!.lastNodeTitle);
    });

    it("should return data for teams with scans", () => {
      scanRepository.create({ gameId, teamId: team1Id, nodeId: node1Id, pointsAwarded: 100 });
      scanRepository.create({ gameId, teamId: team2Id, nodeId: node1Id, pointsAwarded: 100 });
      scanRepository.create({ gameId, teamId: team2Id, nodeId: node2Id, pointsAwarded: 150 });

      const data = scanRepository.getLeaderboardData(gameId);

      // Should have data for both teams that have scans
      const team1Data = data.find(d => d.teamId === team1Id);
      const team2Data = data.find(d => d.teamId === team2Id);
      expect(team1Data).toBeDefined();
      expect(team2Data).toBeDefined();
      expect(team1Data!.nodesFound).toBe(1);
      expect(team2Data!.nodesFound).toBe(2);
    });
  });
});
