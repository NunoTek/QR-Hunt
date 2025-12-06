import { createHash } from "crypto";
import { edgeRepository } from "../repositories/EdgeRepository.js";
import { hintUsageRepository } from "../repositories/HintUsageRepository.js";
import { nodeRepository } from "../repositories/NodeRepository.js";
import { scanRepository } from "../repositories/ScanRepository.js";
import { teamRepository } from "../repositories/TeamRepository.js";
import type { HintUsage, Node, Scan, TeamProgress } from "../types.js";
import { gameProgressValidator } from "./GameProgressValidator.js";
import { nodeStatusCalculator } from "./NodeStatusCalculator.js";
import { pointsCalculator } from "./PointsCalculator.js";

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
    // Validate team and game using shared validator
    const validation = gameProgressValidator.validateTeamAndGameActive(data.teamId);
    if (!validation.valid || !validation.data) {
      return { success: false, message: validation.message };
    }
    const { team, game } = validation.data;

    // Find and validate node
    const node = nodeRepository.findByNodeKey(team.gameId, data.nodeKey);
    if (!node) {
      return { success: false, message: "Invalid QR code" };
    }

    // Check if this is a valid scan based on team progress
    const scanValidation = this.validateScan(team.id, node);
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

    // Calculate points using shared calculator
    const lastScan = scanRepository.findLastScanByTeam(data.teamId);
    const pointsAwarded = pointsCalculator.calculateScanPoints(node, game, lastScan);

    // Record scan
    const scan = scanRepository.create({
      gameId: team.gameId,
      teamId: data.teamId,
      nodeId: node.id,
      clientIp: data.clientIp,
      userAgent: data.userAgent,
      pointsAwarded,
    });

    // Get completion status using shared calculator
    const status = nodeStatusCalculator.getCompletionStatus(data.teamId, team.gameId);
    const isGameComplete = status.allNodesScanned && node.isEnd;
    const message = this.constructSuccessMessage(isGameComplete, status.allNodesScanned, node.isEnd, status.remainingCount);

    return {
      success: true,
      message,
      node: this.sanitizeNode(node),
      nextNodes: status.remainingNodes.map(this.sanitizeNode),
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

    const { scans, scannedNodeIds } = nodeStatusCalculator.getTeamScanStatus(teamId);

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
    const { activatedNodes } = nodeStatusCalculator.getNodeSets(team.gameId);
    const allNodesScanned = activatedNodes.every((n) => scannedNodeIds.has(n.id));

    // If all activated nodes scanned, only allow end nodes to finish the game
    if (allNodesScanned && !node.isEnd) {
      return { valid: false, message: "You've found all QR codes! Find an end point to finish." };
    }

    return { valid: true, message: "" };
  }

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

  private getNextNodes(nodeId: string): Node[] {
    const edges = edgeRepository.findOutgoingEdges(nodeId);
    const nodes: Node[] = [];

    for (const edge of edges) {
      const node = nodeRepository.findById(edge.toNodeId);
      if (node && node.activated) {
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
    return { ...node, passwordHash: null };
  }

  getTeamProgress(teamId: string): TeamProgress | null {
    const validation = gameProgressValidator.validateTeamAndGame(teamId);
    if (!validation.valid || !validation.data) return null;
    const { team, game } = validation.data;

    const { scans, scannedNodeIds, lastScan } = nodeStatusCalculator.getTeamScanStatus(teamId);
    const { activatedNodes } = nodeStatusCalculator.getNodeSets(team.gameId);
    const totalPoints = pointsCalculator.getRawPoints(teamId);
    const isRandomMode = game.settings.randomMode ?? false;

    let currentNode: Node | null = null;
    let nextClue: Node | null = null;
    let nextNodes: Node[] = [];
    let isFinished = false;

    const allNodesScanned = activatedNodes.every((n) => scannedNodeIds.has(n.id));

    if (scans.length > 0) {
      currentNode = lastScan ? nodeRepository.findById(lastScan.nodeId) : null;

      if (allNodesScanned && currentNode?.isEnd) {
        isFinished = true;
        if (team.currentClueId) {
          teamRepository.update(teamId, { currentClueId: null });
        }
      } else {
        nextNodes = activatedNodes.filter((n) => !scannedNodeIds.has(n.id));

        if (isRandomMode) {
          nextClue = this.getOrAssignRandomClue(team, nextNodes);
        } else {
          if (currentNode) {
            const connectedNodes = this.getNextNodes(currentNode.id);
            nextClue = connectedNodes.find((n) => !scannedNodeIds.has(n.id)) || null;
            if (!nextClue && nextNodes.length > 0) {
              nextClue = nextNodes[0];
            }
          }
        }
      }
    } else {
      // No scans yet - determine starting clue
      nextClue = this.getStartingClue(team, activatedNodes, isRandomMode);
      nextNodes = activatedNodes.filter((n) => n.id !== nextClue?.id);
    }

    return {
      team,
      scans,
      currentNode,
      nextClue,
      nextNodes,
      totalPoints,
      nodesFound: scans.length,
      isFinished,
    };
  }

  private getStartingClue(
    team: { id: string; startNodeId: string | null; currentClueId: string | null },
    activatedNodes: Node[],
    isRandomMode: boolean
  ): Node | null {
    const startNodes = activatedNodes.filter((n) => n.isStart);

    // Team has assigned start node
    if (team.startNodeId) {
      const startNode = nodeRepository.findById(team.startNodeId);
      if (startNode?.activated) {
        return startNode;
      }
    }

    // Random mode: get or assign random start node
    if (isRandomMode && startNodes.length > 0) {
      return this.getOrAssignRandomClue(team, startNodes);
    }

    // Standard mode: first start node
    return startNodes[0] || null;
  }

  private getOrAssignRandomClue(
    team: { id: string; currentClueId: string | null },
    availableNodes: Node[]
  ): Node | null {
    if (availableNodes.length === 0) return null;

    // Check if there's a persisted clue that's still valid
    if (team.currentClueId) {
      const persistedClue = availableNodes.find((n) => n.id === team.currentClueId);
      if (persistedClue) return persistedClue;
    }

    // Assign a new random clue
    const randomIndex = Math.floor(Math.random() * availableNodes.length);
    const newClue = availableNodes[randomIndex];
    teamRepository.update(team.id, { currentClueId: newClue.id });
    return newClue;
  }

  shuffleRandomClue(teamId: string): { success: boolean; newClue?: Node; message?: string } {
    const validation = gameProgressValidator.validateTeamAndGameActive(teamId);
    if (!validation.valid || !validation.data) {
      return { success: false, message: validation.message };
    }
    const { team, game } = validation.data;

    if (!game.settings.randomMode) {
      return { success: false, message: "Random mode is not enabled for this game" };
    }

    const { scans, scannedNodeIds } = nodeStatusCalculator.getTeamScanStatus(teamId);
    const { activatedNodes } = nodeStatusCalculator.getNodeSets(team.gameId);

    let availableNodes = scans.length === 0
      ? activatedNodes.filter((n) => n.isStart)
      : activatedNodes.filter((n) => !scannedNodeIds.has(n.id));

    // Filter out current clue to get a different one
    if (team.currentClueId && availableNodes.length > 1) {
      availableNodes = availableNodes.filter((n) => n.id !== team.currentClueId);
    }

    if (availableNodes.length === 0) {
      return { success: false, message: "No other clues available" };
    }

    const randomIndex = Math.floor(Math.random() * availableNodes.length);
    const newClue = availableNodes[randomIndex];
    teamRepository.update(teamId, { currentClueId: newClue.id });

    return { success: true, newClue: this.sanitizeNode(newClue) };
  }

  requestHint(teamId: string, nodeId: string): HintResult {
    const validation = gameProgressValidator.validateTeamAndGameActive(teamId);
    if (!validation.valid || !validation.data) {
      return { success: false, message: validation.message };
    }
    const { team } = validation.data;

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

    // Check if already used
    const existingUsage = pointsCalculator.getHintUsage(teamId, nodeId);
    if (existingUsage) {
      return {
        success: true,
        message: "Hint already used",
        hint: node.hint,
        pointsDeducted: existingUsage.pointsDeducted,
        alreadyUsed: true,
      };
    }

    // Calculate and record hint usage
    const pointsDeducted = pointsCalculator.calculateHintDeduction(node);
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

  getHintUsage(teamId: string, nodeId: string): HintUsage | null {
    return pointsCalculator.getHintUsage(teamId, nodeId);
  }

  getTotalHintPointsDeducted(teamId: string): number {
    return pointsCalculator.getHintDeduction(teamId);
  }

  checkIfWinner(teamId: string): { isWinner: boolean; winnerTeamId?: string; hasWinner: boolean } {
    const validation = gameProgressValidator.validateTeamAndGame(teamId);
    if (!validation.valid || !validation.data) {
      return { isWinner: false, hasWinner: false };
    }
    const { team } = validation.data;

    const { activatedNodes, endNodeIds } = nodeStatusCalculator.getNodeSets(team.gameId);
    const teams = teamRepository.findByGameId(team.gameId);

    let firstFinisher: { teamId: string; finishTime: Date } | null = null;

    for (const t of teams) {
      const { scannedNodeIds, lastScan } = nodeStatusCalculator.getTeamScanStatus(t.id);
      const allNodesScanned = activatedNodes.every((n) => scannedNodeIds.has(n.id));
      const endedOnEndNode = lastScan && endNodeIds.has(lastScan.nodeId);

      if (allNodesScanned && endedOnEndNode) {
        const finishTime = new Date(lastScan.timestamp);
        if (!firstFinisher || finishTime < firstFinisher.finishTime) {
          firstFinisher = { teamId: t.id, finishTime };
        }
      }
    }

    if (!firstFinisher) return { isWinner: false, hasWinner: false };

    return {
      isWinner: teamId === firstFinisher.teamId,
      winnerTeamId: firstFinisher.teamId,
      hasWinner: true,
    };
  }
}

export const scanService = new ScanService();
