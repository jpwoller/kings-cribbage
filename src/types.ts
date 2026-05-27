// Tile ranks
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';
export type TileColor = 'light' | 'dark';

export interface Tile {
  id: string;
  rank: Rank;
  color: TileColor;
  // For 6/9 tiles, this tracks the chosen orientation
  displayRank?: '6' | '9';
}

export interface BoardCell {
  row: number;
  col: number;
  tile: Tile | null;
}

export interface PlacedTile {
  tile: Tile;
  row: number;
  col: number;
}

export interface Player {
  id: string;
  name: string;
  score: number;
  rack: Tile[];
}

export type GameStatus = 'waiting' | 'active' | 'finished';

export interface GameState {
  id: string;
  board: (Tile | null)[][]; // 13x13 grid
  bag: Tile[];
  players: Player[];
  currentPlayerIndex: number;
  status: GameStatus;
  winner: string | null;
  createdAt: number;
  updatedAt: number;
  lastMove: PlacedTile[] | null;
  consecutivePasses: number;
  moveHistory: MoveRecord[];
  isFirstMove: boolean;
}

export interface MoveRecord {
  playerName: string;
  tiles: PlacedTile[];
  score: number;
  timestamp: number;
}

export interface ScoringResult {
  valid: boolean;
  score: number;
  breakdown: ScoringBreakdown[];
  error?: string;
}

export interface ScoringBreakdown {
  type: 'fifteen' | 'pair' | 'three_of_a_kind' | 'four_of_a_kind' | 'five_of_a_kind' | 'run' | 'first_play_bonus' | 'all_five_bonus' | 'flush_bonus';
  points: number;
  tiles: Tile[];
  description: string;
}

// Card point values for scoring fifteens
export const CARD_POINTS: Record<Rank, number> = {
  'A': 1,
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  'J': 10,
  'Q': 10,
  'K': 10,
};

// Rank order for runs
export const RANK_ORDER: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export const BOARD_SIZE = 13;
