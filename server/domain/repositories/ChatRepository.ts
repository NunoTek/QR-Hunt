import { nanoid } from "nanoid";
import { getDatabase } from "../../db/database.js";
import type { ChatMessage } from "../types.js";

interface ChatMessageRow {
  id: string;
  game_id: string;
  sender_type: "admin" | "team";
  sender_id: string | null;
  sender_name: string;
  recipient_type: "all" | "team";
  recipient_id: string | null;
  message: string;
  created_at: string;
}

function rowToMessage(row: ChatMessageRow): ChatMessage {
  return {
    id: row.id,
    gameId: row.game_id,
    senderType: row.sender_type,
    senderId: row.sender_id,
    senderName: row.sender_name,
    recipientType: row.recipient_type,
    recipientId: row.recipient_id,
    message: row.message,
    createdAt: row.created_at,
  };
}

export class ChatRepository {
  create(data: {
    gameId: string;
    senderType: "admin" | "team";
    senderId: string | null;
    senderName: string;
    recipientType: "all" | "team";
    recipientId: string | null;
    message: string;
  }): ChatMessage {
    const db = getDatabase();
    const id = nanoid();

    db.prepare(
      `INSERT INTO chat_messages (id, game_id, sender_type, sender_id, sender_name, recipient_type, recipient_id, message)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      data.gameId,
      data.senderType,
      data.senderId,
      data.senderName,
      data.recipientType,
      data.recipientId,
      data.message
    );

    return this.findById(id)!;
  }

  findById(id: string): ChatMessage | null {
    const db = getDatabase();
    const row = db
      .prepare("SELECT * FROM chat_messages WHERE id = ?")
      .get(id) as ChatMessageRow | undefined;
    return row ? rowToMessage(row) : null;
  }

  findByGameId(gameId: string, limit = 100): ChatMessage[] {
    const db = getDatabase();
    const rows = db
      .prepare(
        `SELECT * FROM chat_messages
         WHERE game_id = ?
         ORDER BY created_at DESC, rowid DESC
         LIMIT ?`
      )
      .all(gameId, limit) as ChatMessageRow[];
    return rows.map(rowToMessage).reverse();
  }

  findForTeam(gameId: string, teamId: string, limit = 100): ChatMessage[] {
    const db = getDatabase();
    const rows = db
      .prepare(
        `SELECT * FROM chat_messages
         WHERE game_id = ?
         AND (
           recipient_type = 'all'
           OR (recipient_type = 'team' AND recipient_id = ?)
           OR (sender_type = 'team' AND sender_id = ?)
         )
         ORDER BY created_at DESC, rowid DESC
         LIMIT ?`
      )
      .all(gameId, teamId, teamId, limit) as ChatMessageRow[];
    return rows.map(rowToMessage).reverse();
  }

  delete(id: string): boolean {
    const db = getDatabase();
    const result = db.prepare("DELETE FROM chat_messages WHERE id = ?").run(id);
    return result.changes > 0;
  }

  deleteByGameId(gameId: string): boolean {
    const db = getDatabase();
    const result = db.prepare("DELETE FROM chat_messages WHERE game_id = ?").run(gameId);
    return result.changes > 0;
  }
}

export const chatRepository = new ChatRepository();
