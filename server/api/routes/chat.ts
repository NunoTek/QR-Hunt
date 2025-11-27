import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { chatRepository } from "../../domain/repositories/ChatRepository.js";
import { gameRepository } from "../../domain/repositories/GameRepository.js";
import { gameEvents } from "../../lib/eventEmitter.js";
import { requireAdminAuth, requireTeamAuth } from "../middleware.js";

const sendMessageSchema = z.object({
  message: z.string().min(1).max(1000),
  recipientType: z.enum(["all", "team"]),
  recipientId: z.string().optional(),
});

export async function chatRoutes(fastify: FastifyInstance) {
  // Team routes
  fastify.register(async (teamRoutes) => {
    teamRoutes.addHook("preHandler", requireTeamAuth);

    // Get messages for team
    teamRoutes.get(
      "/messages",
      async (request: FastifyRequest, reply: FastifyReply) => {
        const team = request.team!;
        const messages = chatRepository.findForTeam(team.gameId, team.id);
        return reply.send({ messages });
      }
    );

    // Send message as team
    teamRoutes.post(
      "/messages",
      async (
        request: FastifyRequest<{ Body: unknown }>,
        reply: FastifyReply
      ) => {
        const parseResult = sendMessageSchema.safeParse(request.body);
        if (!parseResult.success) {
          return reply.status(400).send({
            error: "Invalid request",
            details: parseResult.error.flatten(),
          });
        }

        const { message, recipientType, recipientId } = parseResult.data;
        const team = request.team!;

        // Teams can only send to "all" (broadcast) or to admin (no recipientId)
        // They cannot send private messages to other teams
        if (recipientType === "team" && recipientId) {
          return reply.status(403).send({
            error: "Teams can only send messages to everyone or the admin",
          });
        }

        const chatMessage = chatRepository.create({
          gameId: team.gameId,
          senderType: "team",
          senderId: team.id,
          senderName: team.name,
          recipientType: "all", // Teams always broadcast (admin sees all)
          recipientId: null,
          message,
        });

        // Emit chat event
        const game = gameRepository.findById(team.gameId);
        if (game) {
          gameEvents.emitChat(game.publicSlug, chatMessage);
        }

        return reply.status(201).send({ message: chatMessage });
      }
    );
  });

  // Admin routes
  fastify.register(async (adminRoutes) => {
    adminRoutes.addHook("preHandler", requireAdminAuth);

    // Get all messages for a game
    adminRoutes.get(
      "/admin/:gameId/messages",
      async (
        request: FastifyRequest<{ Params: { gameId: string } }>,
        reply: FastifyReply
      ) => {
        const { gameId } = request.params;
        const messages = chatRepository.findByGameId(gameId);
        return reply.send({ messages });
      }
    );

    // Send message as admin
    adminRoutes.post(
      "/admin/:gameId/messages",
      async (
        request: FastifyRequest<{
          Params: { gameId: string };
          Body: unknown;
        }>,
        reply: FastifyReply
      ) => {
        const parseResult = sendMessageSchema.safeParse(request.body);
        if (!parseResult.success) {
          return reply.status(400).send({
            error: "Invalid request",
            details: parseResult.error.flatten(),
          });
        }

        const { message, recipientType, recipientId } = parseResult.data;
        const { gameId } = request.params;

        const chatMessage = chatRepository.create({
          gameId,
          senderType: "admin",
          senderId: null,
          senderName: "Admin",
          recipientType,
          recipientId: recipientId || null,
          message,
        });

        // Emit chat event
        const game = gameRepository.findById(gameId);
        if (game) {
          gameEvents.emitChat(game.publicSlug, chatMessage);
        }

        return reply.status(201).send({ message: chatMessage });
      }
    );

    // Delete message
    adminRoutes.delete(
      "/admin/messages/:messageId",
      async (
        request: FastifyRequest<{ Params: { messageId: string } }>,
        reply: FastifyReply
      ) => {
        const { messageId } = request.params;
        const deleted = chatRepository.delete(messageId);
        if (!deleted) {
          return reply.status(404).send({ error: "Message not found" });
        }
        return reply.send({ success: true });
      }
    );
  });
}
