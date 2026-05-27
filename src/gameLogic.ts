import type { Tile, Rank, TileColor, PlacedTile, ScoringResult, ScoringBreakdown, GameState, Player } from './types';
import { CARD_POINTS, RANK_ORDER, BOARD_SIZE } from './types';
import { v4 as uuidv4 } from 'uuid';

// ============ TILE MANAGEMENT ============

export function createTileBag(): Tile[] {
  const tiles: Tile[] = [];
  const ranks: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const colors: TileColor[] = ['light', 'dark'];

  for (const color of colors) {
    for (const rank of ranks) {
      // 4 tiles of each rank per color = 104 total (4 * 13 * 2)
      for (let i = 0; i < 4; i++) {
        tiles.push({
          id: uuidv4(),
          rank,
          color,
          displayRank: (rank === '6' || rank === '9') ? rank : undefined,
        });
      }
    }
  }

  return shuffleArray(tiles);
}

export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function drawTiles(bag: Tile[], count: number): { drawn: Tile[]; remaining: Tile[] } {
  const drawn = bag.slice(0, count);
  const remaining = bag.slice(count);
  return { drawn, remaining };
}

// ============ BOARD UTILITIES ============

export function createEmptyBoard(): (Tile | null)[][] {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => null)
  );
}

export function getEffectiveRank(tile: Tile): Rank {
  if (tile.rank === '6' || tile.rank === '9') {
    return tile.displayRank || tile.rank;
  }
  return tile.rank;
}

export function getCardPoints(tile: Tile): number {
  const rank = getEffectiveRank(tile);
  return CARD_POINTS[rank];
}

export function getRankIndex(tile: Tile): number {
  const rank = getEffectiveRank(tile);
  return RANK_ORDER.indexOf(rank);
}

// ============ MOVE VALIDATION ============

export function validateMove(
  board: (Tile | null)[][],
  placedTiles: PlacedTile[],
  isFirstMove: boolean
): { valid: boolean; error?: string } {
  if (placedTiles.length === 0) {
    return { valid: false, error: 'You must place at least one tile.' };
  }

  if (isFirstMove && placedTiles.length < 2) {
    return { valid: false, error: 'First move must place at least 2 tiles.' };
  }

  // Check all tiles are in a straight line
  const rows = new Set(placedTiles.map(t => t.row));
  const cols = new Set(placedTiles.map(t => t.col));

  if (rows.size > 1 && cols.size > 1) {
    return { valid: false, error: 'All tiles must be placed in a straight line.' };
  }

  // Check bounds
  for (const pt of placedTiles) {
    if (pt.row < 0 || pt.row >= BOARD_SIZE || pt.col < 0 || pt.col >= BOARD_SIZE) {
      return { valid: false, error: 'Tile placed outside the board.' };
    }
    if (board[pt.row][pt.col] !== null) {
      return { valid: false, error: 'Cannot place a tile on an occupied cell.' };
    }
  }

  // Check connectivity - tiles must be contiguous (no gaps in the line)
  if (placedTiles.length > 1) {
    const isHorizontal = rows.size === 1;
    if (isHorizontal) {
      const row = placedTiles[0].row;
      const sortedCols = [...placedTiles.map(t => t.col)].sort((a, b) => a - b);
      // Check all positions between min and max are either placed or already on board
      for (let c = sortedCols[0]; c <= sortedCols[sortedCols.length - 1]; c++) {
        const isPlaced = placedTiles.some(t => t.col === c);
        const isOnBoard = board[row][c] !== null;
        if (!isPlaced && !isOnBoard) {
          return { valid: false, error: 'Tiles must form a contiguous line (no gaps).' };
        }
      }
    } else {
      const col = placedTiles[0].col;
      const sortedRows = [...placedTiles.map(t => t.row)].sort((a, b) => a - b);
      for (let r = sortedRows[0]; r <= sortedRows[sortedRows.length - 1]; r++) {
        const isPlaced = placedTiles.some(t => t.row === r);
        const isOnBoard = board[r][col] !== null;
        if (!isPlaced && !isOnBoard) {
          return { valid: false, error: 'Tiles must form a contiguous line (no gaps).' };
        }
      }
    }
  }

  // Check connectivity to existing tiles (not for first move)
  if (!isFirstMove) {
    let connected = false;
    for (const pt of placedTiles) {
      const neighbors = [
        [pt.row - 1, pt.col],
        [pt.row + 1, pt.col],
        [pt.row, pt.col - 1],
        [pt.row, pt.col + 1],
      ];
      for (const [r, c] of neighbors) {
        if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
          if (board[r][c] !== null) {
            connected = true;
            break;
          }
        }
      }
      if (connected) break;
    }
    if (!connected) {
      return { valid: false, error: 'Tiles must connect to existing tiles on the board.' };
    }
  }

  return { valid: true };
}

