import { createHash } from "crypto";
import { gameRepository } from "../repositories/GameRepository.js";
import { teamRepository } from "../repositories/TeamRepository.js";
import { nodeRepository } from "../repositories/NodeRepository.js";
import { edgeRepository } from "../repositories/EdgeRepository.js";
import { scanRepository } from "../repositories/ScanRepository.js";
import type { Scan, Node, TeamProgress } from "../types.js";

export interface ScanResult {
  success: boolean;
  message: string;
  node?: Node;
  nextNodes?: Node[];
  isGameComplete?: boolean;
  pointsAwarded?: number;
  scan?: Scan;
}

export class ScanService {
  recordScan(data: {
    teamId: string;
    nodeKey: string;
    password?: string;
    clientIp?: string;
    userAgent?: string;
  }): ScanResult {
    const team = teamRepository.findById(data.teamId);
    if (!team) {
      return { success: false, message: "Team not found" };
    }

    const game = gameRepository.findById(team.gameId);
    if (!game) {
      return { success: false, message: "Game not found" };
    }

    if (game.status !== "active") {
      return { success: false, message: "Game is not active" };
    }

    const node = nodeRepository.findByNodeKey(team.gameId, data.nodeKey);
    if (!node) {
      return { success: false, message: "Invalid QR code" };
    }

    // Check if this is a valid scan based on team progress
    const validationResult = this.validateScan(team.id, node);
    if (!validationResult.valid) {
      return { success: false, message: validationResult.message };
    }

    // Check password if required
    if (node.passwordRequired) {
      if (!data.password) {
        return {
          success: false,
          message: "Password required",
          node: this.sanitizeNode(node),
        };
      }
      if (!this.verifyPassword(data.password, node.passwordHash)) {
        return { success: false, message: "Incorrect password" };
      }
    }

    // Check if already scanned
    if (scanRepository.hasTeamScannedNode(data.teamId, node.id)) {
      return {
        success: false,
        message: "You have already scanned this QR code",
        node: this.sanitizeNode(node),
      };
    }

    // Calculate points
    const pointsAwarded = this.calculatePoints(data.teamId, node);

    // Record the scan
    const scan = scanRepository.create({
      gameId: team.gameId,
      teamId: data.teamId,
      nodeId: node.id,
      clientIp: data.clientIp,
      userAgent: data.userAgent,
      pointsAwarded,
    });

    // Check if game is complete (all nodes scanned and last scan is an end node)
    const allNodes = nodeRepository.findByGameId(team.gameId);
    const teamScans = scanRepository.findByTeamId(data.teamId);
    const scannedNodeIds = new Set(teamScans.map((s) => s.nodeId));
    const allNodesScanned = allNodes.every((n) => scannedNodeIds.has(n.id));
    const isGameComplete = allNodesScanned && node.isEnd;

    // Get remaining nodes to scan
    const remainingNodes = allNodes.filter((n) => !scannedNodeIds.has(n.id));

    let message = "QR scanned successfully";
    if (isGameComplete) {
      message = "Congratulations! You found all QR codes and finished!";
    } else if (allNodesScanned && !node.isEnd) {
      message = "All QR codes found! Now find an end point to finish!";
    } else {
      const remaining = remainingNodes.length;
      message = `QR scanned! ${remaining} more to find.`;
    }

    return {
      success: true,
      message,
      node: this.sanitizeNode(node),
      nextNodes: remainingNodes.map(this.sanitizeNode),
      isGameComplete,
      pointsAwarded,
      scan,
    };
  }

  private validateScan(teamId: string, node: Node): { valid: boolean; message: string } {
    const team = teamRepository.findById(teamId);
    if (!team) {
      return { valid: false, message: "Team not found" };
    }

    const scans = scanRepository.findByTeamId(teamId);

    // First scan - must match team's start node or any start node
    if (scans.length === 0) {
      if (team.startNodeId) {
        if (node.id !== team.startNodeId) {
          return { valid: false, message: "This is not your starting QR code" };
        }
      } else if (!node.isStart) {
        return { valid: false, message: "You must start with a starting QR code" };
      }
      return { valid: true, message: "" };
    }

    // Check if all nodes have been scanned
    const allNodes = nodeRepository.findByGameId(team.gameId);
    const scannedNodeIds = new Set(scans.map((s) => s.nodeId));
    const allNodesScanned = allNodes.every((n) => scannedNodeIds.has(n.id));

    // If all nodes scanned, only allow end nodes to finish the game
    if (allNodesScanned) {
      if (!node.isEnd) {
        return { valid: false, message: "You've found all QR codes! Find an end point to finish." };
      }
    }

    // Any node can be scanned in any order (after starting)
    return { valid: true, message: "" };
  }

  private calculatePoints(teamId: string, node: Node): number {
    const team = teamRepository.findById(teamId);
    if (!team) return 0;

    const game = gameRepository.findById(team.gameId);
    if (!game) return node.points;

    let points = node.points;

    if (game.settings.timeBonusEnabled) {
      const lastScan = scanRepository.findLastScanByTeam(teamId);
      if (lastScan) {
        const timeDiff =
          Date.now() - new Date(lastScan.timestamp).getTime();
        const minutesTaken = timeDiff / (1000 * 60);

        // Bonus for fast completion (under 5 minutes)
        if (minutesTaken < 5) {
          points = Math.round(points * game.settings.timeBonusMultiplier);
        }
      }
    }

    return points;
  }

