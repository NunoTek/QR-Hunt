import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { requireAdminAuth } from "../middleware.js";
import { gameService } from "../../domain/services/GameService.js";
import { authService } from "../../domain/services/AuthService.js";
import { gameRepository } from "../../domain/repositories/GameRepository.js";
import { teamRepository } from "../../domain/repositories/TeamRepository.js";
import { nodeRepository } from "../../domain/repositories/NodeRepository.js";
import { edgeRepository } from "../../domain/repositories/EdgeRepository.js";
import {
  createGameSchema,
  updateGameSchema,
  createNodeSchema,
  updateNodeSchema,
  createEdgeSchema,
  updateEdgeSchema,
  createTeamSchema,
  updateTeamSchema,
} from "../schemas.js";

export async function adminRoutes(fastify: FastifyInstance) {
  // Add auth hook for all routes in this scope
  fastify.addHook("preHandler", requireAdminAuth);

  // ==================== GAMES ====================

  // List all games
  fastify.get("/games", async (_request: FastifyRequest, reply: FastifyReply) => {
    const games = gameRepository.findAll();
    return reply.send({ games });
  });

  // Create game
  fastify.post(
    "/games",
    async (
      request: FastifyRequest<{
        Body: {
          name: string;
          publicSlug: string;
          settings?: Record<string, unknown>;
        };
      }>,
      reply: FastifyReply
    ) => {
      const parseResult = createGameSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: "Invalid request",
          details: parseResult.error.flatten(),
        });
      }

      try {
        const game = gameService.createGame(parseResult.data);
        return reply.status(201).send({ game });
      } catch (error) {
        return reply.status(400).send({
          error: error instanceof Error ? error.message : "Failed to create game",
        });
      }
    }
  );

  // Get game
  fastify.get(
    "/games/:id",
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const game = gameRepository.findById(request.params.id);
      if (!game) {
        return reply.status(404).send({ error: "Game not found" });
      }
      return reply.send({ game });
    }
  );

  // Update game
  fastify.patch(
    "/games/:id",
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: Record<string, unknown>;
      }>,
      reply: FastifyReply
    ) => {
      const parseResult = updateGameSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: "Invalid request",
          details: parseResult.error.flatten(),
        });
      }

      try {
        const updateData: Parameters<typeof gameService.updateGame>[1] = {};
        if (parseResult.data.name) updateData.name = parseResult.data.name;
        if (parseResult.data.publicSlug) updateData.publicSlug = parseResult.data.publicSlug;
        if (parseResult.data.status) updateData.status = parseResult.data.status;
        if (parseResult.data.logoUrl !== undefined) updateData.logoUrl = parseResult.data.logoUrl;
        if (parseResult.data.settings) {
          updateData.settings = {
            rankingMode: parseResult.data.settings.rankingMode || "points",
            basePoints: parseResult.data.settings.basePoints || 100,
            timeBonusEnabled: parseResult.data.settings.timeBonusEnabled ?? true,
            timeBonusMultiplier: parseResult.data.settings.timeBonusMultiplier || 1.5,
          };
        }

        const game = gameService.updateGame(request.params.id, updateData);
        if (!game) {
          return reply.status(404).send({ error: "Game not found" });
        }
        return reply.send({ game });
      } catch (error) {
        return reply.status(400).send({
          error: error instanceof Error ? error.message : "Failed to update game",
        });
      }
    }
  );

  // Activate game
  fastify.post(
    "/games/:id/activate",
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const game = gameService.activateGame(request.params.id);
        if (!game) {
          return reply.status(404).send({ error: "Game not found" });
        }
        return reply.send({ game });
      } catch (error) {
        return reply.status(400).send({
          error: error instanceof Error ? error.message : "Failed to activate game",
        });
      }
    }
  );

  // Complete game
  fastify.post(
    "/games/:id/complete",
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const game = gameService.completeGame(request.params.id);
      if (!game) {
        return reply.status(404).send({ error: "Game not found" });
      }
      return reply.send({ game });
    }
  );

  // Delete game
  fastify.delete(
    "/games/:id",
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const deleted = gameService.deleteGame(request.params.id);
      if (!deleted) {
        return reply.status(404).send({ error: "Game not found" });
      }
      return reply.send({ success: true });
    }
  );

  // Get game status
  fastify.get(
    "/games/:id/status",
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const status = gameService.getGameStatus(request.params.id);
      if (!status) {
        return reply.status(404).send({ error: "Game not found" });
      }

      const leaderboard = gameService.getLeaderboard(request.params.id);

      return reply.send({
        ...status,
        leaderboard,
      });
    }
  );

  // ==================== NODES ====================

  // List nodes for a game
  fastify.get(
    "/games/:gameId/nodes",
    async (
      request: FastifyRequest<{ Params: { gameId: string } }>,
      reply: FastifyReply
    ) => {
      const nodes = nodeRepository.findByGameId(request.params.gameId);
      return reply.send({ nodes });
    }
  );

  // Create node
  fastify.post(
    "/nodes",
    async (
      request: FastifyRequest<{
        Body: {
          gameId: string;
          title: string;
          nodeKey?: string;
          content?: string;
          contentType?: string;
          mediaUrl?: string;
          passwordRequired?: boolean;
          password?: string;
          isStart?: boolean;
          isEnd?: boolean;
          points?: number;
          metadata?: Record<string, unknown>;
        };
      }>,
      reply: FastifyReply
    ) => {
      const parseResult = createNodeSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: "Invalid request",
          details: parseResult.error.flatten(),
        });
      }

      const data = parseResult.data;
      let passwordHash: string | undefined;

      if (data.passwordRequired && data.password) {
        passwordHash = authService.hashPassword(data.password);
      }

      const node = nodeRepository.create({
        ...data,
        passwordHash,
      });

      return reply.status(201).send({ node });
    }
  );

  // Get node
  fastify.get(
    "/nodes/:id",
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const node = nodeRepository.findById(request.params.id);
      if (!node) {
        return reply.status(404).send({ error: "Node not found" });
      }
      return reply.send({ node });
    }
  );

  // Update node
  fastify.patch(
    "/nodes/:id",
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: Record<string, unknown>;
      }>,
      reply: FastifyReply
    ) => {
      const parseResult = updateNodeSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: "Invalid request",
          details: parseResult.error.flatten(),
        });
      }

      const data = parseResult.data;
      let passwordHash: string | null | undefined;

      if (data.password !== undefined) {
        passwordHash = data.password
          ? authService.hashPassword(data.password)
          : null;
      }

      const updateData = {
        ...data,
        passwordHash,
      };
      delete (updateData as Record<string, unknown>).password;

      const node = nodeRepository.update(request.params.id, updateData);
      if (!node) {
        return reply.status(404).send({ error: "Node not found" });
      }
      return reply.send({ node });
    }
  );

  // Delete node
  fastify.delete(
    "/nodes/:id",
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const deleted = nodeRepository.delete(request.params.id);
      if (!deleted) {
        return reply.status(404).send({ error: "Node not found" });
      }
      return reply.send({ success: true });
    }
  );

  // ==================== EDGES ====================

  // List edges for a game
  fastify.get(
    "/games/:gameId/edges",
    async (
      request: FastifyRequest<{ Params: { gameId: string } }>,
      reply: FastifyReply
    ) => {
      const edges = edgeRepository.findByGameId(request.params.gameId);
      return reply.send({ edges });
    }
  );

  // Create edge
  fastify.post(
    "/edges",
    async (
      request: FastifyRequest<{
        Body: {
          gameId: string;
          fromNodeId: string;
          toNodeId: string;
          condition?: Record<string, unknown>;
          sortOrder?: number;
        };
      }>,
      reply: FastifyReply
    ) => {
      const parseResult = createEdgeSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: "Invalid request",
          details: parseResult.error.flatten(),
        });
      }

      const edge = edgeRepository.create(parseResult.data);
      return reply.status(201).send({ edge });
    }
  );

  // Delete edge
  fastify.delete(
    "/edges/:id",
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const deleted = edgeRepository.delete(request.params.id);
      if (!deleted) {
        return reply.status(404).send({ error: "Edge not found" });
      }
      return reply.send({ success: true });
    }
  );

  // ==================== TEAMS ====================

  // List teams for a game
  fastify.get(
    "/games/:gameId/teams",
    async (
      request: FastifyRequest<{ Params: { gameId: string } }>,
      reply: FastifyReply
    ) => {
      const teams = teamRepository.findByGameId(request.params.gameId);
      return reply.send({ teams });
    }
  );

  // Create team
  fastify.post(
    "/teams",
    async (
      request: FastifyRequest<{
        Body: {
          gameId: string;
          name: string;
          code?: string;
          startNodeId?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const parseResult = createTeamSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: "Invalid request",
          details: parseResult.error.flatten(),
        });
      }

      const { gameId, name, code, startNodeId, logoUrl } = parseResult.data;

      // Auto-assign start node if not specified
      let assignedStartNodeId = startNodeId;
      if (!assignedStartNodeId) {
        const startNodes = nodeRepository.findStartNodes(gameId);
        if (startNodes.length > 0) {
          // Get existing teams and their start node assignments
          const existingTeams = teamRepository.findByGameId(gameId);
          const startNodeUsage = new Map<string, number>();

          // Initialize usage count for each start node
          for (const node of startNodes) {
            startNodeUsage.set(node.id, 0);
          }

          // Count how many teams are assigned to each start node
          for (const team of existingTeams) {
            if (team.startNodeId && startNodeUsage.has(team.startNodeId)) {
              startNodeUsage.set(team.startNodeId, startNodeUsage.get(team.startNodeId)! + 1);
            }
          }

          // Find the start node with the least usage
          let minUsage = Infinity;
          let leastUsedNodeId = startNodes[0].id;
          for (const [nodeId, usage] of startNodeUsage) {
            if (usage < minUsage) {
              minUsage = usage;
              leastUsedNodeId = nodeId;
            }
          }

          assignedStartNodeId = leastUsedNodeId;
        }
      }

      const team = teamRepository.create({
        gameId,
        name,
        code,
        startNodeId: assignedStartNodeId,
        logoUrl,
      });
      return reply.status(201).send({ team });
    }
  );

  // Update team
  fastify.patch(
    "/teams/:id",
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: Record<string, unknown>;
      }>,
      reply: FastifyReply
    ) => {
      const parseResult = updateTeamSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: "Invalid request",
          details: parseResult.error.flatten(),
        });
      }

      const team = teamRepository.update(request.params.id, parseResult.data);
      if (!team) {
        return reply.status(404).send({ error: "Team not found" });
      }
      return reply.send({ team });
    }
  );

  // Delete team
  fastify.delete(
    "/teams/:id",
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const deleted = teamRepository.delete(request.params.id);
      if (!deleted) {
        return reply.status(404).send({ error: "Team not found" });
      }
      return reply.send({ success: true });
    }
  );

  // Generate QR codes for game
  fastify.get(
    "/games/:gameId/qrcodes",
    async (
      request: FastifyRequest<{
        Params: { gameId: string };
        Querystring: { baseUrl?: string };
      }>,
      reply: FastifyReply
    ) => {
      const game = gameRepository.findById(request.params.gameId);
      if (!game) {
        return reply.status(404).send({ error: "Game not found" });
      }

      const nodes = nodeRepository.findByGameId(request.params.gameId);
      const baseUrl = (request.query as { baseUrl?: string }).baseUrl || "http://localhost:3000";

      const qrCodes = nodes.map((node) => ({
        nodeId: node.id,
        nodeKey: node.nodeKey,
        title: node.title,
        isStart: node.isStart,
        isEnd: node.isEnd,
        url: `${baseUrl}/g/${game.publicSlug}/n/${node.nodeKey}`,
      }));

      return reply.send({ qrCodes });
    }
  );
}
