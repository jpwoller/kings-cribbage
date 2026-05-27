import type { Player } from '../types';

interface ScoreBoardProps {
  players: Player[];
  currentPlayerId: string;
  currentPlayerIndex: number;
}

export function ScoreBoard({ players, currentPlayerId, currentPlayerIndex }: ScoreBoardProps) {
  const maxScore = Math.max(...players.map(p => p.score), 1);

  return (
    <div className="bg-slate-800/80 rounded-lg p-4 border border-slate-700">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Live Scoreboard</span>
      </div>
      <div className="space-y-3">
        {players.map((player, idx) => {
          const isMe = player.id === currentPlayerId;
          const isActive = idx === currentPlayerIndex;
          const barWidth = maxScore > 0 ? Math.max((player.score / maxScore) * 100, 5) : 5;

          return (
            <div key={player.id} className="relative">
              {/* Player name and score */}
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  {/* Active turn indicator dot */}
                  <span className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                    isActive ? 'bg-green-400 shadow-lg shadow-green-400/50 animate-pulse' : 'bg-slate-600'
                  }`}></span>
                  <span className={`text-sm font-medium truncate max-w-[120px] ${
                    isMe ? 'text-amber-300' : 'text-white'
                  }`}>
                    {player.name}
                    {isMe && <span className="text-xs text-slate-400 ml-1">(you)</span>}
                  </span>
                </div>
                <span className={`text-xl font-bold tabular-nums transition-all duration-500 ${
                  isMe ? 'text-amber-400' : 'text-white'
                }`}>
                  {player.score}
                </span>
              </div>

              {/* Score bar */}
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ease-out ${
                    isMe ? 'bg-amber-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${barWidth}%` }}
                />
              </div>

              {/* Tiles remaining */}
              <div className="flex justify-end mt-0.5">
                <span className="text-[10px] text-slate-500">{player.rack.length} tiles in hand</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
