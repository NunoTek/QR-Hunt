import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { requireAdminAuth } from "../middleware.js";
import { gameService } from "../../domain/services/GameService.js";
import { authService } from "../../domain/services/AuthService.js";
import { teamService } from "../../domain/services/TeamService.js";
import { gameRepository } from "../../domain/repositories/GameRepository.js";
import { teamRepository } from "../../domain/repositories/TeamRepository.js";
import { nodeRepository } from "../../domain/repositories/NodeRepository.js";
import { edgeRepository } from "../../domain/repositories/EdgeRepository.js";
import { scanRepository } from "../../domain/repositories/ScanRepository.js";
import type { ContentType, EdgeCondition, GameSettings } from "../../domain/types.js";
import {
  createGameSchema,
  updateGameSchema,
  createNodeSchema,
  updateNodeSchema,
  createEdgeSchema,
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
        const existingGame = gameRepository.findById(request.params.id);
        if (!existingGame) {
          return reply.status(404).send({ error: "Game not found" });
        }

        const updateData: Parameters<typeof gameService.updateGame>[1] = {};
        if (parseResult.data.name) updateData.name = parseResult.data.name;
        if (parseResult.data.publicSlug) updateData.publicSlug = parseResult.data.publicSlug;
        if (parseResult.data.status) updateData.status = parseResult.data.status;
        if (parseResult.data.logoUrl !== undefined) updateData.logoUrl = parseResult.data.logoUrl;
        if (parseResult.data.settings) {
          // Merge with existing settings instead of replacing
          updateData.settings = {
            ...existingGame.settings,
            rankingMode: parseResult.data.settings.rankingMode ?? existingGame.settings.rankingMode,
            basePoints: parseResult.data.settings.basePoints ?? existingGame.settings.basePoints,
            timeBonusEnabled: parseResult.data.settings.timeBonusEnabled ?? existingGame.settings.timeBonusEnabled,
            timeBonusMultiplier: parseResult.data.settings.timeBonusMultiplier ?? existingGame.settings.timeBonusMultiplier,
            randomMode: parseResult.data.settings.randomMode ?? existingGame.settings.randomMode ?? false,
          };
        }

        // Reset all scans when game is set to draft
        if (parseResult.data.status === "draft") {
          scanRepository.deleteByGameId(request.params.id);
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

      const team = teamService.createTeam(parseResult.data);
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
        activated: node.activated,
        adminComment: node.adminComment,
        url: `${baseUrl}/g/${game.publicSlug}/n/${node.nodeKey}`,
      }));

      return reply.send({ qrCodes });
    }
  );

  // ==================== EXPORT/IMPORT ====================

  // Export game data
  fastify.get(
    "/games/:gameId/export",
    async (
      request: FastifyRequest<{ Params: { gameId: string } }>,
      reply: FastifyReply
    ) => {
      const game = gameRepository.findById(request.params.gameId);
      if (!game) {
        return reply.status(404).send({ error: "Game not found" });
      }

      const nodes = nodeRepository.findByGameId(request.params.gameId);
      const edges = edgeRepository.findByGameId(request.params.gameId);
      const teams = teamRepository.findByGameId(request.params.gameId);

      // Build node ID to key mapping for edges
      const nodeIdToKey = new Map<string, string>();
      for (const node of nodes) {
        nodeIdToKey.set(node.id, node.nodeKey);
      }

      const exportData = {
        version: 1,
        exportedAt: new Date().toISOString(),
        game: {
          name: game.name,
          publicSlug: game.publicSlug,
          status: game.status,
          settings: game.settings,
          logoUrl: game.logoUrl,
        },
        nodes: nodes.map((node) => ({
          nodeKey: node.nodeKey,
          title: node.title,
          content: node.content,
          contentType: node.contentType,
          mediaUrl: node.mediaUrl,
          passwordRequired: node.passwordRequired,
          // Note: we don't export password hashes for security
          isStart: node.isStart,
          isEnd: node.isEnd,
          points: node.points,
          adminComment: node.adminComment,
          metadata: node.metadata,
        })),
        edges: edges.map((edge) => ({
          fromNodeKey: nodeIdToKey.get(edge.fromNodeId) || edge.fromNodeId,
          toNodeKey: nodeIdToKey.get(edge.toNodeId) || edge.toNodeId,
          condition: edge.condition,
          sortOrder: edge.sortOrder,
        })),
        teams: teams.map((team) => ({
          name: team.name,
          code: team.code,
          startNodeKey: team.startNodeId ? nodeIdToKey.get(team.startNodeId) : null,
          logoUrl: team.logoUrl,
        })),
      };

      reply.header("Content-Type", "application/json");
      reply.header(
        "Content-Disposition",
        `attachment; filename="${game.publicSlug}-export.json"`
      );
      return reply.send(exportData);
    }
  );

  // Import game data
  fastify.post(
    "/games/import",
    async (
      request: FastifyRequest<{
        Body: {
          data: {
            version: number;
            game: {
              name: string;
              publicSlug: string;
              status?: string;
              settings?: Record<string, unknown>;
              logoUrl?: string | null;
            };
            nodes: Array<{
              nodeKey: string;
              title: string;
              content?: string | null;
              contentType?: string;
              mediaUrl?: string | null;
              passwordRequired?: boolean;
              isStart?: boolean;
              isEnd?: boolean;
              points?: number;
              adminComment?: string | null;
              metadata?: Record<string, unknown>;
            }>;
            edges: Array<{
              fromNodeKey: string;
              toNodeKey: string;
              condition?: { type?: string; value?: string };
              sortOrder?: number;
            }>;
            teams: Array<{
              name: string;
              code: string;
              startNodeKey?: string | null;
              logoUrl?: string | null;
            }>;
          };
          overwrite?: boolean;
        };
      }>,
      reply: FastifyReply
    ) => {
      const { data, overwrite } = request.body;

      if (!data || !data.game || !data.nodes) {
        return reply.status(400).send({ error: "Invalid import data" });
      }

      // Check if game with this slug already exists
      const existingGame = gameRepository.findBySlug(data.game.publicSlug);

      let gameId: string;

      if (existingGame) {
        if (!overwrite) {
          return reply.status(409).send({
            error: "Game with this slug already exists",
            existingGameId: existingGame.id,
          });
        }

        // Delete existing nodes, edges, teams (cascade will handle edges)
        const existingNodes = nodeRepository.findByGameId(existingGame.id);
        for (const node of existingNodes) {
          nodeRepository.delete(node.id);
        }
        const existingTeams = teamRepository.findByGameId(existingGame.id);
        for (const team of existingTeams) {
          teamRepository.delete(team.id);
        }

        // Update game settings
        gameRepository.update(existingGame.id, {
          name: data.game.name,
          settings: data.game.settings as unknown as GameSettings,
          logoUrl: data.game.logoUrl,
        });

        gameId = existingGame.id;
      } else {
        // Create new game
        const newGame = gameService.createGame({
          name: data.game.name,
          publicSlug: data.game.publicSlug,
          logoUrl: data.game.logoUrl || undefined,
          settings: data.game.settings as unknown as GameSettings,
        });
        gameId = newGame.id;
      }

      // Create nodes and build key to ID mapping
      const nodeKeyToId = new Map<string, string>();
      for (const nodeData of data.nodes) {
        const node = nodeRepository.create({
          gameId,
          nodeKey: nodeData.nodeKey,
          title: nodeData.title,
          content: nodeData.content || undefined,
          contentType: (nodeData.contentType as ContentType) || "text",
          mediaUrl: nodeData.mediaUrl || undefined,
          passwordRequired: nodeData.passwordRequired || false,
          isStart: nodeData.isStart || false,
          isEnd: nodeData.isEnd || false,
          points: nodeData.points ?? 100,
          adminComment: nodeData.adminComment || undefined,
          metadata: nodeData.metadata || {},
        });
        nodeKeyToId.set(nodeData.nodeKey, node.id);
      }

      // Create edges
      for (const edgeData of data.edges || []) {
        const fromNodeId = nodeKeyToId.get(edgeData.fromNodeKey);
        const toNodeId = nodeKeyToId.get(edgeData.toNodeKey);

        if (fromNodeId && toNodeId) {
          edgeRepository.create({
            gameId,
            fromNodeId,
            toNodeId,
            condition: edgeData.condition as EdgeCondition,
            sortOrder: edgeData.sortOrder || 0,
          });
        }
      }

      // Create teams
      for (const teamData of data.teams || []) {
        const startNodeId = teamData.startNodeKey
          ? nodeKeyToId.get(teamData.startNodeKey)
          : undefined;

        teamRepository.create({
          gameId,
          name: teamData.name,
          code: teamData.code,
          startNodeId,
          logoUrl: teamData.logoUrl || undefined,
        });
      }

      const game = gameRepository.findById(gameId);
      return reply.status(existingGame ? 200 : 201).send({
        success: true,
        message: existingGame ? "Game updated from import" : "Game imported successfully",
        game,
      });
    }
  );
}
