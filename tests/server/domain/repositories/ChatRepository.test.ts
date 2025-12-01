import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { initializeDatabase, closeDatabase, getDatabase } from "@server/db/database.js";
import { chatRepository } from "@server/domain/repositories/ChatRepository.js";
import { gameRepository } from "@server/domain/repositories/GameRepository.js";
import { teamRepository } from "@server/domain/repositories/TeamRepository.js";

describe("ChatRepository", () => {
  let gameId: string;
  let team1Id: string;
  let team2Id: string;

  beforeEach(async () => {
    process.env.DATA_DIR = "./tests/test-data-chat-repo";
    await initializeDatabase();

    // Create a test game
    const game = gameRepository.create({
      name: "Test Chat Game",
      publicSlug: "test-chat-game",
    });
    gameId = game.id;

    // Create test teams
    const team1 = teamRepository.create({ gameId, name: "Team Alpha" });
    const team2 = teamRepository.create({ gameId, name: "Team Beta" });
    team1Id = team1.id;
    team2Id = team2.id;
  });

  afterEach(() => {
    const db = getDatabase();
    db.exec("DELETE FROM chat_messages");
    db.exec("DELETE FROM teams");
    db.exec("DELETE FROM games");
    closeDatabase();
  });

  describe("create", () => {
    it("should create a message from admin to all", () => {
      const message = chatRepository.create({
        gameId,
        senderType: "admin",
        senderId: null,
        senderName: "Admin",
        recipientType: "all",
        recipientId: null,
        message: "Hello everyone!",
      });

      expect(message).toBeDefined();
      expect(message.id).toBeDefined();
      expect(message.gameId).toBe(gameId);
      expect(message.senderType).toBe("admin");
      expect(message.senderId).toBeNull();
      expect(message.senderName).toBe("Admin");
      expect(message.recipientType).toBe("all");
      expect(message.recipientId).toBeNull();
      expect(message.message).toBe("Hello everyone!");
      expect(message.createdAt).toBeDefined();
    });

    it("should create a message from admin to specific team", () => {
      const message = chatRepository.create({
        gameId,
        senderType: "admin",
        senderId: null,
        senderName: "Admin",
        recipientType: "team",
        recipientId: team1Id,
        message: "Private message to Team Alpha",
      });

      expect(message.recipientType).toBe("team");
      expect(message.recipientId).toBe(team1Id);
    });

    it("should create a message from team to all", () => {
      const message = chatRepository.create({
        gameId,
        senderType: "team",
        senderId: team1Id,
        senderName: "Team Alpha",
        recipientType: "all",
        recipientId: null,
        message: "Hello from Team Alpha!",
      });

      expect(message.senderType).toBe("team");
      expect(message.senderId).toBe(team1Id);
      expect(message.senderName).toBe("Team Alpha");
      expect(message.recipientType).toBe("all");
    });
  });

  describe("findById", () => {
    it("should find existing message by id", () => {
      const created = chatRepository.create({
        gameId,
        senderType: "admin",
        senderId: null,
        senderName: "Admin",
        recipientType: "all",
        recipientId: null,
        message: "Find me!",
      });

      const found = chatRepository.findById(created.id);

      expect(found).toBeDefined();
      expect(found!.id).toBe(created.id);
      expect(found!.message).toBe("Find me!");
    });

    it("should return null for non-existent id", () => {
      const found = chatRepository.findById("non-existent");
      expect(found).toBeNull();
    });
  });

  describe("findByGameId", () => {
    it("should return empty array when no messages", () => {
      const messages = chatRepository.findByGameId(gameId);
      expect(messages).toEqual([]);
    });

    it("should return all messages for a game", () => {
      chatRepository.create({
        gameId,
        senderType: "admin",
        senderId: null,
        senderName: "Admin",
        recipientType: "all",
        recipientId: null,
        message: "Message 1",
      });

      chatRepository.create({
        gameId,
        senderType: "team",
        senderId: team1Id,
        senderName: "Team Alpha",
        recipientType: "all",
        recipientId: null,
        message: "Message 2",
      });

      const messages = chatRepository.findByGameId(gameId);

      expect(messages.length).toBe(2);
    });

    it("should return messages in chronological order", () => {
      chatRepository.create({
        gameId,
        senderType: "admin",
        senderId: null,
        senderName: "Admin",
        recipientType: "all",
        recipientId: null,
        message: "First",
      });

      chatRepository.create({
        gameId,
        senderType: "admin",
        senderId: null,
        senderName: "Admin",
        recipientType: "all",
        recipientId: null,
        message: "Second",
      });

      const messages = chatRepository.findByGameId(gameId);

      expect(messages[0].message).toBe("First");
      expect(messages[1].message).toBe("Second");
    });

    it("should respect the limit parameter", () => {
      for (let i = 0; i < 5; i++) {
        chatRepository.create({
          gameId,
          senderType: "admin",
          senderId: null,
          senderName: "Admin",
          recipientType: "all",
          recipientId: null,
          message: `Message ${i}`,
        });
      }

      const messages = chatRepository.findByGameId(gameId, 3);

      expect(messages.length).toBe(3);
    });

    it("should only return messages for specified game", () => {
      const otherGame = gameRepository.create({
        name: "Other Game",
        publicSlug: "other-chat-game",
      });

      chatRepository.create({
        gameId,
        senderType: "admin",
        senderId: null,
        senderName: "Admin",
        recipientType: "all",
        recipientId: null,
        message: "In test game",
      });

      chatRepository.create({
        gameId: otherGame.id,
        senderType: "admin",
        senderId: null,
        senderName: "Admin",
        recipientType: "all",
        recipientId: null,
        message: "In other game",
      });

      const messages = chatRepository.findByGameId(gameId);

      expect(messages.length).toBe(1);
      expect(messages[0].message).toBe("In test game");
    });
  });

  describe("findForTeam", () => {
    it("should return broadcast messages", () => {
      chatRepository.create({
        gameId,
        senderType: "admin",
        senderId: null,
        senderName: "Admin",
        recipientType: "all",
        recipientId: null,
        message: "Broadcast message",
      });

      const messages = chatRepository.findForTeam(gameId, team1Id);

      expect(messages.length).toBe(1);
      expect(messages[0].message).toBe("Broadcast message");
    });

    it("should return private messages sent to the team", () => {
      chatRepository.create({
        gameId,
        senderType: "admin",
        senderId: null,
        senderName: "Admin",
        recipientType: "team",
        recipientId: team1Id,
        message: "Private to Team Alpha",
      });

      const messages = chatRepository.findForTeam(gameId, team1Id);

      expect(messages.length).toBe(1);
      expect(messages[0].message).toBe("Private to Team Alpha");
    });

    it("should return messages sent by the team", () => {
      chatRepository.create({
        gameId,
        senderType: "team",
        senderId: team1Id,
        senderName: "Team Alpha",
        recipientType: "all",
        recipientId: null,
        message: "From Team Alpha",
      });

      const messages = chatRepository.findForTeam(gameId, team1Id);

      expect(messages.length).toBe(1);
      expect(messages[0].message).toBe("From Team Alpha");
    });

    it("should NOT return private messages sent to other teams", () => {
      chatRepository.create({
        gameId,
        senderType: "admin",
        senderId: null,
        senderName: "Admin",
        recipientType: "team",
        recipientId: team2Id,
        message: "Private to Team Beta",
      });

      const messages = chatRepository.findForTeam(gameId, team1Id);

      expect(messages.length).toBe(0);
    });

    it("should return mixed message types correctly", () => {
      // Broadcast message
      chatRepository.create({
        gameId,
        senderType: "admin",
        senderId: null,
        senderName: "Admin",
        recipientType: "all",
        recipientId: null,
        message: "Broadcast",
      });

      // Private to team1
      chatRepository.create({
        gameId,
        senderType: "admin",
        senderId: null,
        senderName: "Admin",
        recipientType: "team",
        recipientId: team1Id,
        message: "Private to Team 1",
      });

      // Private to team2 (should NOT appear)
      chatRepository.create({
        gameId,
        senderType: "admin",
        senderId: null,
        senderName: "Admin",
        recipientType: "team",
        recipientId: team2Id,
        message: "Private to Team 2",
      });

      // Message from team1
      chatRepository.create({
        gameId,
        senderType: "team",
        senderId: team1Id,
        senderName: "Team Alpha",
        recipientType: "all",
        recipientId: null,
        message: "From Team 1",
      });

      const messages = chatRepository.findForTeam(gameId, team1Id);

      expect(messages.length).toBe(3);
      const messageTexts = messages.map((m) => m.message);
      expect(messageTexts).toContain("Broadcast");
      expect(messageTexts).toContain("Private to Team 1");
      expect(messageTexts).toContain("From Team 1");
      expect(messageTexts).not.toContain("Private to Team 2");
    });
  });

  describe("delete", () => {
    it("should delete existing message", () => {
      const message = chatRepository.create({
        gameId,
        senderType: "admin",
        senderId: null,
        senderName: "Admin",
        recipientType: "all",
        recipientId: null,
        message: "Delete me",
      });

      const result = chatRepository.delete(message.id);

      expect(result).toBe(true);
      expect(chatRepository.findById(message.id)).toBeNull();
    });

    it("should return false for non-existent message", () => {
      const result = chatRepository.delete("non-existent");
      expect(result).toBe(false);
    });
  });

  describe("deleteByGameId", () => {
    it("should delete all messages for a game", () => {
      chatRepository.create({
        gameId,
        senderType: "admin",
        senderId: null,
        senderName: "Admin",
        recipientType: "all",
        recipientId: null,
        message: "Message 1",
      });

      chatRepository.create({
        gameId,
        senderType: "team",
        senderId: team1Id,
        senderName: "Team Alpha",
        recipientType: "all",
        recipientId: null,
        message: "Message 2",
      });

      const result = chatRepository.deleteByGameId(gameId);

      expect(result).toBe(true);
      expect(chatRepository.findByGameId(gameId)).toEqual([]);
    });

    it("should return false when no messages to delete", () => {
      const result = chatRepository.deleteByGameId(gameId);
      expect(result).toBe(false);
    });

    it("should only delete messages for specified game", () => {
      const otherGame = gameRepository.create({
        name: "Other Game",
        publicSlug: "other-delete-game",
      });

      chatRepository.create({
        gameId,
        senderType: "admin",
        senderId: null,
        senderName: "Admin",
        recipientType: "all",
        recipientId: null,
        message: "In test game",
      });

      chatRepository.create({
        gameId: otherGame.id,
        senderType: "admin",
        senderId: null,
        senderName: "Admin",
        recipientType: "all",
        recipientId: null,
        message: "In other game",
      });

      chatRepository.deleteByGameId(gameId);

      expect(chatRepository.findByGameId(gameId)).toEqual([]);
      expect(chatRepository.findByGameId(otherGame.id).length).toBe(1);
    });
  });
});