  private getNextNodes(nodeId: string): Node[] {
    const edges = edgeRepository.findOutgoingEdges(nodeId);
    const nodes: Node[] = [];

    for (const edge of edges) {
      const node = nodeRepository.findById(edge.toNodeId);
      if (node) {
        nodes.push(node);
      }
    }

    return nodes;
  }

  private verifyPassword(password: string, hash: string | null): boolean {
    if (!hash) return true;
    const inputHash = createHash("sha256").update(password).digest("hex");
    return inputHash === hash;
  }

  private sanitizeNode(node: Node): Node {
    // Remove password hash from node data sent to client
    return {
      ...node,
      passwordHash: null,
    };
  }

  getTeamProgress(teamId: string): TeamProgress | null {
    const team = teamRepository.findById(teamId);
    if (!team) return null;

    const game = gameRepository.findById(team.gameId);
    if (!game) return null;

    const scans = scanRepository.findByTeamId(teamId);
    const totalPoints = scanRepository.getTotalPointsByTeam(teamId);
    const nodesFound = scans.length;

    let currentNode: Node | null = null;
    let nextClue: Node | null = null;
    let nextNodes: Node[] = [];
    let isFinished = false;

    // Get all nodes and check completion
    const allNodes = nodeRepository.findByGameId(team.gameId);
    const scannedNodeIds = new Set(scans.map((s) => s.nodeId));
    const allNodesScanned = allNodes.every((n) => scannedNodeIds.has(n.id));

    // Check if random mode is enabled
    const isRandomMode = game.settings.randomMode ?? false;

    if (scans.length > 0) {
      const lastScan = scans[scans.length - 1];
      currentNode = nodeRepository.findById(lastScan.nodeId);

      // Finished = all nodes scanned AND last scan is an end node
      if (allNodesScanned && currentNode?.isEnd) {
        isFinished = true;
      } else {
        // Show remaining nodes to find
        nextNodes = allNodes.filter((n) => !scannedNodeIds.has(n.id));

        if (isRandomMode) {
          // Random mode: pick a random unscanned node as next clue
          if (nextNodes.length > 0) {
            const randomIndex = Math.floor(Math.random() * nextNodes.length);
            nextClue = nextNodes[randomIndex];
          }
        } else {
          // Standard mode: get next clue from edges (first unscanned node connected via edge)
          if (currentNode) {
            const connectedNodes = this.getNextNodes(currentNode.id);
            nextClue = connectedNodes.find((n) => !scannedNodeIds.has(n.id)) || null;

            // If no connected unscanned nodes, pick first remaining node
            if (!nextClue && nextNodes.length > 0) {
              nextClue = nextNodes[0];
            }
          }
        }
      }
    } else if (team.startNodeId) {
      // Team hasn't scanned yet, show start node as the clue to find
      nextClue = nodeRepository.findById(team.startNodeId);
      nextNodes = allNodes.filter((n) => n.id !== team.startNodeId);
    } else if (isRandomMode) {
      // Random mode with no start node: pick a random start node
      const startNodes = allNodes.filter((n) => n.isStart);
      if (startNodes.length > 0) {
        const randomIndex = Math.floor(Math.random() * startNodes.length);
        nextClue = startNodes[randomIndex];
        nextNodes = allNodes.filter((n) => n.id !== nextClue!.id);
      }
    }

    return {
      team,
      scans,
      currentNode,
      nextClue,
      nextNodes,
      totalPoints,
      nodesFound,
      isFinished,
    };
  }

  checkIfWinner(teamId: string): { isWinner: boolean; winnerTeamId?: string } {
    const team = teamRepository.findById(teamId);
    if (!team) return { isWinner: false };

    const game = gameRepository.findById(team.gameId);
    if (!game) return { isWinner: false };

    const allNodes = nodeRepository.findByGameId(team.gameId);
    const endNodeIds = new Set(allNodes.filter((n) => n.isEnd).map((n) => n.id));
    const totalNodesCount = allNodes.length;

    // Find all teams that have finished (scanned all nodes + ended on an end node)
    const teams = teamRepository.findByGameId(team.gameId);
    let firstFinisher: { teamId: string; finishTime: Date } | null = null;

    for (const t of teams) {
      const scans = scanRepository.findByTeamId(t.id);
      const scannedNodeIds = new Set(scans.map((s) => s.nodeId));
      const lastScan = scans[scans.length - 1];

      // Team finished if: scanned all nodes AND last scan is an end node
      const allNodesScanned = scannedNodeIds.size === totalNodesCount;
      const endedOnEndNode = lastScan && endNodeIds.has(lastScan.nodeId);

      if (allNodesScanned && endedOnEndNode) {
        const finishTime = new Date(lastScan.timestamp);
        if (!firstFinisher || finishTime < firstFinisher.finishTime) {
          firstFinisher = { teamId: t.id, finishTime };
        }
      }
    }

    if (!firstFinisher) return { isWinner: false };

    return {
      isWinner: teamId === firstFinisher.teamId,
      winnerTeamId: firstFinisher.teamId,
    };
  }
}

export const scanService = new ScanService();
