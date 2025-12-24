import { gameRepository } from "../repositories/GameRepository.js";
import { teamRepository } from "../repositories/TeamRepository.js";
import { nodeRepository } from "../repositories/NodeRepository.js";
import type { Game, Team, GameStatus } from "../types.js";

/**
 * Centralized validation service for game and team operations.
 * Eliminates duplicate validation logic across services and routes.
 */

export interface ValidationResult<T = void> {
  valid: boolean;
  message: string;
  data?: T;
}

export interface TeamAndGame {
  team: Team;
  game: Game;
}

class GameProgressValidatorService {
  /**
   * Validate that a team exists
   */
  validateTeam(teamId: string): ValidationResult<Team> {
    const team = teamRepository.findById(teamId);
    if (!team) {
      return { valid: false, message: "Team not found" };
    }
    return { valid: true, message: "", data: team };
  }

  /**
   * Validate that a game exists
   */
  validateGame(gameId: string): ValidationResult<Game> {
    const game = gameRepository.findById(gameId);
    if (!game) {
      return { valid: false, message: "Game not found" };
    }
    return { valid: true, message: "", data: game };
  }

  /**
   * Validate that a game exists by slug
   */
  validateGameBySlug(slug: string): ValidationResult<Game> {
    const game = gameRepository.findBySlug(slug);
    if (!game) {
      return { valid: false, message: "Game not found" };
    }
    return { valid: true, message: "", data: game };
  }

  /**
   * Validate both team and game exist (most common pattern)
   */
  validateTeamAndGame(teamId: string): ValidationResult<TeamAndGame> {
    const teamResult = this.validateTeam(teamId);
    if (!teamResult.valid || !teamResult.data) {
      return { valid: false, message: teamResult.message };
    }

    const gameResult = this.validateGame(teamResult.data.gameId);
    if (!gameResult.valid || !gameResult.data) {
      return { valid: false, message: gameResult.message };
    }

    return {
      valid: true,
      message: "",
      data: { team: teamResult.data, game: gameResult.data },
    };
  }

  /**
   * Validate game is in expected status
   */
  validateGameStatus(gameId: string, expectedStatus: GameStatus | GameStatus[]): ValidationResult<Game> {
    const gameResult = this.validateGame(gameId);
    if (!gameResult.valid || !gameResult.data) {
      return gameResult;
    }

    const statuses = Array.isArray(expectedStatus) ? expectedStatus : [expectedStatus];
    if (!statuses.includes(gameResult.data.status)) {
      return {
        valid: false,
        message: `Game is not ${statuses.join(" or ")}`,
      };
    }

    return gameResult;
  }

  /**
   * Validate game is active (most common status check)
   */
  validateGameActive(gameId: string): ValidationResult<Game> {
    return this.validateGameStatus(gameId, "active");
  }

  /**
   * Validate team exists and game is active
   */
  validateTeamAndGameActive(teamId: string): ValidationResult<TeamAndGame> {
    const result = this.validateTeamAndGame(teamId);
    if (!result.valid || !result.data) {
      return result;
    }

    if (result.data.game.status !== "active") {
      return { valid: false, message: "Game is not active" };
    }

    return result;
  }

  /**
   * Validate game can be activated (has required nodes)
   */
  validateGameCanActivate(gameId: string): ValidationResult<Game> {
    const gameResult = this.validateGame(gameId);
    if (!gameResult.valid || !gameResult.data) {
      return gameResult;
    }

    const nodes = nodeRepository.findByGameId(gameId);
    if (nodes.length === 0) {
      return { valid: false, message: "Cannot activate game without any nodes" };
    }

    const startNodes = nodes.filter((n) => n.isStart);
    if (startNodes.length === 0) {
      return { valid: false, message: "Cannot activate game without at least one start node" };
    }

    const endNodes = nodes.filter((n) => n.isEnd);
    if (endNodes.length === 0) {
      return { valid: false, message: "Cannot activate game without at least one end node" };
    }

    const activatedNodes = nodes.filter((n) => n.activated);
    if (activatedNodes.length === 0) {
      return { valid: false, message: "Cannot activate game without at least one activated node" };
    }

    return gameResult;
  }

  /**
   * Get team and game without validation (for internal use when already validated)
   */
  getTeamAndGame(teamId: string): TeamAndGame | null {
    const team = teamRepository.findById(teamId);
    if (!team) return null;

    const game = gameRepository.findById(team.gameId);
    if (!game) return null;

    return { team, game };
  }
}

export const gameProgressValidator = new GameProgressValidatorService();
