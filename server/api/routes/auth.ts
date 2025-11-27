import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { authService } from "../../domain/services/AuthService.js";
import { joinGameSchema } from "../schemas.js";

export async function authRoutes(fastify: FastifyInstance) {
  // Join a game with team code
  fastify.post(
    "/join",
    async (
      request: FastifyRequest<{
        Body: { gameSlug: string; teamCode: string };
      }>,
      reply: FastifyReply
    ) => {
      const parseResult = joinGameSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: "Invalid request",
          details: parseResult.error.flatten(),
        });
      }

      const { gameSlug, teamCode } = parseResult.data;
      const result = authService.joinGame(gameSlug, teamCode);

      if (!result.success) {
        return reply.status(400).send({ error: result.message });
      }

      // Set cookie for web clients
      reply.setCookie("team_token", result.session!.token, {
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 48 * 60 * 60, // 48 hours
      });

      return reply.send({
        success: true,
        team: {
          id: result.team!.id,
          name: result.team!.name,
          code: result.team!.code,
        },
        token: result.session!.token,
        expiresAt: result.session!.expiresAt,
      });
    }
  );

  // Logout
  fastify.post("/logout", async (request: FastifyRequest, reply: FastifyReply) => {
    const token =
      request.headers.authorization?.replace("Bearer ", "") ||
      (request.cookies as Record<string, string>)?.team_token;

    if (token) {
      authService.logout(token);
    }

    reply.clearCookie("team_token", { path: "/" });
    return reply.send({ success: true });
  });

  // Validate current session
  fastify.get("/me", async (request: FastifyRequest, reply: FastifyReply) => {
    const token =
      request.headers.authorization?.replace("Bearer ", "") ||
      (request.cookies as Record<string, string>)?.team_token;

    if (!token) {
      return reply.status(401).send({ error: "Not authenticated" });
    }

    const { valid, team, session } = authService.validateSession(token);
    if (!valid || !team) {
      return reply.status(401).send({ error: "Invalid or expired session" });
    }

    return reply.send({
      team: {
        id: team.id,
        name: team.name,
        code: team.code,
        gameId: team.gameId,
        logoUrl: team.logoUrl,
      },
      expiresAt: session!.expiresAt,
    });
  });
}
