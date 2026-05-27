import type { Player } from '../types';

interface ScoreBoardProps {
  players: Player[];
  currentPlayerId: string;
}

export function ScoreBoard({ players, currentPlayerId }: ScoreBoardProps) {
  return (
    <div className="bg-slate-800/80 rounded-lg p-3 border border-slate-700">
      <span className="text-xs text-slate-400 uppercase tracking-wider">Scores</span>
      <div className="mt-2 space-y-2">
        {players.map(player => (
          <div
            key={player.id}
            className={`flex items-center justify-between p-2 rounded ${
              player.id === currentPlayerId ? 'bg-slate-700/50' : ''
            }`}
          >
            <div className="flex items-center gap-2">
              {player.id === currentPlayerId && (
                <span className="w-2 h-2 rounded-full bg-green-400"></span>
              )}
              <span className="text-sm text-white font-medium truncate max-w-[100px]">
                {player.name}
                {player.id === currentPlayerId && ' (you)'}
              </span>
            </div>
            <span className="text-lg font-bold text-amber-400">{player.score}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
