# CLAUDE.md

Guidance for working on this repo. `claude-for-legal` is a legal services
platform with two deployment surfaces: (1) a Claude Code plugin marketplace with
twelve first-party legal plugins, one vendor plugin, and five managed-agent
cookbooks, and (2) a Python backend + Next.js frontend that runs the same legal
agents as an interactive multi-agent chat application.

## Layout

```
.claude-plugin/marketplace.json   # the marketplace manifest — one entry per plugin
agents/                           # 12 first-party plugins (commercial-legal, privacy-legal, ...)
  <plugin>/
    .claude-plugin/plugin.json    # plugin manifest (name, version, description, author)
    .mcp.json                     # MCP servers the plugin connects to
    CLAUDE.md                     # practice-profile TEMPLATE (see "Plugin CLAUDE.md" below)
    README.md                     # per-plugin docs
    skills/<name>/SKILL.md        # one skill per directory
    agents/<name>.md              # subagent definitions
    hooks/hooks.json              # hook config (most plugins ship an empty stub)
    .gitignore
legal_agents/                     # Python agent SDK package (backend)
  __init__.py                     # exports all 12 agent modules + chart_generator
  common.py                       # factory functions, reader runner, skill indexer
  orchestrator/agent.py           # routes user requests to specialized agents
  <agent_name>/agent.py           # one module per legal agent (12 + chart_generator)
sdk_tools/                        # MCP tool servers (routing, calculator)
mcp_servers/                      # per-agent MCP server configs (extensible)
main.py                           # CLI entry point for the multi-agent platform
api_server.py                     # FastAPI server (SSE streaming to frontend)
api_handlers.py                   # async agent invocation and session state
session_manager.py                # session persistence
pyproject.toml                    # Python dependencies
frontend/                         # Next.js 16 chat interface at /legal
  app/legal/                      # main route (session management, chat UI)
  app/api/agents/                 # API proxy routes to Python backend
  components/                     # React components (shadcn/ui + custom)
  hooks/                          # useSession, useAgentStream
external_plugins/<vendor>/        # vendor-maintained plugins (CoCounsel)
managed-agent-cookbooks/<name>/   # CMA agent.yaml + subagents/ + steering-examples.json
scripts/                          # validate.py, lint-tool-scope.py, orchestrate.py,
                                  # deploy-managed-agent.sh, test-cookbooks.sh
references/                       # shared templates (company-profile, dashboard)
financial-only-for-reference/     # original financial agents (reference only, not deployed)
```

## Validation — run before opening a PR

This repo follows the same conventions `anthropics/claude-plugins-official`
enforces in CI. Run the equivalent checks locally:

```bash
# 1. Marketplace + per-plugin schema validation (source of truth)
claude plugin validate .claude-plugin/marketplace.json
for d in agents/*/; do [ -f "$d/.claude-plugin/plugin.json" ] && claude plugin validate "$d"; done
claude plugin validate external_plugins/cocounsel-legal

# 2. Cookbook tool-scope lint (orchestrators must not over-grant tools)
python3 scripts/lint-tool-scope.py

# 3. JSON/YAML sanity
python3 -c "import json,glob; [json.load(open(f)) for f in glob.glob('**/*.json', recursive=True)]"

# 4. Python syntax check (legal_agents + sdk_tools)
python3 -c "import ast,os; [ast.parse(open(os.path.join(r,f)).read()) for r,_,fs in os.walk('legal_agents') for f in fs if f.endswith('.py')]"

# 5. Frontend build
cd frontend && npm run build
```

### Marketplace invariants (I1–I11)

`claude-plugins-official` layers these on top of the schema check. They apply
here too — the ones most likely to trip a contributor:

- **I1** — `plugins[]` should be alpha-sorted by name (case-insensitive).
  *Currently a known warning: the array is in a curated display order. If you
  add a plugin, ask before re-sorting the whole array.*
- **I2** — no duplicate plugin names.
- **I3** — `description` 10–2000 chars, no leading/trailing whitespace.
- **I8** — every vendored `source` (`"./<dir>"`) must point at a directory that
  contains `.claude-plugin/plugin.json`.
- **I9** — `source` paths/URLs must contain no shell metacharacters or `..`.
- **I10** — no hidden Unicode (zero-width chars, bidi controls) in
  `name`/`description`.
- **I11** — `name` must match `^[a-z0-9][a-z0-9-]{1,63}$`.

### Frontmatter requirements

Every `agents/*.md` needs `name` and `description`. Every
`skills/<name>/SKILL.md` needs `description`. Every `commands/*.md` needs
`description`. Multi-line descriptions use `>` block scalars and that's fine —
`claude plugin validate` parses them correctly.

## Conventions

### Keep `marketplace.json` in sync with `plugin.json`

