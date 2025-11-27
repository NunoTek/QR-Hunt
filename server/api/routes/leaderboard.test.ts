import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { initializeDatabase, closeDatabase, getDatabase } from "../../db/database.js";
import { gameRepository } from "../../domain/repositories/GameRepository.js";
import { teamRepository } from "../../domain/repositories/TeamRepository.js";
import { nodeRepository } from "../../domain/repositories/NodeRepository.js";
import { scanRepository } from "../../domain/repositories/ScanRepository.js";
import { edgeRepository } from "../../domain/repositories/EdgeRepository.js";
import { gameService } from "../../domain/services/GameService.js";
import { getLeaderboardData, invalidateLeaderboardCache } from "./leaderboard.js";

describe("Leaderboard API", () => {
  let gameId: string;
  let gameSlug: string;
  let team1Id: string;
  let team2Id: string;
  let team3Id: string;
  let startNodeId: string;
  let middleNodeId: string;
  let endNodeId: string;

  beforeEach(async () => {
    process.env.DATA_DIR = "./tests/test-data-leaderboard-api";
    await initializeDatabase();

    // Create test game
    const game = gameRepository.create({
      name: "Leaderboard Test Game",
      publicSlug: "lb-test-game",
    });
    gameId = game.id;
    gameSlug = game.publicSlug;
    gameRepository.update(gameId, { status: "active" });

    // Create nodes
    const startNode = nodeRepository.create({
      gameId,
      title: "Start",
      isStart: true,
      points: 100,
    });
    startNodeId = startNode.id;

    const middleNode = nodeRepository.create({
      gameId,
      title: "Middle Clue",
      points: 150,
    });
    middleNodeId = middleNode.id;

    const endNode = nodeRepository.create({
      gameId,
      title: "End",
      isEnd: true,
      points: 200,
    });
    endNodeId = endNode.id;

    // Create edges
    edgeRepository.create({ gameId, fromNodeId: startNodeId, toNodeId: middleNodeId });
    edgeRepository.create({ gameId, fromNodeId: middleNodeId, toNodeId: endNodeId });

    // Create teams
    const team1 = teamRepository.create({ gameId, name: "Team Alpha" });
    const team2 = teamRepository.create({ gameId, name: "Team Beta" });
    const team3 = teamRepository.create({ gameId, name: "Team Gamma" });
    team1Id = team1.id;
    team2Id = team2.id;
    team3Id = team3.id;

    // Invalidate cache
    invalidateLeaderboardCache(gameSlug);
  });

  afterEach(() => {
    const db = getDatabase();
    db.exec("DELETE FROM scans");
    db.exec("DELETE FROM edges");
    db.exec("DELETE FROM nodes");
    db.exec("DELETE FROM teams");
    db.exec("DELETE FROM games");
    closeDatabase();
  });

  describe("getLeaderboardData", () => {
    it("should return null for non-existent game", () => {
      const data = getLeaderboardData("non-existent-game");
      expect(data).toBeNull();
    });

    it("should return leaderboard with teams even without scans (showing 0 points)", () => {
      const data = getLeaderboardData(gameSlug);

      expect(data).toBeDefined();
      expect(data!.game.id).toBe(gameId);
      expect(data!.game.name).toBe("Leaderboard Test Game");
      expect(data!.game.status).toBe("active");
      // Teams exist but have 0 points
      expect(data!.leaderboard.length).toBe(3);
      expect(data!.leaderboard[0].totalPoints).toBe(0);
    });

    it("should return leaderboard with correct rankings by points", () => {
      // Team 1: 2 nodes, 250 points
      scanRepository.create({ gameId, teamId: team1Id, nodeId: startNodeId, pointsAwarded: 100 });
      scanRepository.create({ gameId, teamId: team1Id, nodeId: middleNodeId, pointsAwarded: 150 });

      // Team 2: 1 node, 100 points
      scanRepository.create({ gameId, teamId: team2Id, nodeId: startNodeId, pointsAwarded: 100 });

      // Team 3: 3 nodes, 450 points
      scanRepository.create({ gameId, teamId: team3Id, nodeId: startNodeId, pointsAwarded: 100 });
      scanRepository.create({ gameId, teamId: team3Id, nodeId: middleNodeId, pointsAwarded: 150 });
      scanRepository.create({ gameId, teamId: team3Id, nodeId: endNodeId, pointsAwarded: 200 });

      invalidateLeaderboardCache(gameSlug);
      const data = getLeaderboardData(gameSlug);

      expect(data!.leaderboard.length).toBe(3);

      // Find entries by team name
      const team1Entry = data!.leaderboard.find(e => e.teamName === "Team Alpha");
      const team2Entry = data!.leaderboard.find(e => e.teamName === "Team Beta");
      const team3Entry = data!.leaderboard.find(e => e.teamName === "Team Gamma");

      expect(team1Entry!.totalPoints).toBe(250);
      expect(team1Entry!.nodesFound).toBe(2);

      expect(team2Entry!.totalPoints).toBe(100);
      expect(team2Entry!.nodesFound).toBe(1);

      expect(team3Entry!.totalPoints).toBe(450);
      expect(team3Entry!.nodesFound).toBe(3);

      // Team with highest points should have better rank
      expect(team3Entry!.rank).toBeLessThan(team1Entry!.rank);
      expect(team1Entry!.rank).toBeLessThan(team2Entry!.rank);
    });

    it("should show current clue for active teams", () => {
      scanRepository.create({ gameId, teamId: team1Id, nodeId: startNodeId, pointsAwarded: 100 });
      scanRepository.create({ gameId, teamId: team1Id, nodeId: middleNodeId, pointsAwarded: 150 });

      invalidateLeaderboardCache(gameSlug);
      const data = getLeaderboardData(gameSlug);

      // Current clue should be one of the nodes the team scanned
      const team1Entry = data!.leaderboard.find(e => e.teamName === "Team Alpha");
      expect(team1Entry).toBeDefined();
      expect(["Start", "Middle Clue"]).toContain(team1Entry!.currentClue);
    });

    it("should include updatedAt timestamp", () => {
      const data = getLeaderboardData(gameSlug);

      expect(data!.updatedAt).toBeDefined();
      expect(new Date(data!.updatedAt).toISOString()).toBe(data!.updatedAt);
    });
  });

  describe("gameService.getLeaderboard", () => {
    it("should rank by points by default", () => {
      // Team 1: 250 points
      scanRepository.create({ gameId, teamId: team1Id, nodeId: startNodeId, pointsAwarded: 100 });
      scanRepository.create({ gameId, teamId: team1Id, nodeId: middleNodeId, pointsAwarded: 150 });

      // Team 2: 100 points
      scanRepository.create({ gameId, teamId: team2Id, nodeId: startNodeId, pointsAwarded: 100 });

      const leaderboard = gameService.getLeaderboard(gameId);

      expect(leaderboard[0].teamName).toBe("Team Alpha");
      expect(leaderboard[0].totalPoints).toBe(250);
      expect(leaderboard[1].teamName).toBe("Team Beta");
      expect(leaderboard[1].totalPoints).toBe(100);
    });

    it("should rank teams by points", () => {
      // Team 1: 250 points
      scanRepository.create({ gameId, teamId: team1Id, nodeId: startNodeId, pointsAwarded: 100 });
      scanRepository.create({ gameId, teamId: team1Id, nodeId: middleNodeId, pointsAwarded: 150 });

      // Team 2: 450 points (more scans)
      scanRepository.create({ gameId, teamId: team2Id, nodeId: startNodeId, pointsAwarded: 100 });
      scanRepository.create({ gameId, teamId: team2Id, nodeId: middleNodeId, pointsAwarded: 150 });
      scanRepository.create({ gameId, teamId: team2Id, nodeId: endNodeId, pointsAwarded: 200 });

      const leaderboard = gameService.getLeaderboard(gameId);

      // Team Beta has more points (450), should be first
      expect(leaderboard[0].teamName).toBe("Team Beta");
      expect(leaderboard[0].totalPoints).toBe(450);
      expect(leaderboard[1].teamName).toBe("Team Alpha");
      expect(leaderboard[1].totalPoints).toBe(250);
    });

    it("should include teams with no scans at the bottom", () => {
      // Only Team 1 has scans
      scanRepository.create({ gameId, teamId: team1Id, nodeId: startNodeId, pointsAwarded: 100 });

      const leaderboard = gameService.getLeaderboard(gameId);

      // Team 1 first (has scans)
      expect(leaderboard[0].teamName).toBe("Team Alpha");

      // Other teams should be listed with 0 points
      const team2Entry = leaderboard.find(e => e.teamName === "Team Beta");
      expect(team2Entry!.totalPoints).toBe(0);
      expect(team2Entry!.nodesFound).toBe(0);
    });
  });

  describe("cache invalidation", () => {
    it("should return fresh data after invalidation", () => {
      // Get initial data (teams with 0 points)
      const data1 = getLeaderboardData(gameSlug);
      expect(data1!.leaderboard.length).toBe(3);
      expect(data1!.leaderboard[0].totalPoints).toBe(0);

      // Add a scan
      scanRepository.create({ gameId, teamId: team1Id, nodeId: startNodeId, pointsAwarded: 100 });

      // Invalidate cache
      invalidateLeaderboardCache(gameSlug);

      // Get fresh data - team1 should now have points
      const data2 = getLeaderboardData(gameSlug);
      const team1Entry = data2!.leaderboard.find(e => e.teamName === "Team Alpha");
      expect(team1Entry!.totalPoints).toBe(100);
    });
  });
});