// ============ SCORING ============

/**
 * Get all lines (hands) formed by the placed tiles.
 * Each line is the full contiguous run of tiles in that row/column.
 */
export function getFormedLines(
  board: (Tile | null)[][],
  placedTiles: PlacedTile[]
): Tile[][] {
  // Create a temporary board with placed tiles
  const tempBoard = board.map(row => [...row]);
  for (const pt of placedTiles) {
    tempBoard[pt.row][pt.col] = pt.tile;
  }

  const lines: Tile[][] = [];
  const lineKeys = new Set<string>();

  // Determine if placement is horizontal or vertical
  const rows = new Set(placedTiles.map(t => t.row));
  const cols = new Set(placedTiles.map(t => t.col));
  const isHorizontal = rows.size === 1;
  const isSingleTile = placedTiles.length === 1;

  // Get the main line (the line containing all placed tiles)
  if (isHorizontal || isSingleTile) {
    const row = placedTiles[0].row;
    // Find the full horizontal extent
    let minCol = Math.min(...placedTiles.map(t => t.col));
    let maxCol = Math.max(...placedTiles.map(t => t.col));
    // Extend left
    while (minCol > 0 && tempBoard[row][minCol - 1] !== null) minCol--;
    // Extend right
    while (maxCol < BOARD_SIZE - 1 && tempBoard[row][maxCol + 1] !== null) maxCol++;

    if (maxCol > minCol) {
      const line: Tile[] = [];
      for (let c = minCol; c <= maxCol; c++) {
        line.push(tempBoard[row][c]!);
      }
      const key = `h-${row}-${minCol}-${maxCol}`;
      if (!lineKeys.has(key)) {
        lineKeys.add(key);
        lines.push(line);
      }
    }
  }

  if (!isHorizontal || isSingleTile) {
    const col = placedTiles[0].col;
    // Find the full vertical extent
    let minRow = Math.min(...placedTiles.map(t => t.row));
    let maxRow = Math.max(...placedTiles.map(t => t.row));
    // Extend up
    while (minRow > 0 && tempBoard[minRow - 1][col] !== null) minRow--;
    // Extend down
    while (maxRow < BOARD_SIZE - 1 && tempBoard[maxRow + 1][col] !== null) maxRow++;

    if (maxRow > minRow) {
      const line: Tile[] = [];
      for (let r = minRow; r <= maxRow; r++) {
        line.push(tempBoard[r][col]!);
      }
      const key = `v-${col}-${minRow}-${maxRow}`;
      if (!lineKeys.has(key)) {
        lineKeys.add(key);
        lines.push(line);
      }
    }
  }

  // Get perpendicular lines (cross-words)
  for (const pt of placedTiles) {
    if (isHorizontal || isSingleTile) {
      // Check vertical cross-line for each placed tile
      let minRow = pt.row;
      let maxRow = pt.row;
      while (minRow > 0 && tempBoard[minRow - 1][pt.col] !== null) minRow--;
      while (maxRow < BOARD_SIZE - 1 && tempBoard[maxRow + 1][pt.col] !== null) maxRow++;
      if (maxRow > minRow) {
        const line: Tile[] = [];
        for (let r = minRow; r <= maxRow; r++) {
          line.push(tempBoard[r][pt.col]!);
        }
        const key = `v-${pt.col}-${minRow}-${maxRow}`;
        if (!lineKeys.has(key)) {
          lineKeys.add(key);
          lines.push(line);
        }
      }
    }
    if (!isHorizontal || isSingleTile) {
      // Check horizontal cross-line for each placed tile
      let minCol = pt.col;
      let maxCol = pt.col;
      while (minCol > 0 && tempBoard[pt.row][minCol - 1] !== null) minCol--;
      while (maxCol < BOARD_SIZE - 1 && tempBoard[pt.row][maxCol + 1] !== null) maxCol++;
      if (maxCol > minCol) {
        const line: Tile[] = [];
        for (let c = minCol; c <= maxCol; c++) {
          line.push(tempBoard[pt.row][c]!);
        }
        const key = `h-${pt.row}-${minCol}-${maxCol}`;
        if (!lineKeys.has(key)) {
          lineKeys.add(key);
          lines.push(line);
        }
      }
    }
  }

  return lines;
}

