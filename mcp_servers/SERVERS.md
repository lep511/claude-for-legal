# MCP Servers

This document describes each available MCP server, how to configure it, and which agents use it.

## Overview

| Server | URL | Transport | Auth | Agents |
|--------|-----|-----------|------|--------|
| `google_drive` | `drivemcp.googleapis.com/mcp/v1` | http | OAuth (CLI) | all 12 |
| `slack` | `mcp.slack.com/mcp` | http | OAuth (CLI) | all 12 |
| `courtlistener` | `mcp.courtlistener.com` | http | OAuth (CLI) | ip, law-student, legal-clinic, litigation |
| `descrybe` | `mcp.descrybe.com/mcp` | http | OAuth (CLI) | ip, law-student, legal-clinic |
| `trellis` | `mcp.trellis.law/anthropic` | http | OAuth (CLI) | litigation |
| `solve_intelligence` | `api.solveintelligence.com/mcp` | http | `SOLVE_TOKEN` | corporate, ip |
| `courtroom5` | `mcp.courtroom5.com` | http | OAuth (CLI) | legal-clinic |
| `ironclad` | `mcp.na1.ironcladapp.com/mcp` | http | `IRONCLAD_TOKEN` | commercial |
| `definely` | `mcp.uk.definely.com/api/proxy/core-mcp` | http | `DEFINELY_TOKEN` | commercial, corporate |
| `imanage` | `cloudimanage.com/mcp/work` | http | `IMANAGE_TOKEN` | commercial, corporate |
| `docusign` | `mcp.docusign.com/mcp` | http | `DOCUSIGN_TOKEN` | commercial |
| `box` | `mcp.box.com/mcp` | http | `BOX_TOKEN` | corporate |
| `everlaw` | `api.everlaw.com/v1/mcp` | http | `EVERLAW_TOKEN` | litigation |
| `aurora` | `mcp.ai.consilio.com` | http | `AURORA_TOKEN` | litigation |
| `topcounsel` | `api.techgc.co/api/mcp/topcounsel` | http | OAuth (CLI) | commercial, corporate, litigation |
| `lawve_ai` | `mcp.lawve.ai/mcp` | http | OAuth (CLI) | legal-builder-hub |
| `asana` | `mcp.asana.com/sse` | sse | OAuth (CLI) | product |
| `atlassian` | `mcp.atlassian.com/v1/sse` | sse | OAuth (CLI) | product |
| `linear` | `mcp.linear.app/mcp` | http | OAuth (CLI) | product |

---

## google_drive — Google Drive

**What it provides:** Search, read, and fetch documents from Google Drive.

**URL:** `https://drivemcp.googleapis.com/mcp/v1`

**Auth:** OAuth handled by Claude Code CLI session. No token required.

**Agents:** All 12 legal agents.

---

## slack — Slack

**What it provides:** Search messages, read channels, find discussions across your workspace.

**URL:** `https://mcp.slack.com/mcp`

**Auth:** OAuth handled by Claude Code CLI session. No token required.

**Agents:** All 12 legal agents.

---

## courtlistener — CourtListener

**What it provides:** Court docket search, opinions, and PACER integration.

**URL:** `https://mcp.courtlistener.com/`

**Auth:** OAuth handled by Claude Code CLI session. No token required.

**Agents:** ip-legal, law-student, legal-clinic, litigation-legal.

**Use cases:**
- Docket monitoring for litigation-legal
- Case law research for law-student
- Court filings for legal-clinic intake

---

## descrybe — Descrybe

**What it provides:** Legal research — case law, statutes, secondary sources.

**URL:** `https://mcp.descrybe.com/mcp`

**Auth:** OAuth handled by Claude Code CLI session. No token required.

**Agents:** ip-legal, law-student, legal-clinic.

---

## trellis — Trellis

**What it provides:** State court analytics — judges, rulings, docket data.

**URL:** `https://mcp.trellis.law/anthropic`

**Auth:** OAuth handled by Claude Code CLI session. No token required.

**Agents:** litigation-legal.

---

## solve_intelligence — Solve Intelligence

**What it provides:** Patent analysis — claims mapping, prior art, FTO.

**URL:** `https://api.solveintelligence.com/mcp/`

**Auth:** Bearer token via `SOLVE_TOKEN` env var.

**Configuration (.env):**
```bash
SOLVE_TOKEN=your-api-key
```

**Agents:** corporate-legal, ip-legal.

---

## courtroom5 — Courtroom5

**What it provides:** Pro se litigation guidance and court procedure.

**URL:** `https://mcp.courtroom5.com`

**Auth:** OAuth handled by Claude Code CLI session. No token required.

**Agents:** legal-clinic.

---

## ironclad — Ironclad

**What it provides:** Contract lifecycle management — search contracts, workflows, repository access.

**URL:** `https://mcp.na1.ironcladapp.com/mcp`

**Auth:** Bearer token via `IRONCLAD_TOKEN` env var.

**Configuration (.env):**
```bash
IRONCLAD_TOKEN=your-api-key
```

**Agents:** commercial-legal.

**Use cases:**
- Search contract repository for renewals
- Track workflow status
- Pull agreement metadata for review

---

## definely — Definely

**What it provides:** Live, deterministic access to contract structure — resolve definitions, validate cross-references, map dependencies, run structural diffs.

**URL:** `https://mcp.uk.definely.com/api/proxy/core-mcp`

**Auth:** Bearer token via `DEFINELY_TOKEN` env var.

