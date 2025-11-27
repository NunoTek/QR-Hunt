import type { FastifyInstance } from "fastify";
import { getDatabase } from "../../db/database.js";

export async function healthRoutes(fastify: FastifyInstance) {
  // Basic health check - just returns OK
  fastify.get("/", async (_request, reply) => {
    return reply.send({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Detailed health check with database connectivity
  fastify.get("/ready", async (_request, reply) => {
    const checks: Record<string, { status: string; latency?: number; error?: string }> = {};

    // Check database connectivity
    const dbStart = performance.now();
    try {
      const db = getDatabase();
      db.prepare("SELECT 1").get();
      checks.database = {
        status: "healthy",
        latency: Math.round(performance.now() - dbStart),
      };
    } catch (error) {
      checks.database = {
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }

    const allHealthy = Object.values(checks).every((c) => c.status === "healthy");

    return reply.status(allHealthy ? 200 : 503).send({
      status: allHealthy ? "ready" : "not_ready",
      timestamp: new Date().toISOString(),
      checks,
    });
  });

  // Liveness check for kubernetes-style probes
  fastify.get("/live", async (_request, reply) => {
    return reply.send({ status: "alive", timestamp: new Date().toISOString() });
  });
}
