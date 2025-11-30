import { createHash } from "crypto";
import { gameRepository } from "../repositories/GameRepository.js";
import { teamRepository } from "../repositories/TeamRepository.js";
import { nodeRepository } from "../repositories/NodeRepository.js";
import { edgeRepository } from "../repositories/EdgeRepository.js";
import { scanRepository } from "../repositories/ScanRepository.js";
import { hintUsageRepository } from "../repositories/HintUsageRepository.js";
import type { Scan, Node, TeamProgress, HintUsage } from "../types.js";
import { GAME } from "../../config/constants.js";

export interface ScanResult {
  success: boolean;
  message: string;
  node?: Node;
  nextNodes?: Node[];
  isGameComplete?: boolean;
  pointsAwarded?: number;
  scan?: Scan;
}

export interface HintResult {
  success: boolean;
  message: string;
  hint?: string;
  pointsDeducted?: number;
  alreadyUsed?: boolean;
}

export class ScanService {
  recordScan(data: {
    teamId: string;
    nodeKey: string;
    password?: string;
    clientIp?: string;
    userAgent?: string;
  }): ScanResult {
    // Validate team and game
    const entityValidation = this.validateTeamAndGame(data.teamId);
    if (!entityValidation.valid) {
      return { success: false, message: entityValidation.message };
    }
    const { team, game: _game } = entityValidation;

    // Find and validate node
    const node = nodeRepository.findByNodeKey(team!.gameId, data.nodeKey);
    if (!node) {
      return { success: false, message: "Invalid QR code" };
    }

    // Check if this is a valid scan based on team progress
    const scanValidation = this.validateScan(team!.id, node);
    if (!scanValidation.valid) {
      return { success: false, message: scanValidation.message };
    }

    // Validate password if required
    const passwordValidation = this.validatePasswordIfRequired(node, data.password);
    if (!passwordValidation.valid) {
      return passwordValidation.result!;
    }

    // Check if already scanned
    if (scanRepository.hasTeamScannedNode(data.teamId, node.id)) {
      return {
        success: false,
        message: "You have already scanned this QR code",
        node: this.sanitizeNode(node),
      };
    }

    // Calculate points and record scan
    const pointsAwarded = this.calculatePoints(data.teamId, node);
    const scan = scanRepository.create({
      gameId: team!.gameId,
      teamId: data.teamId,
      nodeId: node.id,
      clientIp: data.clientIp,
      userAgent: data.userAgent,
      pointsAwarded,
    });

    // Check completion status and build response
    const completionStatus = this.checkCompletionStatus(team!.gameId, data.teamId, node);

    return {
      success: true,
      message: completionStatus.message,
      node: this.sanitizeNode(node),
      nextNodes: completionStatus.remainingNodes.map(this.sanitizeNode),
      isGameComplete: completionStatus.isGameComplete,
      pointsAwarded,
      scan,
    };
  }

  /** Validates that team exists and game is active */
  private validateTeamAndGame(teamId: string): {
    valid: boolean;
    message: string;
    team?: ReturnType<typeof teamRepository.findById>;
    game?: ReturnType<typeof gameRepository.findById>;
  } {
    const team = teamRepository.findById(teamId);
    if (!team) {
      return { valid: false, message: "Team not found" };
    }

    const game = gameRepository.findById(team.gameId);
    if (!game) {
      return { valid: false, message: "Game not found" };
    }

    if (game.status !== "active") {
      return { valid: false, message: "Game is not active" };
    }

    return { valid: true, message: "", team, game };
  }

  /** Validates password if node requires one */
  private validatePasswordIfRequired(
    node: Node,
    password?: string
  ): { valid: boolean; result?: ScanResult } {
    if (!node.passwordRequired) {
      return { valid: true };
    }

    if (!password) {
      return {
        valid: false,
        result: {
          success: false,
          message: "Password required",
          node: this.sanitizeNode(node),
        },
      };
    }

    if (!this.verifyPassword(password, node.passwordHash)) {
      return {
        valid: false,
        result: { success: false, message: "Incorrect password" },
      };
    }

    return { valid: true };
  }

  /** Checks game completion status and generates appropriate message */
  private checkCompletionStatus(
    gameId: string,
    teamId: string,
    lastNode: Node
  ): {
    isGameComplete: boolean;
    allNodesScanned: boolean;
    remainingNodes: Node[];
    message: string;
  } {
    const allNodes = nodeRepository.findActivatedByGameId(gameId);
    const teamScans = scanRepository.findByTeamId(teamId);
    const scannedNodeIds = new Set(teamScans.map((s) => s.nodeId));
    const allNodesScanned = allNodes.every((n) => scannedNodeIds.has(n.id));
    const isGameComplete = allNodesScanned && lastNode.isEnd;
    const remainingNodes = allNodes.filter((n) => !scannedNodeIds.has(n.id));

    const message = this.constructSuccessMessage(isGameComplete, allNodesScanned, lastNode.isEnd, remainingNodes.length);

    return { isGameComplete, allNodesScanned, remainingNodes, message };
  }

