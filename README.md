# Claude for Legal

Multi-agent legal platform with twelve specialized legal agents, a Python backend (FastAPI), and a Next.js chat interface. Covers in-house commercial, privacy, product, corporate, employment, litigation, regulatory, AI governance, IP, law school clinics, and students.

> [!IMPORTANT]
> **Every output from these agents is a draft for attorney review — not legal advice, not a legal conclusion, not a substitute for a lawyer.** They are built with guardrails that reflect that: source attribution on every citation, conservative defaults on privilege and subjective legal calls, jurisdiction assumptions surfaced, and explicit gates before anything is filed, sent, or relied on. A lawyer reviews, verifies, and takes professional responsibility for anything that leaves the building.
>
> **These agents do not represent Anthropic's legal positions.** They are tools that help lawyers analyze issues. The attorney using the system — not the agents, and not Anthropic — is responsible for the legal positions taken in their work product.

## Getting Started

### Prerequisites

- Python 3.13+
- Node.js (for the frontend)
- [uv](https://docs.astral.sh/uv/) package manager
- Authentication: either an `ANTHROPIC_API_KEY` or AWS Bedrock access

### 1. Configure authentication

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

**Option A — Anthropic API directly:**
```env
ANTHROPIC_API_KEY=sk-ant-...
```

**Option B — AWS Bedrock (IAM role / instance profile):**
```env
CLAUDE_CODE_USE_BEDROCK=1
AWS_PROFILE=developer
AWS_REGION=us-west-2
```

> [!NOTE]
> If you see "Not logged in · Please run /login" in the chat, it means the backend cannot authenticate with the Claude API. Verify your `.env` is configured correctly and restart the backend.

### 2. Start the backend

```bash
uv run uvicorn api_server:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Start the frontend

```bash
cd frontend && npm install && npm run dev
```

Open http://localhost:35428/legal — the orchestrator routes your requests to the right legal agent.

### First-time setup

1. Open the **Settings** page (gear icon in the top nav)
2. Configure each agent's practice profile through the form UI
3. The more context you provide, the better the agents perform

## Agents

Each agent is named for the workflow it runs. The orchestrator routes requests automatically based on the subject matter.

| Agent | What it does | Slug |
|---|---|---|
| **Vendor Agreement Reviewer** | Reviews a vendor MSA against your playbook and produces a redline memo | `commercial-legal` |
| **NDA Triager** | GREEN/YELLOW/RED triage of inbound NDAs | `commercial-legal` |
| **Tabular Diligence Review** | Tabular review over a data room with citations | `corporate-legal` |
| **Termination Reviewer** | Runs a proposed termination against jurisdiction-specific risk flags | `employment-legal` |
| **DSAR Responder** | Drafts DSAR acknowledgments and responses within statutory timelines | `privacy-legal` |
| **Launch Reviewer** | Reviews a product launch against your risk calibration | `product-legal` |
| **AI Use Case Triager** | Classifies proposed AI use cases against your registry | `ai-governance-legal` |
| **Reg Feed Watcher** | Regulatory feed digest | `regulatory-legal` |
| **Trademark Clearance Screener** | First-pass clearance with knockout check | `ip-legal` |
| **Claim Chart Builder** | Element-by-element claim chart | `litigation-legal` |
| **Clinic Intake** | Structured client intake with cross-area issue spotting | `legal-clinic` |
| **Bar Prep Coach** | MBE and essay practice targeted at weak subjects | `law-student` |

## Repository Layout

```
agents/                   # 12 agent directories + orchestrator
  __init__.py             # dynamic loader
  _common.py             # shared factories, reader runner, skill indexer
  _orchestrator/          # routes requests to specialized agents
  commercial-legal/       # in-house commercial contracts
  corporate-legal/        # M&A diligence, board consents, entity compliance
  employment-legal/       # hire/term review, worker classification, leave
  privacy-legal/          # DPA, DSAR, PIA, privacy triage
  product-legal/          # launch review, marketing claims
  regulatory-legal/       # reg feed watcher, policy diff, gap tracker
  ai-governance-legal/    # AI use-case triage, AIAs, vendor AI review
  ip-legal/               # trademark clearance, FTO, C&D, DMCA, OSS
  litigation-legal/       # portfolio, matters, holds, demands, claim charts
  legal-clinic/           # clinic setup, student ramp, intake, deadlines
  law-student/            # Socratic drilling, outlining, IRAC, bar prep
  legal-builder-hub/      # community skill discovery
sdk_tools/                # MCP tool servers (routing, calculator)
mcp_servers/              # MCP server configuration registry
frontend/                 # Next.js 16 chat UI at /legal
api_server.py             # FastAPI backend (port 8000)
api_handlers.py           # async agent invocation and session state
session_manager.py        # session persistence
profile_manager.py        # practice profile CRUD and rendering
skill_runner.py           # skill discovery and API execution
main.py                   # CLI entry point
templates/                # Excel/Word output templates
references/               # shared templates (company-profile, dashboard)
scripts/                  # validate.py, orchestrate.py
```

Each agent directory contains:

```
<agent>/
  CLAUDE.md               # practice profile template (configured via Settings UI)
  README.md               # agent documentation
  agent.py                # Python backend logic (system prompt, create_options)
  skills/                 # workflow definitions (SKILL.md files)
  agents/                 # scheduled agent definitions (if any)
```

## API Endpoints

### Chat

- `POST /api/chat` — Send a message and receive SSE stream
- `POST /api/sessions` — Create a new session
- `GET /api/sessions` — List sessions
- `GET /api/sessions/{id}` — Get session details
- `DELETE /api/sessions/{id}` — Delete a session
- `POST /api/sessions/{id}/upload` — Upload a file

### Profiles

- `GET /api/profiles` — List all agents with configuration status
- `GET /api/profiles/{slug}` — Get profile schema and current values
- `PUT /api/profiles/{slug}` — Update profile values
- `POST /api/profiles/{slug}/reset` — Reset profile to template

### Skills

- `GET /api/agents/{slug}/skills` — List available skills for an agent
- `POST /api/agents/{slug}/skills/{skill_name}` — Execute a specific skill workflow

## Architecture

```
Browser ──SSE──> Next.js API routes ──HTTP──> FastAPI (api_server.py)
                                                 │
                                                 ├── Orchestrator (routes to agents)
                                                 ├── Agent 1..12 (claude-agent-sdk)
                                                 ├── Profile Manager (CRUD)
                                                 └── Skill Runner (workflow execution)
```

The orchestrator classifies user intent and routes to the specialized agent. Each agent has:
- A system prompt with practice-area expertise
- Access to shell tools (Read, Write, Bash) for document processing
- MCP tools via `mcp_servers/registry.py` for external integrations
- Skills (SKILL.md) that define structured workflows

## Making It Yours

- **Configure practice profiles** — Use the Settings UI to fill in your team's specific positions, escalation rules, and house style
- **Edit CLAUDE.md templates** — Modify the template structure to add fields specific to your practice
- **Fork skills** — Each skill is a markdown file under `skills/`. Edit the steps, gates, and output format
- **Add MCP integrations** — Configure external services in `mcp_servers/registry.py`

## License

Licensed under the [Apache License, Version 2.0](LICENSE).

Copyright 2026 Anthropic PBC.