/**
 * Score a single line of tiles (a "hand")
 */
export function scoreLine(tiles: Tile[]): { score: number; breakdown: ScoringBreakdown[] } {
  if (tiles.length < 2 || tiles.length > 5) {
    return { score: 0, breakdown: [] };
  }

  const breakdown: ScoringBreakdown[] = [];
  let totalScore = 0;

  // Score fifteens - check all subsets of 2+ tiles
  const fifteenScore = scoreFifteens(tiles);
  totalScore += fifteenScore.score;
  breakdown.push(...fifteenScore.breakdown);

  // Score pairs/three-of-a-kind/four-of-a-kind/five-of-a-kind
  const pairScore = scorePairs(tiles);
  totalScore += pairScore.score;
  breakdown.push(...pairScore.breakdown);

  // Score runs
  const runScore = scoreRuns(tiles);
  totalScore += runScore.score;
  breakdown.push(...runScore.breakdown);

  return { score: totalScore, breakdown };
}

function scoreFifteens(tiles: Tile[]): { score: number; breakdown: ScoringBreakdown[] } {
  const breakdown: ScoringBreakdown[] = [];
  let score = 0;

  // Check all subsets of size 2 to tiles.length
  const n = tiles.length;
  for (let mask = 3; mask < (1 << n); mask++) {
    // At least 2 bits set
    const bits = countBits(mask);
    if (bits < 2) continue;

    let sum = 0;
    const subset: Tile[] = [];
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) {
        sum += getCardPoints(tiles[i]);
        subset.push(tiles[i]);
      }
    }
    if (sum === 15) {
      score += 2;
      breakdown.push({
        type: 'fifteen',
        points: 2,
        tiles: subset,
        description: `Fifteen for 2 (${subset.map(t => getEffectiveRank(t)).join('+')})`,
      });
    }
  }

  return { score, breakdown };
}

function countBits(n: number): number {
  let count = 0;
  while (n) {
    count += n & 1;
    n >>= 1;
  }
  return count;
}

function scorePairs(tiles: Tile[]): { score: number; breakdown: ScoringBreakdown[] } {
  const breakdown: ScoringBreakdown[] = [];
  let score = 0;

  // Group by effective rank
  const groups: Map<Rank, Tile[]> = new Map();
  for (const tile of tiles) {
    const rank = getEffectiveRank(tile);
    if (!groups.has(rank)) groups.set(rank, []);
    groups.get(rank)!.push(tile);
  }

  for (const [rank, group] of groups) {
    if (group.length === 2) {
      score += 2;
      breakdown.push({
        type: 'pair',
        points: 2,
        tiles: group,
        description: `Pair of ${rank}s`,
      });
    } else if (group.length === 3) {
      score += 6;
      breakdown.push({
        type: 'three_of_a_kind',
        points: 6,
        tiles: group,
        description: `Three ${rank}s`,
      });
    } else if (group.length === 4) {
      score += 12;
      breakdown.push({
        type: 'four_of_a_kind',
        points: 12,
        tiles: group,
        description: `Four ${rank}s`,
      });
    } else if (group.length === 5) {
      score += 20;
      breakdown.push({
        type: 'five_of_a_kind',
        points: 20,
        tiles: group,
        description: `Five ${rank}s`,
      });
    }
  }

  return { score, breakdown };
}

