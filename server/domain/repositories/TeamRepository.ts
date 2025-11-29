import { nanoid } from "nanoid";
import { getDatabase } from "../../db/database.js";
import type { Team } from "../types.js";
import { TEAM_CODE } from "../../config/constants.js";

interface TeamRow {
  id: string;
  game_id: string;
  code: string;
  name: string;
  start_node_id: string | null;
  current_clue_id: string | null;
  logo_url: string | null;
  created_at: string;
}

function rowToTeam(row: TeamRow): Team {
  return {
    id: row.id,
    gameId: row.game_id,
    code: row.code,
    name: row.name,
    startNodeId: row.start_node_id,
    currentClueId: row.current_clue_id,
    logoUrl: row.logo_url,
    createdAt: row.created_at,
  };
}

function generateTeamCode(): string {
  let code = "";
  for (let i = 0; i < TEAM_CODE.LENGTH; i++) {
    code += TEAM_CODE.CHARSET.charAt(Math.floor(Math.random() * TEAM_CODE.CHARSET.length));
  }
  return code;
}

export class TeamRepository {
  create(data: {
    gameId: string;
    name: string;
    code?: string;
    startNodeId?: string;
    logoUrl?: string | null;
  }): Team {
    const db = getDatabase();
    const id = nanoid();
    const code = data.code || generateTeamCode();

    db.prepare(
      `INSERT INTO teams (id, game_id, code, name, start_node_id, logo_url)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(id, data.gameId, code, data.name, data.startNodeId || null, data.logoUrl ?? null);

    return this.findById(id)!;
  }

  findById(id: string): Team | null {
    const db = getDatabase();
    const row = db
      .prepare("SELECT * FROM teams WHERE id = ?")
      .get(id) as TeamRow | undefined;
    return row ? rowToTeam(row) : null;
  }

  findByCode(gameId: string, code: string): Team | null {
    const db = getDatabase();
    const row = db
      .prepare("SELECT * FROM teams WHERE game_id = ? AND code = ?")
      .get(gameId, code.toUpperCase()) as TeamRow | undefined;
    return row ? rowToTeam(row) : null;
  }

  findByCodeGlobal(code: string): Team | null {
    const db = getDatabase();
    const row = db
      .prepare("SELECT * FROM teams WHERE code = ?")
      .get(code.toUpperCase()) as TeamRow | undefined;
    return row ? rowToTeam(row) : null;
  }

  findByGameId(gameId: string): Team[] {
    const db = getDatabase();
    const rows = db
      .prepare("SELECT * FROM teams WHERE game_id = ? ORDER BY created_at ASC")
      .all(gameId) as TeamRow[];
    return rows.map(rowToTeam);
  }

  update(
    id: string,
    data: Partial<{ name: string; code: string; startNodeId: string | null; currentClueId: string | null; logoUrl: string | null }>
  ): Team | null {
    const db = getDatabase();
    const existing = this.findById(id);
    if (!existing) return null;

    const updates: string[] = [];
    const values: unknown[] = [];

    if (data.name !== undefined) {
      updates.push("name = ?");
      values.push(data.name);
    }
    if (data.code !== undefined) {
      updates.push("code = ?");
      values.push(data.code.toUpperCase());
    }
    if (data.startNodeId !== undefined) {
      updates.push("start_node_id = ?");
      values.push(data.startNodeId);
    }
    if (data.currentClueId !== undefined) {
      updates.push("current_clue_id = ?");
      values.push(data.currentClueId);
    }
    if (data.logoUrl !== undefined) {
      updates.push("logo_url = ?");
      values.push(data.logoUrl);
    }

    if (updates.length > 0) {
      values.push(id);
      db.prepare(`UPDATE teams SET ${updates.join(", ")} WHERE id = ?`).run(
        ...values
      );
    }

    return this.findById(id);
  }

  delete(id: string): boolean {
    const db = getDatabase();
    const result = db.prepare("DELETE FROM teams WHERE id = ?").run(id);
    return result.changes > 0;
  }
}

export const teamRepository = new TeamRepository();
