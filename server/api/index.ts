import type { FastifyInstance } from "fastify";
import { adminRoutes } from "./routes/admin.js";
import { authRoutes } from "./routes/auth.js";
import { chatRoutes } from "./routes/chat.js";
import { feedbackRoutes } from "./routes/feedback.js";
import { healthRoutes } from "./routes/health.js";
import { leaderboardRoutes } from "./routes/leaderboard.js";
import { scanRoutes } from "./routes/scan.js";

export async function registerApiRoutes(fastify: FastifyInstance) {
  // Health check routes
  await fastify.register(healthRoutes, { prefix: "/health" });

  // Public routes
  await fastify.register(authRoutes, { prefix: "/auth" });
  await fastify.register(leaderboardRoutes, { prefix: "/game" });

  // Team routes (require team session)
  await fastify.register(scanRoutes, { prefix: "/scan" });

  // Chat routes (both team and admin)
  await fastify.register(chatRoutes, { prefix: "/chat" });

  // Feedback routes (team submit, public view, admin manage)
  await fastify.register(feedbackRoutes, { prefix: "/feedback" });

  // Admin routes (require admin code)
  await fastify.register(adminRoutes, { prefix: "/admin" });
}
