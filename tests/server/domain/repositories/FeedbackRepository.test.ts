import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { initializeDatabase, closeDatabase, getDatabase } from "@server/db/database.js";
import { feedbackRepository } from "@server/domain/repositories/FeedbackRepository.js";
import { gameRepository } from "@server/domain/repositories/GameRepository.js";
import { teamRepository } from "@server/domain/repositories/TeamRepository.js";

describe("FeedbackRepository", () => {
  let gameId: string;
  let teamId: string;

  beforeEach(async () => {
    process.env.DATA_DIR = "./tests/test-data-feedback-repo";
    await initializeDatabase();

    // Create a test game
    const game = gameRepository.create({
      name: "Test Game",
      publicSlug: "test-game-feedback",
    });
    gameId = game.id;

    // Create a test team
    const team = teamRepository.create({
      gameId,
      name: "Test Team",
      code: "TEST01",
    });
    teamId = team.id;
  });

  afterEach(() => {
    const db = getDatabase();
    db.exec("DELETE FROM feedback");
    db.exec("DELETE FROM teams");
    db.exec("DELETE FROM games");
    closeDatabase();
  });

  describe("create", () => {
    it("should create feedback with rating only", () => {
      const feedback = feedbackRepository.create({
        gameId,
        teamId,
        teamName: "Test Team",
        rating: 5,
      });

      expect(feedback).toBeDefined();
      expect(feedback.id).toBeDefined();
      expect(feedback.gameId).toBe(gameId);
      expect(feedback.teamId).toBe(teamId);
      expect(feedback.teamName).toBe("Test Team");
      expect(feedback.rating).toBe(5);
      expect(feedback.comment).toBeNull();
    });

    it("should create feedback with rating and comment", () => {
      const feedback = feedbackRepository.create({
        gameId,
        teamId,
        teamName: "Test Team",
        rating: 4,
        comment: "Great game! Really enjoyed it.",
      });

      expect(feedback.rating).toBe(4);
      expect(feedback.comment).toBe("Great game! Really enjoyed it.");
    });
  });

  describe("findById", () => {
    it("should find existing feedback by id", () => {
      const created = feedbackRepository.create({
        gameId,
        teamId,
        teamName: "Test Team",
        rating: 5,
      });

      const found = feedbackRepository.findById(created.id);

      expect(found).toBeDefined();
      expect(found!.id).toBe(created.id);
    });

    it("should return null for non-existent id", () => {
      const found = feedbackRepository.findById("non-existent");
      expect(found).toBeNull();
    });
  });

  describe("findByGameId", () => {
    it("should return all feedback for a game", () => {
      // Create another team
      const team2 = teamRepository.create({
        gameId,
        name: "Team 2",
        code: "TEAM02",
      });

      feedbackRepository.create({
        gameId,
        teamId,
        teamName: "Test Team",
        rating: 5,
      });
      feedbackRepository.create({
        gameId,
        teamId: team2.id,
        teamName: "Team 2",
        rating: 4,
      });

      const feedback = feedbackRepository.findByGameId(gameId);

      expect(feedback.length).toBe(2);
    });

    it("should return empty array when no feedback", () => {
      const feedback = feedbackRepository.findByGameId(gameId);
      expect(feedback).toEqual([]);
    });
  });

  describe("findByTeamId", () => {
    it("should find feedback by team id", () => {
      feedbackRepository.create({
        gameId,
        teamId,
        teamName: "Test Team",
        rating: 5,
        comment: "Awesome!",
      });

      const feedback = feedbackRepository.findByTeamId(teamId);

      expect(feedback).toBeDefined();
      expect(feedback!.teamId).toBe(teamId);
      expect(feedback!.rating).toBe(5);
    });

    it("should return null when no feedback from team", () => {
      const feedback = feedbackRepository.findByTeamId(teamId);
      expect(feedback).toBeNull();
    });
  });

  describe("findByGameAndTeam", () => {
    it("should find feedback by game and team", () => {
      feedbackRepository.create({
        gameId,
        teamId,
        teamName: "Test Team",
        rating: 4,
      });

      const feedback = feedbackRepository.findByGameAndTeam(gameId, teamId);

      expect(feedback).toBeDefined();
      expect(feedback!.gameId).toBe(gameId);
      expect(feedback!.teamId).toBe(teamId);
    });

    it("should return null for wrong game", () => {
      feedbackRepository.create({
        gameId,
        teamId,
        teamName: "Test Team",
        rating: 4,
      });

      const feedback = feedbackRepository.findByGameAndTeam("wrong-game", teamId);
      expect(feedback).toBeNull();
    });
  });

  describe("update", () => {
    it("should update rating", () => {
      const feedback = feedbackRepository.create({
        gameId,
        teamId,
        teamName: "Test Team",
        rating: 3,
      });

      const updated = feedbackRepository.update(feedback.id, { rating: 5 });

      expect(updated).toBeDefined();
      expect(updated!.rating).toBe(5);
    });

    it("should update comment", () => {
      const feedback = feedbackRepository.create({
        gameId,
        teamId,
        teamName: "Test Team",
        rating: 4,
        comment: "Original comment",
      });

      const updated = feedbackRepository.update(feedback.id, {
        comment: "Updated comment",
      });

      expect(updated!.comment).toBe("Updated comment");
    });

    it("should update both rating and comment", () => {
      const feedback = feedbackRepository.create({
        gameId,
        teamId,
        teamName: "Test Team",
        rating: 2,
      });

      const updated = feedbackRepository.update(feedback.id, {
        rating: 5,
        comment: "Changed my mind!",
      });

      expect(updated!.rating).toBe(5);
      expect(updated!.comment).toBe("Changed my mind!");
    });

    it("should return null for non-existent feedback", () => {
      const updated = feedbackRepository.update("non-existent", { rating: 5 });
      expect(updated).toBeNull();
    });
  });

  describe("delete", () => {
    it("should delete existing feedback", () => {
      const feedback = feedbackRepository.create({
        gameId,
        teamId,
        teamName: "Test Team",
        rating: 5,
      });

      const result = feedbackRepository.delete(feedback.id);

      expect(result).toBe(true);
      expect(feedbackRepository.findById(feedback.id)).toBeNull();
    });

    it("should return false for non-existent feedback", () => {
      const result = feedbackRepository.delete("non-existent");
      expect(result).toBe(false);
    });
  });

  describe("deleteByGameId", () => {
    it("should delete all feedback for a game", () => {
      const team2 = teamRepository.create({
        gameId,
        name: "Team 2",
        code: "TEAM02",
      });

      feedbackRepository.create({
        gameId,
        teamId,
        teamName: "Test Team",
        rating: 5,
      });
      feedbackRepository.create({
        gameId,
        teamId: team2.id,
        teamName: "Team 2",
        rating: 4,
      });

      const deleted = feedbackRepository.deleteByGameId(gameId);

      expect(deleted).toBe(2);
      expect(feedbackRepository.findByGameId(gameId)).toEqual([]);
    });
  });

  describe("getAverageRating", () => {
    it("should calculate average rating", () => {
      const team2 = teamRepository.create({
        gameId,
        name: "Team 2",
        code: "TEAM02",
      });
      const team3 = teamRepository.create({
        gameId,
        name: "Team 3",
        code: "TEAM03",
      });

      feedbackRepository.create({
        gameId,
        teamId,
        teamName: "Test Team",
        rating: 5,
      });
      feedbackRepository.create({
        gameId,
        teamId: team2.id,
        teamName: "Team 2",
        rating: 4,
      });
      feedbackRepository.create({
        gameId,
        teamId: team3.id,
        teamName: "Team 3",
        rating: 3,
      });

      const avg = feedbackRepository.getAverageRating(gameId);

      expect(avg).toBe(4); // (5 + 4 + 3) / 3 = 4
    });

    it("should return null when no feedback", () => {
      const avg = feedbackRepository.getAverageRating(gameId);
      expect(avg).toBeNull();
    });
  });

  describe("getCount", () => {
    it("should count feedback", () => {
      const team2 = teamRepository.create({
        gameId,
        name: "Team 2",
        code: "TEAM02",
      });

      feedbackRepository.create({
        gameId,
        teamId,
        teamName: "Test Team",
        rating: 5,
      });
      feedbackRepository.create({
        gameId,
        teamId: team2.id,
        teamName: "Team 2",
        rating: 4,
      });

      const count = feedbackRepository.getCount(gameId);

      expect(count).toBe(2);
    });

    it("should return 0 when no feedback", () => {
      const count = feedbackRepository.getCount(gameId);
      expect(count).toBe(0);
    });
  });
});
