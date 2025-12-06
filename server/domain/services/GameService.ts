import { gameRepository } from "../repositories/GameRepository.js";
import { nodeRepository } from "../repositories/NodeRepository.js";
import { scanRepository } from "../repositories/ScanRepository.js";
import { teamRepository } from "../repositories/TeamRepository.js";
import { gameEvents } from "../../lib/eventEmitter.js";
import type { Game, GameSettings, GameStatus, LeaderboardEntry, Node, Team } from "../types.js";
import { gameProgressValidator } from "./GameProgressValidator.js";
import { nodeStatusCalculator } from "./NodeStatusCalculator.js";
import { pointsCalculator } from "./PointsCalculator.js";

/** Data from scan repository for leaderboard calculation */
interface LeaderboardTeamData {
  teamId: string;
  nodesFound: number;
  totalPoints: number;
  lastScanTime: string | null;
  lastNodeId: string | null;
  nextNodeTitle: string | null;
  currentClueTitle: string | null;
}

export class GameService {
  createGame(data: {
    name: string;
    publicSlug: string;
    logoUrl?: string;
    settings?: Partial<GameSettings>;
  }): Game {
    const existingGame = gameRepository.findBySlug(data.publicSlug);
    if (existingGame) {
      throw new Error(`Game with slug "${data.publicSlug}" already exists`);
    }
    return gameRepository.create(data);
  }

  getGame(id: string): Game | null {
    return gameRepository.findById(id);
  }

  getGameBySlug(slug: string): Game | null {
    return gameRepository.findBySlug(slug);
  }

  getAllGames(): Game[] {
    return gameRepository.findAll();
  }

  getActiveGames(): Game[] {
    return gameRepository.findByStatus("active");
  }

  updateGame(
    id: string,
    data: Partial<{
      name: string;
      publicSlug: string;
      status: GameStatus;
      logoUrl: string | null;
      settings: GameSettings;
    }>
  ): Game | null {
    if (data.publicSlug) {
      const existing = gameRepository.findBySlug(data.publicSlug);
      if (existing && existing.id !== id) {
        throw new Error(`Game with slug "${data.publicSlug}" already exists`);
      }
    }
    return gameRepository.update(id, data);
  }

  /**
   * Opens a game for team registration (sets status to pending).
   */
  openGame(id: string): Game | null {
    const game = gameRepository.findById(id);
    if (!game) return null;

    // Use shared validator for game requirements
    const validation = gameProgressValidator.validateGameCanActivate(id);
    if (!validation.valid) {
      throw new Error(validation.message);
    }

    const updatedGame = gameRepository.update(id, { status: "pending" });
    if (updatedGame) {
      gameEvents.emitGameStatus(game.publicSlug, "pending");
    }
    return updatedGame;
  }

  /**
   * Activates a game (sets status to active).
   */
  activateGame(id: string): Game | null {
    const game = gameRepository.findById(id);
    if (!game) return null;

    if (game.status !== "draft" && game.status !== "pending") {
      throw new Error("Can only activate games that are in draft or pending status");
    }

    // Use shared validator for game requirements
    const validation = gameProgressValidator.validateGameCanActivate(id);
    if (!validation.valid) {
      throw new Error(validation.message);
    }

    const updatedGame = gameRepository.update(id, { status: "active" });
    if (updatedGame) {
      gameEvents.emitGameStatus(game.publicSlug, "active");
    }
    return updatedGame;
  }

  completeGame(id: string): Game | null {
    const game = gameRepository.findById(id);
    const updatedGame = gameRepository.update(id, { status: "completed" });
    if (updatedGame && game) {
      gameEvents.emitGameStatus(game.publicSlug, "completed");
    }
    return updatedGame;
  }

  deleteGame(id: string): boolean {
    return gameRepository.delete(id);
  }

  getLeaderboard(gameId: string): LeaderboardEntry[] {
    const game = gameRepository.findById(gameId);
    if (!game) return [];

    const teams = teamRepository.findByGameId(gameId);
    const { activatedNodes, endNodeIds } = nodeStatusCalculator.getNodeSets(gameId);
    const leaderboardData = scanRepository.getLeaderboardData(gameId);
    const dataMap = new Map(leaderboardData.map((d) => [d.teamId, d]));

    const entries = teams.map((team) =>
      this.createLeaderboardEntry(team, dataMap.get(team.id), activatedNodes, endNodeIds)
    );

    this.sortLeaderboardEntries(entries, game.settings.rankingMode);
    this.assignRanks(entries);

    return entries;
  }

