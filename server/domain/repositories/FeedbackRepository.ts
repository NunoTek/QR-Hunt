import { nanoid } from "nanoid";
import { getDatabase } from "../../db/database.js";
import type { Feedback } from "../types.js";

interface FeedbackRow {
  id: string;
  game_id: string;
  team_id: string;
  team_name: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

function rowToFeedback(row: FeedbackRow): Feedback {
  return {
    id: row.id,
    gameId: row.game_id,
    teamId: row.team_id,
    teamName: row.team_name,
    rating: row.rating,
    comment: row.comment,
    createdAt: row.created_at,
  };
}

export class FeedbackRepository {
  create(data: {
    gameId: string;
    teamId: string;
    teamName: string;
    rating: number;
    comment?: string;
  }): Feedback {
    const db = getDatabase();
    const id = nanoid();

    db.prepare(
      `INSERT INTO feedback (id, game_id, team_id, team_name, rating, comment)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(id, data.gameId, data.teamId, data.teamName, data.rating, data.comment || null);

    return this.findById(id)!;
  }

  findById(id: string): Feedback | null {
    const db = getDatabase();
    const row = db
      .prepare("SELECT * FROM feedback WHERE id = ?")
      .get(id) as FeedbackRow | undefined;
    return row ? rowToFeedback(row) : null;
  }

  findByGameId(gameId: string): Feedback[] {
    const db = getDatabase();
    const rows = db
      .prepare("SELECT * FROM feedback WHERE game_id = ? ORDER BY created_at DESC")
      .all(gameId) as FeedbackRow[];
    return rows.map(rowToFeedback);
  }

  findByTeamId(teamId: string): Feedback | null {
    const db = getDatabase();
    const row = db
      .prepare("SELECT * FROM feedback WHERE team_id = ?")
      .get(teamId) as FeedbackRow | undefined;
    return row ? rowToFeedback(row) : null;
  }

  findByGameAndTeam(gameId: string, teamId: string): Feedback | null {
    const db = getDatabase();
    const row = db
      .prepare("SELECT * FROM feedback WHERE game_id = ? AND team_id = ?")
      .get(gameId, teamId) as FeedbackRow | undefined;
    return row ? rowToFeedback(row) : null;
  }

  update(
    id: string,
    data: Partial<{ rating: number; comment: string }>
  ): Feedback | null {
    const db = getDatabase();
    const existing = this.findById(id);
    if (!existing) return null;

    const updates: string[] = [];
    const values: unknown[] = [];

    if (data.rating !== undefined) {
      updates.push("rating = ?");
      values.push(data.rating);
    }
    if (data.comment !== undefined) {
      updates.push("comment = ?");
      values.push(data.comment);
    }

    if (updates.length > 0) {
      values.push(id);
      db.prepare(`UPDATE feedback SET ${updates.join(", ")} WHERE id = ?`).run(
        ...values
      );
    }

    return this.findById(id);
  }

  delete(id: string): boolean {
    const db = getDatabase();
    const result = db.prepare("DELETE FROM feedback WHERE id = ?").run(id);
    return result.changes > 0;
  }

  deleteByGameId(gameId: string): number {
    const db = getDatabase();
    const result = db
      .prepare("DELETE FROM feedback WHERE game_id = ?")
      .run(gameId);
    return result.changes;
  }

  getAverageRating(gameId: string): number | null {
    const db = getDatabase();
    const result = db
      .prepare("SELECT AVG(rating) as avg_rating FROM feedback WHERE game_id = ?")
      .get(gameId) as { avg_rating: number | null };
    return result.avg_rating;
  }

  getCount(gameId: string): number {
    const db = getDatabase();
    const result = db
      .prepare("SELECT COUNT(*) as count FROM feedback WHERE game_id = ?")
      .get(gameId) as { count: number };
    return result.count;
  }
}

export const feedbackRepository = new FeedbackRepository();
