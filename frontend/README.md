# Legal Agents — Frontend

Single-page chat interface for a multi-agent legal services platform. Streams responses from a Python backend via SSE and renders charts, tables, and downloadable deliverables in real time.

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.2 (App Router) |
| Language | TypeScript 5.7, React 19 |
| Compiler | React Compiler (babel-plugin-react-compiler) |
| Styling | Tailwind CSS 3.4 + shadcn/ui (Radix primitives) |
| Charts | Recharts 2.15 |
| Theme | next-themes (light/dark) |
| Bundler | Turbopack (dev), Webpack (build) |

## Prerequisites

- **Node.js** >= 22 (LTS)
- **npm** >= 10
- Python backend running (default `http://localhost:8000`)

## Local Development

```bash
# Install dependencies
npm install

# Start dev server (port 3000)
npm run dev

# Lint
npm run lint

# Type check (no emit)
npx tsc --noEmit

# Production build
npm run build

# Start production server locally
npm run start
```

The frontend proxies all API calls to `PYTHON_BACKEND_URL`. To use a custom backend:

```bash
# Option 1: .env.local file
echo "PYTHON_BACKEND_URL=http://your-backend:8000" > .env.local
npm run dev

# Option 2: inline
PYTHON_BACKEND_URL=http://your-backend:8000 npm run dev
```

## Project Structure

```
frontend/
├── app/
│   ├── layout.tsx              # Root layout (fonts, ThemeProvider, Toaster)
│   ├── page.tsx                # Redirect / → /legal
│   ├── globals.css             # CSS variables, animations
│   ├── legal/
│   │   ├── page.tsx            # Server Component: cookie check + redirect
│   │   ├── LegalRedirect.tsx   # Client: loading/retry UI
│   │   └── [sessionId]/
│   │       └── page.tsx        # Main chat interface
│   ├── api/
│   │   ├── agents/
│   │   │   ├── chat/route.ts           # POST → backend /api/chat (SSE proxy)
│   │   │   └── sessions/              # CRUD proxy for sessions
│   │   │       ├── route.ts           # GET list, POST create (accepts optional {name})
│   │   │       └── [id]/
│   │   │           ├── route.ts       # GET detail, DELETE
│   │   │           ├── status/route.ts
│   │   │           ├── upload/route.ts
│   │   │           └── files/
│   │   │               ├── route.ts          # GET file list
│   │   │               └── [filename]/route.ts # GET download
│   │   └── session-cookie/route.ts    # Cookie management
│   └── actions/
│       └── session-cookie.ts   # Client helpers for cookie API
├── components/
│   ├── ui/                     # shadcn/ui primitives (do not edit)
│   ├── ChatMessages.tsx        # Message list + empty state
│   ├── ChatInput.tsx           # Input form + file upload
│   ├── ChartRenderer.tsx       # Bar, line, pie, area charts
│   ├── SafeChartRenderer.tsx   # Error boundary + PNG export
│   ├── TableRenderer.tsx       # Markdown table rendering
│   ├── VisualizationPanel.tsx  # Right panel (charts + tables + files)
│   ├── SessionControls.tsx     # Session dropdown + delete dialog
│   ├── TopNavBar.tsx           # Logo + theme toggle
│   ├── AgentBadge.tsx          # Agent slug + tools badges
│   ├── FilePreview.tsx         # File thumbnail/preview
│   ├── FileOutputList.tsx      # Download links for generated files
│   ├── CookieConsent.tsx       # Cookie consent banner
│   └── theme-provider.tsx      # next-themes wrapper
├── hooks/
│   ├── useSession.ts           # Session CRUD + cookie/sessionStorage persistence
│   ├── useAgentStream.ts       # SSE parsing + message accumulation
│   └── use-toast.ts            # Toast notification system
├── types/
│   ├── agent.ts                # Message, Session, SSE types
│   └── chart.ts                # ChartData, ChartConfig
├── utils/
│   ├── fileHandling.ts         # File → base64 conversion
│   ├── extractTables.ts        # Markdown table extraction
│   ├── stripFilePaths.ts       # Remove internal paths from output
│   └── cleanAgentContent.ts    # Filter agent narration
├── lib/
│   └── utils.ts                # cn() helper (clsx + tailwind-merge)
└── public/
    ├── ant-logo.svg
    ├── hero.png
    ├── wordmark.svg
    └── wordmark-dark.svg
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PYTHON_BACKEND_URL` | URL of the Python backend API | `http://localhost:8000` |

All API routes in `app/api/` proxy requests to this URL. No business logic lives in the frontend — it is a pure presentation layer.

## Deploying to Vercel

### First-time setup

```bash
# Install Vercel CLI globally
npm i -g vercel

# Login
vercel login

# Link the project (from frontend/ directory)
vercel link
```

This creates `.vercel/project.json` with `projectId` and `orgId`.

### Configure environment variables

```bash
# Set the backend URL for all environments
vercel env add PYTHON_BACKEND_URL production
# Enter: http://your-backend-host:8000

vercel env add PYTHON_BACKEND_URL preview
# Enter: http://your-backend-host:8000

# Verify
vercel env ls

# Update an existing variable
echo "http://new-backend:8000" | vercel env update PYTHON_BACKEND_URL production --yes
```

You can also set these in the Vercel Dashboard: **Project Settings > Environment Variables**.

### Deploy

```bash
# Preview deployment (creates unique URL, does not affect production)
vercel

# Production deployment (deploys to live domain)
vercel --prod

# Force rebuild (skip cache)
vercel --prod --force
```

### Vercel project settings

The project auto-detects Next.js. No special configuration needed:

- **Framework Preset**: Next.js
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`
- **Node.js Version**: 22.x

### Post-deploy verification

```bash
# Check deployment status
vercel ls

# Inspect a specific deployment
vercel inspect <deployment-url>

# View logs
vercel logs <deployment-url>
```

## Versioning

This project follows [Semantic Versioning](https://semver.org/) and [Keep a Changelog](https://keepachangelog.com/).

### Current version: `0.4.1`

The version is tracked in `package.json` and documented in `CHANGELOG.md`.

### Version scheme

| Increment | When |
|-----------|------|
| **MAJOR** (1.0.0) | Breaking changes to the API contract with the backend, incompatible URL structure changes, or major UI redesigns |
| **MINOR** (0.X.0) | New features (new components, new SSE events handled, new pages) |
| **PATCH** (0.0.X) | Bug fixes, styling tweaks, dependency updates, performance improvements |

### Release workflow

1. Make changes on a feature branch
2. Update `CHANGELOG.md` with the changes under a new version heading
3. Update `version` in `package.json`
4. Merge to `main`
5. Deploy: `vercel --prod`

### Changelog format

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added
- New features

### Changed
- Changes to existing functionality

### Fixed
- Bug fixes

### Removed
- Removed features
```

See `CHANGELOG.md` for the full history.

## SSE Event Types

The frontend handles these event types from the backend stream:

| Event | Description |
|-------|-------------|
| `text` | Incremental text content |
| `route` | Orchestrator routing to a specialized agent |
| `handoff` | Agent-to-agent handoff |
| `tool_start` | Agent started using a tool |
| `tool_end` | Tool execution completed |
| `file_output` | A file was generated |
| `chart_data` | Chart visualization data |
| `error` | Error message |
| `heartbeat` | Keep-alive signal |
| `complete` | Stream finished (includes session name) |
| `reasoning` | Agent reasoning (ignored in UI) |

## Supported File Uploads

CSV, DOCX, XLS, XLSX, MD — limited in both the file input `accept` attribute and validated in the handler.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
