import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error("Database not initialized. Call initializeDatabase first.");
  }
  return db;
}

export async function initializeDatabase(): Promise<Database.Database> {
  const dataDir = process.env.DATA_DIR || "./data";
  const dbPath = path.join(dataDir, "qr-hunt.sqlite");

  // Ensure data directory exists
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  db = new Database(dbPath);

  // Enable WAL mode for better concurrent performance
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  // Run migrations
  runMigrations(db);

  return db;
}

function runMigrations(database: Database.Database): void {
  // Create migrations table if it doesn't exist
  database.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const migrations = getMigrations();
  const appliedMigrations = database
    .prepare("SELECT name FROM migrations")
    .all() as { name: string }[];
  const appliedNames = new Set(appliedMigrations.map((m) => m.name));

  for (const migration of migrations) {
    if (!appliedNames.has(migration.name)) {
      console.log(`Running migration: ${migration.name}`);
      database.exec(migration.sql);
      database
        .prepare("INSERT INTO migrations (name) VALUES (?)")
        .run(migration.name);
    }
  }
}

interface Migration {
  name: string;
  sql: string;
}

function getMigrations(): Migration[] {
  return [
    {
      name: "001_initial_schema",
      sql: `
        -- Games table
        CREATE TABLE games (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          public_slug TEXT NOT NULL UNIQUE,
          status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed')),
          settings TEXT DEFAULT '{}',
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX idx_games_public_slug ON games(public_slug);
        CREATE INDEX idx_games_status ON games(status);

        -- Teams table
        CREATE TABLE teams (
          id TEXT PRIMARY KEY,
          game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
          code TEXT NOT NULL,
          name TEXT NOT NULL,
          start_node_id TEXT,
          logo_url TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(game_id, code)
        );

        CREATE INDEX idx_teams_game_id ON teams(game_id);
        CREATE INDEX idx_teams_code ON teams(code);

        -- Nodes table (QR code destinations)
        CREATE TABLE nodes (
          id TEXT PRIMARY KEY,
          game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
          node_key TEXT NOT NULL,
          title TEXT NOT NULL,
          content TEXT,
          content_type TEXT DEFAULT 'text' CHECK (content_type IN ('text', 'image', 'video', 'audio', 'link')),
          media_url TEXT,
          password_required INTEGER DEFAULT 0,
          password_hash TEXT,
          is_start INTEGER DEFAULT 0,
          is_end INTEGER DEFAULT 0,
          points INTEGER DEFAULT 100,
          metadata TEXT DEFAULT '{}',
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(game_id, node_key)
        );

        CREATE INDEX idx_nodes_game_id ON nodes(game_id);
        CREATE INDEX idx_nodes_node_key ON nodes(node_key);

        -- Edges table (connections between nodes)
        CREATE TABLE edges (
          id TEXT PRIMARY KEY,
          game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
          from_node_id TEXT NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
          to_node_id TEXT NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
          condition TEXT DEFAULT '{}',
          sort_order INTEGER DEFAULT 0,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX idx_edges_game_id ON edges(game_id);
        CREATE INDEX idx_edges_from_node ON edges(from_node_id);
        CREATE INDEX idx_edges_to_node ON edges(to_node_id);

        -- Scans table (recorded team scans)
        CREATE TABLE scans (
          id TEXT PRIMARY KEY,
          game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
          team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
          node_id TEXT NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
          timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
          client_ip TEXT,
          user_agent TEXT,
          points_awarded INTEGER DEFAULT 0
        );

        CREATE INDEX idx_scans_game_id ON scans(game_id);
        CREATE INDEX idx_scans_team_id ON scans(team_id);
        CREATE INDEX idx_scans_node_id ON scans(node_id);
        CREATE INDEX idx_scans_timestamp ON scans(timestamp);

        -- Team sessions table (for authentication)
        CREATE TABLE team_sessions (
          id TEXT PRIMARY KEY,
          team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
          token TEXT NOT NULL UNIQUE,
          expires_at TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX idx_team_sessions_token ON team_sessions(token);
        CREATE INDEX idx_team_sessions_team_id ON team_sessions(team_id);

        -- Admin settings (for MVP single admin code)
        CREATE TABLE admin_settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
      `,
    },
    {
      name: "002_add_logo_url",
      sql: `
        -- Add logo_url column to games table
        ALTER TABLE games ADD COLUMN logo_url TEXT;

        -- Add logo_url column to teams table
        ALTER TABLE teams ADD COLUMN logo_url TEXT;
      `,
    },
    {
      name: "003_add_chat_messages",
      sql: `
        -- Chat messages table
        CREATE TABLE chat_messages (
          id TEXT PRIMARY KEY,
          game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
          sender_type TEXT NOT NULL CHECK (sender_type IN ('admin', 'team')),
          sender_id TEXT,
          sender_name TEXT NOT NULL,
          recipient_type TEXT NOT NULL CHECK (recipient_type IN ('all', 'team')),
          recipient_id TEXT,
          message TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX idx_chat_messages_game_id ON chat_messages(game_id);
        CREATE INDEX idx_chat_messages_recipient ON chat_messages(recipient_type, recipient_id);
        CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at);
      `,
    },
  ];
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}
