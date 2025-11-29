import { teamRepository } from "../repositories/TeamRepository.js";
import { nodeRepository } from "../repositories/NodeRepository.js";
import type { Team } from "../types.js";

export interface CreateTeamData {
  gameId: string;
  name: string;
  code?: string;
  startNodeId?: string;
  logoUrl?: string | null;
}

export class TeamService {
  /**
   * Creates a team with automatic start node assignment if not specified.
   * Uses round-robin distribution to evenly distribute teams across start nodes.
   */
  createTeam(data: CreateTeamData): Team {
    const startNodeId = data.startNodeId || this.findLeastUsedStartNode(data.gameId);

    return teamRepository.create({
      gameId: data.gameId,
      name: data.name,
      code: data.code,
      startNodeId,
      logoUrl: data.logoUrl,
    });
  }

  /**
   * Finds the start node with the least team assignments for even distribution.
   */
  private findLeastUsedStartNode(gameId: string): string | undefined {
    const startNodes = nodeRepository.findStartNodes(gameId);
    if (startNodes.length === 0) {
      return undefined;
    }

    const existingTeams = teamRepository.findByGameId(gameId);
    const startNodeUsage = this.countStartNodeUsage(startNodes, existingTeams);

    return this.selectLeastUsedNode(startNodeUsage, startNodes[0].id);
  }

  /**
   * Counts how many teams are assigned to each start node.
   */
  private countStartNodeUsage(
    startNodes: ReturnType<typeof nodeRepository.findStartNodes>,
    teams: Team[]
  ): Map<string, number> {
    const usage = new Map<string, number>();

    // Initialize all start nodes with zero usage
    for (const node of startNodes) {
      usage.set(node.id, 0);
    }

    // Count team assignments
    for (const team of teams) {
      if (team.startNodeId && usage.has(team.startNodeId)) {
        usage.set(team.startNodeId, usage.get(team.startNodeId)! + 1);
      }
    }

    return usage;
  }

  /**
   * Selects the node with minimum usage from the usage map.
   */
  private selectLeastUsedNode(
    usage: Map<string, number>,
    fallbackId: string
  ): string {
    let minUsage = Infinity;
    let leastUsedNodeId = fallbackId;

    for (const [nodeId, count] of usage) {
      if (count < minUsage) {
        minUsage = count;
        leastUsedNodeId = nodeId;
      }
    }

    return leastUsedNodeId;
  }

  getTeam(id: string): Team | null {
    return teamRepository.findById(id);
  }

  getTeamsByGame(gameId: string): Team[] {
    return teamRepository.findByGameId(gameId);
  }

  updateTeam(
    id: string,
    data: Partial<{
      name: string;
      code: string;
      startNodeId: string | null;
      currentClueId: string | null;
      logoUrl: string | null;
    }>
  ): Team | null {
    return teamRepository.update(id, data);
  }

  deleteTeam(id: string): boolean {
    return teamRepository.delete(id);
  }
}

export const teamService = new TeamService();