function scoreRuns(tiles: Tile[]): { score: number; breakdown: ScoringBreakdown[] } {
  const breakdown: ScoringBreakdown[] = [];
  let score = 0;

  // Get rank indices and sort
  const indices = tiles.map((t, i) => ({ index: i, rankIdx: getRankIndex(t), tile: t }));
  indices.sort((a, b) => a.rankIdx - b.rankIdx);

  // Find all runs of 3+ consecutive ranks
  // We need to handle duplicates (e.g., 3-4-4-5 has two runs of 3)
  // Use a recursive approach to find all distinct runs
  const runs = findRuns(tiles);
  
  for (const run of runs) {
    if (run.length >= 3) {
      score += run.length;
      breakdown.push({
        type: 'run',
        points: run.length,
        tiles: run,
        description: `Run of ${run.length} (${run.map(t => getEffectiveRank(t)).join('-')})`,
      });
    }
  }

  return { score, breakdown };
}

function findRuns(tiles: Tile[]): Tile[][] {
  // Group tiles by rank index
  const groups: Map<number, Tile[]> = new Map();
  for (const tile of tiles) {
    const idx = getRankIndex(tile);
    if (!groups.has(idx)) groups.set(idx, []);
    groups.get(idx)!.push(tile);
  }

  // Get sorted unique rank indices
  const sortedIndices = [...groups.keys()].sort((a, b) => a - b);

  // Find consecutive sequences of rank indices
  const sequences: number[][] = [];
  let current: number[] = [sortedIndices[0]];

  for (let i = 1; i < sortedIndices.length; i++) {
    if (sortedIndices[i] === sortedIndices[i - 1] + 1) {
      current.push(sortedIndices[i]);
    } else {
      if (current.length >= 3) sequences.push(current);
      current = [sortedIndices[i]];
    }
  }
  if (current.length >= 3) sequences.push(current);

  // For each consecutive sequence, enumerate all runs considering duplicates
  const allRuns: Tile[][] = [];

  for (const seq of sequences) {
    // For the longest run in this sequence, generate all combinations
    const tilesPerRank = seq.map(idx => groups.get(idx)!);
    // Generate cartesian product
    const products = cartesianProduct(tilesPerRank);
    for (const product of products) {
      allRuns.push(product);
    }
  }

  return allRuns;
}

function cartesianProduct(arrays: Tile[][]): Tile[][] {
  if (arrays.length === 0) return [[]];
  const [first, ...rest] = arrays;
  const restProducts = cartesianProduct(rest);
  const result: Tile[][] = [];
  for (const item of first) {
    for (const product of restProducts) {
      result.push([item, ...product]);
    }
  }
  return result;
}

/**
 * Calculate the full score for a move
 */
