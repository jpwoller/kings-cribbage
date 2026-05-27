import type { Tile } from '../types';
import { getEffectiveRank } from '../gameLogic';

interface TileRackProps {
  tiles: Tile[];
  selectedTile: Tile | null;
  selectedForExchange: string[];
  exchangeMode: boolean;
  onTileSelect: (tile: Tile) => void;
  onFlipTile: (tile: Tile) => void;
  onDragStart: (tile: Tile) => void;
}

export function TileRack({ tiles, selectedTile, selectedForExchange, exchangeMode, onTileSelect, onFlipTile, onDragStart }: TileRackProps) {
  return (
    <div className="bg-slate-800/80 backdrop-blur rounded-xl p-4 border border-slate-700">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-400 uppercase tracking-wider">Your Tiles — drag to board or tap then tap a cell</span>
        {exchangeMode && (
          <span className="text-xs text-blue-400">Tap tiles to select for exchange</span>
        )}
      </div>
      <div className="flex gap-2 justify-center flex-wrap">
        {tiles.map((tile) => {
          const rank = getEffectiveRank(tile);
          const isLight = tile.color === 'light';
          const isSelected = selectedTile?.id === tile.id;
          const isSelectedForExchange = selectedForExchange.includes(tile.id);
          const canFlip = tile.rank === '6' || tile.rank === '9';

          return (
            <div key={tile.id} className="relative group">
              <button
                draggable={!exchangeMode}
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = 'move';
                  e.dataTransfer.setData('text/plain', tile.id);
                  onDragStart(tile);
                }}
                onClick={() => onTileSelect(tile)}
                className={`
                  w-12 h-14 sm:w-14 sm:h-16 flex items-center justify-center rounded-lg font-bold text-lg sm:text-xl
                  transition-all duration-150 border-2 cursor-grab active:cursor-grabbing
                  ${isLight ? 'bg-amber-100 text-amber-900' : 'bg-amber-800 text-amber-100'}
                  ${isSelected ? 'border-green-400 -translate-y-2 shadow-lg shadow-green-400/30' : 'border-amber-600/50'}
                  ${isSelectedForExchange ? 'border-blue-400 -translate-y-2 shadow-lg shadow-blue-400/30' : ''}
                  ${!isSelected && !isSelectedForExchange ? 'hover:-translate-y-1 hover:shadow-md' : ''}
                `}
              >
                {rank}
              </button>
              {canFlip && (
                <button
                  onClick={(e) => { e.stopPropagation(); onFlipTile(tile); }}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-slate-600 hover:bg-slate-500 rounded-full text-[10px] text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Flip 6/9"
                >
                  ↕
                </button>
              )}
            </div>
          );
        })}
        {tiles.length === 0 && (
          <span className="text-slate-500 text-sm py-4">No tiles</span>
        )}
      </div>
    </div>
  );
}
