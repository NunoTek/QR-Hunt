import type { FastifyRequest, FastifyReply } from "fastify";
import { authService } from "../domain/services/AuthService.js";
import type { Team, TeamSession } from "../domain/types.js";

declare module "fastify" {
  interface FastifyRequest {
    team?: Team;
    session?: TeamSession;
    isAdmin?: boolean;
  }
}

export async function requireTeamAuth(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const token =
    request.headers.authorization?.replace("Bearer ", "") ||
    (request.cookies as Record<string, string>)?.team_token;

  if (!token) {
    return reply.status(401).send({ error: "Authentication required" });
  }

  const { valid, team, session } = authService.validateSession(token);
  if (!valid || !team || !session) {
    return reply.status(401).send({ error: "Invalid or expired session" });
  }

  request.team = team;
  request.session = session;
}

export async function requireAdminAuth(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const adminCode =
    request.headers["x-admin-code"] as string ||
    (request.cookies as Record<string, string>)?.admin_code;

  if (!adminCode) {
    return reply.status(401).send({ error: "Admin authentication required" });
  }

  if (!authService.validateAdminCode(adminCode)) {
    return reply.status(403).send({ error: "Invalid admin code" });
  }

  request.isAdmin = true;
}
