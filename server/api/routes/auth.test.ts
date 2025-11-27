import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { initializeDatabase, closeDatabase, getDatabase } from "../../db/database.js";
import { gameRepository } from "../../domain/repositories/GameRepository.js";
import { teamRepository } from "../../domain/repositories/TeamRepository.js";
import { authService } from "../../domain/services/AuthService.js";

describe("Auth API", () => {
  let gameId: string;
  let teamCode: string;

  beforeEach(async () => {
    process.env.DATA_DIR = "./tests/test-data-auth-api";
    await initializeDatabase();

    // Create test game
    const game = gameRepository.create({
      name: "Auth Test Game",
      publicSlug: "auth-test-game",
    });
    gameId = game.id;
    gameRepository.update(gameId, { status: "active" });

    // Create test team
    const team = teamRepository.create({
      gameId,
      name: "Auth Test Team",
      code: "AUTH01",
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
    it("should successfully join with valid credentials", () => {
      const result = authService.joinGame("auth-test-game", teamCode);

      expect(result.success).toBe(true);
      expect(result.team).toBeDefined();
      expect(result.team!.name).toBe("Auth Test Team");
      expect(result.session).toBeDefined();
      expect(result.session!.token).toBeDefined();
      expect(result.session!.expiresAt).toBeDefined();
    });

    it("should fail with invalid game slug", () => {
      const result = authService.joinGame("non-existent", teamCode);

      expect(result.success).toBe(false);
      expect(result.message).toBe("Game not found");
    });

    it("should fail with invalid team code", () => {
      const result = authService.joinGame("auth-test-game", "INVALID");

      expect(result.success).toBe(false);
      expect(result.message).toBe("Invalid team code");
    });

    it("should fail for inactive game", () => {
      gameRepository.update(gameId, { status: "draft" });

      const result = authService.joinGame("auth-test-game", teamCode);

      expect(result.success).toBe(false);
      expect(result.message).toBe("Game is not currently active");
    });

    it("should fail for completed game", () => {
      gameRepository.update(gameId, { status: "completed" });

      const result = authService.joinGame("auth-test-game", teamCode);

      expect(result.success).toBe(false);
      expect(result.message).toBe("Game is not currently active");
    });

    it("should be case-insensitive for team code", () => {
      const result = authService.joinGame("auth-test-game", teamCode.toLowerCase());

      expect(result.success).toBe(true);
    });
  });

  describe("validateSession", () => {
    it("should validate active session", () => {
      const joinResult = authService.joinGame("auth-test-game", teamCode);
      const token = joinResult.session!.token;

      const result = authService.validateSession(token);

      expect(result.valid).toBe(true);
      expect(result.team).toBeDefined();
      expect(result.session).toBeDefined();
    });

    it("should reject invalid token", () => {
      const result = authService.validateSession("invalid-token-abc");

      expect(result.valid).toBe(false);
      expect(result.team).toBeUndefined();
    });

    it("should reject after logout", () => {
      const joinResult = authService.joinGame("auth-test-game", teamCode);
      const token = joinResult.session!.token;

      authService.logout(token);

      const result = authService.validateSession(token);

      expect(result.valid).toBe(false);
    });
  });

  describe("logout", () => {
    it("should successfully logout valid session", () => {
      const joinResult = authService.joinGame("auth-test-game", teamCode);
      const token = joinResult.session!.token;

      const result = authService.logout(token);

      expect(result).toBe(true);
    });

    it("should return false for invalid token", () => {
      const result = authService.logout("invalid-token");

      expect(result).toBe(false);
    });

    it("should allow re-joining after logout", () => {
      const joinResult1 = authService.joinGame("auth-test-game", teamCode);
      authService.logout(joinResult1.session!.token);

      const joinResult2 = authService.joinGame("auth-test-game", teamCode);

      expect(joinResult2.success).toBe(true);
      expect(joinResult2.session!.token).not.toBe(joinResult1.session!.token);
    });
  });

  describe("admin authentication", () => {
    it("should validate correct admin code", () => {
      const result = authService.validateAdminCode("admin123");
      expect(result).toBe(true);
    });

    it("should reject incorrect admin code", () => {
      const result = authService.validateAdminCode("wrong-code");
      expect(result).toBe(false);
    });

    it("should reject empty admin code", () => {
      const result = authService.validateAdminCode("");
      expect(result).toBe(false);
    });
  });

  describe("password hashing", () => {
    it("should produce consistent hashes", () => {
      const password = "test-password-123";
      const hash1 = authService.hashPassword(password);
      const hash2 = authService.hashPassword(password);

      expect(hash1).toBe(hash2);
    });

    it("should produce different hashes for different inputs", () => {
      const hash1 = authService.hashPassword("password1");
      const hash2 = authService.hashPassword("password2");

      expect(hash1).not.toBe(hash2);
    });

    it("should handle special characters", () => {
      const password = "p@ssw0rd!#$%^&*()";
      const hash = authService.hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash.length).toBeGreaterThan(0);
    });

    it("should handle unicode characters", () => {
      const password = "contraseña密码пароль";
      const hash = authService.hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash.length).toBeGreaterThan(0);
    });
  });
});
