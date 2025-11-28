import { nanoid } from "nanoid";
import { getDatabase } from "../../db/database.js";
import type { Node, ContentType } from "../types.js";

interface NodeRow {
  id: string;
  game_id: string;
  node_key: string;
  title: string;
  content: string | null;
  content_type: ContentType;
  media_url: string | null;
  password_required: number;
  password_hash: string | null;
  is_start: number;
  is_end: number;
  points: number;
  admin_comment: string | null;
  metadata: string;
  created_at: string;
}

function rowToNode(row: NodeRow): Node {
  return {
    id: row.id,
    gameId: row.game_id,
    nodeKey: row.node_key,
    title: row.title,
    content: row.content,
    contentType: row.content_type,
    mediaUrl: row.media_url,
    passwordRequired: row.password_required === 1,
    passwordHash: row.password_hash,
    isStart: row.is_start === 1,
    isEnd: row.is_end === 1,
    points: row.points,
    adminComment: row.admin_comment,
    metadata: JSON.parse(row.metadata) as Record<string, unknown>,
    createdAt: row.created_at,
  };
}

function generateNodeKey(): string {
  return nanoid(10);
}

export class NodeRepository {
  create(data: {
    gameId: string;
    title: string;
    nodeKey?: string;
    content?: string;
    contentType?: ContentType;
    mediaUrl?: string;
    passwordRequired?: boolean;
    passwordHash?: string;
    isStart?: boolean;
    isEnd?: boolean;
    points?: number;
    adminComment?: string;
    metadata?: Record<string, unknown>;
  }): Node {
    const db = getDatabase();
    const id = nanoid();
    const nodeKey = data.nodeKey || generateNodeKey();

    db.prepare(
      `INSERT INTO nodes (id, game_id, node_key, title, content, content_type, media_url,
       password_required, password_hash, is_start, is_end, points, admin_comment, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      data.gameId,
      nodeKey,
      data.title,
      data.content || null,
      data.contentType || "text",
      data.mediaUrl || null,
      data.passwordRequired ? 1 : 0,
      data.passwordHash || null,
      data.isStart ? 1 : 0,
      data.isEnd ? 1 : 0,
      data.points ?? 100,
      data.adminComment || null,
      JSON.stringify(data.metadata || {})
    );

    return this.findById(id)!;
  }

  findById(id: string): Node | null {
    const db = getDatabase();
    const row = db
      .prepare("SELECT * FROM nodes WHERE id = ?")
      .get(id) as NodeRow | undefined;
    return row ? rowToNode(row) : null;
  }

  findByNodeKey(gameId: string, nodeKey: string): Node | null {
    const db = getDatabase();
    const row = db
      .prepare("SELECT * FROM nodes WHERE game_id = ? AND node_key = ?")
      .get(gameId, nodeKey) as NodeRow | undefined;
    return row ? rowToNode(row) : null;
  }

  findByGameId(gameId: string): Node[] {
    const db = getDatabase();
    const rows = db
      .prepare("SELECT * FROM nodes WHERE game_id = ? ORDER BY created_at ASC")
      .all(gameId) as NodeRow[];
    return rows.map(rowToNode);
  }

  findStartNodes(gameId: string): Node[] {
    const db = getDatabase();
    const rows = db
      .prepare("SELECT * FROM nodes WHERE game_id = ? AND is_start = 1")
      .all(gameId) as NodeRow[];
    return rows.map(rowToNode);
  }

  findEndNodes(gameId: string): Node[] {
    const db = getDatabase();
    const rows = db
      .prepare("SELECT * FROM nodes WHERE game_id = ? AND is_end = 1")
      .all(gameId) as NodeRow[];
    return rows.map(rowToNode);
  }

  update(
    id: string,
    data: Partial<{
      title: string;
      nodeKey: string;
      content: string | null;
      contentType: ContentType;
      mediaUrl: string | null;
      passwordRequired: boolean;
      passwordHash: string | null;
      isStart: boolean;
      isEnd: boolean;
      points: number;
      adminComment: string | null;
      metadata: Record<string, unknown>;
    }>
  ): Node | null {
    const db = getDatabase();
    const existing = this.findById(id);
    if (!existing) return null;

    const updates: string[] = [];
    const values: unknown[] = [];

    if (data.title !== undefined) {
      updates.push("title = ?");
      values.push(data.title);
    }
    if (data.nodeKey !== undefined) {
      updates.push("node_key = ?");
      values.push(data.nodeKey);
    }
    if (data.content !== undefined) {
      updates.push("content = ?");
      values.push(data.content);
    }
    if (data.contentType !== undefined) {
      updates.push("content_type = ?");
      values.push(data.contentType);
    }
    if (data.mediaUrl !== undefined) {
      updates.push("media_url = ?");
      values.push(data.mediaUrl);
    }
    if (data.passwordRequired !== undefined) {
      updates.push("password_required = ?");
      values.push(data.passwordRequired ? 1 : 0);
    }
    if (data.passwordHash !== undefined) {
      updates.push("password_hash = ?");
      values.push(data.passwordHash);
    }
    if (data.isStart !== undefined) {
      updates.push("is_start = ?");
      values.push(data.isStart ? 1 : 0);
    }
    if (data.isEnd !== undefined) {
      updates.push("is_end = ?");
      values.push(data.isEnd ? 1 : 0);
    }
    if (data.points !== undefined) {
      updates.push("points = ?");
      values.push(data.points);
    }
    if (data.adminComment !== undefined) {
      updates.push("admin_comment = ?");
      values.push(data.adminComment);
    }
    if (data.metadata !== undefined) {
      updates.push("metadata = ?");
      values.push(JSON.stringify(data.metadata));
    }

    if (updates.length > 0) {
      values.push(id);
      db.prepare(`UPDATE nodes SET ${updates.join(", ")} WHERE id = ?`).run(
        ...values
      );
    }

    return this.findById(id);
  }

  delete(id: string): boolean {
    const db = getDatabase();
    const result = db.prepare("DELETE FROM nodes WHERE id = ?").run(id);
    return result.changes > 0;
  }
}

export const nodeRepository = new NodeRepository();