  private createLeaderboardEntry(
    team: Team,
    data: LeaderboardTeamData | undefined,
    activatedNodes: Node[],
    endNodeIds: Set<string>
  ): LeaderboardEntry {
    const isFinished = this.isTeamFinished(data, activatedNodes.length, endNodeIds);
    const currentClue = this.getCurrentClue(team, data, activatedNodes);

    // Use shared points calculator
    const { adjustedPoints } = pointsCalculator.getPointsSummary(team.id);

    return {
      teamId: team.id,
      teamName: team.name,
      teamLogoUrl: team.logoUrl,
      nodesFound: data?.nodesFound || 0,
      totalPoints: adjustedPoints,
      currentNodeTitle: currentClue,
      lastScanTime: data?.lastScanTime || null,
      isFinished,
      rank: 0,
    };
  }

  private isTeamFinished(
    data: LeaderboardTeamData | undefined,
    totalNodesCount: number,
    endNodeIds: Set<string>
  ): boolean {
    if (!data) return false;

    const allNodesScanned = data.nodesFound >= totalNodesCount;
    const endedOnEndNode = data.lastNodeId ? endNodeIds.has(data.lastNodeId) : false;

    return allNodesScanned && endedOnEndNode;
  }

  private getCurrentClue(
    team: Team,
    data: LeaderboardTeamData | undefined,
    activatedNodes: Node[]
  ): string | null {
    if (data) {
      return data.currentClueTitle || data.nextNodeTitle || null;
    }

    if (team.startNodeId) {
      const startNode = activatedNodes.find((n) => n.id === team.startNodeId);
      return startNode?.title || null;
    }

    return null;
  }

  private sortLeaderboardEntries(entries: LeaderboardEntry[], rankingMode: string): void {
    entries.sort((a, b) => {
      // Finished teams always rank first
      if (a.isFinished && !b.isFinished) return -1;
      if (!a.isFinished && b.isFinished) return 1;

      switch (rankingMode) {
        case "points":
          if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
          return this.compareByTime(a, b);
        case "nodes":
          if (b.nodesFound !== a.nodesFound) return b.nodesFound - a.nodesFound;
          return this.compareByTime(a, b);
        case "time":
          return this.compareByTime(a, b);
        default:
          if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
          return this.compareByTime(a, b);
      }
    });
  }

  private compareByTime(a: LeaderboardEntry, b: LeaderboardEntry): number {
    return new Date(a.lastScanTime || 0).getTime() - new Date(b.lastScanTime || 0).getTime();
  }

  private assignRanks(entries: LeaderboardEntry[]): void {
    entries.forEach((entry, index) => {
      entry.rank = index + 1;
    });
  }

  getGameStatus(gameId: string): {
    game: Game;
    teamCount: number;
    totalScans: number;
    finishedTeams: number;
  } | null {
    const game = gameRepository.findById(gameId);
    if (!game) return null;

    const teams = teamRepository.findByGameId(gameId);
    const scans = scanRepository.findByGameId(gameId);
    const { activatedNodes, endNodeIds } = nodeStatusCalculator.getNodeSets(gameId);

    let finishedTeams = 0;
    for (const team of teams) {
      const { scannedNodeIds, lastScan } = nodeStatusCalculator.getTeamScanStatus(team.id);
      const allNodesScanned = activatedNodes.every((n) => scannedNodeIds.has(n.id));
      const endedOnEndNode = lastScan && endNodeIds.has(lastScan.nodeId);

      if (allNodesScanned && endedOnEndNode) {
        finishedTeams++;
      }
    }

    return {
      game,
      teamCount: teams.length,
      totalScans: scans.length,
      finishedTeams,
    };
  }

