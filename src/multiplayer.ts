import type { GameState, PlacedTile } from './types';
import { createNewGame, joinGame, executeMove, executePass, executeExchange } from './gameLogic';

/**
 * Multiplayer infrastructure using a lightweight WebSocket relay.
 * 
 * Architecture:
 * - Game state is stored in localStorage as the source of truth for each player
 * - A free WebSocket relay (deployed on Render) syncs state between players
 * - Falls back to manual "refresh" polling if WebSocket is unavailable
 * 
 * For GitHub Pages deployment, we use a tiny relay server deployed on Render.com (free tier).
 */

// Relay server URL - deployed on Render free tier
// Falls back to localStorage-only mode if relay is unavailable
const RELAY_URL = getRelayUrl();

function getRelayUrl(): string {
  // Check if there's a custom relay URL set
  const custom = localStorage.getItem('kings-cribbage-relay-url');
  if (custom) return custom;
  // Default relay - will be set up on Render
  return 'wss://kings-cribbage-relay.onrender.com';
}

// WebSocket connection management
let ws: WebSocket | null = null;
let wsReconnectTimer: ReturnType<typeof setTimeout> | null = null;
let gameSubscriptions: Map<string, (game: GameState) => void> = new Map();

function connectWebSocket() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    return;
  }

  try {
    ws = new WebSocket(RELAY_URL);

    ws.onopen = () => {
      console.log('[Kings Cribbage] Connected to relay');
      // Re-subscribe to all active games
      for (const gameCode of gameSubscriptions.keys()) {
        ws?.send(JSON.stringify({ type: 'subscribe', gameCode }));
      }
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'gameUpdate' && msg.gameCode && msg.data) {
          const game = msg.data as GameState;
          // Save to localStorage
          saveGameToStorage(msg.gameCode, game);
          // Notify subscribers
          const callback = gameSubscriptions.get(msg.gameCode);
          if (callback) callback(game);
        }
      } catch (e) {
        console.warn('[Kings Cribbage] Failed to parse relay message:', e);
      }
    };

    ws.onclose = () => {
      console.log('[Kings Cribbage] Disconnected from relay, will retry...');
      scheduleReconnect();
    };

    ws.onerror = () => {
      console.warn('[Kings Cribbage] Relay connection error, falling back to local mode');
      ws?.close();
    };
  } catch (e) {
    console.warn('[Kings Cribbage] Could not connect to relay:', e);
    scheduleReconnect();
  }
}

function scheduleReconnect() {
  if (wsReconnectTimer) clearTimeout(wsReconnectTimer);
  wsReconnectTimer = setTimeout(() => {
    connectWebSocket();
  }, 5000);
}

function sendToRelay(gameCode: string, game: GameState) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'gameUpdate', gameCode, data: game }));
  }
}

// Initialize connection
connectWebSocket();

// ============ LOCAL STORAGE ============

function saveGameToStorage(gameCode: string, game: GameState) {
  localStorage.setItem(`kings-cribbage-game-${gameCode}`, JSON.stringify(game));
}

function loadGameFromStorage(gameCode: string): GameState | null {
  const data = localStorage.getItem(`kings-cribbage-game-${gameCode}`);
  if (!data) return null;
  try {
    return JSON.parse(data) as GameState;
  } catch {
    return null;
  }
}

// ============ PLAYER MANAGEMENT ============

export function getPlayerId(): string {
  let id = localStorage.getItem('kings-cribbage-player-id');
  if (!id) {
    id = 'player-' + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('kings-cribbage-player-id', id);
  }
  return id;
}

export function getPlayerName(): string {
  return localStorage.getItem('kings-cribbage-player-name') || '';
}

export function setPlayerName(name: string): void {
  localStorage.setItem('kings-cribbage-player-name', name);
}

// ============ GAME CODE ============

export function generateGameCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// ============ GAME OPERATIONS ============

export async function createGame(playerName: string): Promise<{ gameCode: string; game: GameState }> {
  const playerId = getPlayerId();
  setPlayerName(playerName);
  const gameCode = generateGameCode();
  const game = createNewGame(playerId, playerName);
  game.id = gameCode;

  saveGameToStorage(gameCode, game);
  sendToRelay(gameCode, game);

  return { gameCode, game };
}

