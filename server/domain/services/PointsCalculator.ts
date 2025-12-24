import { GAME } from "../../config/constants.js";
import { hintUsageRepository } from "../repositories/HintUsageRepository.js";
import { scanRepository } from "../repositories/ScanRepository.js";
import type { Game, Node, Scan } from "../types.js";

/**
 * Centralized service for all point calculations.
 * Consolidates point logic across ScanService and GameService.
 */

export interface PointsSummary {
  rawPoints: number;
  hintDeduction: number;
  adjustedPoints: number;
}

class PointsCalculatorService {
  /**
   * Get total raw points from scans for a team
   */
  getRawPoints(teamId: string): number {
    return scanRepository.getTotalPointsByTeam(teamId);
  }

  /**
   * Get total hint deduction for a team
   */
  getHintDeduction(teamId: string): number {
    return hintUsageRepository.getTotalPointsDeductedForTeam(teamId);
  }

  /**
   * Get adjusted points (raw - hints) for a team
   */
  getAdjustedPoints(teamId: string): number {
    const raw = this.getRawPoints(teamId);
    const deduction = this.getHintDeduction(teamId);
    return raw - deduction;
  }

  /**
   * Get full points summary for a team
   */
  getPointsSummary(teamId: string): PointsSummary {
    const rawPoints = this.getRawPoints(teamId);
    const hintDeduction = this.getHintDeduction(teamId);
    return {
      rawPoints,
      hintDeduction,
      adjustedPoints: rawPoints - hintDeduction,
    };
  }

  /**
   * Calculate points for a scan with optional time bonus
   */
  calculateScanPoints(node: Node, game: Game, lastScan: Scan | null): number {
    let points = node.points;

    if (game.settings.timeBonusEnabled && lastScan) {
      const timeDiff = Date.now() - new Date(lastScan.timestamp).getTime();
      const minutesTaken = timeDiff / (1000 * 60);

      // Bonus for fast completion
      if (minutesTaken < GAME.TIME_BONUS_THRESHOLD_MINUTES) {
        points = Math.round(points * game.settings.timeBonusMultiplier);
      }
    }

    return points;
  }

  /**
   * Calculate hint deduction for a node (half of node points)
   */
  calculateHintDeduction(node: Node): number {
    return Math.floor(node.points / 2);
  }

  /**
   * Check if team has already used hint for a node
   */
  hasUsedHint(teamId: string, nodeId: string): boolean {
    return hintUsageRepository.findByTeamAndNode(teamId, nodeId) !== null;
  }

  /**
   * Get hint usage info for a node
   */
  getHintUsage(teamId: string, nodeId: string) {
    return hintUsageRepository.findByTeamAndNode(teamId, nodeId);
  }
}

export const pointsCalculator = new PointsCalculatorService();
