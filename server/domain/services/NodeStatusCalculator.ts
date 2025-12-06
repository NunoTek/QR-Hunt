import { nodeRepository } from "../repositories/NodeRepository.js";
import { scanRepository } from "../repositories/ScanRepository.js";
import type { Node, Scan } from "../types.js";

/**
 * Centralized service for calculating node completion status.
 * Eliminates duplication across ScanService, GameService, and routes.
 */

export interface CompletionStatus {
  allNodesScanned: boolean;
  isGameComplete: boolean;
  remainingNodes: Node[];
  remainingCount: number;
  scannedCount: number;
  totalActivatedCount: number;
}

export interface NodeSets {
  activatedNodes: Node[];
  activatedNodeIds: Set<string>;
  startNodeIds: Set<string>;
  endNodeIds: Set<string>;
}

export interface TeamScanStatus {
  scans: Scan[];
  scannedNodeIds: Set<string>;
  lastScan: Scan | null;
  lastNodeId: string | null;
}

class NodeStatusCalculatorService {
  /**
   * Get all activated nodes for a game with categorized sets
   */
  getNodeSets(gameId: string): NodeSets {
    const activatedNodes = nodeRepository.findActivatedByGameId(gameId);
    const activatedNodeIds = new Set(activatedNodes.map((n) => n.id));
    const startNodeIds = new Set(activatedNodes.filter((n) => n.isStart).map((n) => n.id));
    const endNodeIds = new Set(activatedNodes.filter((n) => n.isEnd).map((n) => n.id));

    return { activatedNodes, activatedNodeIds, startNodeIds, endNodeIds };
  }

  /**
   * Get team's scan status including scanned node IDs
   */
  getTeamScanStatus(teamId: string): TeamScanStatus {
    const scans = scanRepository.findByTeamId(teamId);
    const scannedNodeIds = new Set(scans.map((s) => s.nodeId));
    const lastScan = scans.length > 0 ? scans[scans.length - 1] : null;
    const lastNodeId = lastScan?.nodeId ?? null;

    return { scans, scannedNodeIds, lastScan, lastNodeId };
  }

  /**
   * Calculate full completion status for a team
   */
  getCompletionStatus(teamId: string, gameId: string): CompletionStatus {
    const { activatedNodes, endNodeIds } = this.getNodeSets(gameId);
    const { scannedNodeIds, lastNodeId } = this.getTeamScanStatus(teamId);

    const allNodesScanned = activatedNodes.every((n) => scannedNodeIds.has(n.id));
    const endedOnEndNode = lastNodeId !== null && endNodeIds.has(lastNodeId);
    const isGameComplete = allNodesScanned && endedOnEndNode;
    const remainingNodes = activatedNodes.filter((n) => !scannedNodeIds.has(n.id));

    return {
      allNodesScanned,
      isGameComplete,
      remainingNodes,
      remainingCount: remainingNodes.length,
      scannedCount: scannedNodeIds.size,
      totalActivatedCount: activatedNodes.length,
    };
  }

  /**
   * Check if all activated nodes have been scanned
   */
  isAllNodesScanned(teamId: string, gameId: string): boolean {
    const { activatedNodes } = this.getNodeSets(gameId);
    const { scannedNodeIds } = this.getTeamScanStatus(teamId);
    return activatedNodes.every((n) => scannedNodeIds.has(n.id));
  }

  /**
   * Check if team has finished the game (all nodes + end node)
   */
  isTeamFinished(teamId: string, gameId: string): boolean {
    return this.getCompletionStatus(teamId, gameId).isGameComplete;
  }

  /**
   * Get remaining unscanned activated nodes for a team
   */
  getRemainingNodes(teamId: string, gameId: string): Node[] {
    const { activatedNodes } = this.getNodeSets(gameId);
    const { scannedNodeIds } = this.getTeamScanStatus(teamId);
    return activatedNodes.filter((n) => !scannedNodeIds.has(n.id));
  }

  /**
   * Get available start nodes for a team that hasn't started yet
   */
  getAvailableStartNodes(gameId: string): Node[] {
    const { activatedNodes } = this.getNodeSets(gameId);
    return activatedNodes.filter((n) => n.isStart);
  }

  /**
   * Check if a specific node has been scanned by a team
   */
  hasTeamScannedNode(teamId: string, nodeId: string): boolean {
    const { scannedNodeIds } = this.getTeamScanStatus(teamId);
    return scannedNodeIds.has(nodeId);
  }
}

export const nodeStatusCalculator = new NodeStatusCalculatorService();
