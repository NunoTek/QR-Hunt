export interface LeaderboardEntry {
  rank: number;
  teamName: string;
  teamLogoUrl: string | null;
  nodesFound: number;
  totalPoints: number;
  isFinished: boolean;
  currentClue: string | null;
}

export interface LeaderboardData {
  game: {
    id: string;
    name: string;
    slug: string;
    status: string;
    logoUrl: string | null;
  };
  leaderboard: LeaderboardEntry[];
  updatedAt: string;
}

export interface FeedbackEntry {
  id: string;
  teamName: string;
  rating: number;
  comment: string | null;
  createdAt: string;
}

export interface FeedbackData {
  feedback: FeedbackEntry[];
  averageRating: number | null;
  count: number;
}

export interface RankChange {
  teamName: string;
  direction: "up" | "down";
  positions: number;
}

export interface PerformanceData {
  game: { id: string; name: string; slug: string };
  nodes: Array<{ id: string; title: string }>;
  teams: Array<{
    teamId: string;
    teamName: string;
    teamLogoUrl: string | null;
    clueTimings: Array<{
      nodeId: string;
      nodeTitle: string;
      timestamp: string;
      timeFromStart: number;
      timeFromPrevious: number;
    }>;
    totalTime: number;
  }>;
}
