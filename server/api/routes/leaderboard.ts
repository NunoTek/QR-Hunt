import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { gameService } from "../../domain/services/GameService.js";
import { gameRepository } from "../../domain/repositories/GameRepository.js";
import { teamRepository } from "../../domain/repositories/TeamRepository.js";
import { nodeRepository } from "../../domain/repositories/NodeRepository.js";
import { scanRepository } from "../../domain/repositories/ScanRepository.js";
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

  // Game status stream for waiting room (SSE)
  fastify.get(
    "/:slug/status/stream",
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

      // Send initial status
      reply.raw.write(`event: status\n`);
      reply.raw.write(`data: ${JSON.stringify({ status: game.status, timestamp: new Date().toISOString() })}\n\n`);

      // Send current teams list with connection status
      const teams = teamRepository.findByGameId(game.id);
      const connections = gameEvents.getTeamConnections(slug);
      const teamsData = teams.map((t) => {
        const connection = connections.find((c) => c.teamId === t.id);
        return {
          id: t.id,
          name: t.name,
          logoUrl: t.logoUrl,
          joinedAt: t.createdAt,
          isConnected: connection?.isConnected ?? false,
        };
      });
      reply.raw.write(`event: teams\n`);
      reply.raw.write(`data: ${JSON.stringify({ teams: teamsData })}\n\n`);

      // Keep-alive ping
      const keepAliveInterval = setInterval(() => {
        reply.raw.write(`: ping\n\n`);
      }, SSE.KEEP_ALIVE_INTERVAL_MS);

      // Listen for game status changes
      const onGameStatus = (data: { status: string; timestamp: string }) => {
        reply.raw.write(`event: status\n`);
        reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
      };

      // Listen for team joined events
      const onTeamJoined = (data: { id: string; name: string; logoUrl: string | null; joinedAt: string }) => {
        reply.raw.write(`event: team_joined\n`);
        reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
      };

      // Listen for team connection status changes
      const onTeamConnection = (data: { teamId: string; teamName: string; isConnected: boolean; timestamp: string }) => {
        reply.raw.write(`event: team_connection\n`);
        reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
      };

      gameEvents.onGameStatus(slug, onGameStatus);
      gameEvents.onTeamJoined(slug, onTeamJoined);
      gameEvents.onTeamConnectionStatus(slug, onTeamConnection);

      // Clean up on close
      request.raw.on("close", () => {
        clearInterval(keepAliveInterval);
        gameEvents.offGameStatus(slug, onGameStatus);
        gameEvents.offTeamJoined(slug, onTeamJoined);
        gameEvents.offTeamConnectionStatus(slug, onTeamConnection);
      });

      // Don't end the response - keep it open for SSE
      return reply;
    }
  );

  // Team heartbeat endpoint for connection tracking
  fastify.post(
    "/:slug/heartbeat",
    async (
      request: FastifyRequest<{
        Params: { slug: string };
        Body: { teamId: string; teamName: string };
      }>,
      reply: FastifyReply
    ) => {
      const { slug } = request.params;
      const { teamId, teamName } = request.body || {};

      if (!teamId || !teamName) {
        return reply.status(400).send({ error: "teamId and teamName are required" });
      }

      const game = gameRepository.findBySlug(slug);
      if (!game) {
        return reply.status(404).send({ error: "Game not found" });
      }

      // Record the heartbeat
      gameEvents.teamHeartbeat(slug, teamId, teamName);

      return reply.send({ ok: true });
    }
  );

  // Get team performance data for charts
  // NOTE: This route must be defined BEFORE /:slug to ensure proper route matching
  fastify.get(
    "/:slug/performance",
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

      const teams = teamRepository.findByGameId(game.id);
      const allScans = scanRepository.findByGameId(game.id);
      const nodes = nodeRepository.findByGameId(game.id);

      // Create node map for quick lookup
      const nodeMap = new Map(nodes.map(n => [n.id, n]));

      // Group scans by team and calculate time per clue
      const teamPerformance = teams.map(team => {
        const teamScans = allScans
          .filter(s => s.teamId === team.id)
          .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        const clueTimings: Array<{
          nodeId: string;
          nodeTitle: string;
          timestamp: string;
          timeFromStart: number; // seconds from first scan
          timeFromPrevious: number; // seconds from previous scan
        }> = [];

        const firstScanTime = teamScans.length > 0 ? new Date(teamScans[0].timestamp).getTime() : 0;

        teamScans.forEach((scan, index) => {
          const node = nodeMap.get(scan.nodeId);
          const scanTime = new Date(scan.timestamp).getTime();
          const prevScanTime = index > 0 ? new Date(teamScans[index - 1].timestamp).getTime() : scanTime;

          clueTimings.push({
            nodeId: scan.nodeId,
            nodeTitle: node?.title || "Unknown",
            timestamp: scan.timestamp,
            timeFromStart: Math.round((scanTime - firstScanTime) / 1000),
            timeFromPrevious: Math.round((scanTime - prevScanTime) / 1000),
          });
        });

        return {
          teamId: team.id,
          teamName: team.name,
          teamLogoUrl: team.logoUrl,
          clueTimings,
          totalTime: clueTimings.length > 0 ? clueTimings[clueTimings.length - 1].timeFromStart : 0,
        };
      });

      // Get ordered list of nodes for consistent chart display
      const orderedNodes = nodes
        .filter(n => !n.isStart)
        .sort((a, b) => {
          // Sort by most common scan order
          const aFirstScan = allScans.find(s => s.nodeId === a.id);
          const bFirstScan = allScans.find(s => s.nodeId === b.id);
          if (!aFirstScan) return 1;
          if (!bFirstScan) return -1;
          return new Date(aFirstScan.timestamp).getTime() - new Date(bFirstScan.timestamp).getTime();
        })
        .map(n => ({ id: n.id, title: n.title }));

      return reply.send({
        game: {
          id: game.id,
          name: game.name,
          slug: game.publicSlug,
        },
        nodes: orderedNodes,
        teams: teamPerformance,
      });
    }
  );

  // Get game info (public)
  // NOTE: This catch-all route must be defined LAST to not interfere with more specific routes
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
