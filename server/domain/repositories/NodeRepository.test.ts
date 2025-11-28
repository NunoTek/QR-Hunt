import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { initializeDatabase, closeDatabase, getDatabase } from "../../db/database.js";
import { nodeRepository } from "./NodeRepository.js";
import { gameRepository } from "./GameRepository.js";

describe("NodeRepository", () => {
  let gameId: string;

  beforeEach(async () => {
    process.env.DATA_DIR = "./tests/test-data-node-repo";
    await initializeDatabase();

    // Create a test game
    const game = gameRepository.create({
      name: "Test Game",
      publicSlug: "test-game-node",
    });
    gameId = game.id;
  });

  afterEach(() => {
    const db = getDatabase();
    db.exec("DELETE FROM nodes");
    db.exec("DELETE FROM games");
    closeDatabase();
  });

  describe("create", () => {
    it("should create a node with default values", () => {
      const node = nodeRepository.create({
        gameId,
        title: "Test Node",
      });

      expect(node).toBeDefined();
      expect(node.id).toBeDefined();
      expect(node.gameId).toBe(gameId);
      expect(node.title).toBe("Test Node");
      expect(node.nodeKey).toMatch(/^[A-Za-z0-9_-]{10}$/);
      expect(node.content).toBeNull();
      expect(node.contentType).toBe("text");
      expect(node.mediaUrl).toBeNull();
      expect(node.passwordRequired).toBe(false);
      expect(node.passwordHash).toBeNull();
      expect(node.isStart).toBe(false);
      expect(node.isEnd).toBe(false);
      expect(node.points).toBe(100);
      expect(node.metadata).toEqual({});
    });

    it("should create a start node", () => {
      const node = nodeRepository.create({
        gameId,
        title: "Start Node",
        isStart: true,
      });

      expect(node.isStart).toBe(true);
      expect(node.isEnd).toBe(false);
    });

    it("should create an end node", () => {
      const node = nodeRepository.create({
        gameId,
        title: "End Node",
        isEnd: true,
      });

      expect(node.isStart).toBe(false);
      expect(node.isEnd).toBe(true);
    });

    it("should create a node with custom content", () => {
      const node = nodeRepository.create({
        gameId,
        title: "Content Node",
        content: "Look for the hidden clue!",
        contentType: "text",
      });

      expect(node.content).toBe("Look for the hidden clue!");
      expect(node.contentType).toBe("text");
    });

    it("should create a node with password protection", () => {
      const node = nodeRepository.create({
        gameId,
        title: "Protected Node",
        passwordRequired: true,
        passwordHash: "hashed-password-123",
      });

      expect(node.passwordRequired).toBe(true);
      expect(node.passwordHash).toBe("hashed-password-123");
    });

    it("should create a node with media", () => {
      const node = nodeRepository.create({
        gameId,
        title: "Media Node",
        contentType: "image",
        mediaUrl: "https://example.com/image.jpg",
      });

      expect(node.contentType).toBe("image");
      expect(node.mediaUrl).toBe("https://example.com/image.jpg");
    });

    it("should create a node with custom points", () => {
      const node = nodeRepository.create({
        gameId,
        title: "High Value Node",
        points: 500,
      });

      expect(node.points).toBe(500);
    });

    it("should create a node with metadata", () => {
      const node = nodeRepository.create({
        gameId,
        title: "Meta Node",
        metadata: { hint: "near the fountain", difficulty: "hard" },
      });

      expect(node.metadata).toEqual({ hint: "near the fountain", difficulty: "hard" });
    });

    it("should allow custom node key", () => {
      const node = nodeRepository.create({
        gameId,
        title: "Custom Key",
        nodeKey: "MYKEY12345",
      });

      expect(node.nodeKey).toBe("MYKEY12345");
    });

    it("should create a node with admin comment", () => {
      const node = nodeRepository.create({
        gameId,
        title: "Commented Node",
        adminComment: "This is an internal note for admins",
      });

      expect(node.adminComment).toBe("This is an internal note for admins");
    });

    it("should create a node with null admin comment by default", () => {
      const node = nodeRepository.create({
        gameId,
        title: "No Comment Node",
      });

      expect(node.adminComment).toBeNull();
    });
  });

  describe("findById", () => {
    it("should find existing node by id", () => {
      const created = nodeRepository.create({
        gameId,
        title: "Find Me",
      });

      const found = nodeRepository.findById(created.id);

      expect(found).toBeDefined();
      expect(found!.id).toBe(created.id);
      expect(found!.title).toBe("Find Me");
    });

    it("should return null for non-existent id", () => {
      const found = nodeRepository.findById("non-existent");
      expect(found).toBeNull();
    });
  });

  describe("findByNodeKey", () => {
    it("should find node by game and node key", () => {
      const node = nodeRepository.create({
        gameId,
        title: "Key Node",
        nodeKey: "TESTKEY123",
      });

      const found = nodeRepository.findByNodeKey(gameId, "TESTKEY123");

      expect(found).toBeDefined();
      expect(found!.id).toBe(node.id);
    });

    it("should return null for wrong game", () => {
      nodeRepository.create({
        gameId,
        title: "Wrong Game Node",
        nodeKey: "WRONGKEY",
      });

      const found = nodeRepository.findByNodeKey("different-game", "WRONGKEY");
      expect(found).toBeNull();
    });

    it("should return null for non-existent key", () => {
      const found = nodeRepository.findByNodeKey(gameId, "NOTEXIST");
      expect(found).toBeNull();
    });
  });

  describe("findByGameId", () => {
    it("should return empty array when no nodes", () => {
      const nodes = nodeRepository.findByGameId(gameId);
      expect(nodes).toEqual([]);
    });

    it("should return all nodes for game", () => {
      nodeRepository.create({ gameId, title: "Node 1" });
      nodeRepository.create({ gameId, title: "Node 2" });
      nodeRepository.create({ gameId, title: "Node 3" });

      const nodes = nodeRepository.findByGameId(gameId);

      expect(nodes.length).toBe(3);
    });

    it("should only return nodes for specified game", () => {
      nodeRepository.create({ gameId, title: "Right Game" });

      const otherGame = gameRepository.create({
        name: "Other",
        publicSlug: "other-game-node",
      });
      nodeRepository.create({ gameId: otherGame.id, title: "Other Game Node" });

      const nodes = nodeRepository.findByGameId(gameId);

      expect(nodes.length).toBe(1);
      expect(nodes[0].title).toBe("Right Game");
    });
  });

  describe("findStartNodes", () => {
    it("should return only start nodes", () => {
      nodeRepository.create({ gameId, title: "Start 1", isStart: true });
      nodeRepository.create({ gameId, title: "Start 2", isStart: true });
      nodeRepository.create({ gameId, title: "Middle", isStart: false });
      nodeRepository.create({ gameId, title: "End", isEnd: true });

      const startNodes = nodeRepository.findStartNodes(gameId);

      expect(startNodes.length).toBe(2);
      expect(startNodes.every(n => n.isStart)).toBe(true);
    });

    it("should return empty array when no start nodes", () => {
      nodeRepository.create({ gameId, title: "Regular" });

      const startNodes = nodeRepository.findStartNodes(gameId);
      expect(startNodes).toEqual([]);
    });
  });

  describe("findEndNodes", () => {
    it("should return only end nodes", () => {
      nodeRepository.create({ gameId, title: "Start", isStart: true });
      nodeRepository.create({ gameId, title: "Middle" });
      nodeRepository.create({ gameId, title: "End 1", isEnd: true });
      nodeRepository.create({ gameId, title: "End 2", isEnd: true });

      const endNodes = nodeRepository.findEndNodes(gameId);

      expect(endNodes.length).toBe(2);
      expect(endNodes.every(n => n.isEnd)).toBe(true);
    });

    it("should return empty array when no end nodes", () => {
      nodeRepository.create({ gameId, title: "Regular" });

      const endNodes = nodeRepository.findEndNodes(gameId);
      expect(endNodes).toEqual([]);
    });
  });

  describe("update", () => {
    it("should update node title", () => {
      const node = nodeRepository.create({
        gameId,
        title: "Original",
      });

      const updated = nodeRepository.update(node.id, { title: "Updated" });

      expect(updated).toBeDefined();
      expect(updated!.title).toBe("Updated");
    });

    it("should update node content", () => {
      const node = nodeRepository.create({
        gameId,
        title: "Content Test",
      });

      const updated = nodeRepository.update(node.id, {
        content: "New clue text",
        contentType: "link",
      });

      expect(updated!.content).toBe("New clue text");
      expect(updated!.contentType).toBe("link");
    });

    it("should update node points", () => {
      const node = nodeRepository.create({
        gameId,
        title: "Points Test",
        points: 100,
      });

      const updated = nodeRepository.update(node.id, { points: 250 });

      expect(updated!.points).toBe(250);
    });

    it("should update password settings", () => {
      const node = nodeRepository.create({
        gameId,
        title: "Password Test",
      });

      const updated = nodeRepository.update(node.id, {
        passwordRequired: true,
        passwordHash: "new-hash",
      });

      expect(updated!.passwordRequired).toBe(true);
      expect(updated!.passwordHash).toBe("new-hash");
    });

    it("should update start/end flags", () => {
      const node = nodeRepository.create({
        gameId,
        title: "Flag Test",
      });

      const updated = nodeRepository.update(node.id, {
        isStart: true,
        isEnd: false,
      });

      expect(updated!.isStart).toBe(true);
      expect(updated!.isEnd).toBe(false);
    });

    it("should update metadata", () => {
      const node = nodeRepository.create({
        gameId,
        title: "Meta Test",
        metadata: { old: true },
      });

      const updated = nodeRepository.update(node.id, {
        metadata: { new: true, hint: "updated" },
      });

      expect(updated!.metadata).toEqual({ new: true, hint: "updated" });
    });

    it("should allow setting content to null", () => {
      const node = nodeRepository.create({
        gameId,
        title: "Null Content",
        content: "Some content",
      });

      const updated = nodeRepository.update(node.id, { content: null });

      expect(updated!.content).toBeNull();
    });

    it("should update admin comment", () => {
      const node = nodeRepository.create({
        gameId,
        title: "Admin Comment Test",
      });

      const updated = nodeRepository.update(node.id, {
        adminComment: "New admin note",
      });

      expect(updated!.adminComment).toBe("New admin note");
    });

    it("should allow setting admin comment to null", () => {
      const node = nodeRepository.create({
        gameId,
        title: "Clear Comment",
        adminComment: "Old comment",
      });

      const updated = nodeRepository.update(node.id, { adminComment: null });

      expect(updated!.adminComment).toBeNull();
    });

    it("should return null for non-existent node", () => {
      const updated = nodeRepository.update("non-existent", { title: "Updated" });
      expect(updated).toBeNull();
    });
  });

  describe("delete", () => {
    it("should delete existing node", () => {
      const node = nodeRepository.create({
        gameId,
        title: "Delete Me",
      });

      const result = nodeRepository.delete(node.id);

      expect(result).toBe(true);
      expect(nodeRepository.findById(node.id)).toBeNull();
    });

    it("should return false for non-existent node", () => {
      const result = nodeRepository.delete("non-existent");
      expect(result).toBe(false);
    });
  });
});
