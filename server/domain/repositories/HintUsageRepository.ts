import { nanoid } from "nanoid";
import { getDatabase } from "../../db/database.js";
import type { HintUsage } from "../types.js";

interface HintUsageRow {
  id: string;
  game_id: string;
  team_id: string;
  node_id: string;
  points_deducted: number;
  created_at: string;
}

function rowToHintUsage(row: HintUsageRow): HintUsage {
  return {
    id: row.id,
    gameId: row.game_id,
    teamId: row.team_id,
    nodeId: row.node_id,
    pointsDeducted: row.points_deducted,
    createdAt: row.created_at,
  };
}

export class HintUsageRepository {
  create(data: {
    gameId: string;
    teamId: string;
    nodeId: string;
    pointsDeducted: number;
  }): HintUsage {
    const db = getDatabase();
    const id = nanoid();

    db.prepare(
      `INSERT INTO hint_usages (id, game_id, team_id, node_id, points_deducted)
       VALUES (?, ?, ?, ?, ?)`
    ).run(id, data.gameId, data.teamId, data.nodeId, data.pointsDeducted);

    return this.findById(id)!;
  }

  findById(id: string): HintUsage | null {
    const db = getDatabase();
    const row = db
      .prepare("SELECT * FROM hint_usages WHERE id = ?")
      .get(id) as HintUsageRow | undefined;
    return row ? rowToHintUsage(row) : null;
  }

  findByTeamAndNode(teamId: string, nodeId: string): HintUsage | null {
    const db = getDatabase();
    const row = db
      .prepare("SELECT * FROM hint_usages WHERE team_id = ? AND node_id = ?")
      .get(teamId, nodeId) as HintUsageRow | undefined;
    return row ? rowToHintUsage(row) : null;
  }

  findByTeamId(teamId: string): HintUsage[] {
    const db = getDatabase();
    const rows = db
      .prepare("SELECT * FROM hint_usages WHERE team_id = ? ORDER BY created_at ASC")
      .all(teamId) as HintUsageRow[];
    return rows.map(rowToHintUsage);
  }

  findByGameId(gameId: string): HintUsage[] {
    const db = getDatabase();
    const rows = db
      .prepare("SELECT * FROM hint_usages WHERE game_id = ? ORDER BY created_at ASC")
      .all(gameId) as HintUsageRow[];
    return rows.map(rowToHintUsage);
  }

  getTotalPointsDeductedForTeam(teamId: string): number {
    const db = getDatabase();
    const result = db
      .prepare("SELECT COALESCE(SUM(points_deducted), 0) as total FROM hint_usages WHERE team_id = ?")
      .get(teamId) as { total: number };
    return result.total;
  }

  delete(id: string): boolean {
    const db = getDatabase();
    const result = db.prepare("DELETE FROM hint_usages WHERE id = ?").run(id);
    return result.changes > 0;
  }
}

export const hintUsageRepository = new HintUsageRepository();
