import { z } from "zod";

// Auth schemas
export const joinGameSchema = z.object({
  gameSlug: z.string().min(1),
  teamCode: z.string().min(1).max(10),
});

// Scan schemas
export const recordScanSchema = z.object({
  nodeKey: z.string().min(1),
  password: z.string().optional(),
});

// Admin schemas
export const createGameSchema = z.object({
  name: z.string().min(1).max(100),
  publicSlug: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  logoUrl: z.string().url().optional(),
  settings: z
    .object({
      rankingMode: z.enum(["points", "nodes", "time"]).optional(),
      basePoints: z.number().int().positive().optional(),
      timeBonusEnabled: z.boolean().optional(),
      timeBonusMultiplier: z.number().positive().optional(),
      randomMode: z.boolean().optional(),
    })
    .optional(),
});

export const updateGameSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  publicSlug: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  status: z.enum(["draft", "active", "completed"]).optional(),
  logoUrl: z.string().url().nullable().optional(),
  settings: z
    .object({
      rankingMode: z.enum(["points", "nodes", "time"]).optional(),
      basePoints: z.number().int().positive().optional(),
      timeBonusEnabled: z.boolean().optional(),
      timeBonusMultiplier: z.number().positive().optional(),
      randomMode: z.boolean().optional(),
    })
    .optional(),
});

export const createNodeSchema = z.object({
  gameId: z.string().min(1),
  title: z.string().min(1).max(200),
  nodeKey: z.string().min(1).max(50).optional(),
  content: z.string().max(5000).optional(),
  contentType: z.enum(["text", "image", "video", "audio", "link"]).optional(),
  mediaUrl: z.string().url().optional(),
  passwordRequired: z.boolean().optional(),
  password: z.string().min(1).max(100).optional(),
  isStart: z.boolean().optional(),
  isEnd: z.boolean().optional(),
  points: z.number().int().min(0).optional(),
  adminComment: z.string().max(1000).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const updateNodeSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  nodeKey: z.string().min(1).max(50).optional(),
  content: z.string().max(5000).optional(),
  contentType: z.enum(["text", "image", "video", "audio", "link"]).optional(),
  mediaUrl: z.string().url().nullable().optional(),
  passwordRequired: z.boolean().optional(),
  password: z.string().min(1).max(100).nullable().optional(),
  isStart: z.boolean().optional(),
  isEnd: z.boolean().optional(),
  points: z.number().int().min(0).optional(),
  adminComment: z.string().max(1000).nullable().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const createEdgeSchema = z.object({
  gameId: z.string().min(1),
  fromNodeId: z.string().min(1),
  toNodeId: z.string().min(1),
  condition: z
    .object({
      type: z.enum(["password", "always"]).optional(),
      value: z.string().optional(),
    })
    .optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const updateEdgeSchema = z.object({
  fromNodeId: z.string().min(1).optional(),
  toNodeId: z.string().min(1).optional(),
  condition: z
    .object({
      type: z.enum(["password", "always"]).optional(),
      value: z.string().optional(),
    })
    .optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const createTeamSchema = z.object({
  gameId: z.string().min(1),
  name: z.string().min(1).max(100),
  code: z.string().min(4).max(10).optional(),
  startNodeId: z.string().optional(),
  logoUrl: z.string().url().optional(),
});

export const updateTeamSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  code: z.string().min(4).max(10).optional(),
  startNodeId: z.string().nullable().optional(),
  logoUrl: z.string().url().nullable().optional(),
});
