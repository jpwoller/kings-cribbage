import { useState, useEffect, useCallback } from 'react';
import type { GameState, PlacedTile, Tile } from '../types';
import { BOARD_SIZE } from '../types';
import { subscribeToGame, makeMove, passTurn, exchangeTiles, getPlayerId } from '../multiplayer';
import { calculateMoveScore, getEffectiveRank } from '../gameLogic';
import { Board } from './Board';
import { TileRack } from './TileRack';
import { ScoreBoard } from './ScoreBoard';
import { MoveHistory } from './MoveHistory';

interface GameViewProps {
  gameCode: string;
  onBack: () => void;
}

export function GameView({ gameCode, onBack }: GameViewProps) {
  const [game, setGame] = useState<GameState | null>(null);
  const [selectedTile, setSelectedTile] = useState<Tile | null>(null);
  const [placedTiles, setPlacedTiles] = useState<PlacedTile[]>([]);
  const [error, setError] = useState('');
  const [previewScore, setPreviewScore] = useState<number | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [exchangeMode, setExchangeMode] = useState(false);
  const [selectedForExchange, setSelectedForExchange] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  const playerId = getPlayerId();

  useEffect(() => {
    const unsubscribe = subscribeToGame(gameCode, (updatedGame) => {
      setGame(updatedGame);
    });
    return unsubscribe;
  }, [gameCode]);

  // Calculate preview score when tiles are placed
  useEffect(() => {
    if (game && placedTiles.length > 0) {
      const result = calculateMoveScore(game.board, placedTiles, game.isFirstMove);
      if (result.valid) {
        setPreviewScore(result.score);
        setError('');
      } else {
        setPreviewScore(null);
        if (placedTiles.length >= 2 || !game.isFirstMove) {
          setError(result.error || '');
        }
      }
    } else {
      setPreviewScore(null);
    }
  }, [placedTiles, game]);

  const currentPlayer = game?.players[game.currentPlayerIndex];
  const isMyTurn = currentPlayer?.id === playerId;
  const myPlayer = game?.players.find(p => p.id === playerId);
  const myRack = myPlayer?.rack || [];

  // Tiles available on rack (not yet placed on board)
  const availableRack = myRack.filter(
    t => !placedTiles.some(pt => pt.tile.id === t.id)
  );

  const handleCellClick = useCallback((row: number, col: number) => {
    if (!game || !isMyTurn || exchangeMode) return;

    // If there's already a placed tile here (from this turn), remove it
    const existingPlaced = placedTiles.find(pt => pt.row === row && pt.col === col);
    if (existingPlaced) {
      setPlacedTiles(prev => prev.filter(pt => !(pt.row === row && pt.col === col)));
      setSelectedTile(null);
      return;
    }

    // If cell is occupied on the board, ignore
    if (game.board[row][col] !== null) return;

    // If we have a selected tile, place it
    if (selectedTile) {
      setPlacedTiles(prev => [...prev, { tile: selectedTile, row, col }]);
      setSelectedTile(null);
    }
  }, [game, isMyTurn, selectedTile, placedTiles, exchangeMode]);

  const handleTileSelect = (tile: Tile) => {
    if (exchangeMode) {
      setSelectedForExchange(prev =>
        prev.includes(tile.id)
          ? prev.filter(id => id !== tile.id)
          : [...prev, tile.id]
      );
      return;
    }
    if (selectedTile?.id === tile.id) {
      setSelectedTile(null);
    } else {
      setSelectedTile(tile);
    }
  };

  const handleSubmitMove = async () => {
    if (!game || placedTiles.length === 0) return;
    setError('');

    const result = await makeMove(gameCode, placedTiles);
    if (result.success) {
      setPlacedTiles([]);
      setSelectedTile(null);
      setPreviewScore(null);
    } else {
      setError(result.error || 'Invalid move.');
    }
  };

  const handlePass = async () => {
    if (!game || !isMyTurn) return;
    setPlacedTiles([]);
    setSelectedTile(null);
    await passTurn(gameCode);
  };

  const handleExchange = async () => {
    if (!game || !isMyTurn || selectedForExchange.length === 0) return;
    if (game.bag.length === 0) {
      setError('No tiles left in the bag to exchange.');
      return;
    }
    await exchangeTiles(gameCode, selectedForExchange);
    setExchangeMode(false);
    setSelectedForExchange([]);
  };

  const handleRecall = () => {
    setPlacedTiles([]);
    setSelectedTile(null);
    setError('');
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(gameCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFlipTile = (tile: Tile) => {
    // Only for 6/9 tiles
    if (tile.rank !== '6' && tile.rank !== '9') return;

    // Check if tile is in placed tiles
    const placedIdx = placedTiles.findIndex(pt => pt.tile.id === tile.id);
    if (placedIdx >= 0) {
      const newPlaced = [...placedTiles];
      const currentDisplay = newPlaced[placedIdx].tile.displayRank || newPlaced[placedIdx].tile.rank;
      newPlaced[placedIdx] = {
        ...newPlaced[placedIdx],
        tile: {
          ...newPlaced[placedIdx].tile,
          displayRank: currentDisplay === '6' ? '9' : '6',
        }
      };
      setPlacedTiles(newPlaced);
    }
  };

  if (!game) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-slate-300">Loading game...</p>
        </div>
      </div>
    );
  }

  if (game.status === 'waiting') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-slate-800/90 backdrop-blur rounded-xl p-8 max-w-md w-full border border-slate-700 text-center">
          <h2 className="text-2xl font-bold text-amber-400 mb-4">Waiting for Opponent</h2>
          <p className="text-slate-300 mb-6">Share this code with your opponent:</p>
          <div className="bg-slate-900 rounded-lg p-4 mb-4">
            <span className="text-3xl font-mono font-bold text-white tracking-[0.3em]">
              {gameCode}
            </span>
          </div>
          <button
            onClick={handleCopyCode}
            className="py-2 px-6 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors mb-4"
          >
            {copied ? 'Copied!' : 'Copy Code'}
          </button>
          <div className="animate-pulse text-slate-400 text-sm mt-4">
            Waiting for player 2 to join...
          </div>
          <button
            onClick={onBack}
            className="mt-6 text-slate-400 hover:text-white text-sm underline"
          >
            ← Back to Lobby
          </button>
        </div>
      </div>
    );
  }

  if (game.status === 'finished') {
    const winner = game.players.find(p => p.id === game.winner);
    const isWinner = game.winner === playerId;
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-slate-800/90 backdrop-blur rounded-xl p-8 max-w-md w-full border border-slate-700 text-center">
          <h2 className="text-3xl font-bold mb-4">
            {isWinner ? (
              <span className="text-amber-400">You Won!</span>
            ) : (
              <span className="text-slate-300">Game Over</span>
            )}
          </h2>
          <p className="text-slate-300 mb-6">
            {winner ? `${winner.name} wins!` : 'Game ended in a tie!'}
          </p>
          <div className="space-y-2 mb-6">
            {game.players.map(p => (
              <div key={p.id} className={`flex justify-between items-center p-3 rounded-lg ${p.id === game.winner ? 'bg-amber-900/30 border border-amber-700' : 'bg-slate-700'}`}>
                <span className="text-white font-medium">{p.name}</span>
                <span className="text-xl font-bold text-amber-400">{p.score}</span>
              </div>
            ))}
          </div>
          <button
            onClick={onBack}
            className="py-3 px-6 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-lg transition-colors"
          >
            Back to Lobby
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Sidebar - Scores & Info */}
      <div className="lg:w-64 p-4 flex flex-col gap-4">
        {/* Game Code */}
        <div className="bg-slate-800/80 rounded-lg p-3 border border-slate-700">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Game Code</span>
            <button onClick={handleCopyCode} className="text-xs text-green-400 hover:text-green-300">
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <span className="font-mono text-lg text-white tracking-wider">{gameCode}</span>
        </div>

        {/* Turn Indicator */}
        <div className={`rounded-lg p-3 border ${isMyTurn ? 'bg-green-900/30 border-green-700' : 'bg-slate-800/80 border-slate-700'}`}>
          <p className="text-sm font-medium">
            {isMyTurn ? (
              <span className="text-green-400">Your Turn!</span>
            ) : (
              <span className="text-slate-400">Waiting for {currentPlayer?.name}...</span>
            )}
          </p>
        </div>

        {/* Scores */}
        <ScoreBoard players={game.players} currentPlayerId={playerId} />

        {/* Bag Count */}
        <div className="bg-slate-800/80 rounded-lg p-3 border border-slate-700">
          <span className="text-xs text-slate-400">Tiles in Bag</span>
          <p className="text-lg font-bold text-white">{game.bag.length}</p>
        </div>

        {/* History Toggle */}
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="bg-slate-800/80 rounded-lg p-3 border border-slate-700 text-left hover:bg-slate-700/80 transition-colors"
        >
          <span className="text-sm text-slate-300">
            {showHistory ? 'Hide' : 'Show'} Move History
          </span>
        </button>

        {showHistory && <MoveHistory moves={game.moveHistory} />}

        <button
          onClick={onBack}
          className="text-slate-500 hover:text-white text-sm mt-auto"
        >
          ← Back to Lobby
        </button>
      </div>

      {/* Main Game Area */}
      <div className="flex-1 flex flex-col items-center p-4 gap-4">
        {/* Board */}
        <Board
          board={game.board}
          placedTiles={placedTiles}
          lastMove={game.lastMove}
          onCellClick={handleCellClick}
          selectedTile={selectedTile}
        />

        {/* Preview Score */}
        {previewScore !== null && (
          <div className="bg-green-900/50 border border-green-700 rounded-lg px-4 py-2">
            <span className="text-green-300 font-medium">Score: +{previewScore} points</span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-900/50 border border-red-700 rounded-lg px-4 py-2 max-w-md">
            <span className="text-red-300 text-sm">{error}</span>
          </div>
        )}

        {/* Tile Rack */}
        {myPlayer && (
          <TileRack
            tiles={availableRack}
            selectedTile={selectedTile}
            selectedForExchange={selectedForExchange}
            exchangeMode={exchangeMode}
            onTileSelect={handleTileSelect}
            onFlipTile={handleFlipTile}
          />
        )}

        {/* Action Buttons */}
        {isMyTurn && (
          <div className="flex flex-wrap gap-2 justify-center">
            {!exchangeMode ? (
              <>
                <button
                  onClick={handleSubmitMove}
                  disabled={placedTiles.length === 0 || previewScore === null}
                  className="py-2 px-6 bg-green-600 hover:bg-green-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold rounded-lg transition-colors"
                >
                  Submit Move
                </button>
                <button
                  onClick={handleRecall}
                  disabled={placedTiles.length === 0}
                  className="py-2 px-4 bg-slate-600 hover:bg-slate-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg transition-colors"
                >
                  Recall
                </button>
                <button
                  onClick={() => setExchangeMode(true)}
                  disabled={game.bag.length === 0}
                  className="py-2 px-4 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg transition-colors"
                >
                  Exchange
                </button>
                <button
                  onClick={handlePass}
                  className="py-2 px-4 bg-red-700 hover:bg-red-600 text-white rounded-lg transition-colors"
                >
                  Pass
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleExchange}
                  disabled={selectedForExchange.length === 0}
                  className="py-2 px-6 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold rounded-lg transition-colors"
                >
                  Confirm Exchange ({selectedForExchange.length})
                </button>
                <button
                  onClick={() => { setExchangeMode(false); setSelectedForExchange([]); }}
                  className="py-2 px-4 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
