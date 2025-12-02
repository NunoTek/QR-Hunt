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

## Screenshots

<p align="center">
  <img src="public/screenshots/mobile-dark-play-scan.jpg" width="150" alt="QR Scanner"/>
  <img src="public/screenshots/mobile-dark-play-clue.jpg" width="150" alt="Clue Display"/>
  <img src="public/screenshots/mobile-dark-play-progress.jpg" width="150" alt="Progress Tracking"/>
  <img src="public/screenshots/mobile-dark-leaderboard.jpg" width="150" alt="Live Leaderboard"/>
  <img src="public/screenshots/mobile-dark-play-chat.jpg" width="150" alt="Team Chat"/>
</p>

## Features

### For Players
| Feature | Description |
|---------|-------------|
| Instant Join | 6-character code auto-submits — no signup required |
| Pre-filled Join | Share links with `?teamCode=ABC123` for animated auto-fill |
| Browser Scanner | Camera-based QR scanning, works on any device |
| Clue Navigation | Each scan reveals the next clue |
| Progress Tracking | See X/Y codes found, points always visible |
| Offline Mode | Cached clues visible without network, syncs when back online |
| Waiting Room | See "X of Y ready" teams with real-time connection status |
| Team Chat | Message organizers for hints |
| Dark/Light Theme | User preference |

### For Organizers
| Feature | Description |
|---------|-------------|
| Visual Builder | Drag-and-drop node creation |
| Multi-game Support | Run multiple hunts simultaneously |
| QR Generator | Built-in with logo embedding and error correction |
| Share Links | Copy team join links with pre-filled codes |
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
- **671 tests** — Comprehensive test coverage

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
# App: http://localhost:3000 | API: http://localhost:3002
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
├── components/       # UI components
│   ├── Button.tsx    # Polymorphic button (button/link/anchor)
│   ├── Modal.tsx     # Centralized modal with header/footer
│   ├── Card.tsx      # Card container
│   ├── WaitingRoom.tsx # Pre-game lobby with team presence
│   └── ...           # QRScanner, Chat, ClueDisplay, etc.
├── routes/           # Pages: play, join, admin, leaderboard
├── hooks/            # Shared logic (useQRScanner, useSSE)
└── i18n/             # Translations (en, fr, pt)

server/               # Fastify backend
├── api/routes/       # REST endpoints + SSE streams
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
**Frontend:** Remix 2, React 18, Vite 6, Tailwind
**Real-time:** Server-Sent Events
**Deploy:** Docker, Caddy

## License

MIT
