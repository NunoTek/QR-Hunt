import { nanoid } from "nanoid";
import { getDatabase } from "../../db/database.js";
import type { Game, GameSettings, GameStatus } from "../types.js";

interface GameRow {
  id: string;
  name: string;
  public_slug: string;
  status: GameStatus;
  settings: string;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

function rowToGame(row: GameRow): Game {
  return {
    id: row.id,
    name: row.name,
    publicSlug: row.public_slug,
    status: row.status,
    settings: JSON.parse(row.settings) as GameSettings,
    logoUrl: row.logo_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class GameRepository {
  create(data: {
    name: string;
    publicSlug: string;
    settings?: Partial<GameSettings>;
    logoUrl?: string | null;
  }): Game {
    const db = getDatabase();
    const id = nanoid();
    const settings: GameSettings = {
      rankingMode: "points",
      basePoints: 100,
      timeBonusEnabled: true,
      timeBonusMultiplier: 1.5,
      ...data.settings,
    };

    db.prepare(
      `INSERT INTO games (id, name, public_slug, settings, logo_url)
       VALUES (?, ?, ?, ?, ?)`
    ).run(id, data.name, data.publicSlug, JSON.stringify(settings), data.logoUrl ?? null);

    return this.findById(id)!;
  }

  findById(id: string): Game | null {
    const db = getDatabase();
    const row = db
      .prepare("SELECT * FROM games WHERE id = ?")
      .get(id) as GameRow | undefined;
    return row ? rowToGame(row) : null;
  }

  findBySlug(slug: string): Game | null {
    const db = getDatabase();
    const row = db
      .prepare("SELECT * FROM games WHERE public_slug = ?")
      .get(slug) as GameRow | undefined;
    return row ? rowToGame(row) : null;
  }

  findAll(): Game[] {
    const db = getDatabase();
    const rows = db
      .prepare("SELECT * FROM games ORDER BY created_at DESC")
      .all() as GameRow[];
    return rows.map(rowToGame);
  }

  findByStatus(status: GameStatus): Game[] {
    const db = getDatabase();
    const rows = db
      .prepare("SELECT * FROM games WHERE status = ? ORDER BY created_at DESC")
      .all(status) as GameRow[];
    return rows.map(rowToGame);
  }

  update(
    id: string,
    data: Partial<{
      name: string;
      publicSlug: string;
      status: GameStatus;
      settings: GameSettings;
      logoUrl: string | null;
    }>
  ): Game | null {
    const db = getDatabase();
    const existing = this.findById(id);
    if (!existing) return null;

    const updates: string[] = [];
    const values: unknown[] = [];

    if (data.name !== undefined) {
      updates.push("name = ?");
      values.push(data.name);
    }
    if (data.publicSlug !== undefined) {
      updates.push("public_slug = ?");
      values.push(data.publicSlug);
    }
    if (data.status !== undefined) {
      updates.push("status = ?");
      values.push(data.status);
    }
    if (data.settings !== undefined) {
      updates.push("settings = ?");
      values.push(JSON.stringify(data.settings));
    }
    if (data.logoUrl !== undefined) {
      updates.push("logo_url = ?");
      values.push(data.logoUrl);
    }

    if (updates.length > 0) {
      updates.push("updated_at = CURRENT_TIMESTAMP");
      values.push(id);
      db.prepare(
        `UPDATE games SET ${updates.join(", ")} WHERE id = ?`
      ).run(...values);
    }

    return this.findById(id);
  }

  delete(id: string): boolean {
    const db = getDatabase();
    const result = db.prepare("DELETE FROM games WHERE id = ?").run(id);
    return result.changes > 0;
  }
}

export const gameRepository = new GameRepository();