export async function joinGameByCode(gameCode: string, playerName: string): Promise<GameState | null> {
  const playerId = getPlayerId();
  setPlayerName(playerName);

  // Try to get game from relay first
  const gameFromRelay = await fetchGameFromRelay(gameCode);
  const game = gameFromRelay || loadGameFromStorage(gameCode);

  if (!game) return null;

  if (game.status !== 'waiting') {
    if (game.players.some(p => p.id === playerId)) {
      saveGameToStorage(gameCode, game);
      return game;
    }
    return null;
  }

  const updatedGame = joinGame(game, playerId, playerName);
  saveGameToStorage(gameCode, updatedGame);
  sendToRelay(gameCode, updatedGame);

  return updatedGame;
}

async function fetchGameFromRelay(gameCode: string): Promise<GameState | null> {
  return new Promise((resolve) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      resolve(null);
      return;
    }

    const timeout = setTimeout(() => resolve(null), 3000);

    const handler = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'gameState' && msg.gameCode === gameCode) {
          clearTimeout(timeout);
          ws?.removeEventListener('message', handler);
          resolve(msg.data || null);
        }
      } catch { /* ignore */ }
    };

    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ type: 'getGame', gameCode }));
  });
}

export function subscribeToGame(gameCode: string, callback: (game: GameState) => void): () => void {
  gameSubscriptions.set(gameCode, callback);

  // Subscribe via WebSocket
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'subscribe', gameCode }));
  }

  // Immediately call back with local data
  const local = loadGameFromStorage(gameCode);
  if (local) {
    setTimeout(() => callback(local), 0);
  }

  // Set up polling as fallback (every 3 seconds)
  const pollInterval = setInterval(() => {
    if (ws && ws.readyState === WebSocket.OPEN) return; // WebSocket is handling it
    const game = loadGameFromStorage(gameCode);
    if (game) callback(game);
  }, 3000);

  return () => {
    gameSubscriptions.delete(gameCode);
    clearInterval(pollInterval);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'unsubscribe', gameCode }));
    }
  };
}

export async function makeMove(gameCode: string, placedTiles: PlacedTile[]): Promise<{ success: boolean; error?: string }> {
  const playerId = getPlayerId();
  const game = loadGameFromStorage(gameCode);

  if (!game) return { success: false, error: 'Game not found.' };

  const { game: updatedGame, result } = executeMove(game, playerId, placedTiles);
  if (!result.valid) {
    return { success: false, error: result.error };
  }

  saveGameToStorage(gameCode, updatedGame);
  sendToRelay(gameCode, updatedGame);

  // Notify local subscribers
  const callback = gameSubscriptions.get(gameCode);
  if (callback) callback(updatedGame);

  return { success: true };
}

export async function passTurn(gameCode: string): Promise<void> {
  const playerId = getPlayerId();
  const game = loadGameFromStorage(gameCode);
  if (!game) return;

  const updatedGame = executePass(game, playerId);
  saveGameToStorage(gameCode, updatedGame);
  sendToRelay(gameCode, updatedGame);

  const callback = gameSubscriptions.get(gameCode);
  if (callback) callback(updatedGame);
}

export async function exchangeTiles(gameCode: string, tileIds: string[]): Promise<void> {
  const playerId = getPlayerId();
  const game = loadGameFromStorage(gameCode);
  if (!game) return;

  const updatedGame = executeExchange(game, playerId, tileIds);
  saveGameToStorage(gameCode, updatedGame);
  sendToRelay(gameCode, updatedGame);

  const callback = gameSubscriptions.get(gameCode);
  if (callback) callback(updatedGame);
}

// ============ MY GAMES LIST ============

export function getMyGames(): string[] {
  const stored = localStorage.getItem('kings-cribbage-my-games');
  return stored ? JSON.parse(stored) : [];
}

export function addMyGame(gameCode: string): void {
  const games = getMyGames();
  if (!games.includes(gameCode)) {
    games.push(gameCode);
    localStorage.setItem('kings-cribbage-my-games', JSON.stringify(games));
  }
}

export function removeMyGame(gameCode: string): void {
  const games = getMyGames().filter(g => g !== gameCode);
  localStorage.setItem('kings-cribbage-my-games', JSON.stringify(games));
}
