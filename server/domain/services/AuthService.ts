import { createHash } from "crypto";
import { gameRepository } from "../repositories/GameRepository.js";
import { teamRepository } from "../repositories/TeamRepository.js";
import { sessionRepository } from "../repositories/SessionRepository.js";
import type { Team, TeamSession } from "../types.js";

const ADMIN_CODE = process.env.ADMIN_CODE || "admin123";

export interface JoinResult {
  success: boolean;
  message: string;
  team?: Team;
  session?: TeamSession;
}

export class AuthService {
  joinGame(gameSlug: string, teamCode: string): JoinResult {
    const game = gameRepository.findBySlug(gameSlug);
    if (!game) {
      return { success: false, message: "Game not found" };
    }

    if (game.status !== "active") {
      return { success: false, message: "Game is not currently active" };
    }

    const team = teamRepository.findByCode(game.id, teamCode.toUpperCase());
    if (!team) {
      return { success: false, message: "Invalid team code" };
    }

    // Create session for team
    const session = sessionRepository.create(team.id, 48); // 48 hour session

    return {
      success: true,
      message: "Joined successfully",
      team,
      session,
    };
  }

  validateSession(token: string): {
    valid: boolean;
    team?: Team;
    session?: TeamSession;
  } {
    const session = sessionRepository.findValidByToken(token);
    if (!session) {
      return { valid: false };
    }

    const team = teamRepository.findById(session.teamId);
    if (!team) {
      return { valid: false };
    }

    // Extend session on valid use
    sessionRepository.extendSession(token, 48);

    return { valid: true, team, session };
  }

  logout(token: string): boolean {
    return sessionRepository.deleteByToken(token);
  }

  validateAdminCode(code: string): boolean {
    return code === ADMIN_CODE;
  }

  hashPassword(password: string): string {
    return createHash("sha256").update(password).digest("hex");
  }

  cleanupExpiredSessions(): number {
    return sessionRepository.deleteExpired();
  }
}

export const authService = new AuthService();