export function calculateMoveScore(
  board: (Tile | null)[][],
  placedTiles: PlacedTile[],
  isFirstMove: boolean
): ScoringResult {
  // Validate the move first
  const validation = validateMove(board, placedTiles, isFirstMove);
  if (!validation.valid) {
    return { valid: false, score: 0, breakdown: [], error: validation.error };
  }

  // Get all lines formed
  const lines = getFormedLines(board, placedTiles);

  if (lines.length === 0) {
    return { valid: false, score: 0, breakdown: [], error: 'No valid hands formed.' };
  }

  // Check that no line exceeds 5 tiles
  for (const line of lines) {
    if (line.length > 5) {
      return { valid: false, score: 0, breakdown: [], error: 'A line cannot exceed 5 tiles.' };
    }
  }

  let totalScore = 0;
  const allBreakdown: ScoringBreakdown[] = [];

  // Score each line
  for (const line of lines) {
    const lineResult = scoreLine(line);
    if (lineResult.score === 0) {
      // Every line must score!
      return {
        valid: false,
        score: 0,
        breakdown: [],
        error: `Invalid hand: [${line.map(t => getEffectiveRank(t)).join(', ')}] does not score.`,
      };
    }
    totalScore += lineResult.score;
    allBreakdown.push(...lineResult.breakdown);
  }

  // Bonuses
  if (isFirstMove) {
    totalScore += 10;
    allBreakdown.push({
      type: 'first_play_bonus',
      points: 10,
      tiles: [],
      description: 'First play bonus',
    });
  }

  if (placedTiles.length === 5) {
    totalScore += 10;
    allBreakdown.push({
      type: 'all_five_bonus',
      points: 10,
      tiles: [],
      description: 'All five tiles bonus',
    });
  }

  // Flush bonus - check if any formed line of 5 tiles is all same color
  for (const line of lines) {
    if (line.length === 5 && line.every(t => t.color === line[0].color)) {
      totalScore += 10;
      allBreakdown.push({
        type: 'flush_bonus',
        points: 10,
        tiles: line,
        description: 'Flush bonus (5 same color)',
      });
      break; // Only one flush bonus per move
    }
  }

  return { valid: true, score: totalScore, breakdown: allBreakdown };
}

// ============ GAME STATE MANAGEMENT ============

export function createNewGame(player1Id: string, player1Name: string): GameState {
  const bag = createTileBag();
  const { drawn: hand1, remaining: bag1 } = drawTiles(bag, 5);

  const player1: Player = {
    id: player1Id,
    name: player1Name,
    score: 0,
    rack: hand1,
  };

  return {
    id: uuidv4(),
    board: createEmptyBoard(),
    bag: bag1,
    players: [player1],
    currentPlayerIndex: 0,
    status: 'waiting',
    winner: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    lastMove: null,
    consecutivePasses: 0,
    moveHistory: [],
    isFirstMove: true,
    chat: [],
  };
}

export function joinGame(game: GameState, player2Id: string, player2Name: string): GameState {
  const { drawn: hand2, remaining: newBag } = drawTiles(game.bag, 5);

  const player2: Player = {
    id: player2Id,
    name: player2Name,
    score: 0,
    rack: hand2,
  };

  return {
    ...game,
    bag: newBag,
    players: [...game.players, player2],
    status: 'active',
    updatedAt: Date.now(),
  };
}

export function executeMove(game: GameState, playerId: string, placedTiles: PlacedTile[]): { game: GameState; result: ScoringResult } {
  const playerIndex = game.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1 || playerIndex !== game.currentPlayerIndex) {
    return { game, result: { valid: false, score: 0, breakdown: [], error: 'Not your turn.' } };
  }

  const result = calculateMoveScore(game.board, placedTiles, game.isFirstMove);
  if (!result.valid) {
    return { game, result };
  }

  // Apply move to board
  const newBoard = game.board.map(row => [...row]);
  for (const pt of placedTiles) {
    newBoard[pt.row][pt.col] = pt.tile;
  }

  // Remove placed tiles from player's rack and draw new ones
  const player = game.players[playerIndex];
  const placedTileIds = new Set(placedTiles.map(pt => pt.tile.id));
  const remainingRack = player.rack.filter(t => !placedTileIds.has(t.id));
  const tilesToDraw = Math.min(5 - remainingRack.length, game.bag.length);
  const { drawn, remaining: newBag } = drawTiles(game.bag, tilesToDraw);
  const newRack = [...remainingRack, ...drawn];

  // Update player
  const newPlayers = [...game.players];
  newPlayers[playerIndex] = {
    ...player,
    score: player.score + result.score,
    rack: newRack,
  };

  // Check if game is over (player used all tiles and bag is empty)
  const gameOver = newRack.length === 0 && newBag.length === 0;

  // Move to next player
  const nextPlayerIndex = (playerIndex + 1) % game.players.length;

  const moveRecord = {
    playerName: player.name,
    tiles: placedTiles,
    score: result.score,
    timestamp: Date.now(),
  };

  let newGame: GameState = {
    ...game,
    board: newBoard,
    bag: newBag,
    players: newPlayers,
    currentPlayerIndex: nextPlayerIndex,
    updatedAt: Date.now(),
    lastMove: placedTiles,
    consecutivePasses: 0,
    moveHistory: [...game.moveHistory, moveRecord],
    isFirstMove: false,
  };

  if (gameOver) {
    newGame = endGame(newGame, playerIndex);
  }

  return { game: newGame, result };
}

