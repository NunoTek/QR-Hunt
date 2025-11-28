# QR Hunt

A self-hostable QR code scavenger hunt platform. Create interactive treasure hunts where participants scan QR codes to progress through clues, communicate with organizers, and compete on real-time leaderboards.

## Features

### Game Management
- **Multi-game Support**: Run multiple scavenger hunts simultaneously
- **Game Status Workflow**: Draft → Active → Completed lifecycle
- **Custom Branding**: Upload logos for games and QR codes
- **Configurable Scoring**: Points-based, node count, or time-based ranking
- **Score Reset**: Changing status to "draft" resets all team progress

### Node System
- **Flexible Content Types**: Text, images, videos, audio, or links
- **Password Protection**: Optional passwords on nodes for puzzles
- **Multiple Start/End Points**: Define multiple valid starting and ending locations
- **Collect-All-Clues Gameplay**: Teams must find ALL QR codes, not just follow a path

### Team Experience
- **Instant Join**: Teams join with a simple code - no app download needed
- **Auto-Submit Join Code**: Automatically submits when 6-character code is complete
- **Built-in QR Scanner**: Camera-based scanning directly in the browser
- **Progress Tracking**: Shows X/Y QR codes found with complete scan history
- **Clue-Based Navigation**: Each scan reveals the next clue to find the next QR code
- **Fixed Points Display**: Points always visible at top-right while playing
- **Dark/Light Theme**: User-selectable theme preference

### Real-time Features
- **Live Leaderboard**: Instant updates via Server-Sent Events (SSE)
- **Chat System**:
  - Admin can broadcast to all teams or send private messages
  - Teams can communicate with organizers
  - Unread message notifications with badges
- **Sound Effects**: Audio feedback for scans and events

### QR Code Generation
- **Built-in Generator**: Create QR codes directly in admin panel
- **Logo Embedding**: Custom logo in QR center with error correction
- **Configurable Error Correction**: Low, Medium, Quartile, High (30%)
- **Multiple Export Options**: Download as PNG or SVG, print directly
- **QR Identify Scanner**: Scan any QR code to identify which node it belongs to

### Admin Panel
- **Visual Game Builder**: Intuitive interface for creating hunts
- **Game Logo Display**: Shows game logo next to name in admin header
- **Undo Delete**: 20-second grace period to recover deletions
- **Game Deletion Modal**: Secure deletion with name confirmation dialog
- **Team Management**: Create, edit, and monitor teams
- **Real-time Monitoring**: Watch team progress as they play

### Deployment
- **Self-Hosted**: Your data stays on your server
- **Docker Ready**: One-command deployment
- **Automatic HTTPS**: Via Caddy reverse proxy
- **SQLite Database**: No external database required

## Quick Start

### Using Docker Compose (Recommended)

```bash
# Clone the repository
git clone https://github.com/yourusername/qr-hunt.git
cd qr-hunt

# Create environment file
cp .env.example .env

# Edit .env with your settings
# ADMIN_CODE=your-secure-admin-code
# DOMAIN=your-domain.com

# Start the application
docker compose up -d
```

The application will be available at:
- `http://localhost` (or your configured domain)
- HTTPS is automatically configured when using a real domain

### Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The app runs on `http://localhost:5173` (Remix) with the API on port `3002`.

## Usage

### For Organizers

1. **Access Admin Panel**: Navigate to `/admin` and enter your admin code
2. **Create a Game**: Click "New Game" and configure settings
3. **Add Nodes**: Create checkpoints with clues and point values
4. **Connect Nodes**: Define the path using edges (connections)
5. **Create Teams**: Generate teams with unique join codes
6. **Generate QR Codes**: Download and print QR codes for each node
7. **Activate Game**: Start the hunt when ready
8. **Monitor Progress**: Watch the leaderboard and chat with teams

### For Players

