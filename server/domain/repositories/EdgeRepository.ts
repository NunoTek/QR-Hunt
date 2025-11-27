import { nanoid } from "nanoid";
import { getDatabase } from "../../db/database.js";
import type { Edge, EdgeCondition } from "../types.js";

interface EdgeRow {
  id: string;
  game_id: string;
  from_node_id: string;
  to_node_id: string;
  condition: string;
  sort_order: number;
  created_at: string;
}

function rowToEdge(row: EdgeRow): Edge {
  return {
    id: row.id,
    gameId: row.game_id,
    fromNodeId: row.from_node_id,
    toNodeId: row.to_node_id,
    condition: JSON.parse(row.condition) as EdgeCondition,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

export class EdgeRepository {
  create(data: {
    gameId: string;
    fromNodeId: string;
    toNodeId: string;
    condition?: EdgeCondition;
    sortOrder?: number;
  }): Edge {
    const db = getDatabase();
    const id = nanoid();

    db.prepare(
      `INSERT INTO edges (id, game_id, from_node_id, to_node_id, condition, sort_order)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      data.gameId,
      data.fromNodeId,
      data.toNodeId,
      JSON.stringify(data.condition || { type: "always" }),
      data.sortOrder ?? 0
    );

    return this.findById(id)!;
  }

  findById(id: string): Edge | null {
    const db = getDatabase();
    const row = db
      .prepare("SELECT * FROM edges WHERE id = ?")
      .get(id) as EdgeRow | undefined;
    return row ? rowToEdge(row) : null;
  }

  findByGameId(gameId: string): Edge[] {
    const db = getDatabase();
    const rows = db
      .prepare(
        "SELECT * FROM edges WHERE game_id = ? ORDER BY sort_order ASC, created_at ASC"
      )
      .all(gameId) as EdgeRow[];
    return rows.map(rowToEdge);
  }

  findOutgoingEdges(nodeId: string): Edge[] {
    const db = getDatabase();
    const rows = db
      .prepare(
        "SELECT * FROM edges WHERE from_node_id = ? ORDER BY sort_order ASC"
      )
      .all(nodeId) as EdgeRow[];
    return rows.map(rowToEdge);
  }

  findIncomingEdges(nodeId: string): Edge[] {
    const db = getDatabase();
    const rows = db
      .prepare(
        "SELECT * FROM edges WHERE to_node_id = ? ORDER BY sort_order ASC"
      )
      .all(nodeId) as EdgeRow[];
    return rows.map(rowToEdge);
  }

  update(
    id: string,
    data: Partial<{
      fromNodeId: string;
      toNodeId: string;
      condition: EdgeCondition;
      sortOrder: number;
    }>
  ): Edge | null {
    const db = getDatabase();
    const existing = this.findById(id);
    if (!existing) return null;

    const updates: string[] = [];
    const values: unknown[] = [];

    if (data.fromNodeId !== undefined) {
      updates.push("from_node_id = ?");
      values.push(data.fromNodeId);
    }
    if (data.toNodeId !== undefined) {
      updates.push("to_node_id = ?");
      values.push(data.toNodeId);
    }
    if (data.condition !== undefined) {
      updates.push("condition = ?");
      values.push(JSON.stringify(data.condition));
    }
    if (data.sortOrder !== undefined) {
      updates.push("sort_order = ?");
      values.push(data.sortOrder);
    }

    if (updates.length > 0) {
      values.push(id);
      db.prepare(`UPDATE edges SET ${updates.join(", ")} WHERE id = ?`).run(
        ...values
      );
    }

    return this.findById(id);
  }

  delete(id: string): boolean {
    const db = getDatabase();
    const result = db.prepare("DELETE FROM edges WHERE id = ?").run(id);
    return result.changes > 0;
  }

  deleteByGameId(gameId: string): number {
    const db = getDatabase();
    const result = db
      .prepare("DELETE FROM edges WHERE game_id = ?")
      .run(gameId);
    return result.changes;
  }
}

export const edgeRepository = new EdgeRepository();