export function executePass(game: GameState, playerId: string): GameState {
  const playerIndex = game.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1 || playerIndex !== game.currentPlayerIndex) {
    return game;
  }

  const newConsecutivePasses = game.consecutivePasses + 1;
  const nextPlayerIndex = (playerIndex + 1) % game.players.length;

  const moveRecord = {
    playerName: game.players[playerIndex].name,
    tiles: [],
    score: 0,
    timestamp: Date.now(),
  };

  let newGame: GameState = {
    ...game,
    currentPlayerIndex: nextPlayerIndex,
    updatedAt: Date.now(),
    consecutivePasses: newConsecutivePasses,
    lastMove: null,
    moveHistory: [...game.moveHistory, moveRecord],
  };

  // If all players pass consecutively, game is over
  if (newConsecutivePasses >= game.players.length) {
    newGame = endGame(newGame, -1);
  }

  return newGame;
}

export function executeExchange(game: GameState, playerId: string, tileIds: string[]): GameState {
  const playerIndex = game.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1 || playerIndex !== game.currentPlayerIndex) {
    return game;
  }

  if (game.bag.length === 0) return game;

  const player = game.players[playerIndex];
  const tilesToReturn = player.rack.filter(t => tileIds.includes(t.id));
  const remainingRack = player.rack.filter(t => !tileIds.includes(t.id));

  // Draw new tiles
  const tilesToDraw = Math.min(tilesToReturn.length, game.bag.length);
  const { drawn, remaining: bagAfterDraw } = drawTiles(game.bag, tilesToDraw);

  // Put returned tiles back in bag and shuffle
  const newBag = shuffleArray([...bagAfterDraw, ...tilesToReturn]);
  const newRack = [...remainingRack, ...drawn];

  const newPlayers = [...game.players];
  newPlayers[playerIndex] = { ...player, rack: newRack };

  const nextPlayerIndex = (playerIndex + 1) % game.players.length;

  const moveRecord = {
    playerName: player.name,
    tiles: [],
    score: 0,
    timestamp: Date.now(),
  };

  return {
    ...game,
    bag: newBag,
    players: newPlayers,
    currentPlayerIndex: nextPlayerIndex,
    updatedAt: Date.now(),
    consecutivePasses: game.consecutivePasses + 1,
    lastMove: null,
    moveHistory: [...game.moveHistory, moveRecord],
  };
}

function endGame(game: GameState, winnerByEmptyRack: number): GameState {
  // Subtract remaining tile values from each player's score
  const newPlayers = game.players.map(player => {
    const penalty = player.rack.reduce((sum, tile) => sum + getCardPoints(tile), 0);
    return { ...player, score: Math.max(0, player.score - penalty) };
  });

  // Determine winner (highest score)
  let maxScore = -1;
  let winnerId: string | null = null;
  for (const player of newPlayers) {
    if (player.score > maxScore) {
      maxScore = player.score;
      winnerId = player.id;
    }
  }

  return {
    ...game,
    players: newPlayers,
    status: 'finished',
    winner: winnerId,
    updatedAt: Date.now(),
  };
}
