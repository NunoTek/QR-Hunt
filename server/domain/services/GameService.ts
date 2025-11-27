import { gameRepository } from "../repositories/GameRepository.js";
import { nodeRepository } from "../repositories/NodeRepository.js";
import { scanRepository } from "../repositories/ScanRepository.js";
import { teamRepository } from "../repositories/TeamRepository.js";
import type { Game, GameSettings, GameStatus, LeaderboardEntry } from "../types.js";

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

  activateGame(id: string): Game | null {
    const game = gameRepository.findById(id);
    if (!game) return null;

    const nodes = nodeRepository.findByGameId(id);
    if (nodes.length === 0) {
      throw new Error("Cannot activate game without any nodes");
    }

    const startNodes = nodes.filter((n) => n.isStart);
    if (startNodes.length === 0) {
      throw new Error("Cannot activate game without at least one start node");
    }

    const endNodes = nodes.filter((n) => n.isEnd);
    if (endNodes.length === 0) {
      throw new Error("Cannot activate game without at least one end node");
    }

    return gameRepository.update(id, { status: "active" });
  }

  completeGame(id: string): Game | null {
    return gameRepository.update(id, { status: "completed" });
  }

  deleteGame(id: string): boolean {
    return gameRepository.delete(id);
  }

  getLeaderboard(gameId: string): LeaderboardEntry[] {
    const game = gameRepository.findById(gameId);
    if (!game) return [];

    const teams = teamRepository.findByGameId(gameId);
    const allNodes = nodeRepository.findByGameId(gameId);
    const totalNodesCount = allNodes.length;
    const endNodeIds = new Set(allNodes.filter((n) => n.isEnd).map((n) => n.id));

    // Use optimized single-query method to get all leaderboard data
    const leaderboardData = scanRepository.getLeaderboardData(gameId);
    const dataMap = new Map(leaderboardData.map((d) => [d.teamId, d]));

    const entries: LeaderboardEntry[] = teams.map((team) => {
      const data = dataMap.get(team.id);
      // Finished = all nodes scanned AND last scan is an end node
      const allNodesScanned = (data?.nodesFound || 0) >= totalNodesCount;
      const endedOnEndNode = data?.lastNodeId ? endNodeIds.has(data.lastNodeId) : false;
      const isFinished = allNodesScanned && endedOnEndNode;

      return {
        teamId: team.id,
        teamName: team.name,
        teamLogoUrl: team.logoUrl,
        nodesFound: data?.nodesFound || 0,
        totalPoints: data?.totalPoints || 0,
        // Show the next node they're looking for (current clue points to next location)
        currentNodeTitle: data?.nextNodeTitle || null,
        lastScanTime: data?.lastScanTime || null,
        isFinished,
        rank: 0,
      };
    });

    // Sort based on game settings
    entries.sort((a, b) => {
      // Finished teams first
      if (a.isFinished && !b.isFinished) return -1;
      if (!a.isFinished && b.isFinished) return 1;

      switch (game.settings.rankingMode) {
        case "points":
          return b.totalPoints - a.totalPoints;
        case "nodes":
          if (b.nodesFound !== a.nodesFound) {
            return b.nodesFound - a.nodesFound;
          }
          return (
            new Date(a.lastScanTime || 0).getTime() -
            new Date(b.lastScanTime || 0).getTime()
          );
        case "time":
          return (
            new Date(a.lastScanTime || 0).getTime() -
            new Date(b.lastScanTime || 0).getTime()
          );
        default:
          return b.totalPoints - a.totalPoints;
      }
    });

    // Assign ranks
    entries.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    return entries;
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
    const allNodes = nodeRepository.findByGameId(gameId);
    const totalNodesCount = allNodes.length;
    const endNodeIds = new Set(allNodes.filter((n) => n.isEnd).map((n) => n.id));

    let finishedTeams = 0;
    for (const team of teams) {
      const teamScans = scans.filter((s) => s.teamId === team.id);
      const scannedNodeIds = new Set(teamScans.map((s) => s.nodeId));
      const lastScan = teamScans[teamScans.length - 1];

      // Finished = all nodes scanned AND last scan is an end node
      const allNodesScanned = scannedNodeIds.size >= totalNodesCount;
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
}

export const gameService = new GameService();
