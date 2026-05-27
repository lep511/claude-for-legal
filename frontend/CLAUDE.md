# Frontend — Legal Services Platform

@AGENTS.md

## Stack

- Next.js 16.2 (App Router) with React 19 and React Compiler
- Tailwind CSS + shadcn/ui (Radix primitives)
- Recharts for data visualization
- next-themes for dark/light mode

## Architecture

Single-page chat interface at `/legal` that streams responses from a Python backend via SSE.

### API routes (`app/api/agents/`)

All routes proxy to `PYTHON_BACKEND_URL` (default `http://localhost:8000`). They forward requests and stream responses — no business logic lives here.

### Custom hooks (`hooks/`)

- `useSession` — session CRUD + localStorage persistence
- `useAgentStream` — SSE parsing, message accumulation, tool/chart/file extraction

### Components

- `components/ui/` — shadcn/ui primitives (do not edit directly; regenerate with CLI)
- `components/ChartRenderer.tsx` — renders bar, multiBar, line, pie, area, stackedArea
- `components/SessionControls.tsx` — session management dropdown

### SSE event types from backend

`text`, `route`, `handoff`, `tool_start`, `tool_end`, `file_output`, `chart_data`, `error`, `heartbeat`, `complete`, `reasoning`

## Conventions

- All pages are client components (`"use client"`) since the app is interactive/streaming
- CSS variables defined in `globals.css` for theming (HSL color system)
- Chart colors: `--chart-1` through `--chart-5`
- File uploads limited to: CSV, DOCX, XLS, XLSX, MD

## Running

```bash
npm run dev    # starts on port 3000
npm run build  # production build
npm run lint   # eslint
```

Requires the Python backend running on port 8000 (see root README).
