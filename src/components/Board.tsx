import type { Tile, PlacedTile } from '../types';
import { BOARD_SIZE } from '../types';
import { getEffectiveRank } from '../gameLogic';

interface BoardProps {
  board: (Tile | null)[][];
  placedTiles: PlacedTile[];
  lastMove: PlacedTile[] | null;
  onCellClick: (row: number, col: number) => void;
  selectedTile: Tile | null;
}

export function Board({ board, placedTiles, lastMove, onCellClick, selectedTile }: BoardProps) {
  const isLastMoveCell = (row: number, col: number): boolean => {
    return lastMove?.some(pt => pt.row === row && pt.col === col) || false;
  };

  const getPlacedTile = (row: number, col: number): PlacedTile | undefined => {
    return placedTiles.find(pt => pt.row === row && pt.col === col);
  };

  return (
    <div className="overflow-auto max-w-full">
      <div
        className="grid gap-[1px] bg-green-900 p-1 rounded-lg shadow-2xl border-2 border-amber-800"
        style={{
          gridTemplateColumns: `repeat(${BOARD_SIZE}, minmax(0, 1fr))`,
          width: 'fit-content',
        }}
      >
        {Array.from({ length: BOARD_SIZE }, (_, row) =>
          Array.from({ length: BOARD_SIZE }, (_, col) => {
            const boardTile = board[row]?.[col];
            const placed = getPlacedTile(row, col);
            const tile = placed?.tile || boardTile;
            const isLastMove = isLastMoveCell(row, col);
            const isPlacedThisTurn = !!placed;
            const isEmpty = !tile;
            const canPlace = isEmpty && selectedTile;

            return (
              <div
                key={`${row}-${col}`}
                onClick={() => onCellClick(row, col)}
                className={`
                  w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 flex items-center justify-center rounded-sm text-xs sm:text-sm font-bold
                  transition-all duration-150 select-none
                  ${isEmpty ? 'bg-green-800/60' : ''}
                  ${canPlace ? 'cursor-pointer hover:bg-green-600/80 ring-1 ring-green-400/30' : ''}
                  ${tile && !isPlacedThisTurn ? 'cursor-default' : ''}
                  ${isPlacedThisTurn ? 'cursor-pointer ring-2 ring-amber-400 animate-pulse' : ''}
                  ${isLastMove && !isPlacedThisTurn ? 'ring-1 ring-blue-400' : ''}
                `}
              >
                {tile && (
                  <TileDisplay tile={tile} isPlaced={isPlacedThisTurn} isLastMove={isLastMove && !isPlacedThisTurn} />
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function TileDisplay({ tile, isPlaced, isLastMove }: { tile: Tile; isPlaced: boolean; isLastMove: boolean }) {
  const rank = getEffectiveRank(tile);
  const isLight = tile.color === 'light';

  return (
    <div
      className={`
        w-full h-full flex items-center justify-center rounded-sm font-bold text-xs sm:text-sm
        ${isLight ? 'bg-amber-100 text-amber-900' : 'bg-amber-800 text-amber-100'}
        ${isPlaced ? 'shadow-lg shadow-amber-400/30' : ''}
        ${isLastMove ? 'opacity-90' : ''}
      `}
    >
      {rank}
    </div>
  );
}
