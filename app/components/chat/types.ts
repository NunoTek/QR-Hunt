export interface ChatMessage {
  id: string;
  senderType: "admin" | "team";
  senderId: string | null;
  senderName: string;
  recipientType: "all" | "team";
  recipientId: string | null;
  message: string;
  createdAt: string;
}

export interface Team {
  id: string;
  name: string;
}

export interface ChatConfig {
  gameSlug: string;
  token?: string;
  isAdmin?: boolean;
  gameId?: string;
  adminCode?: string;
  currentTeamId?: string;
  teams?: Team[];
}
