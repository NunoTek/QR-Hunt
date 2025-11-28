import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { feedbackRepository } from "../../domain/repositories/FeedbackRepository.js";
import { requireTeamAuth, requireAdminAuth } from "../middleware.js";
import { z } from "zod";

const submitFeedbackSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

export async function feedbackRoutes(fastify: FastifyInstance) {
  // Team routes - submit feedback
  fastify.register(async (teamRoutes) => {
    teamRoutes.addHook("preHandler", requireTeamAuth);

    // Submit or update feedback
    teamRoutes.post(
      "/",
      async (
        request: FastifyRequest<{ Body: { rating: number; comment?: string } }>,
        reply: FastifyReply
      ) => {
        const parseResult = submitFeedbackSchema.safeParse(request.body);
        if (!parseResult.success) {
          return reply.status(400).send({
            error: "Invalid request",
            details: parseResult.error.flatten(),
          });
        }

        const { rating, comment } = parseResult.data;
        const team = request.team!;

        // Check if team already submitted feedback
        const existing = feedbackRepository.findByGameAndTeam(team.gameId, team.id);

        if (existing) {
          // Update existing feedback
          const updated = feedbackRepository.update(existing.id, { rating, comment });
          return reply.send({
            success: true,
            message: "Feedback updated",
            feedback: updated,
          });
        }

        // Create new feedback
        const feedback = feedbackRepository.create({
          gameId: team.gameId,
          teamId: team.id,
          teamName: team.name,
          rating,
          comment,
        });

        return reply.send({
          success: true,
          message: "Feedback submitted",
          feedback,
        });
      }
    );

    // Get team's own feedback
    teamRoutes.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
      const team = request.team!;
      const feedback = feedbackRepository.findByTeamId(team.id);
      return reply.send({ feedback });
    });
  });

  // Public route - get feedback for leaderboard (no auth required)
  fastify.get(
    "/game/:gameSlug",
    async (
      request: FastifyRequest<{ Params: { gameSlug: string } }>,
      reply: FastifyReply
    ) => {
      // Need to get game ID from slug
      const { gameRepository } = await import("../../domain/repositories/GameRepository.js");
      const game = gameRepository.findBySlug(request.params.gameSlug);

      if (!game) {
        return reply.status(404).send({ error: "Game not found" });
      }

      const feedback = feedbackRepository.findByGameId(game.id);
      const averageRating = feedbackRepository.getAverageRating(game.id);
      const count = feedbackRepository.getCount(game.id);

      return reply.send({
        feedback,
        averageRating: averageRating ? Math.round(averageRating * 10) / 10 : null,
        count,
      });
    }
  );

  // Admin routes
  fastify.register(async (adminRoutes) => {
    adminRoutes.addHook("preHandler", requireAdminAuth);

    // Get all feedback for a game
    adminRoutes.get(
      "/admin/:gameId",
      async (
        request: FastifyRequest<{ Params: { gameId: string } }>,
        reply: FastifyReply
      ) => {
        const feedback = feedbackRepository.findByGameId(request.params.gameId);
        const averageRating = feedbackRepository.getAverageRating(request.params.gameId);
        const count = feedbackRepository.getCount(request.params.gameId);

        return reply.send({
          feedback,
          averageRating: averageRating ? Math.round(averageRating * 10) / 10 : null,
          count,
        });
      }
    );

    // Delete feedback
    adminRoutes.delete(
      "/admin/:id",
      async (
        request: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply
      ) => {
        const deleted = feedbackRepository.delete(request.params.id);
        if (!deleted) {
          return reply.status(404).send({ error: "Feedback not found" });
        }
        return reply.send({ success: true });
      }
    );
  });
}
