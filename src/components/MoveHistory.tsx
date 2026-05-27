import type { MoveRecord } from '../types';
import { getEffectiveRank } from '../gameLogic';

interface MoveHistoryProps {
  moves: MoveRecord[];
}

export function MoveHistory({ moves }: MoveHistoryProps) {
  if (moves.length === 0) {
    return (
      <div className="bg-slate-800/80 rounded-lg p-3 border border-slate-700">
        <span className="text-xs text-slate-400">No moves yet</span>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/80 rounded-lg p-3 border border-slate-700 max-h-60 overflow-y-auto">
      <span className="text-xs text-slate-400 uppercase tracking-wider">Move History</span>
      <div className="mt-2 space-y-1">
        {[...moves].reverse().map((move, idx) => (
          <div key={idx} className="text-xs p-2 bg-slate-700/50 rounded">
            <div className="flex justify-between">
              <span className="text-slate-300 font-medium">{move.playerName}</span>
              <span className="text-amber-400 font-bold">
                {move.score > 0 ? `+${move.score}` : 'Pass'}
              </span>
            </div>
            {move.tiles.length > 0 && (
              <span className="text-slate-500">
                Played: {move.tiles.map(pt => getEffectiveRank(pt.tile)).join(', ')}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