For first-party plugins, `marketplace.json`'s `name`, `description`, and
`author` should match the plugin's own `.claude-plugin/plugin.json` field for
field. If you change a plugin's description in one place, change it in the
other.

### Skill names in prose must be canonical

When a `SKILL.md` (especially `customize` or `cold-start-interview`) tells the
user "run `/foo`," `foo` must be the actual `skills/<foo>/` directory name.
Short forms like `/triage` for `/use-case-triage` look right in prose but are
dead commands — the user types them and nothing happens. Refs to Claude Code
built-ins (`/mcp`, `/plugin`) and to other plugins (`/<other-plugin>:<skill>`)
are fine.

### Plugin CLAUDE.md is a template, not project context

Each `<plugin>/CLAUDE.md` is a practice-profile template that the
`cold-start-interview` skill copies to `~/.claude/plugins/config/claude-for-legal/<plugin>/CLAUDE.md`
on the user's machine. It is *not* loaded as project context when the plugin is
installed — `claude plugin validate` warns about this and the warning is
expected. Don't "fix" it by moving the content into a skill.

### `external_plugins/` is vendor-maintained

Plugins under `external_plugins/` are built and maintained by the vendor
(README.md has the policy). Don't change vendor-authored content without
checking with them first; whitespace normalization and formatting are usually
fine since the vendor lands changes via PR rather than mirroring a fork.

### Formatting

- 2-space indent in all JSON and `.mcp.json` files.
- Final newline at end of every text file.
- No trailing whitespace.
- Markdown tables: pipe-aligned columns are nice but not required; just keep
  the column count consistent.

## Cookbooks

Each `managed-agent-cookbooks/<name>/` has `agent.yaml` (the orchestrator),
`subagents/*.yaml` (the leaves), `steering-examples.json`, and `README.md`. Two
rules that `scripts/lint-tool-scope.py` enforces:

1. The orchestrator gets local-only tools (`read`, `grep`, `glob`,
   `agent_toolset`); MCP and write tools belong to specific subagent leaves.
2. The README's security table and the `agent.yaml` comments must match what
   the YAML actually grants. Don't claim a tool a subagent doesn't have.

## Python Backend (`legal_agents/`)

The Python backend uses `claude-agent-sdk` to run 12 legal agents + 1
chart-generator behind a FastAPI server. Key architecture:

- **Orchestrator** (`legal_agents/orchestrator/agent.py`) — classifies user
  intent and routes to the right agent via `route_to_agent` tool.
- **Pattern A agents** (simple) — single agent with shell access, no untrusted
  document processing: `product_legal`, `ai_governance_legal`, `law_student`,
  `legal_clinic`, `legal_builder_hub`, `chart_generator`.
- **Pattern B agents** (with reader) — adds an isolated reader subprocess that
  processes untrusted documents with schema validation and no shell access:
  `commercial_legal`, `litigation_legal`, `corporate_legal`, `employment_legal`,
  `privacy_legal`, `regulatory_legal`, `ip_legal`.
- **common.py** — shared factories: `create_agent_options()`,
  `create_orchestrator_options()`, `run_reader()`, `skill_paths()`,
  `headless_append()`. Also builds the `_SKILL_INDEX` by scanning
  `agents/<plugin>/skills/`.
- **sdk_tools/** — MCP tool servers for routing (route_to_agent,
  request_handoff) and calculator.

### Running the backend

```bash
uv run uvicorn api_server:app --host 0.0.0.0 --port 8000 --reload
# or
python main.py  # CLI mode
```

### Adding a new agent

1. Create `legal_agents/<name>/__init__.py` and `agent.py`.
2. Define `create_options(session_id) -> ClaudeAgentOptions`.
3. Add it to `legal_agents/__init__.py`, `AGENTS` dicts in `main.py` and
   `api_handlers.py`, and `AGENT_CATALOG` in the orchestrator.

## Frontend (`frontend/`)

Next.js 16 app at `/legal`. Streams agent responses via SSE from the Python
backend. Domain-agnostic architecture — all legal-specific text is in UI
strings, not logic.

```bash
cd frontend && npm install && npm run dev   # http://localhost:3000
```

Requires the Python backend on port 8000.

## Things to leave alone

- Per-plugin `.gitignore` files differ slightly across plugins. Probably
  intentional; ask before unifying.
- `hooks/hooks.json` is missing in two plugins. Hooks are optional; the missing
  files are not a bug.
- `references/` lives only at repo root and is not shipped inside any plugin
  directory. Several plugin `CLAUDE.md` templates reference it as if it were —
  that's a known gap, not a thing to silently move.
- `financial-only-for-reference/` is the original financial agents project used
  as a template. Keep it for reference; don't deploy or import from it.
