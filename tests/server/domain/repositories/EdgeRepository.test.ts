import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { initializeDatabase, closeDatabase, getDatabase } from "@server/db/database.js";
import { edgeRepository } from "@server/domain/repositories/EdgeRepository.js";
import { nodeRepository } from "@server/domain/repositories/NodeRepository.js";
import { gameRepository } from "@server/domain/repositories/GameRepository.js";

describe("EdgeRepository", () => {
  let gameId: string;
  let node1Id: string;
  let node2Id: string;
  let node3Id: string;

  beforeEach(async () => {
    process.env.DATA_DIR = "./tests/test-data-edge-repo";
    await initializeDatabase();

    // Create a test game
    const game = gameRepository.create({
      name: "Test Game",
      publicSlug: "test-game-edge",
    });
    gameId = game.id;

    // Create test nodes
    const node1 = nodeRepository.create({ gameId, title: "Node 1", isStart: true });
    const node2 = nodeRepository.create({ gameId, title: "Node 2" });
    const node3 = nodeRepository.create({ gameId, title: "Node 3", isEnd: true });
    node1Id = node1.id;
    node2Id = node2.id;
    node3Id = node3.id;
  });

  afterEach(() => {
    const db = getDatabase();
    db.exec("DELETE FROM edges");
    db.exec("DELETE FROM nodes");
    db.exec("DELETE FROM games");
    closeDatabase();
  });

  describe("create", () => {
    it("should create an edge with default condition", () => {
      const edge = edgeRepository.create({
        gameId,
        fromNodeId: node1Id,
        toNodeId: node2Id,
      });

      expect(edge).toBeDefined();
      expect(edge.id).toBeDefined();
      expect(edge.gameId).toBe(gameId);
      expect(edge.fromNodeId).toBe(node1Id);
      expect(edge.toNodeId).toBe(node2Id);
      expect(edge.condition).toEqual({ type: "always" });
      expect(edge.sortOrder).toBe(0);
    });

    it("should create an edge with custom condition", () => {
      const edge = edgeRepository.create({
        gameId,
        fromNodeId: node1Id,
        toNodeId: node2Id,
        condition: { type: "password", value: "secret" },
      });

      expect(edge.condition).toEqual({ type: "password", value: "secret" });
    });

    it("should create an edge with custom sort order", () => {
      const edge = edgeRepository.create({
        gameId,
        fromNodeId: node1Id,
        toNodeId: node2Id,
        sortOrder: 10,
      });

      expect(edge.sortOrder).toBe(10);
    });
  });

  describe("findById", () => {
    it("should find existing edge by id", () => {
      const created = edgeRepository.create({
        gameId,
        fromNodeId: node1Id,
        toNodeId: node2Id,
      });

      const found = edgeRepository.findById(created.id);

      expect(found).toBeDefined();
      expect(found!.id).toBe(created.id);
    });

    it("should return null for non-existent id", () => {
      const found = edgeRepository.findById("non-existent");
      expect(found).toBeNull();
    });
  });

  describe("findByGameId", () => {
    it("should return empty array when no edges", () => {
      const edges = edgeRepository.findByGameId(gameId);
      expect(edges).toEqual([]);
    });

    it("should return all edges for game", () => {
      edgeRepository.create({ gameId, fromNodeId: node1Id, toNodeId: node2Id });
      edgeRepository.create({ gameId, fromNodeId: node2Id, toNodeId: node3Id });

      const edges = edgeRepository.findByGameId(gameId);

      expect(edges.length).toBe(2);
    });

    it("should return edges ordered by sort order", () => {
      edgeRepository.create({ gameId, fromNodeId: node1Id, toNodeId: node2Id, sortOrder: 2 });
      edgeRepository.create({ gameId, fromNodeId: node2Id, toNodeId: node3Id, sortOrder: 1 });

      const edges = edgeRepository.findByGameId(gameId);

      expect(edges[0].sortOrder).toBe(1);
      expect(edges[1].sortOrder).toBe(2);
    });

    it("should only return edges for specified game", () => {
      edgeRepository.create({ gameId, fromNodeId: node1Id, toNodeId: node2Id });

      const otherGame = gameRepository.create({
        name: "Other",
        publicSlug: "other-game-edge",
      });
      const otherNode1 = nodeRepository.create({ gameId: otherGame.id, title: "Other 1" });
      const otherNode2 = nodeRepository.create({ gameId: otherGame.id, title: "Other 2" });
      edgeRepository.create({ gameId: otherGame.id, fromNodeId: otherNode1.id, toNodeId: otherNode2.id });

      const edges = edgeRepository.findByGameId(gameId);

      expect(edges.length).toBe(1);
    });
  });

  describe("findOutgoingEdges", () => {
    it("should return edges leaving a node", () => {
      edgeRepository.create({ gameId, fromNodeId: node1Id, toNodeId: node2Id });
      edgeRepository.create({ gameId, fromNodeId: node1Id, toNodeId: node3Id });
      edgeRepository.create({ gameId, fromNodeId: node2Id, toNodeId: node3Id });

      const outgoing = edgeRepository.findOutgoingEdges(node1Id);

      expect(outgoing.length).toBe(2);
      expect(outgoing.every(e => e.fromNodeId === node1Id)).toBe(true);
    });

    it("should return empty array when no outgoing edges", () => {
      edgeRepository.create({ gameId, fromNodeId: node1Id, toNodeId: node3Id });

      const outgoing = edgeRepository.findOutgoingEdges(node3Id);
      expect(outgoing).toEqual([]);
    });

    it("should return edges ordered by sort order", () => {
      edgeRepository.create({ gameId, fromNodeId: node1Id, toNodeId: node2Id, sortOrder: 5 });
      edgeRepository.create({ gameId, fromNodeId: node1Id, toNodeId: node3Id, sortOrder: 1 });

      const outgoing = edgeRepository.findOutgoingEdges(node1Id);

      expect(outgoing[0].toNodeId).toBe(node3Id);
      expect(outgoing[1].toNodeId).toBe(node2Id);
    });
  });

  describe("findIncomingEdges", () => {
    it("should return edges entering a node", () => {
      edgeRepository.create({ gameId, fromNodeId: node1Id, toNodeId: node3Id });
      edgeRepository.create({ gameId, fromNodeId: node2Id, toNodeId: node3Id });

      const incoming = edgeRepository.findIncomingEdges(node3Id);

      expect(incoming.length).toBe(2);
      expect(incoming.every(e => e.toNodeId === node3Id)).toBe(true);
    });

    it("should return empty array when no incoming edges", () => {
      edgeRepository.create({ gameId, fromNodeId: node1Id, toNodeId: node2Id });

      const incoming = edgeRepository.findIncomingEdges(node1Id);
      expect(incoming).toEqual([]);
    });
  });

  describe("update", () => {
    it("should update from node", () => {
      const edge = edgeRepository.create({
        gameId,
        fromNodeId: node1Id,
        toNodeId: node3Id,
      });

      const updated = edgeRepository.update(edge.id, { fromNodeId: node2Id });

      expect(updated).toBeDefined();
      expect(updated!.fromNodeId).toBe(node2Id);
    });

    it("should update to node", () => {
      const edge = edgeRepository.create({
        gameId,
        fromNodeId: node1Id,
        toNodeId: node2Id,
      });

      const updated = edgeRepository.update(edge.id, { toNodeId: node3Id });

      expect(updated!.toNodeId).toBe(node3Id);
    });

    it("should update condition", () => {
      const edge = edgeRepository.create({
        gameId,
        fromNodeId: node1Id,
        toNodeId: node2Id,
      });

      const updated = edgeRepository.update(edge.id, {
        condition: { type: "password", value: "secret123" },
      });

      expect(updated!.condition).toEqual({ type: "password", value: "secret123" });
    });

    it("should update sort order", () => {
      const edge = edgeRepository.create({
        gameId,
        fromNodeId: node1Id,
        toNodeId: node2Id,
        sortOrder: 1,
      });

      const updated = edgeRepository.update(edge.id, { sortOrder: 10 });

      expect(updated!.sortOrder).toBe(10);
    });

    it("should return null for non-existent edge", () => {
      const updated = edgeRepository.update("non-existent", { sortOrder: 5 });
      expect(updated).toBeNull();
    });
  });

  describe("delete", () => {
    it("should delete existing edge", () => {
      const edge = edgeRepository.create({
        gameId,
        fromNodeId: node1Id,
        toNodeId: node2Id,
      });

      const result = edgeRepository.delete(edge.id);

      expect(result).toBe(true);
      expect(edgeRepository.findById(edge.id)).toBeNull();
    });

    it("should return false for non-existent edge", () => {
      const result = edgeRepository.delete("non-existent");
      expect(result).toBe(false);
    });
  });

  describe("deleteByGameId", () => {
    it("should delete all edges for a game", () => {
      edgeRepository.create({ gameId, fromNodeId: node1Id, toNodeId: node2Id });
      edgeRepository.create({ gameId, fromNodeId: node2Id, toNodeId: node3Id });

      const count = edgeRepository.deleteByGameId(gameId);

      expect(count).toBe(2);
      expect(edgeRepository.findByGameId(gameId)).toEqual([]);
    });

    it("should return 0 when no edges to delete", () => {
      const count = edgeRepository.deleteByGameId(gameId);
      expect(count).toBe(0);
    });

    it("should only delete edges for specified game", () => {
      edgeRepository.create({ gameId, fromNodeId: node1Id, toNodeId: node2Id });

      const otherGame = gameRepository.create({
        name: "Other Delete",
        publicSlug: "other-game-delete",
      });
      const otherNode1 = nodeRepository.create({ gameId: otherGame.id, title: "Other 1" });
      const otherNode2 = nodeRepository.create({ gameId: otherGame.id, title: "Other 2" });
      edgeRepository.create({ gameId: otherGame.id, fromNodeId: otherNode1.id, toNodeId: otherNode2.id });

      edgeRepository.deleteByGameId(gameId);

      expect(edgeRepository.findByGameId(otherGame.id).length).toBe(1);
    });
  });
});
