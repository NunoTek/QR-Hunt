export interface HintInfo {
  hasHint: boolean;
  hintUsed: boolean;
  hintText: string | null;
  pointsDeducted: number;
  pointsCost: number;
}

export interface ClueNode {
  id: string;
  title: string;
  content: string | null;
  contentType: string;
  mediaUrl: string | null;
}

export interface ScannedNode extends ClueNode {
  points: number;
  timestamp: string;
  isEnd: boolean;
}

export interface GameData {
  teamId: string;
  teamName: string;
  teamCode: string;
  teamLogoUrl: string | null;
  gameName: string;
  gameLogoUrl: string | null;
  currentNode: (ClueNode & { isEnd: boolean }) | null;
  nextClue: ClueNode | null;
  nextClueHint: HintInfo | null;
  startingClue: ClueNode | null;
  startingClueHint: HintInfo | null;
  scannedNodes: ScannedNode[];
  nodesFound: number;
  totalNodes: number;
  totalPoints: number;
  hintPointsDeducted: number;
  isFinished: boolean;
  isWinner: boolean;
  isRandomMode: boolean;
}
