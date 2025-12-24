export interface Node {
  id: string;
  nodeKey: string;
  title: string;
  content: string | null;
  contentType: string;
  mediaUrl: string | null;
  passwordRequired: boolean;
  isStart: boolean;
  isEnd: boolean;
  points: number;
  hint: string | null;
  adminComment: string | null;
  activated: boolean;
}

export interface Edge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
}

export interface Team {
  id: string;
  code: string;
  name: string;
  startNodeId: string | null;
  logoUrl: string | null;
}

export interface Feedback {
  id: string;
  teamName: string;
  rating: number;
  comment: string | null;
  createdAt: string;
}

export interface Game {
  id: string;
  name: string;
  publicSlug: string;
  status: string;
  logoUrl: string | null;
  settings: {
    rankingMode: string;
    basePoints: number;
    randomMode?: boolean;
  };
}

export interface QRCode {
  nodeId: string;
  nodeKey: string;
  title: string;
  url: string;
  isStart: boolean;
  isEnd: boolean;
  activated: boolean;
  adminComment: string | null;
}

export interface GameEditorData {
  game: Game;
  nodes: Node[];
  edges: Edge[];
  teams: Team[];
  qrCodes: QRCode[];
  baseUrl: string;
  adminCode: string;
}

export type TabType = "nodes" | "qrcodes" | "edges" | "teams" | "feedback" | "analytics" | "settings";

export interface AnalyticsData {
  teams: Array<{
    teamId: string;
    teamName: string;
    teamLogoUrl: string | null;
    totalTime: number;
    nodeTimings: Array<{
      nodeId: string;
      nodeTitle: string;
      timeSpentMs: number;
      timestamp: string;
    }>;
    isFinished: boolean;
    rank: number;
  }>;
  nodeStats: Array<{
    nodeId: string;
    nodeTitle: string;
    averageTimeMs: number;
    minTimeMs: number;
    maxTimeMs: number;
    completionCount: number;
  }>;
  bottlenecks: Array<{
    nodeId: string;
    nodeTitle: string;
    averageTimeMs: number;
  }>;
}

export interface NodeFilter {
  title: string;
  activated: "all" | "activated" | "not-activated";
}

export interface QRFilter {
  title: string;
  activated: "all" | "activated" | "not-activated";
}

// Shared form input classes
export const inputClasses = "w-full px-3 py-2 text-sm bg-secondary text-primary border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent";
