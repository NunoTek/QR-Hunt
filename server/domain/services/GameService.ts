import { gameRepository } from "../repositories/GameRepository.js";
import { nodeRepository } from "../repositories/NodeRepository.js";
import { scanRepository } from "../repositories/ScanRepository.js";
import { teamRepository } from "../repositories/TeamRepository.js";
import { hintUsageRepository } from "../repositories/HintUsageRepository.js";
import { gameEvents } from "../../lib/eventEmitter.js";
import type { Game, GameSettings, GameStatus, LeaderboardEntry, Node, Team } from "../types.js";

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

    const updatedGame = gameRepository.update(id, { status: "active" });
    if (updatedGame) {
      // Emit game status change event for waiting rooms
      gameEvents.emitGameStatus(game.publicSlug, "active");
    }
    return updatedGame;
  }

  completeGame(id: string): Game | null {
    const game = gameRepository.findById(id);
    const updatedGame = gameRepository.update(id, { status: "completed" });
    if (updatedGame && game) {
      // Emit game status change event
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
    const allNodes = nodeRepository.findByGameId(gameId);
    const leaderboardData = scanRepository.getLeaderboardData(gameId);
    const dataMap = new Map(leaderboardData.map((d) => [d.teamId, d]));

    const entries = teams.map((team) =>
      this.createLeaderboardEntry(team, dataMap.get(team.id), allNodes)
    );

    this.sortLeaderboardEntries(entries, game.settings.rankingMode);
    this.assignRanks(entries);

    return entries;
  }

  /** Creates a single leaderboard entry for a team */
  private createLeaderboardEntry(
    team: Team,
    data: LeaderboardTeamData | undefined,
    allNodes: Node[]
  ): LeaderboardEntry {
    const isFinished = this.isTeamFinished(data, allNodes);
    const currentClue = this.getCurrentClue(team, data, allNodes);

    // Deduct hint points from total
    const hintPointsDeducted = hintUsageRepository.getTotalPointsDeductedForTeam(team.id);
    const adjustedPoints = (data?.totalPoints || 0) - hintPointsDeducted;

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

  /** Determines if a team has finished the game */
  private isTeamFinished(
    data: LeaderboardTeamData | undefined,
    allNodes: Node[]
  ): boolean {
    if (!data) return false;

    const totalNodesCount = allNodes.length;
    const endNodeIds = new Set(allNodes.filter((n) => n.isEnd).map((n) => n.id));

    const allNodesScanned = data.nodesFound >= totalNodesCount;
    const endedOnEndNode = data.lastNodeId ? endNodeIds.has(data.lastNodeId) : false;

    return allNodesScanned && endedOnEndNode;
  }

  /** Gets the current clue for a team */
  private getCurrentClue(
    team: Team,
    data: LeaderboardTeamData | undefined,
    allNodes: Node[]
  ): string | null {
    // Priority: currentClueTitle (random mode) -> nextNodeTitle (edge-based) -> start node title
    if (data) {
      return data.currentClueTitle || data.nextNodeTitle || null;
    }

    // Team hasn't scanned anything yet, show their start node clue
    if (team.startNodeId) {
      const startNode = allNodes.find((n) => n.id === team.startNodeId);
      return startNode?.title || null;
    }

    return null;
  }

  /** Sorts leaderboard entries based on ranking mode */
  private sortLeaderboardEntries(
    entries: LeaderboardEntry[],
    rankingMode: string
  ): void {
    entries.sort((a, b) => {
      // Finished teams always rank first
      if (a.isFinished && !b.isFinished) return -1;
      if (!a.isFinished && b.isFinished) return 1;

      switch (rankingMode) {
        case "points":
          // Primary: more points wins
          if (b.totalPoints !== a.totalPoints) {
            return b.totalPoints - a.totalPoints;
          }
          // Tiebreaker: faster team wins (earlier last scan time)
          return this.compareByTime(a, b);
        case "nodes":
          if (b.nodesFound !== a.nodesFound) {
            return b.nodesFound - a.nodesFound;
          }
          return this.compareByTime(a, b);
        case "time":
          return this.compareByTime(a, b);
        default:
          // Same as points mode
          if (b.totalPoints !== a.totalPoints) {
            return b.totalPoints - a.totalPoints;
          }
          return this.compareByTime(a, b);
      }
    });
  }

  /** Compares two entries by their last scan time */
  private compareByTime(a: LeaderboardEntry, b: LeaderboardEntry): number {
    return (
      new Date(a.lastScanTime || 0).getTime() -
      new Date(b.lastScanTime || 0).getTime()
    );
  }

  /** Assigns ranks to sorted entries */
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