1. **Join Game**: Visit the game URL and enter your team code (auto-submits when complete)
2. **View Starting Clue**: Your first clue appears immediately - it tells you where to find the first QR code
3. **Find & Scan**: Use the clue to locate the QR code, then scan it with the built-in scanner
4. **Follow the Trail**: After each scan, a new clue appears guiding you to the next QR code
5. **Track Progress**: Your points are always visible at the top-right; see X/Y QR codes found
6. **Find All QR Codes**: Scan every QR code (order doesn't matter after starting)
7. **Chat with Admin**: Ask for hints or report issues anytime
8. **Win!**: First team to find ALL QR codes and scan an end node wins

## API Reference

### Public Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/join` | Join a game with team code |
| POST | `/api/v1/auth/logout` | Logout team session |
| GET | `/api/v1/auth/session` | Validate current session |
| GET | `/api/v1/game/:slug/leaderboard` | Get leaderboard data |
| GET | `/api/v1/game/:slug/leaderboard/stream` | SSE stream for live updates |
| GET | `/api/v1/health/live` | Liveness check |
| GET | `/api/v1/health/ready` | Readiness check |

### Team Endpoints (Requires Auth)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/scan` | Record a QR code scan |
| GET | `/api/v1/scan/progress` | Get team's current progress |
| GET | `/api/v1/chat/messages` | Get chat messages |
| POST | `/api/v1/chat/messages` | Send chat message |

### Admin Endpoints (Requires X-Admin-Code header)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/admin/games` | List all games |
| POST | `/api/v1/admin/games` | Create a game |
| GET | `/api/v1/admin/games/:id` | Get game details |
| PUT | `/api/v1/admin/games/:id` | Update game |
| DELETE | `/api/v1/admin/games/:id` | Delete game |
| GET | `/api/v1/admin/games/:id/nodes` | List nodes |
| POST | `/api/v1/admin/games/:id/nodes` | Create node |
| PUT | `/api/v1/admin/nodes/:id` | Update node |
| DELETE | `/api/v1/admin/nodes/:id` | Delete node |
| GET | `/api/v1/admin/games/:id/edges` | List edges |
| POST | `/api/v1/admin/games/:id/edges` | Create edge |
| DELETE | `/api/v1/admin/edges/:id` | Delete edge |
| GET | `/api/v1/admin/games/:id/teams` | List teams |
| POST | `/api/v1/admin/games/:id/teams` | Create team |
| PUT | `/api/v1/admin/teams/:id` | Update team |
| DELETE | `/api/v1/admin/teams/:id` | Delete team |
| GET | `/api/v1/chat/admin/:gameId/messages` | Get all chat messages |
| POST | `/api/v1/chat/admin/:gameId/messages` | Send chat message |
| DELETE | `/api/v1/chat/admin/messages/:id` | Delete chat message |

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Environment mode |
| `PORT` | `3002` | API server port |
| `HOST` | `0.0.0.0` | Server bind address |
| `DATA_DIR` | `./data` | SQLite database directory |
| `ADMIN_CODE` | `admin123` | Admin authentication code |
| `DOMAIN` | `localhost` | Public domain (for Docker/Caddy) |

### Game Settings

```typescript
{
  rankingMode: "points" | "nodes" | "time",
  basePoints: number,
  timeBonusEnabled: boolean,
  timeBonusMultiplier: number
}
```

## Architecture

```
qr-hunt/
├── app/                    # Remix frontend
│   ├── components/         # React components
│   │   ├── Chat.tsx        # Real-time chat widget
│   │   ├── ClueDisplay.tsx # Clue renderer
│   │   ├── QRCodeGenerator.tsx # QR generator with logo
│   │   ├── QRIdentifyScanner.tsx # QR scanner for identifying nodes
│   │   ├── QRScanner.tsx   # Camera scanner for gameplay
│   │   └── Toast.tsx       # Notifications
│   └── routes/             # Page routes
├── server/                 # Fastify backend
│   ├── api/routes/         # API endpoints
│   │   ├── admin.ts        # Admin CRUD
│   │   ├── auth.ts         # Authentication
│   │   ├── chat.ts         # Chat messaging
│   │   ├── leaderboard.ts  # Leaderboard + SSE
│   │   └── scan.ts         # QR scanning
│   ├── db/                 # SQLite + migrations
│   └── domain/             # Business logic
│       ├── repositories/   # Data access
│       ├── services/       # Business services
│       └── types.ts        # TypeScript types
├── tests/                  # Test data directories
├── Dockerfile              # Container build
├── docker-compose.yml      # Production deployment
└── Caddyfile               # Reverse proxy config
```

## Development

```bash
# Install dependencies
npm install

# Run in development mode (API + Remix in parallel)
npm run dev

# Type checking
npm run typecheck

# Run tests
npm test

# Run tests once (CI mode)
npm test -- --run

# Build for production
npm run build

# Start production server
npm start
```

## Testing

The project uses Vitest for testing with isolated SQLite databases per test file:

```bash
# Run all tests in watch mode
npm test

# Run tests once
npm test -- --run

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- server/domain/repositories/GameRepository.test.ts
```

## Deployment

### Docker (Recommended)

```bash
# Production with automatic HTTPS
DOMAIN=hunt.example.com docker compose up -d

# View logs
docker compose logs -f

# Stop
docker compose down
```

### Manual

```bash
# Build
npm run build

# Set environment variables
export NODE_ENV=production
export ADMIN_CODE=your-secure-code
export DATA_DIR=/var/lib/qr-hunt

# Start
npm start
```

## Tech Stack

- **Backend**: Node.js 20+, Fastify 5, TypeScript, SQLite
- **Frontend**: Remix 2, React 18, Vite 6
- **Real-time**: Server-Sent Events (SSE)
- **Testing**: Vitest
- **Deployment**: Docker, Caddy

## License

MIT
