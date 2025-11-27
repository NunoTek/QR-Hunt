import { nanoid } from "nanoid";
import { getDatabase } from "../../db/database.js";
import type { TeamSession } from "../types.js";

interface SessionRow {
  id: string;
  team_id: string;
  token: string;
  expires_at: string;
  created_at: string;
}

function rowToSession(row: SessionRow): TeamSession {
  return {
    id: row.id,
    teamId: row.team_id,
    token: row.token,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  };
}

function generateToken(): string {
  return nanoid(32);
}

export class SessionRepository {
  create(teamId: string, expiresInHours: number = 24): TeamSession {
    const db = getDatabase();
    const id = nanoid();
    const token = generateToken();
    const expiresAt = new Date(
      Date.now() + expiresInHours * 60 * 60 * 1000
    ).toISOString();

    db.prepare(
      `INSERT INTO team_sessions (id, team_id, token, expires_at)
       VALUES (?, ?, ?, ?)`
    ).run(id, teamId, token, expiresAt);

    return this.findById(id)!;
  }

  findById(id: string): TeamSession | null {
    const db = getDatabase();
    const row = db
      .prepare("SELECT * FROM team_sessions WHERE id = ?")
      .get(id) as SessionRow | undefined;
    return row ? rowToSession(row) : null;
  }

  findByToken(token: string): TeamSession | null {
    const db = getDatabase();
    const row = db
      .prepare("SELECT * FROM team_sessions WHERE token = ?")
      .get(token) as SessionRow | undefined;
    return row ? rowToSession(row) : null;
  }

  findValidByToken(token: string): TeamSession | null {
    const db = getDatabase();
    const now = new Date().toISOString();
    const row = db
      .prepare(
        "SELECT * FROM team_sessions WHERE token = ? AND expires_at > ?"
      )
      .get(token, now) as SessionRow | undefined;
    return row ? rowToSession(row) : null;
  }

  findByTeamId(teamId: string): TeamSession[] {
    const db = getDatabase();
    const rows = db
      .prepare(
        "SELECT * FROM team_sessions WHERE team_id = ? ORDER BY created_at DESC"
      )
      .all(teamId) as SessionRow[];
    return rows.map(rowToSession);
  }

  deleteByToken(token: string): boolean {
    const db = getDatabase();
    const result = db
      .prepare("DELETE FROM team_sessions WHERE token = ?")
      .run(token);
    return result.changes > 0;
  }

  deleteByTeamId(teamId: string): number {
    const db = getDatabase();
    const result = db
      .prepare("DELETE FROM team_sessions WHERE team_id = ?")
      .run(teamId);
    return result.changes;
  }

  deleteExpired(): number {
    const db = getDatabase();
    const now = new Date().toISOString();
    const result = db
      .prepare("DELETE FROM team_sessions WHERE expires_at < ?")
      .run(now);
    return result.changes;
  }

  extendSession(token: string, expiresInHours: number = 24): TeamSession | null {
    const db = getDatabase();
    const session = this.findByToken(token);
    if (!session) return null;

    const expiresAt = new Date(
      Date.now() + expiresInHours * 60 * 60 * 1000
    ).toISOString();

    db.prepare("UPDATE team_sessions SET expires_at = ? WHERE token = ?").run(
      expiresAt,
      token
    );

    return this.findByToken(token);
  }
}

export const sessionRepository = new SessionRepository();
