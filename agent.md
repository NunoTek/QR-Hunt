# QR Hunt - Development Guidelines

## Project Overview

QR Hunt is a self-hostable QR code scavenger hunt platform that allows organizers to create interactive treasure hunts using QR codes. Teams scan QR codes placed around a venue to progress through clues, earn points, and compete on a real-time leaderboard.

## Tech Stack

### Backend
- **Runtime**: Node.js 20+
- **Framework**: Fastify 5.x - High-performance web framework
- **Database**: SQLite via better-sqlite3 - Embedded database for easy self-hosting
- **Language**: TypeScript 5.x - Type-safe JavaScript
- **Validation**: Zod - Runtime type validation

### Frontend
- **Framework**: Remix 2.x - Full-stack React framework with SSR
- **UI**: React 18 - Component-based UI library
- **Styling**: Tailwind CSS 4.x with CSS custom properties for theming (dark/light mode)
- **Build Tool**: Vite 6.x - Fast development and build tool
- **QR Generation**: qrcode library with custom logo support

### Real-time Features
- **Server-Sent Events (SSE)** - For live leaderboard and chat updates
- **Web Audio API** - Programmatic sound effects (no external files)

### Testing
- **Framework**: Vitest 2.x - Fast, Vite-native test runner
- **Coverage**: @vitest/coverage-v8

### Development Tools
- **TypeScript**: Strict type checking
- **ESLint**: Code linting
- **tsx**: TypeScript execution for development
- **npm-run-all**: Parallel script execution

## Architecture

```
├── app/                    # Remix frontend application
│   ├── components/         # Reusable React components
│   │   ├── Chat.tsx        # Real-time chat widget
│   │   ├── ClueDisplay.tsx # Clue content renderer
│   │   ├── Loading.tsx     # Loading spinner component
│   │   ├── QRCodeGenerator.tsx # QR code generator with logo support
│   │   ├── QRScanner.tsx   # Camera-based QR scanner
│   │   ├── ThemeToggle.tsx # Dark/light theme switcher
│   │   └── Toast.tsx       # Toast notification system
│   ├── lib/                # Client-side utilities
│   │   ├── api.ts          # API client helpers
│   │   └── sounds.ts       # Web Audio API sound effects
│   ├── styles/             # CSS styles
│   │   └── global.css      # Tailwind imports + CSS variables for theming
│   └── routes/             # Remix routes (pages)
│       ├── _index.tsx      # Landing page
│       ├── join.tsx        # Team join page
│       ├── play.$gameSlug.tsx # Team play interface
│       ├── leaderboard.$gameSlug.tsx # Public leaderboard
│       ├── admin.tsx       # Admin layout
│       ├── admin._index.tsx # Admin login
│       ├── admin.games._index.tsx # Games list
│       ├── admin.games.new.tsx # Create new game
│       ├── admin.games.$gameId.tsx # Game management
│       └── g.$gameSlug.n.$nodeKey.tsx # QR code redirect handler
├── server/                 # Backend API server
│   ├── api/                # API routes and middleware
│   │   ├── routes/         # Route handlers
│   │   │   ├── admin.ts    # Admin CRUD operations
│   │   │   ├── auth.ts     # Team authentication
│   │   │   ├── chat.ts     # Chat messaging
│   │   │   ├── health.ts   # Health check endpoints
│   │   │   ├── leaderboard.ts # Leaderboard with SSE
│   │   │   └── scan.ts     # QR scan processing
│   │   ├── middleware.ts   # Auth middleware
│   │   └── schemas.ts      # Zod validation schemas
│   ├── db/                 # Database setup and migrations
│   │   └── database.ts     # SQLite connection and migrations
│   ├── domain/             # Business logic layer
│   │   ├── repositories/   # Data access layer
│   │   │   ├── GameRepository.ts
│   │   │   ├── TeamRepository.ts
│   │   │   ├── NodeRepository.ts
│   │   │   ├── EdgeRepository.ts
│   │   │   ├── ScanRepository.ts
│   │   │   ├── SessionRepository.ts
│   │   │   └── ChatRepository.ts
│   │   ├── services/       # Business services
│   │   │   ├── AuthService.ts
│   │   │   ├── GameService.ts
│   │   │   └── ScanService.ts
│   │   └── types.ts        # Domain types
│   ├── lib/                # Server utilities
│   │   └── eventEmitter.ts # SSE event management
│   └── index.ts            # Server entry point
├── tests/                  # Test data directories
│   └── test-data-*/        # Isolated test databases
├── public/                 # Static assets
├── tailwind.config.js      # Tailwind CSS configuration
├── Dockerfile              # Container build
├── docker-compose.yml      # Container orchestration
└── Caddyfile               # Reverse proxy config
```

