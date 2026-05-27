const { WebSocketServer } = require('ws');
const http = require('http');

const PORT = process.env.PORT || 8080;

// In-memory game state store
const games = new Map();
// Track which clients are subscribed to which games
const subscriptions = new Map(); // gameCode -> Set<ws>

const server = http.createServer((req, res) => {
  // Health check endpoint
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', games: games.size }));
    return;
  }
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Kings Cribbage Relay Server');
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  const clientSubscriptions = new Set();

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());

      switch (msg.type) {
        case 'subscribe': {
          const { gameCode } = msg;
          if (!gameCode) break;
          clientSubscriptions.add(gameCode);
          if (!subscriptions.has(gameCode)) {
            subscriptions.set(gameCode, new Set());
          }
          subscriptions.get(gameCode).add(ws);

          // Send current game state if available
          if (games.has(gameCode)) {
            ws.send(JSON.stringify({
              type: 'gameUpdate',
              gameCode,
              data: games.get(gameCode),
            }));
          }
          break;
        }

        case 'unsubscribe': {
          const { gameCode } = msg;
          if (!gameCode) break;
          clientSubscriptions.delete(gameCode);
          subscriptions.get(gameCode)?.delete(ws);
          break;
        }

        case 'getGame': {
          const { gameCode } = msg;
          if (!gameCode) break;
          const gameData = games.get(gameCode) || null;
          ws.send(JSON.stringify({
            type: 'gameState',
            gameCode,
            data: gameData,
          }));
          break;
        }

        case 'gameUpdate': {
          const { gameCode, data: gameData } = msg;
          if (!gameCode || !gameData) break;

          // Store the game state
          games.set(gameCode, gameData);

          // Broadcast to all subscribers except sender
          const subs = subscriptions.get(gameCode);
          if (subs) {
            const broadcast = JSON.stringify({
              type: 'gameUpdate',
              gameCode,
              data: gameData,
            });
            for (const client of subs) {
              if (client !== ws && client.readyState === 1) {
                client.send(broadcast);
              }
            }
          }
          break;
        }
      }
    } catch (e) {
      console.error('Error processing message:', e.message);
    }
  });

  ws.on('close', () => {
    // Clean up subscriptions for this client
    for (const gameCode of clientSubscriptions) {
      subscriptions.get(gameCode)?.delete(ws);
      if (subscriptions.get(gameCode)?.size === 0) {
        subscriptions.delete(gameCode);
      }
    }
  });

  ws.on('error', (err) => {
    console.error('WebSocket error:', err.message);
  });
});

// Clean up old games every hour (games older than 7 days)
setInterval(() => {
  const now = Date.now();
  const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
  for (const [code, game] of games) {
    if (game.updatedAt && now - game.updatedAt > maxAge) {
      games.delete(code);
      subscriptions.delete(code);
    }
  }
}, 60 * 60 * 1000);

server.listen(PORT, () => {
  console.log(`Kings Cribbage Relay Server running on port ${PORT}`);
});
