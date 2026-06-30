# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Backend — Python 3.13+, managed with uv
uv run uvicorn api_server:app --host 0.0.0.0 --port 8000 --reload

# Frontend — Next.js 16, served on port 35428
cd frontend && npm install && npm run dev

# Lint frontend
cd frontend && npm run lint

# No test suite currently configured
```

The app is accessed at http://localhost:3000/legal (Next.js proxies to the Python backend on port 8000).

## Architecture

This is a multi-agent legal platform with three layers:

**Browser -> Next.js (port 35428) -> FastAPI (port 8000) -> Claude Agent SDK**

The FastAPI backend (`api_server.py`) exposes REST + SSE endpoints. The frontend at `frontend/` is a Next.js 16 app with API routes that proxy to the Python backend.

### Request Flow

1. User sends a message via `POST /api/chat` (SSE stream)
2. The **orchestrator** (`agents/_orchestrator/agent.py`) classifies intent and calls `route_to_agent` (an MCP tool from `sdk_tools/routing.py`)
3. `api_handlers.py` reads the routing decision and spawns the selected **specialized agent** via `claude_agent_sdk.query()`
4. The specialized agent streams results back through the SSE connection
5. Agents can hand off to other agents via `request_handoff` (up to `MAX_HANDOFF_DEPTH` times)

### Agent System

- 12 specialized agents live under `agents/<slug>/agent.py`, each exporting `create_options(session_id) -> ClaudeAgentOptions`
- `agents/__init__.py` dynamically loads all agents from kebab-case directories
- `agents/_common.py` provides shared factories: `create_agent_options()`, `create_orchestrator_options()`, `run_reader()`, and the `headless_append()` system prompt suffix
- Each agent can have an isolated **reader subagent** (untrusted document parsing with schema validation via `run_reader()`)
- Skills are markdown workflow definitions in `agents/<slug>/skills/<skill-name>/SKILL.md`

### Session & Profile Management

- `session_manager.py` — persists sessions to `sandbox/sessions/{id}.json`, output files to `sandbox/out/{id}/`
- `profile_manager.py` — practice profiles stored as values in `sandbox/profiles/{slug}.json`, rendered into `sandbox/profiles/rendered/{slug}.md` by replacing `[PLACEHOLDER ...]` markers in each agent's `CLAUDE.md` template
- `api_handlers.py` — `SessionRegistry` holds in-memory state with TTL eviction; `run_agent_turn()` orchestrates the full orchestrator->agent pipeline

### MCP Servers

- `mcp_servers/registry.py` — maps 19 external MCP servers (legal research, CLM, e-discovery, etc.) to agents, configured via env vars or pre-registered URLs with token auth
- `sdk_tools/routing.py` — provides `route_to_agent` and `request_handoff` tools as an in-process MCP server
- `sdk_tools/calculator.py` — calculator MCP tool available to all agents

### Frontend

- Next.js App Router at `frontend/app/`
- API routes under `frontend/app/api/agents/` proxy to the Python backend
- Main chat page at `frontend/app/legal/[sessionId]/page.tsx`
- Components: `ChatMessages`, `ChatInput`, `ChatForm`, `SkillPanel`, `ChartRenderer`, `FileOutputList`, etc.
- Uses shadcn/ui (Radix + Tailwind), recharts for visualizations, react-markdown for rendering

## Key Environment Variables

- `ANTHROPIC_API_KEY` or `CLAUDE_CODE_USE_BEDROCK=1` with AWS credentials
- `CLAUDE_MODEL` — defaults to `us.anthropic.claude-opus-4-6-v1`
- `THINKING_ENABLED` / `THINKING_BUDGET` — extended thinking for Opus 4+
- `MAX_TURNS` (50), `MAX_HANDOFF_DEPTH` (3), `SESSION_TTL_MINUTES` (30)
- `API_CORS_ORIGINS` — comma-separated allowed origins
- MCP tokens: `IRONCLAD_TOKEN`, `EVERLAW_TOKEN`, `SOLVE_TOKEN`, etc. (optional)

## Conventions

- Agent slugs are kebab-case (`commercial-legal`), Python module names are snake_case (`commercial_legal`)
- Every agent's `create_options()` must return a `ClaudeAgentOptions` — the standard pattern uses `create_agent_options()` from `_common.py`
- Untrusted document processing goes through isolated reader subagents with JSON Schema validation (`run_reader()`)
- Output files go to `sandbox/out/{session_id}/`; input files uploaded by users go to `sandbox/{session_id}/`
- The `headless_append()` function adds critical operational rules (scope, no fabrication, template usage, handoff) to every agent's system prompt
- Skills are invoked by name through the API (`POST /api/agents/{slug}/skills/{skill_name}`) and rendered into prompts by `skill_runner.py`