## Domain Model

### Core Entities

```typescript
// Game - A scavenger hunt instance
interface Game {
  id: string;
  name: string;
  publicSlug: string;        // URL-friendly identifier
  status: "draft" | "active" | "completed";
  settings: GameSettings;
  logoUrl: string | null;    // Custom game branding
  createdAt: string;
  updatedAt: string;
}

// GameSettings - Scoring configuration
interface GameSettings {
  rankingMode: "points" | "nodes" | "time";
  basePoints: number;
  timeBonusEnabled: boolean;
  timeBonusMultiplier: number;
}

// Team - Participating group
interface Team {
  id: string;
  gameId: string;
  code: string;              // 6-character join code (e.g., "ALPHA1")
  name: string;
  startNodeId: string | null; // Assigned starting point
  logoUrl: string | null;
  createdAt: string;
}

// Node - A QR code checkpoint with clue content
// IMPORTANT: The content tells players where to find the NEXT QR code!
interface Node {
  id: string;
  gameId: string;
  nodeKey: string;           // Unique key for QR URL
  title: string;             // Display name (shown on leaderboard as "looking for")
  content: string | null;    // Clue text pointing to NEXT location's QR code
  contentType: "text" | "image" | "video" | "audio" | "link";
  mediaUrl: string | null;   // Optional media (image/video/audio URL)
  passwordRequired: boolean; // Requires password to complete scan
  passwordHash: string | null;
  isStart: boolean;          // Can be assigned as team's starting point
  isEnd: boolean;            // Scanning this completes the game
  points: number;            // Points awarded when scanned
  metadata: Record<string, unknown>;
  createdAt: string;
}

// Edge - Connection between nodes (defines valid paths)
interface Edge {
  id: string;
  gameId: string;
  fromNodeId: string;
  toNodeId: string;
  condition: { type?: "password" | "always"; value?: string };
  sortOrder: number;
  createdAt: string;
}

// Scan - Record of a team scanning a node
interface Scan {
  id: string;
  gameId: string;
  teamId: string;
  nodeId: string;
  timestamp: string;
  clientIp: string | null;
  userAgent: string | null;
  pointsAwarded: number;
}

// ChatMessage - Communication between admin and teams
interface ChatMessage {
  id: string;
  gameId: string;
  senderType: "admin" | "team";
  senderId: string | null;
  senderName: string;
  recipientType: "all" | "team";  // Broadcast or private
  recipientId: string | null;      // Target team for private messages
  message: string;
  createdAt: string;
}
```

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/join` | Team joins game with code |
| POST | `/api/v1/auth/logout` | Team logout |
| GET | `/api/v1/auth/session` | Validate session |

### Admin Operations (requires `x-admin-code` header)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/admin/games` | List all games |
| POST | `/api/v1/admin/games` | Create game |
| GET | `/api/v1/admin/games/:id` | Get game details |
| PUT | `/api/v1/admin/games/:id` | Update game |
| DELETE | `/api/v1/admin/games/:id` | Delete game |
| GET | `/api/v1/admin/games/:id/teams` | List teams |
| POST | `/api/v1/admin/games/:id/teams` | Create team |
| PUT | `/api/v1/admin/teams/:id` | Update team |
| DELETE | `/api/v1/admin/teams/:id` | Delete team |
| GET | `/api/v1/admin/games/:id/nodes` | List nodes |
| POST | `/api/v1/admin/games/:id/nodes` | Create node |
| PUT | `/api/v1/admin/nodes/:id` | Update node |
| DELETE | `/api/v1/admin/nodes/:id` | Delete node |
| GET | `/api/v1/admin/games/:id/edges` | List edges |
| POST | `/api/v1/admin/games/:id/edges` | Create edge |
| DELETE | `/api/v1/admin/edges/:id` | Delete edge |

