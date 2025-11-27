import { nanoid } from "nanoid";
import { getDatabase } from "../../db/database.js";
import type { Scan } from "../types.js";

interface ScanRow {
  id: string;
  game_id: string;
  team_id: string;
  node_id: string;
  timestamp: string;
  client_ip: string | null;
  user_agent: string | null;
  points_awarded: number;
}

function rowToScan(row: ScanRow): Scan {
  return {
    id: row.id,
    gameId: row.game_id,
    teamId: row.team_id,
    nodeId: row.node_id,
    timestamp: row.timestamp,
    clientIp: row.client_ip,
    userAgent: row.user_agent,
    pointsAwarded: row.points_awarded,
  };
}

export class ScanRepository {
  create(data: {
    gameId: string;
    teamId: string;
    nodeId: string;
    clientIp?: string;
    userAgent?: string;
    pointsAwarded?: number;
  }): Scan {
    const db = getDatabase();
    const id = nanoid();

    db.prepare(
      `INSERT INTO scans (id, game_id, team_id, node_id, client_ip, user_agent, points_awarded)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      data.gameId,
      data.teamId,
      data.nodeId,
      data.clientIp || null,
      data.userAgent || null,
      data.pointsAwarded ?? 0
    );

    return this.findById(id)!;
  }

  findById(id: string): Scan | null {
    const db = getDatabase();
    const row = db
      .prepare("SELECT * FROM scans WHERE id = ?")
      .get(id) as ScanRow | undefined;
    return row ? rowToScan(row) : null;
  }

  findByTeamId(teamId: string): Scan[] {
    const db = getDatabase();
    const rows = db
      .prepare("SELECT * FROM scans WHERE team_id = ? ORDER BY timestamp ASC")
      .all(teamId) as ScanRow[];
    return rows.map(rowToScan);
  }

  findByGameId(gameId: string): Scan[] {
    const db = getDatabase();
    const rows = db
      .prepare("SELECT * FROM scans WHERE game_id = ? ORDER BY timestamp ASC")
      .all(gameId) as ScanRow[];
    return rows.map(rowToScan);
  }

  findByNodeId(nodeId: string): Scan[] {
    const db = getDatabase();
    const rows = db
      .prepare("SELECT * FROM scans WHERE node_id = ? ORDER BY timestamp ASC")
      .all(nodeId) as ScanRow[];
    return rows.map(rowToScan);
  }

  findLastScanByTeam(teamId: string): Scan | null {
    const db = getDatabase();
    const row = db
      .prepare(
        "SELECT * FROM scans WHERE team_id = ? ORDER BY timestamp DESC LIMIT 1"
      )
      .get(teamId) as ScanRow | undefined;
    return row ? rowToScan(row) : null;
  }

  hasTeamScannedNode(teamId: string, nodeId: string): boolean {
    const db = getDatabase();
    const row = db
      .prepare("SELECT id FROM scans WHERE team_id = ? AND node_id = ? LIMIT 1")
      .get(teamId, nodeId);
    return !!row;
  }

  countByTeam(teamId: string): number {
    const db = getDatabase();
    const result = db
      .prepare("SELECT COUNT(*) as count FROM scans WHERE team_id = ?")
      .get(teamId) as { count: number };
    return result.count;
  }

  getTotalPointsByTeam(teamId: string): number {
    const db = getDatabase();
    const result = db
      .prepare(
        "SELECT COALESCE(SUM(points_awarded), 0) as total FROM scans WHERE team_id = ?"
      )
      .get(teamId) as { total: number };
    return result.total;
  }

  getTeamProgress(gameId: string): Array<{
    teamId: string;
    nodesFound: number;
    totalPoints: number;
    lastScanTime: string | null;
  }> {
    const db = getDatabase();
    const rows = db
      .prepare(
        `SELECT
          team_id,
          COUNT(*) as nodes_found,
          SUM(points_awarded) as total_points,
          MAX(timestamp) as last_scan_time
        FROM scans
        WHERE game_id = ?
        GROUP BY team_id`
      )
      .all(gameId) as Array<{
      team_id: string;
      nodes_found: number;
      total_points: number;
      last_scan_time: string | null;
    }>;

    return rows.map((row) => ({
      teamId: row.team_id,
      nodesFound: row.nodes_found,
      totalPoints: row.total_points,
      lastScanTime: row.last_scan_time,
    }));
  }

  // Optimized method to get full leaderboard data in a single query
  getLeaderboardData(gameId: string): Array<{
    teamId: string;
    nodesFound: number;
    totalPoints: number;
    lastScanTime: string | null;
    lastNodeId: string | null;
    lastNodeTitle: string | null;
    nextNodeTitle: string | null;
  }> {
    const db = getDatabase();
    const rows = db
      .prepare(
        `WITH team_stats AS (
          SELECT
            s.team_id,
            COUNT(*) as nodes_found,
            SUM(s.points_awarded) as total_points,
            MAX(s.timestamp) as last_scan_time
          FROM scans s
          WHERE s.game_id = ?
          GROUP BY s.team_id
        ),
        last_scans AS (
          SELECT
            s.team_id,
            s.node_id,
            n.title as node_title
          FROM scans s
          INNER JOIN nodes n ON s.node_id = n.id
          WHERE s.game_id = ?
            AND s.timestamp = (
              SELECT MAX(s2.timestamp)
              FROM scans s2
              WHERE s2.team_id = s.team_id AND s2.game_id = ?
            )
        ),
        next_nodes AS (
          SELECT
            ls.team_id,
            n.title as next_node_title
          FROM last_scans ls
          INNER JOIN edges e ON ls.node_id = e.from_node_id
          INNER JOIN nodes n ON e.to_node_id = n.id
          WHERE e.game_id = ?
        )
        SELECT
          ts.team_id,
          ts.nodes_found,
          ts.total_points,
          ts.last_scan_time,
          ls.node_id as last_node_id,
          ls.node_title as last_node_title,
          nn.next_node_title
        FROM team_stats ts
        LEFT JOIN last_scans ls ON ts.team_id = ls.team_id
        LEFT JOIN next_nodes nn ON ts.team_id = nn.team_id`
      )
      .all(gameId, gameId, gameId, gameId) as Array<{
      team_id: string;
      nodes_found: number;
      total_points: number;
      last_scan_time: string | null;
      last_node_id: string | null;
      last_node_title: string | null;
      next_node_title: string | null;
    }>;

    return rows.map((row) => ({
      teamId: row.team_id,
      nodesFound: row.nodes_found,
      totalPoints: row.total_points,
      lastScanTime: row.last_scan_time,
      lastNodeId: row.last_node_id,
      lastNodeTitle: row.last_node_title,
      nextNodeTitle: row.next_node_title,
    }));
  }
}

export const scanRepository = new ScanRepository();
