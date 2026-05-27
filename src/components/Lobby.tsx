import { useState } from 'react';
import { createGame, joinGameByCode, setPlayerName, addMyGame, getMyGames } from '../multiplayer';

interface LobbyProps {
  playerName: string;
  onNameChange: (name: string) => void;
  onStartGame: (gameCode: string) => void;
}

export function Lobby({ playerName, onNameChange, onStartGame }: LobbyProps) {
  const [name, setName] = useState(playerName);
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [myGames] = useState(getMyGames());

  const handleCreateGame = async () => {
    if (!name.trim()) {
      setError('Please enter your name first.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      setPlayerName(name.trim());
      onNameChange(name.trim());
      const { gameCode } = await createGame(name.trim());
      addMyGame(gameCode);
      onStartGame(gameCode);
    } catch (e) {
      setError('Failed to create game. Please try again.');
    }
    setLoading(false);
  };

  const handleJoinGame = async () => {
    if (!name.trim()) {
      setError('Please enter your name first.');
      return;
    }
    if (!joinCode.trim()) {
      setError('Please enter a game code.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      setPlayerName(name.trim());
      onNameChange(name.trim());
      const code = joinCode.trim().toUpperCase();
      const game = await joinGameByCode(code, name.trim());
      if (game) {
        addMyGame(code);
        onStartGame(code);
      } else {
        setError('Game not found or already full. Check the code and try again.');
      }
    } catch (e) {
      setError('Failed to join game. Please try again.');
    }
    setLoading(false);
  };

  const handleRejoinGame = (code: string) => {
    if (!name.trim()) {
      setError('Please enter your name first.');
      return;
    }
    setPlayerName(name.trim());
    onNameChange(name.trim());
    onStartGame(code);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-amber-400 mb-2">
            Kings Cribbage
          </h1>
          <p className="text-green-300 text-sm">
            A multiplayer tile game — like Words With Friends meets Cribbage
          </p>
        </div>

        {/* Name Input */}
        <div className="bg-slate-800/80 backdrop-blur rounded-xl p-6 mb-4 border border-slate-700">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Your Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name..."
            className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            maxLength={20}
          />
        </div>

        {/* Create Game */}
        <div className="bg-slate-800/80 backdrop-blur rounded-xl p-6 mb-4 border border-slate-700">
          <h2 className="text-lg font-semibold text-white mb-3">New Game</h2>
          <p className="text-slate-400 text-sm mb-4">
            Create a game and share the code with your opponent.
          </p>
          <button
            onClick={handleCreateGame}
            disabled={loading}
            className="w-full py-3 px-4 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-600 text-white font-semibold rounded-lg transition-colors duration-200"
          >
            {loading ? 'Creating...' : 'Create New Game'}
          </button>
        </div>

        {/* Join Game */}
        <div className="bg-slate-800/80 backdrop-blur rounded-xl p-6 mb-4 border border-slate-700">
          <h2 className="text-lg font-semibold text-white mb-3">Join Game</h2>
          <p className="text-slate-400 text-sm mb-4">
            Enter the 6-letter code shared by your opponent.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="GAME CODE"
              className="flex-1 px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent uppercase tracking-widest text-center font-mono"
              maxLength={6}
            />
            <button
              onClick={handleJoinGame}
              disabled={loading}
              className="py-3 px-6 bg-green-600 hover:bg-green-500 disabled:bg-slate-600 text-white font-semibold rounded-lg transition-colors duration-200"
            >
              Join
            </button>
          </div>
        </div>

        {/* Active Games */}
        {myGames.length > 0 && (
          <div className="bg-slate-800/80 backdrop-blur rounded-xl p-6 mb-4 border border-slate-700">
            <h2 className="text-lg font-semibold text-white mb-3">My Games</h2>
            <div className="space-y-2">
              {myGames.map((code) => (
                <button
                  key={code}
                  onClick={() => handleRejoinGame(code)}
                  className="w-full py-2 px-4 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors duration-200 flex items-center justify-between"
                >
                  <span className="font-mono tracking-wider">{code}</span>
                  <span className="text-sm text-green-400">Resume →</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-900/50 border border-red-700 rounded-lg p-3 text-red-300 text-sm text-center">
            {error}
          </div>
        )}

        {/* Rules Link */}
        <div className="text-center mt-6">
          <p className="text-slate-500 text-xs">
            Place tiles to form Cribbage scoring combinations. Fifteens = 2pts, Pairs = 2pts, Runs of 3+ = length pts.
          </p>
        </div>
      </div>
    </div>
  );
}