### Scan Operations (requires team auth)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/scan` | Record a QR scan |
| GET | `/api/v1/scan/progress` | Get team progress |

### Chat Operations
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/chat/messages` | Get messages (team) |
| POST | `/api/v1/chat/messages` | Send message (team) |
| GET | `/api/v1/chat/admin/:gameId/messages` | Get all messages (admin) |
| POST | `/api/v1/chat/admin/:gameId/messages` | Send message (admin) |
| DELETE | `/api/v1/chat/admin/messages/:id` | Delete message (admin) |

### Leaderboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/game/:slug/leaderboard` | Get leaderboard data |
| GET | `/api/v1/game/:slug/leaderboard/stream` | SSE stream for real-time updates |

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/health/live` | Liveness check |
| GET | `/api/v1/health/ready` | Readiness check |

## Features

### Game Management
- **Multi-game support**: Run multiple scavenger hunts simultaneously
- **Game status workflow**: Draft → Active → Completed
- **Activation requirements**: Requires at least 1 node, 1 start node, and 1 end node
- **Custom branding**: Upload game logo for QR codes and UI
- **Configurable scoring**: Points-based, node count, or time-based ranking

### Node System
- **Flexible content types**: Text, images, videos, audio, and links
- **Password protection**: Optional passwords on nodes for puzzles
- **Multiple start nodes**: Distribute teams across different starting points
- **Branching paths**: Create non-linear hunts with edges defining valid transitions

### Team Management
- **Auto-generated join codes**: 6-character unique codes per team
- **Start node assignment**: Automatic load-balancing across start nodes
- **Team logos**: Custom team branding
- **Progress tracking**: Full scan history with timestamps

### Real-time Features
- **Live leaderboard**: SSE-powered instant updates
- **Chat system**:
  - Admin can broadcast to all teams
  - Admin can send private messages to specific teams
  - Teams can only broadcast (visible to admin and all teams)
  - Unread message badges and notifications
- **Sound effects**: Audio feedback for scans and events

### QR Code Generation
- **Built-in generator**: Create QR codes directly in admin panel
- **Logo embedding**: Custom logo in QR center with error correction
- **Configurable error correction**: Low, Medium, Quartile, High (30%)
- **Download options**: PNG export for printing

### Admin Panel Features
- **Undo delete**: 20-second grace period to undo deletions
- **Game deletion protection**: Two-step confirmation requiring exact name match
- **Visual graph**: Node and edge relationship visualization
- **Bulk operations**: Multi-team creation, edge management

### Player Experience
- **Mobile-first design**: Responsive UI optimized for phones
- **Camera QR scanner**: Built-in scanner using device camera
- **Progress display**: "Your Journey" showing all scanned nodes
- **Starting clue**: Immediately visible upon joining
- **Dark/light theme**: User-selectable theme

## Development Principles

### 1. Clean Code
- Write readable, self-documenting code
- Use meaningful variable and function names
- Keep functions small and focused (single responsibility)
- Avoid deep nesting - prefer early returns
- Comment only when necessary (explain "why", not "what")

### 2. DRY (Don't Repeat Yourself)
- Extract common logic into reusable functions
- Use shared types and interfaces
- Create utility functions for repeated patterns
- BUT: Don't over-abstract prematurely

### 3. KISS (Keep It Simple, Stupid)
- Prefer simple solutions over clever ones
- Avoid over-engineering
- Start with the simplest implementation that works
- Refactor only when complexity is justified

### 4. YAGNI (You Aren't Gonna Need It)
- Don't build features "just in case"
- Implement only what's currently needed
- Avoid speculative generality
- Remove unused code promptly

### 5. SOLID Principles

#### Single Responsibility Principle (SRP)
Each class/module should have one reason to change.
```typescript
// Good: Separate concerns
class GameRepository { /* data access only */ }
class GameService { /* business logic only */ }
```

#### Open/Closed Principle (OCP)
Open for extension, closed for modification.

#### Liskov Substitution Principle (LSP)
Subtypes must be substitutable for their base types.

#### Interface Segregation Principle (ISP)
Prefer small, specific interfaces over large, general ones.

#### Dependency Inversion Principle (DIP)
Depend on abstractions, not concretions.

### 6. Test-Driven Development (TDD)

**Every feature or fix MUST include tests.**

#### The TDD Cycle
1. **Red**: Write a failing test first
2. **Green**: Write minimal code to make it pass
3. **Refactor**: Improve code while keeping tests green

#### Test Structure
```typescript
describe("FeatureName", () => {
  describe("methodName", () => {
    it("should do expected behavior", () => {
      // Arrange
      const input = createTestData();

      // Act
      const result = service.method(input);

      // Assert
      expect(result).toBe(expectedValue);
    });
  });
});
```

#### Test File Locations
```
server/domain/repositories/*.test.ts  # Repository unit tests
server/domain/services/*.test.ts      # Service unit tests
server/api/routes/*.test.ts           # API integration tests
server/lib/*.test.ts                  # Utility tests
```

#### Test Data Directories
Each test file uses an isolated SQLite database in `tests/test-data-*/`:
```typescript
beforeEach(async () => {
  process.env.DATA_DIR = "./tests/test-data-feature-name";
  await initializeDatabase();
});
```

#### Running Tests
```bash
npm test              # Watch mode
npm test -- --run     # Single run (CI)
npm run test:coverage # With coverage report
npm test -- path/to/file.test.ts  # Specific file
```

## Code Style Guidelines

### TypeScript
- Enable strict mode
- Prefer `interface` over `type` for object shapes
- Use explicit return types for public functions
- Avoid `any` - use `unknown` if type is truly unknown

### Naming Conventions
- **Files**: PascalCase for classes (`GameRepository.ts`), kebab-case for utilities
- **Classes**: PascalCase (`GameRepository`)
- **Functions/Methods**: camelCase (`findBySlug`)
- **Constants**: SCREAMING_SNAKE_CASE (`MAX_RETRIES`)
- **Interfaces**: PascalCase, no "I" prefix (`Game`, not `IGame`)
- **Test files**: Same name with `.test.ts` suffix

### Repository Pattern
```typescript
export class FeatureRepository {
  create(data: CreateInput): Feature { }
  findById(id: string): Feature | null { }
  findByGameId(gameId: string): Feature[] { }
  update(id: string, data: UpdateInput): Feature | null { }
  delete(id: string): boolean { }
}

