import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { initializeDatabase, closeDatabase, getDatabase } from "@server/db/database.js";
import { gameRepository } from "@server/domain/repositories/GameRepository.js";
import { teamRepository } from "@server/domain/repositories/TeamRepository.js";
import { chatRepository } from "@server/domain/repositories/ChatRepository.js";
import { authService } from "@server/domain/services/AuthService.js";

describe("Chat API", () => {
  let gameId: string;
  let gameSlug: string;
  let team1Id: string;
  let team2Id: string;
  let team1Code: string;

  beforeEach(async () => {
    process.env.DATA_DIR = "./tests/test-data-chat-api";
    await initializeDatabase();

    // Create test game
    const game = gameRepository.create({
      name: "Chat Test Game",
      publicSlug: "chat-test-game",
    });
    gameId = game.id;
    gameSlug = game.publicSlug;
    gameRepository.update(gameId, { status: "active" });

    // Create test teams
    const team1 = teamRepository.create({ gameId, name: "Team Alpha", code: "ALPHA1" });
    const team2 = teamRepository.create({ gameId, name: "Team Beta", code: "BETA01" });
    team1Id = team1.id;
    team2Id = team2.id;
    team1Code = team1.code;
  });

  afterEach(() => {
    const db = getDatabase();
    db.exec("DELETE FROM chat_messages");
    db.exec("DELETE FROM team_sessions");
    db.exec("DELETE FROM teams");
    db.exec("DELETE FROM games");
    closeDatabase();
  });

  describe("Admin chat operations", () => {
    describe("send message", () => {
      it("should create a broadcast message from admin", () => {
        const message = chatRepository.create({
          gameId,
          senderType: "admin",
          senderId: null,
          senderName: "Admin",
          recipientType: "all",
          recipientId: null,
          message: "Hello everyone!",
        });

        expect(message.senderType).toBe("admin");
        expect(message.recipientType).toBe("all");
        expect(message.message).toBe("Hello everyone!");
      });

      it("should create a private message to specific team", () => {
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
    });

    describe("get messages", () => {
      it("should retrieve all messages for a game", () => {
        chatRepository.create({
          gameId,
          senderType: "admin",
          senderId: null,
          senderName: "Admin",
          recipientType: "all",
          recipientId: null,
          message: "Broadcast",
        });

        chatRepository.create({
          gameId,
          senderType: "admin",
          senderId: null,
          senderName: "Admin",
          recipientType: "team",
          recipientId: team1Id,
          message: "Private",
        });

        const messages = chatRepository.findByGameId(gameId);

        expect(messages.length).toBe(2);
      });
    });

    describe("delete message", () => {
      it("should delete a specific message", () => {
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
        const result = chatRepository.delete("non-existent-id");
        expect(result).toBe(false);
      });
    });
  });

  describe("Team chat operations", () => {
    describe("send message", () => {
      it("should allow team to send broadcast message", () => {
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
        expect(message.recipientType).toBe("all");
      });
    });

    describe("get messages", () => {
      it("should only see broadcast messages", () => {
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

      it("should see private messages sent to them", () => {
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

      it("should NOT see private messages sent to other teams", () => {
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

      it("should see their own messages", () => {
        chatRepository.create({
          gameId,
          senderType: "team",
          senderId: team1Id,
          senderName: "Team Alpha",
          recipientType: "all",
          recipientId: null,
          message: "My own message",
        });

        const messages = chatRepository.findForTeam(gameId, team1Id);

        expect(messages.length).toBe(1);
        expect(messages[0].message).toBe("My own message");
      });
    });
  });

  describe("Message visibility rules", () => {
    it("admin sees all messages including private ones to any team", () => {
      // Broadcast
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

      // Private to team2
      chatRepository.create({
        gameId,
        senderType: "admin",
        senderId: null,
        senderName: "Admin",
        recipientType: "team",
        recipientId: team2Id,
        message: "Private to Team 2",
      });

      // Team message
      chatRepository.create({
        gameId,
        senderType: "team",
        senderId: team1Id,
        senderName: "Team Alpha",
        recipientType: "all",
        recipientId: null,
        message: "From Team Alpha",
      });

      const adminMessages = chatRepository.findByGameId(gameId);

      expect(adminMessages.length).toBe(4);
    });

    it("team1 only sees broadcast, their private messages, and their own messages", () => {
      // Broadcast
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

      // Private to team2 (should NOT be visible to team1)
      chatRepository.create({
        gameId,
        senderType: "admin",
        senderId: null,
        senderName: "Admin",
        recipientType: "team",
        recipientId: team2Id,
        message: "Private to Team 2",
      });

      // Team1's own message
      chatRepository.create({
        gameId,
        senderType: "team",
        senderId: team1Id,
        senderName: "Team Alpha",
        recipientType: "all",
        recipientId: null,
        message: "From Team Alpha",
      });

      const team1Messages = chatRepository.findForTeam(gameId, team1Id);

      expect(team1Messages.length).toBe(3);
      const messageTexts = team1Messages.map((m) => m.message);
      expect(messageTexts).toContain("Broadcast");
      expect(messageTexts).toContain("Private to Team 1");
      expect(messageTexts).toContain("From Team Alpha");
      expect(messageTexts).not.toContain("Private to Team 2");
    });

    it("team2 only sees broadcast, their private messages, and their own messages", () => {
      // Broadcast
      chatRepository.create({
        gameId,
        senderType: "admin",
        senderId: null,
        senderName: "Admin",
        recipientType: "all",
        recipientId: null,
        message: "Broadcast",
      });

      // Private to team1 (should NOT be visible to team2)
      chatRepository.create({
        gameId,
        senderType: "admin",
        senderId: null,
        senderName: "Admin",
        recipientType: "team",
        recipientId: team1Id,
        message: "Private to Team 1",
      });

      // Private to team2
      chatRepository.create({
        gameId,
        senderType: "admin",
        senderId: null,
        senderName: "Admin",
        recipientType: "team",
        recipientId: team2Id,
        message: "Private to Team 2",
      });

      const team2Messages = chatRepository.findForTeam(gameId, team2Id);

      expect(team2Messages.length).toBe(2);
      const messageTexts = team2Messages.map((m) => m.message);
      expect(messageTexts).toContain("Broadcast");
      expect(messageTexts).toContain("Private to Team 2");
      expect(messageTexts).not.toContain("Private to Team 1");
    });
  });

  describe("Authentication integration", () => {
    it("team can authenticate and would be able to chat", () => {
      const result = authService.joinGame(gameSlug, team1Code);

      expect(result.success).toBe(true);
      expect(result.team).toBeDefined();
      expect(result.team!.id).toBe(team1Id);
      expect(result.session).toBeDefined();
    });
  });

  describe("Message ordering", () => {
    it("messages should be returned in chronological order", () => {
      chatRepository.create({
        gameId,
        senderType: "admin",
        senderId: null,
        senderName: "Admin",
        recipientType: "all",
        recipientId: null,
        message: "First message",
      });

      chatRepository.create({
        gameId,
        senderType: "team",
        senderId: team1Id,
        senderName: "Team Alpha",
        recipientType: "all",
        recipientId: null,
        message: "Second message",
      });

      chatRepository.create({
        gameId,
        senderType: "admin",
        senderId: null,
        senderName: "Admin",
        recipientType: "all",
        recipientId: null,
        message: "Third message",
      });

      const messages = chatRepository.findByGameId(gameId);

      expect(messages[0].message).toBe("First message");
      expect(messages[1].message).toBe("Second message");
      expect(messages[2].message).toBe("Third message");
    });
  });
});
