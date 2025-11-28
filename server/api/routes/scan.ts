import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { gameRepository } from "../../domain/repositories/GameRepository.js";
import { nodeRepository } from "../../domain/repositories/NodeRepository.js";
import { scanService } from "../../domain/services/ScanService.js";
import { gameEvents } from "../../lib/eventEmitter.js";
import { requireTeamAuth } from "../middleware.js";
import { recordScanSchema } from "../schemas.js";
import { getLeaderboardData, invalidateLeaderboardCache } from "./leaderboard.js";

export async function scanRoutes(fastify: FastifyInstance) {
  // Add auth hook for all routes in this scope
  fastify.addHook("preHandler", requireTeamAuth);

  // Record a QR scan
  fastify.post(
    "/",
    async (
      request: FastifyRequest<{
        Body: { nodeKey: string; password?: string };
      }>,
      reply: FastifyReply
    ) => {
      const parseResult = recordScanSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: "Invalid request",
          details: parseResult.error.flatten(),
        });
      }

      const { nodeKey, password } = parseResult.data;
      const clientIp = request.ip;
      const userAgent = request.headers["user-agent"];

      const result = scanService.recordScan({
        teamId: request.team!.id,
        nodeKey,
        password,
        clientIp,
        userAgent,
      });

      if (!result.success) {
        const status = result.message === "Password required" ? 200 : 400;
        return reply.status(status).send({
          success: false,
          message: result.message,
          node: result.node,
          passwordRequired: result.message === "Password required",
        });
      }

      // Invalidate leaderboard cache and emit real-time update
      const game = gameRepository.findById(request.team!.gameId);
      if (game) {
        invalidateLeaderboardCache(game.publicSlug);

        // Emit scan event for live notifications
        gameEvents.emitScan(
          game.publicSlug,
          request.team!.name,
          result.node?.title || "Unknown",
          result.pointsAwarded || 0
        );

        // Emit updated leaderboard data
        const leaderboardData = getLeaderboardData(game.publicSlug);
        if (leaderboardData) {
          gameEvents.emitLeaderboardUpdate(game.publicSlug, leaderboardData);
        }
      }

      // Check if this team is the winner
      let winStatus = null;
      if (result.isGameComplete) {
        winStatus = scanService.checkIfWinner(request.team!.id);
      }

      return reply.send({
        success: true,
        message: result.message,
        node: result.node,
        nextNodes: result.nextNodes,
        isGameComplete: result.isGameComplete,
        pointsAwarded: result.pointsAwarded,
        isWinner: winStatus?.isWinner ?? false,
      });
    }
  );

  // Get current team progress
  fastify.get("/progress", async (request: FastifyRequest, reply: FastifyReply) => {
    const progress = scanService.getTeamProgress(request.team!.id);
    if (!progress) {
      return reply.status(404).send({ error: "Progress not found" });
    }

    // Check win status if finished
    let winStatus = null;
    if (progress.isFinished) {
      winStatus = scanService.checkIfWinner(request.team!.id);
    }

    // Get all scanned nodes with details
    const scannedNodes = progress.scans.map((scan) => {
      const node = nodeRepository.findById(scan.nodeId);
      return node ? {
        id: node.id,
        title: node.title,
        content: node.content,
        contentType: node.contentType,
        mediaUrl: node.mediaUrl,
        points: scan.pointsAwarded,
        timestamp: scan.timestamp,
        isEnd: node.isEnd,
      } : null;
    }).filter((n) => n !== null);

    // Get starting clue if team hasn't scanned anything yet
    let startingClue = null;
    if (progress.scans.length === 0 && progress.team.startNodeId) {
      const startNode = nodeRepository.findById(progress.team.startNodeId);
      if (startNode) {
        startingClue = {
          id: startNode.id,
          title: startNode.title,
          content: startNode.content,
          contentType: startNode.contentType,
          mediaUrl: startNode.mediaUrl,
        };
      }
    }

    // Get total nodes count for this game
    const allNodes = nodeRepository.findByGameId(progress.team.gameId);
    const totalNodes = allNodes.length;

    return reply.send({
      team: {
        id: progress.team.id,
        name: progress.team.name,
      },
      currentNode: progress.currentNode
        ? {
            id: progress.currentNode.id,
            title: progress.currentNode.title,
            content: progress.currentNode.content,
            contentType: progress.currentNode.contentType,
            mediaUrl: progress.currentNode.mediaUrl,
            isEnd: progress.currentNode.isEnd,
          }
        : null,
      nextClue: progress.nextClue
        ? {
            id: progress.nextClue.id,
            title: progress.nextClue.title,
            content: progress.nextClue.content,
            contentType: progress.nextClue.contentType,
            mediaUrl: progress.nextClue.mediaUrl,
          }
        : null,
      startingClue,
      scannedNodes,
      nextNodesCount: progress.nextNodes.length,
      nodesFound: progress.nodesFound,
      totalNodes,
      totalPoints: progress.totalPoints,
      isFinished: progress.isFinished,
      isWinner: winStatus?.isWinner ?? false,
      scansCount: progress.scans.length,
    });
  });
}