export const featureRepository = new FeatureRepository();
```

Always export repositories in `server/domain/repositories/index.ts`.

### Service Pattern
```typescript
export class FeatureService {
  // Business logic that coordinates repositories
  doBusinessOperation(input: Input): Result { }
}

export const featureService = new FeatureService();
```

### Route Pattern
```typescript
export async function featureRoutes(fastify: FastifyInstance) {
  fastify.register(async (routes) => {
    routes.addHook("preHandler", requireAuth);

    routes.get("/endpoint", async (request, reply) => {
      // Use static imports at top of file
      const data = repository.find();
      return reply.send({ data });
    });
  });
}
```

## Database Conventions

### Schema
- Use snake_case for column names
- Include `created_at` timestamp on all tables
- Use foreign key constraints with ON DELETE CASCADE
- Add indexes for frequently queried columns

### Migrations
Located in `server/db/database.ts` as numbered migrations:
```typescript
{
  name: "001_initial_schema",
  sql: `CREATE TABLE ...`
},
{
  name: "002_add_feature",
  sql: `ALTER TABLE ...`
}
```

### Query Ordering
When ordering by timestamp, include `rowid` as tiebreaker for consistent ordering:
```sql
ORDER BY created_at DESC, rowid DESC
```

## Security

- Validate all user input with Zod schemas
- Use parameterized queries (built into better-sqlite3)
- Hash passwords with SHA-256 before storage
- Teams cannot send private messages to other teams (only broadcast)
- Admin code required for all admin operations
- Rate limiting on API endpoints
- Secure cookie options in production

## Game Flow

### How Clues Work
**Important**: Each node's content is a CLUE that tells players where to find the NEXT QR code.

```
Node A (Start)           Node B                    Node C (End)
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│ Title: "Start"  │      │ Title: "Clue 2" │      │ Title: "Finish" │
│ Content: "Go to │──────│ Content: "Look  │──────│ Content: "You   │
│ the fountain"   │      │ under the bench"│      │ found it all!"  │
│ Points: 100     │      │ Points: 150     │      │ Points: 200     │
└─────────────────┘      └─────────────────┘      └─────────────────┘
     ▲                        ▲                        ▲
     │                        │                        │
  QR Code A               QR Code B                QR Code C
  (at start)              (at fountain)            (under bench)
