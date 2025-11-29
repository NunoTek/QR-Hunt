import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { gameService } from "../../domain/services/GameService.js";
import { gameRepository } from "../../domain/repositories/GameRepository.js";
import { gameEvents } from "../../lib/eventEmitter.js";
import { LEADERBOARD_CACHE, SSE } from "../../config/constants.js";

// Simple in-memory cache for leaderboard data
const leaderboardCache = new Map<string, { data: unknown; timestamp: number }>();

interface LeaderboardResponse {
  game: {
    id: string;
    name: string;
    slug: string;
    status: string;
    logoUrl: string | null;
  };
  leaderboard: Array<{
    rank: number;
    teamName: string;
    teamLogoUrl: string | null;
    nodesFound: number;
    totalPoints: number;
    isFinished: boolean;
    currentClue: string | null;
  }>;
  updatedAt: string;
}

function getCachedLeaderboard(slug: string): LeaderboardResponse | null {
  const cached = leaderboardCache.get(slug);
  if (cached && Date.now() - cached.timestamp < LEADERBOARD_CACHE.TTL_MS) {
    return cached.data as LeaderboardResponse;
  }
  return null;
}

function setCachedLeaderboard(slug: string, data: LeaderboardResponse): void {
  leaderboardCache.set(slug, { data, timestamp: Date.now() });
}

// Clear cache for a game (called when scans happen)
export function invalidateLeaderboardCache(slug: string): void {
  leaderboardCache.delete(slug);
}

// Get fresh leaderboard data
export function getLeaderboardData(slug: string): LeaderboardResponse | null {
  const game = gameRepository.findBySlug(slug);
  if (!game) return null;

  const leaderboard = gameService.getLeaderboard(game.id);

  return {
    game: {
      id: game.id,
      name: game.name,
      slug: game.publicSlug,
      status: game.status,
      logoUrl: game.logoUrl,
    },
    leaderboard: leaderboard.map((entry) => ({
      rank: entry.rank,
      teamName: entry.teamName,
      teamLogoUrl: entry.teamLogoUrl,
      nodesFound: entry.nodesFound,
      totalPoints: entry.totalPoints,
      isFinished: entry.isFinished,
      currentClue: entry.isFinished ? "Finished!" : entry.currentNodeTitle,
    })),
    updatedAt: new Date().toISOString(),
  };
}

export async function leaderboardRoutes(fastify: FastifyInstance) {
  // Get public leaderboard for a game
  fastify.get(
    "/:slug/leaderboard",
    async (
      request: FastifyRequest<{
        Params: { slug: string };
      }>,
      reply: FastifyReply
    ) => {
      const { slug } = request.params;

      // Check cache first
      const cached = getCachedLeaderboard(slug);
      if (cached) {
        return reply.send(cached);
      }

      const response = getLeaderboardData(slug);
      if (!response) {
        return reply.status(404).send({ error: "Game not found" });
      }

      // Cache the response
      setCachedLeaderboard(slug, response);

      return reply.send(response);
    }
  );

  // Real-time leaderboard updates via Server-Sent Events
  fastify.get(
    "/:slug/leaderboard/stream",
    async (
      request: FastifyRequest<{
        Params: { slug: string };
      }>,
      reply: FastifyReply
    ) => {
      const { slug } = request.params;

      const game = gameRepository.findBySlug(slug);
      if (!game) {
        return reply.status(404).send({ error: "Game not found" });
      }

      // Set SSE headers
      reply.raw.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
      });

      // Send initial data
      const initialData = getLeaderboardData(slug);
      if (initialData) {
        reply.raw.write(`event: leaderboard\n`);
        reply.raw.write(`data: ${JSON.stringify(initialData)}\n\n`);
      }

      // Keep-alive ping
      const keepAliveInterval = setInterval(() => {
        reply.raw.write(`: ping\n\n`);
      }, SSE.KEEP_ALIVE_INTERVAL_MS);

      // Listen for leaderboard updates
      const onLeaderboardUpdate = (data: unknown) => {
        reply.raw.write(`event: leaderboard\n`);
        reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
      };

      // Listen for scan events (for toast notifications)
      const onScan = (data: { teamName: string; nodeName: string; points: number; timestamp: string }) => {
        reply.raw.write(`event: scan\n`);
        reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
      };

      // Listen for chat events
      const onChat = (message: unknown) => {
        reply.raw.write(`event: chat\n`);
        reply.raw.write(`data: ${JSON.stringify(message)}\n\n`);
      };

      gameEvents.onLeaderboardUpdate(slug, onLeaderboardUpdate);
      gameEvents.onScan(slug, onScan);
      gameEvents.onChat(slug, onChat);

      // Clean up on close
      request.raw.on("close", () => {
        clearInterval(keepAliveInterval);
        gameEvents.offLeaderboardUpdate(slug, onLeaderboardUpdate);
        gameEvents.offScan(slug, onScan);
        gameEvents.offChat(slug, onChat);
      });

      // Don't end the response - keep it open for SSE
      return reply;
    }
  );

  // Get game info (public)
  fastify.get(
    "/:slug",
    async (
      request: FastifyRequest<{
        Params: { slug: string };
      }>,
      reply: FastifyReply
    ) => {
      const { slug } = request.params;
      const game = gameRepository.findBySlug(slug);

      if (!game) {
        return reply.status(404).send({ error: "Game not found" });
      }

      return reply.send({
        id: game.id,
        name: game.name,
        slug: game.publicSlug,
        status: game.status,
        logoUrl: game.logoUrl,
      });
    }
  );
}
