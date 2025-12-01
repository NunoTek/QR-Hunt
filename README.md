# QR Hunt

**Create memorable scavenger hunts in minutes.** A self-hostable platform for QR code treasure hunts with real-time leaderboards, team chat, and no app downloads required.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## What is QR Hunt?

QR Hunt is an interactive treasure hunt game where teams race to find hidden QR codes scattered around a location. Each QR code reveals a clue leading to the next location. The first team to find all codes wins!

### The Player Experience

```
┌─────────────────────────────────────────────────────────────────┐
│                         TEAM JOINS                               │
│  Player opens link → Enters 6-digit team code → Ready to play   │
└─────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        READ THE CLUE                             │
│  "Find the old oak tree near the fountain in the main square"   │
└─────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      HUNT & DISCOVER                             │
│  Team discusses → Explores the area → Finds the hidden QR code  │
└─────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         SCAN & SCORE                             │
│  Opens camera → Scans QR → Points awarded → Next clue revealed  │
└─────────────────────────────────────────────────────────────────┘
                              ▼
                    ↺ Repeat until victory!
```

### Perfect For

- **Team building events** — Get colleagues collaborating and exploring
- **Birthday parties** — Turn any venue into an adventure
- **Educational activities** — Campus tours, museum hunts, history walks
- **Corporate events** — Conferences, onboarding, product launches
- **Community events** — City-wide hunts, festival activities

## Why QR Hunt?

- **Zero friction for players** — Join with a 6-digit code, scan with your camera, no app needed
- **Works offline** — Cached clues, pending scans sync when back online
- **Installable PWA** — Add to home screen for native app experience
- **GDPR compliant** — Cookie-free authentication using localStorage
- **Real-time everything** — Live leaderboards, instant chat, immediate feedback
- **Team presence** — See who's online in waiting room before the game starts
- **Self-hosted** — Your data, your server, one Docker command
- **Multilingual** — Built-in support for English, French, and Portuguese
- **Flexible gameplay** — Linear paths, random exploration, or collect-them-all modes

## Features

### For Players
| Feature | Description |
|---------|-------------|
| Instant Join | 6-character code auto-submits — no signup required |
| Browser Scanner | Camera-based QR scanning, works on any device |
| Clue Navigation | Each scan reveals the next clue |
| Progress Tracking | See X/Y codes found, points always visible |
| Offline Mode | Cached clues visible without network, syncs when back online |
| Waiting Room | See other teams, connection status before game starts |
| Team Chat | Message organizers for hints |
| Dark/Light Theme | User preference |

### For Organizers
| Feature | Description |
|---------|-------------|
| Visual Builder | Drag-and-drop node creation |
| Multi-game Support | Run multiple hunts simultaneously |
| QR Generator | Built-in with logo embedding and error correction |
| Real-time Monitor | Watch team progress live |
| Performance Charts | Analyze team timing per clue |
| Team Presence | See which teams are online in waiting room |
| Broadcast Chat | Message all teams or individuals |
| Undo Delete | 20-second recovery window |

### Game Modes
- **Linear** — Teams follow a fixed path from start to end
- **Random** — Any order after the starting clue, shuffle for variety
- **Collect All** — Find every QR code to complete the hunt

### Ranking Modes
- **Points** — Rank teams by total points earned
- **Clues Found** — Rank by number of clues discovered
- **Time** — Fastest team to complete wins

### Technical
- **SSE Leaderboards** — Instant updates without polling
- **Heartbeat System** — Real-time team presence detection with 15s timeout
- **Cookie-free Auth** — localStorage + Bearer tokens for GDPR compliance
- **Offline Support** — Cached game data, pending scan queue
- **PWA Ready** — Installable progressive web app
- **SQLite** — No external database needed
- **Docker + Caddy** — One-command deploy with auto HTTPS
- **i18n Support** — English, French, Portuguese translations
- **414 tests** — Comprehensive test coverage

## Quick Start

### Docker (Recommended)

```bash
git clone https://github.com/yourusername/qr-hunt.git
cd qr-hunt
cp .env.example .env
# Edit .env: set ADMIN_CODE and DOMAIN
docker compose up -d
```

### Local Development

```bash
npm install
npm run dev
# App: http://localhost:5173 | API: http://localhost:3002
```

## How It Works

**Organizers:**
1. Access `/admin` → Create game → Add nodes with clues → Connect them
2. Generate QR codes → Print and place them
3. Create teams → Share join codes → Activate game

**Players:**
1. Visit game URL → Enter team code
2. Read clue → Find location → Scan QR
3. Repeat until all codes found → Win!

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `ADMIN_CODE` | `admin123` | Admin panel access code |
| `DOMAIN` | `localhost` | Your domain (enables HTTPS) |
| `DATA_DIR` | `./data` | Database location |
| `PORT` | `3002` | API port |

## Architecture

```
app/                  # Remix frontend (React)
├── components/       # QRScanner, Chat, ClueDisplay...
├── routes/           # Pages: play, join, admin, leaderboard
└── hooks/            # Shared logic (useQRScanner)

server/               # Fastify backend
├── api/routes/       # REST endpoints
├── domain/           # Business logic & repositories
└── db/               # SQLite migrations
```

## Commands

```bash
npm run dev          # Development mode
npm run build        # Production build
npm start            # Start production server
npm test             # Run tests (watch mode)
npm run typecheck    # Type checking
```

## Tech Stack

**Backend:** Node.js 20+, Fastify 5, TypeScript, SQLite
**Frontend:** Remix 2, React 18, Vite 6
**Real-time:** Server-Sent Events
**Deploy:** Docker, Caddy

## License

MIT