  /** Constructs the appropriate success message based on game state */
  private constructSuccessMessage(
    isGameComplete: boolean,
    allNodesScanned: boolean,
    isEndNode: boolean,
    remainingCount: number
  ): string {
    if (isGameComplete) {
      return "Congratulations! You found all QR codes and finished!";
    }
    if (allNodesScanned && !isEndNode) {
      return "All QR codes found! Now find an end point to finish!";
    }
    return `QR scanned! ${remainingCount} more to find.`;
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

    // Check if all activated nodes have been scanned
    const allNodes = nodeRepository.findActivatedByGameId(team.gameId);
    const scannedNodeIds = new Set(scans.map((s) => s.nodeId));
    const allNodesScanned = allNodes.every((n) => scannedNodeIds.has(n.id));

    // If all activated nodes scanned, only allow end nodes to finish the game
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

        // Bonus for fast completion
        if (minutesTaken < GAME.TIME_BONUS_THRESHOLD_MINUTES) {
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

    // Get activated nodes only (for clues and completion)
    const allNodes = nodeRepository.findActivatedByGameId(team.gameId);
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
        // Clear current clue when finished
        if (team.currentClueId) {
          teamRepository.update(teamId, { currentClueId: null });
        }
      } else {
        // Show remaining nodes to find
        nextNodes = allNodes.filter((n) => !scannedNodeIds.has(n.id));

        if (isRandomMode) {
          // Random mode: use persisted clue or assign a new one
          nextClue = this.getOrAssignRandomClue(team, nextNodes);
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
      // Random mode with no start node: use persisted clue or pick a random start node
      const startNodes = allNodes.filter((n) => n.isStart);
      if (startNodes.length > 0) {
        nextClue = this.getOrAssignRandomClue(team, startNodes);
        nextNodes = allNodes.filter((n) => n.id !== nextClue?.id);
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

  // Get the persisted random clue or assign a new one
  private getOrAssignRandomClue(team: { id: string; currentClueId: string | null }, availableNodes: Node[]): Node | null {
    if (availableNodes.length === 0) return null;

    // Check if there's a persisted clue that's still valid (not scanned yet)
    if (team.currentClueId) {
      const persistedClue = availableNodes.find((n) => n.id === team.currentClueId);
      if (persistedClue) {
        return persistedClue;
      }
      // Persisted clue was scanned or deleted, need a new one
    }

    // Assign a new random clue
    const randomIndex = Math.floor(Math.random() * availableNodes.length);
    const newClue = availableNodes[randomIndex];
    teamRepository.update(team.id, { currentClueId: newClue.id });
    return newClue;
  }

  // Shuffle to a new random clue (for "Try another" button)
  shuffleRandomClue(teamId: string): { success: boolean; newClue?: Node; message?: string } {
    const team = teamRepository.findById(teamId);
    if (!team) {
      return { success: false, message: "Team not found" };
    }

    const game = gameRepository.findById(team.gameId);
    if (!game) {
      return { success: false, message: "Game not found" };
    }

    if (!game.settings.randomMode) {
      return { success: false, message: "Random mode is not enabled for this game" };
    }

    const scans = scanRepository.findByTeamId(teamId);
    const scannedNodeIds = new Set(scans.map((s) => s.nodeId));
    const allNodes = nodeRepository.findActivatedByGameId(team.gameId);

    let availableNodes: Node[];
    if (scans.length === 0) {
      // No scans yet, pick from activated start nodes
      availableNodes = allNodes.filter((n) => n.isStart);
    } else {
      // Pick from unscanned activated nodes
      availableNodes = allNodes.filter((n) => !scannedNodeIds.has(n.id));
    }

    // Filter out current clue to ensure we get a different one
    if (team.currentClueId && availableNodes.length > 1) {
      availableNodes = availableNodes.filter((n) => n.id !== team.currentClueId);
    }

    if (availableNodes.length === 0) {
      return { success: false, message: "No other clues available" };
    }

    // Pick a random new clue
    const randomIndex = Math.floor(Math.random() * availableNodes.length);
    const newClue = availableNodes[randomIndex];
    teamRepository.update(teamId, { currentClueId: newClue.id });

    return { success: true, newClue: this.sanitizeNode(newClue) };
  }

  // Request a hint for a specific node
  requestHint(teamId: string, nodeId: string): HintResult {
    const team = teamRepository.findById(teamId);
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

    const node = nodeRepository.findById(nodeId);
    if (!node) {
      return { success: false, message: "Node not found" };
    }

    if (node.gameId !== team.gameId) {
      return { success: false, message: "Node does not belong to this game" };
    }

    if (!node.hint) {
      return { success: false, message: "No hint available for this clue" };
    }

    // Check if team has already used this hint
    const existingUsage = hintUsageRepository.findByTeamAndNode(teamId, nodeId);
    if (existingUsage) {
      return {
        success: true,
        message: "Hint already used",
        hint: node.hint,
        pointsDeducted: existingUsage.pointsDeducted,
        alreadyUsed: true,
      };
    }

    // Calculate points deduction (half of node points)
    const pointsDeducted = Math.floor(node.points / 2);

    // Record hint usage
    hintUsageRepository.create({
      gameId: team.gameId,
      teamId,
      nodeId,
      pointsDeducted,
    });

    return {
      success: true,
      message: `Hint revealed! ${pointsDeducted} points will be deducted from this clue.`,
      hint: node.hint,
      pointsDeducted,
      alreadyUsed: false,
    };
  }

  // Get hint usage for a specific team and node
  getHintUsage(teamId: string, nodeId: string): HintUsage | null {
    return hintUsageRepository.findByTeamAndNode(teamId, nodeId);
  }

  // Get total points deducted for hints for a team
  getTotalHintPointsDeducted(teamId: string): number {
    return hintUsageRepository.getTotalPointsDeductedForTeam(teamId);
  }

  checkIfWinner(teamId: string): { isWinner: boolean; winnerTeamId?: string } {
    const team = teamRepository.findById(teamId);
    if (!team) return { isWinner: false };

    const game = gameRepository.findById(team.gameId);
    if (!game) return { isWinner: false };

    const allNodes = nodeRepository.findActivatedByGameId(team.gameId);
    const endNodeIds = new Set(allNodes.filter((n) => n.isEnd).map((n) => n.id));
    const totalNodesCount = allNodes.length;

    // Find all teams that have finished (scanned all activated nodes + ended on an end node)
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
