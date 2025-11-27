import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { initializeDatabase, closeDatabase, getDatabase } from "../../db/database.js";
import { authService } from "./AuthService.js";
import { gameRepository } from "../repositories/GameRepository.js";
import { teamRepository } from "../repositories/TeamRepository.js";

describe("AuthService", () => {
  let gameId: string;
  let teamCode: string;

  beforeEach(async () => {
    process.env.DATA_DIR = "./tests/test-data-auth";
    await initializeDatabase();

    // Create a test game
    const game = gameRepository.create({
      name: "Test Auth Game",
      publicSlug: "test-auth-game",
    });
    gameId = game.id;

    // Activate game
    gameRepository.update(gameId, { status: "active" });

    // Create team
    const team = teamRepository.create({
      gameId,
      name: "Test Team",
    });
    teamCode = team.code;
  });

  afterEach(() => {
    const db = getDatabase();
    db.exec("DELETE FROM team_sessions");
    db.exec("DELETE FROM teams");
    db.exec("DELETE FROM games");
    closeDatabase();
  });

  describe("joinGame", () => {
    it("should join game with valid credentials", () => {
      const result = authService.joinGame("test-auth-game", teamCode);

      expect(result.success).toBe(true);
      expect(result.team).toBeDefined();
      expect(result.session).toBeDefined();
      expect(result.session!.token).toBeDefined();
    });

    it("should reject invalid game slug", () => {
      const result = authService.joinGame("invalid-game", teamCode);

      expect(result.success).toBe(false);
      expect(result.message).toBe("Game not found");
    });

    it("should reject invalid team code", () => {
      const result = authService.joinGame("test-auth-game", "INVALID");

      expect(result.success).toBe(false);
      expect(result.message).toBe("Invalid team code");
    });

    it("should reject join for inactive game", () => {
      gameRepository.update(gameId, { status: "draft" });

      const result = authService.joinGame("test-auth-game", teamCode);

      expect(result.success).toBe(false);
      expect(result.message).toBe("Game is not currently active");
    });
  });

  describe("validateSession", () => {
    it("should validate valid session", () => {
      const joinResult = authService.joinGame("test-auth-game", teamCode);
      const token = joinResult.session!.token;

      const result = authService.validateSession(token);

      expect(result.valid).toBe(true);
      expect(result.team).toBeDefined();
    });

    it("should reject invalid token", () => {
      const result = authService.validateSession("invalid-token");

      expect(result.valid).toBe(false);
    });
  });

  describe("validateAdminCode", () => {
    it("should accept correct admin code", () => {
      // Default admin code is admin123 if env not set
      const result = authService.validateAdminCode("admin123");
      expect(result).toBe(true);
    });

    it("should reject incorrect admin code", () => {
      const result = authService.validateAdminCode("wrong-code");
      expect(result).toBe(false);
    });
  });

  describe("hashPassword", () => {
    it("should produce consistent hash", () => {
      const hash1 = authService.hashPassword("test-password");
      const hash2 = authService.hashPassword("test-password");

      expect(hash1).toBe(hash2);
    });

    it("should produce different hashes for different passwords", () => {
      const hash1 = authService.hashPassword("password1");
      const hash2 = authService.hashPassword("password2");

      expect(hash1).not.toBe(hash2);
    });
  });

  describe("logout", () => {
    it("should invalidate session on logout", () => {
      const joinResult = authService.joinGame("test-auth-game", teamCode);
      const token = joinResult.session!.token;

      const logoutSuccess = authService.logout(token);
      expect(logoutSuccess).toBe(true);

      const validateResult = authService.validateSession(token);
      expect(validateResult.valid).toBe(false);
    });
  });
});