```

**Flow**:
1. Team sees Node A's content: "Go to the fountain"
2. Team finds QR Code B at the fountain and scans it
3. Team sees Node B's content: "Look under the bench"
4. Team finds QR Code C under the bench and scans it
5. Team sees Node C's content: "You found it all!" (game complete)

### Setup Phase (Admin)
1. Create a new game (draft status)
2. Add nodes - each node's **content is the clue to find the NEXT location**
3. Define edges connecting nodes (from_node → to_node)
4. Create teams with unique codes
5. Mark start nodes (where teams begin) and end nodes (game completion)
6. Activate game when ready

### Play Phase (Teams)
1. Team joins with game slug + team code
2. Receives session token and sees their **starting clue** (start node's content)
3. Uses the clue to find the first QR code location
4. Scans QR code with phone camera
5. Server validates: Is this node reachable from their last position? (via edges)
6. If valid: Team receives points and sees the **next clue** (scanned node's content)
7. Repeats until scanning an end node
8. Can chat with admin for hints

### Leaderboard
- Shows real-time rankings via Server-Sent Events
- **"Current clue"** displays the **next node they're looking for** (the one connected via edge from their last scan)
- When finished, shows "Finished!" badge
- Ranking modes: points (default), nodes found, or fastest time

### Completion
1. First team to scan an end node is marked as winner
2. Leaderboard shows final rankings with winner highlighted
3. Teams see victory/defeat screen with their stats
4. Admin can complete/archive game

## Adding New Features

### Checklist
1. [ ] Write tests first (TDD)
2. [ ] Implement minimal code to pass tests
3. [ ] Add types to `server/domain/types.ts`
4. [ ] Create/update repository if data access needed
5. [ ] Create/update service if business logic needed
6. [ ] Add API routes with Zod validation
7. [ ] Export in index.ts files
8. [ ] Update this documentation
9. [ ] Run full test suite: `npm test -- --run`
10. [ ] Run type check: `npm run typecheck`

### Example: Adding a New Entity

```typescript
// 1. Add type (server/domain/types.ts)
export interface NewEntity {
  id: string;
  gameId: string;
  // ...fields
  createdAt: string;
}

// 2. Add migration (server/db/database.ts)
{
  name: "004_add_new_entity",
  sql: `
    CREATE TABLE new_entities (
      id TEXT PRIMARY KEY,
      game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX idx_new_entities_game_id ON new_entities(game_id);
  `
}

// 3. Create repository with tests
// server/domain/repositories/NewEntityRepository.ts
// server/domain/repositories/NewEntityRepository.test.ts

// 4. Export in index.ts
export { newEntityRepository, NewEntityRepository } from "./NewEntityRepository.js";

// 5. Add routes if needed
// server/api/routes/newEntity.ts
// server/api/routes/newEntity.test.ts
```

## Deployment

### Docker
```bash
docker-compose up -d
```

The application is designed for easy self-hosting:
- Single SQLite database file in `/app/data`
- No external dependencies required
- Caddy reverse proxy for HTTPS
- Health checks for orchestrator compatibility

### Environment Variables
```env
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
DATA_DIR=/app/data
ADMIN_CODE=your-secure-admin-code
```

### Dockerfile Notes
- Multi-stage build for smaller image
- Alpine base for minimal footprint
- Requires build tools for better-sqlite3 native compilation
- Data volume for persistence

## npm Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development servers (API + Remix) |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm test` | Run tests in watch mode |
| `npm test -- --run` | Run tests once |
| `npm run test:coverage` | Run tests with coverage |
| `npm run typecheck` | TypeScript type checking |
| `npm run lint` | ESLint code linting |
| `npm run db:migrate` | Run database migrations |
| `npm run db:seed` | Seed database with test data |
