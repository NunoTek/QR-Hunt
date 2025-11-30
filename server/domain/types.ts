export type GameStatus = "draft" | "active" | "completed";
export type ContentType = "text" | "image" | "video" | "audio" | "link";

export interface Game {
  id: string;
  name: string;
  publicSlug: string;
  status: GameStatus;
  settings: GameSettings;
  logoUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GameSettings {
  rankingMode: "points" | "nodes" | "time";
  basePoints: number;
  timeBonusEnabled: boolean;
  timeBonusMultiplier: number;
  randomMode: boolean;
}

export interface Team {
  id: string;
  gameId: string;
  code: string;
  name: string;
  startNodeId: string | null;
  currentClueId: string | null;
  logoUrl: string | null;
  createdAt: string;
}

export interface Node {
  id: string;
  gameId: string;
  nodeKey: string;
  title: string;
  content: string | null;
  contentType: ContentType;
  mediaUrl: string | null;
  passwordRequired: boolean;
  passwordHash: string | null;
  isStart: boolean;
  isEnd: boolean;
  points: number;
  hint: string | null;
  adminComment: string | null;
  activated: boolean;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface Edge {
  id: string;
  gameId: string;
  fromNodeId: string;
  toNodeId: string;
  condition: EdgeCondition;
  sortOrder: number;
  createdAt: string;
}

export interface EdgeCondition {
  type?: "password" | "always";
  value?: string;
}

export interface Scan {
  id: string;
  gameId: string;
  teamId: string;
  nodeId: string;
  timestamp: string;
  clientIp: string | null;
  userAgent: string | null;
  pointsAwarded: number;
}

export interface TeamSession {
  id: string;
  teamId: string;
  token: string;
  expiresAt: string;
  createdAt: string;
}

export interface LeaderboardEntry {
  teamId: string;
  teamName: string;
  teamLogoUrl: string | null;
  nodesFound: number;
  totalPoints: number;
  currentNodeTitle: string | null;
  lastScanTime: string | null;
  isFinished: boolean;
  rank: number;
}

export interface TeamProgress {
  team: Team;
  scans: Scan[];
  currentNode: Node | null;
  nextClue: Node | null;
  nextNodes: Node[];
  totalPoints: number;
  nodesFound: number;
  isFinished: boolean;
}

export interface ChatMessage {
  id: string;
  gameId: string;
  senderType: "admin" | "team";
  senderId: string | null;
  senderName: string;
  recipientType: "all" | "team";
  recipientId: string | null;
  message: string;
  createdAt: string;
}

export interface Feedback {
  id: string;
  gameId: string;
  teamId: string;
  teamName: string;
  rating: number;
  comment: string | null;
  createdAt: string;
}

export interface HintUsage {
  id: string;
  gameId: string;
  teamId: string;
  nodeId: string;
  pointsDeducted: number;
  createdAt: string;
}
