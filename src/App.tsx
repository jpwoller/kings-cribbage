import { useState } from 'react';
import { Lobby } from './components/Lobby';
import { GameView } from './components/GameView';
import { getPlayerName } from './multiplayer';

type Screen = 'lobby' | 'game';

function App() {
  const [screen, setScreen] = useState<Screen>('lobby');
  const [gameCode, setGameCode] = useState<string>('');
  const [playerName, setPlayerNameState] = useState(getPlayerName());

  const handleStartGame = (code: string) => {
    setGameCode(code);
    setScreen('game');
  };

  const handleBackToLobby = () => {
    setScreen('lobby');
    setGameCode('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-green-950 to-slate-900">
      {screen === 'lobby' && (
        <Lobby
          playerName={playerName}
          onNameChange={setPlayerNameState}
          onStartGame={handleStartGame}
        />
      )}
      {screen === 'game' && gameCode && (
        <GameView
          gameCode={gameCode}
          onBack={handleBackToLobby}
        />
      )}
    </div>
  );
}

export default App;
