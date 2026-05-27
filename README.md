# Kings Cribbage - Online Multiplayer

A web-based multiplayer implementation of Kings Cribbage — a board game that combines the tile-placement mechanics of Scrabble with the scoring system of Cribbage.

Play turn-by-turn with friends and family, just like Words With Friends!

## How to Play

1. **Create a Game**: Enter your name and click "Create New Game"
2. **Share the Code**: Send the 6-letter game code to your opponent
3. **Opponent Joins**: They enter the code on their device and click "Join"
4. **Take Turns**: Place tiles on the board to form Cribbage scoring combinations

### Scoring
- **Fifteen** (any tiles summing to 15) = 2 points
- **Pair** = 2 points
- **Three of a Kind** = 6 points
- **Four of a Kind** = 12 points
- **Run of 3, 4, or 5** = 3, 4, or 5 points
- **First Play Bonus** = 10 points
- **All Five Tiles Bonus** = 10 points
- **Flush (5 same color)** = 10 points

### Rules
- First player must place at least 2 tiles
- All tiles must be in a straight line
- Every line formed must be a valid scoring combination (no "dead wood")
- No line can exceed 5 tiles
- After the first move, new tiles must connect to existing tiles
- 6s and 9s can be flipped (click the arrow button)

## Architecture

- **Frontend**: React + TypeScript + TailwindCSS (deployed on GitHub Pages)
- **Relay Server**: Node.js WebSocket server (deployed on Render free tier)
- **State Sync**: Real-time WebSocket with localStorage fallback

## Deployment

### Frontend (GitHub Pages)
The frontend automatically deploys via GitHub Actions when you push to `main`.

### Relay Server (Render)
The relay server needs to be deployed separately:

1. Go to [Render.com](https://render.com) and sign up (free, no credit card)
2. Click "New" → "Web Service"
3. Connect your GitHub repo
4. Set the **Root Directory** to `relay-server`
5. Set **Build Command** to `npm install`
6. Set **Start Command** to `node server.js`
7. Choose the **Free** plan
8. Deploy!

After deploying, update the relay URL in `src/multiplayer.ts` to match your Render URL.

## Development

```bash
# Install dependencies
pnpm install

# Start the relay server (in a separate terminal)
cd relay-server && npm install && node server.js

# Start the frontend dev server
pnpm dev
```

## Tech Stack

- [Vite](https://vitejs.dev/) - Build tool
- [React](https://react.dev/) - UI framework
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [TailwindCSS](https://tailwindcss.com/) - Styling
- [WebSocket](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket) - Real-time sync

## License

MIT