  checkAutoStart(gameSlug: string): boolean {
    const game = gameRepository.findBySlug(gameSlug);
    if (!game || game.status !== "pending" || !game.settings.autoStartEnabled) return false;

    const expectedCount = game.settings.expectedTeamCount;
    if (expectedCount <= 0) return false;

    const teams = teamRepository.findByGameId(game.id);
    if (teams.length < expectedCount) return false;

    const connectedCount = gameEvents.getConnectedTeamCount(gameSlug);

    if (connectedCount >= expectedCount) {
      try {
        this.activateGame(game.id);
        console.log(`Auto-started game ${gameSlug} - all ${expectedCount} teams connected`);
        return true;
      } catch (error) {
        console.error(`Failed to auto-start game ${gameSlug}:`, error);
        return false;
      }
    }

    return false;
  }

  getGameAnalytics(gameId: string): {
    teams: Array<{
      teamId: string;
      teamName: string;
      teamLogoUrl: string | null;
      totalTime: number;
      nodeTimings: Array<{
        nodeId: string;
        nodeTitle: string;
        timeSpentMs: number;
        timestamp: string;
      }>;
      isFinished: boolean;
      rank: number;
    }>;
    nodeStats: Array<{
      nodeId: string;
      nodeTitle: string;
      averageTimeMs: number;
      minTimeMs: number;
      maxTimeMs: number;
      completionCount: number;
    }>;
    bottlenecks: Array<{
      nodeId: string;
      nodeTitle: string;
      averageTimeMs: number;
    }>;
  } | null {
    const game = gameRepository.findById(gameId);
    if (!game) return null;

    const teams = teamRepository.findByGameId(gameId);
    const allNodes = nodeRepository.findByGameId(gameId);
    const { activatedNodes } = nodeStatusCalculator.getNodeSets(gameId);
    const nodesMap = new Map(allNodes.map((n) => [n.id, n]));
    const leaderboard = this.getLeaderboard(gameId);
    const rankMap = new Map(leaderboard.map((e) => [e.teamId, e.rank]));

    const teamsAnalytics = teams.map((team) => {
      const { scans } = nodeStatusCalculator.getTeamScanStatus(team.id);
      const sortedScans = [...scans].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      const nodeTimings = sortedScans.map((scan, i) => {
        const prevScan = sortedScans[i - 1];
        const node = nodesMap.get(scan.nodeId);
        const timeSpentMs = prevScan
          ? new Date(scan.timestamp).getTime() - new Date(prevScan.timestamp).getTime()
          : 0;

        return {
          nodeId: scan.nodeId,
          nodeTitle: node?.title || "Unknown",
          timeSpentMs,
          timestamp: scan.timestamp,
        };
      });

      const totalTime = nodeTimings.reduce((sum, t) => sum + t.timeSpentMs, 0);
      const entry = leaderboard.find((e) => e.teamId === team.id);

      return {
        teamId: team.id,
        teamName: team.name,
        teamLogoUrl: team.logoUrl,
        totalTime,
        nodeTimings,
        isFinished: entry?.isFinished || false,
        rank: rankMap.get(team.id) || 0,
      };
    });

    // Calculate node statistics
    const nodeTimeMap = new Map<string, number[]>();
    for (const teamData of teamsAnalytics) {
      for (const timing of teamData.nodeTimings) {
        if (timing.timeSpentMs > 0) {
          if (!nodeTimeMap.has(timing.nodeId)) {
            nodeTimeMap.set(timing.nodeId, []);
          }
          nodeTimeMap.get(timing.nodeId)!.push(timing.timeSpentMs);
        }
      }
    }

    const nodeStats = activatedNodes.map((node) => {
      const times = nodeTimeMap.get(node.id) || [];
      const sum = times.reduce((a, b) => a + b, 0);
      const avg = times.length > 0 ? sum / times.length : 0;

      return {
        nodeId: node.id,
        nodeTitle: node.title,
        averageTimeMs: Math.round(avg),
        minTimeMs: times.length > 0 ? Math.min(...times) : 0,
        maxTimeMs: times.length > 0 ? Math.max(...times) : 0,
        completionCount: times.length,
      };
    });

    const bottlenecks = [...nodeStats]
      .filter((n) => n.completionCount > 0)
      .sort((a, b) => b.averageTimeMs - a.averageTimeMs)
      .slice(0, 5);

    return { teams: teamsAnalytics, nodeStats, bottlenecks };
  }
}

export const gameService = new GameService();

gameEvents.setAutoStartCallback((gameSlug: string) => {
  gameService.checkAutoStart(gameSlug);
});
