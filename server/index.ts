import Fastify from "fastify";
import fastifyCookie from "@fastify/cookie";
import fastifyCors from "@fastify/cors";
import fastifyFormBody from "@fastify/formbody";
import fastifyRateLimit from "@fastify/rate-limit";
import fastifyStatic from "@fastify/static";
import { createRequestHandler } from "@remix-run/node";
import path from "path";
import { fileURLToPath } from "url";
import { initializeDatabase } from "./db/database.js";
import { registerApiRoutes } from "./api/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProduction = process.env.NODE_ENV === "production";
const trustProxy = process.env.TRUST_PROXY === "true";

async function start() {
  const fastify = Fastify({
    logger: {
      level: isProduction ? "info" : "debug",
    },
    trustProxy: trustProxy,
  });

  // Initialize database
  await initializeDatabase();

  // Register plugins
  await fastify.register(fastifyCookie, {
    secret: process.env.COOKIE_SECRET || "qr-hunt-secret-change-in-production",
  });

  await fastify.register(fastifyCors, {
    origin: true,
    credentials: true,
  });

  await fastify.register(fastifyFormBody);

  await fastify.register(fastifyRateLimit, {
    max: 100,
    timeWindow: "1 minute",
  });

  // Register API routes
  await fastify.register(registerApiRoutes, { prefix: "/api/v1" });

  if (isProduction) {
    // Production: serve static files and handle Remix SSR
    await fastify.register(fastifyStatic, {
      root: path.join(__dirname, "../build/client"),
      prefix: "/",
      wildcard: false,
    });

    // @ts-ignore - Production build import
    const build = await import("../build/server/index.js");
    const remixHandler = createRequestHandler(build);

    // Handle all other requests with Remix
    fastify.all("*", async (request, reply) => {
      try {
        // Use forwarded headers when behind a proxy
        const protocol = (request.headers["x-forwarded-proto"] as string) || "http";
        const host = (request.headers["x-forwarded-host"] as string) || request.headers.host || "localhost";
        const url = new URL(request.url, `${protocol}://${host}`);

        const webRequest = new Request(url.toString(), {
          method: request.method,
          headers: request.headers as HeadersInit,
          body:
            request.method !== "GET" && request.method !== "HEAD"
              ? JSON.stringify(request.body)
              : undefined,
        });

        const response = await remixHandler(webRequest, {});

        reply.status(response.status);

        for (const [key, value] of response.headers.entries()) {
          reply.header(key, value);
        }

        const body = await response.text();
        return reply.send(body);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send("Internal Server Error");
      }
    });
  }

  const port = parseInt(process.env.PORT || "3002", 10);
  const host = process.env.HOST || "0.0.0.0";

  try {
    await fastify.listen({ port, host });
    console.log(`🚀 QR Hunt API server running at http://${host}:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();