**Configuration (.env):**
```bash
DEFINELY_TOKEN=your-api-key
```

**Agents:** commercial-legal, corporate-legal.

---

## imanage — iManage

**What it provides:** Governed iManage content connected to Claude — documents stay in iManage, access is permission-bound and auditable.

**URL:** `https://cloudimanage.com/mcp/work`

**Auth:** Bearer token via `IMANAGE_TOKEN` env var.

**Configuration (.env):**
```bash
IMANAGE_TOKEN=your-api-key
```

**Agents:** commercial-legal, corporate-legal.

---

## docusign — DocuSign

**What it provides:** Agreement search, status tracking, and signature workflows.

**URL:** `https://mcp.docusign.com/mcp`

**Auth:** Bearer token via `DOCUSIGN_TOKEN` env var.

**Configuration (.env):**
```bash
DOCUSIGN_TOKEN=your-api-key
```

**Agents:** commercial-legal.

---

## box — Box

**What it provides:** Data room and document management.

**URL:** `https://mcp.box.com/mcp`

**Auth:** Bearer token via `BOX_TOKEN` env var.

**Configuration (.env):**
```bash
BOX_TOKEN=your-api-key
```

**Agents:** corporate-legal.

---

## everlaw — Everlaw

**What it provides:** E-discovery platform — document review, productions.

**URL:** `https://api.everlaw.com/v1/mcp`

**Auth:** Bearer token via `EVERLAW_TOKEN` env var.

**Configuration (.env):**
```bash
EVERLAW_TOKEN=your-api-key
```

**Agents:** litigation-legal.

---

## aurora — Aurora (Consilio)

**What it provides:** Litigation analytics and AI-assisted review.

**URL:** `https://mcp.ai.consilio.com`

**Auth:** Bearer token via `AURORA_TOKEN` env var.

**Configuration (.env):**
```bash
AURORA_TOKEN=your-api-key
```

**Agents:** litigation-legal.

---

## topcounsel — TopCounsel

**What it provides:** Outside counsel recommendations from The L Suite — 5,000+ in-house counsel community sentiment, rankings, and expertise evidence.

**URL:** `https://api.techgc.co/api/mcp/topcounsel`

**Auth:** OAuth handled by Claude Code CLI session. No token required.

**Agents:** commercial-legal, corporate-legal, litigation-legal.

---

## lawve_ai — Lawve AI

**What it provides:** Legal skill marketplace and community resources.

**URL:** `https://mcp.lawve.ai/mcp`

**Auth:** OAuth handled by Claude Code CLI session. No token required.

**Agents:** legal-builder-hub.

---

## asana — Asana

**What it provides:** Project and task management for product launches.

**URL:** `https://mcp.asana.com/sse`

**Transport:** SSE

**Auth:** OAuth handled by Claude Code CLI session. No token required.

**Agents:** product-legal.

---

## atlassian — Atlassian (Jira/Confluence)

**What it provides:** Jira issues and Confluence pages.

**URL:** `https://mcp.atlassian.com/v1/sse`

**Transport:** SSE

**Auth:** OAuth handled by Claude Code CLI session. No token required.

**Agents:** product-legal.

---

## linear — Linear

**What it provides:** Linear issues and project tracking.

**URL:** `https://mcp.linear.app/mcp`

**Auth:** OAuth handled by Claude Code CLI session. No token required.

**Agents:** product-legal.

---

## Adding a new MCP server

1. Add an entry to `MCP_SERVERS` in `mcp_servers/registry.py` with name, description, URL, transport, optional `token_env`, and list of agents.
2. If it requires a token, add the env var to `.env.example`.
3. Document it in this file.

No code changes needed in the agents themselves — `get_mcp_config()` automatically picks up any configured server mapped to the agent.

---

## Configuration resolution

For each server, the registry uses this resolution order:

1. **Explicit env var override** — `MCP_<SERVER>_TRANSPORT` + `MCP_<SERVER>_URL` (or `_COMMAND` for stdio). Allows full customization of URL, headers, or even switching to a local stdio server.
2. **Registry defaults** — uses the pre-configured URL from `registry.py`. If `token_env` is set, the server is only included when that env var has a value.

This means:
- Servers without `token_env` (Google Drive, Slack, CourtListener, etc.) are **always included** — they use OAuth from the Claude Code CLI session.
- Servers with `token_env` are **only included when the token is set** in `.env`.
- Any server can be overridden with explicit `MCP_*` env vars for custom deployments.

---

## Plugin-by-Plugin Summary

| Plugin | MCP Servers |
|---|---|
| commercial-legal | Ironclad, DocuSign, iManage, TopCounsel, Definely, Slack, Google Drive |
| corporate-legal | Box, Definely, iManage, Solve Intelligence, TopCounsel, Slack, Google Drive |
| litigation-legal | Aurora, CourtListener, Everlaw, TopCounsel, Trellis, Slack, Google Drive |
| ip-legal | CourtListener, Descrybe, Solve Intelligence, Slack, Google Drive |
| privacy-legal | Slack, Google Drive |
| employment-legal | Slack, Google Drive |
| regulatory-legal | Slack, Google Drive |
| ai-governance-legal | Slack, Google Drive |
| product-legal | Asana, Atlassian, Linear, Slack, Google Drive |
| law-student | CourtListener, Descrybe, Slack, Google Drive |
| legal-clinic | CourtListener, Courtroom5, Descrybe, Slack, Google Drive |
| legal-builder-hub | Lawve AI, Slack, Google Drive |
