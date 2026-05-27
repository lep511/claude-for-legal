# MCP Servers

This project uses 19 unique MCP servers across its 12 legal plugins. All are remote HTTP/SSE servers — no local processes required.

## Universal (all 12 plugins)

| Server | URL | Purpose |
|---|---|---|
| **Google Drive** | `https://drivemcp.googleapis.com/mcp/v1` | Search, read, and fetch documents |
| **Slack** | `https://mcp.slack.com/mcp` | Search messages, read channels, post alerts |

## Legal Research

| Server | URL | Plugins |
|---|---|---|
| **CourtListener** | `https://mcp.courtlistener.com/` | ip-legal, law-student, legal-clinic, litigation-legal |
| **Descrybe** | `https://mcp.descrybe.com/mcp` | ip-legal, law-student, legal-clinic |
| **Trellis** | `https://mcp.trellis.law/anthropic` | litigation-legal |
| **Solve Intelligence** | `https://api.solveintelligence.com/mcp/` | corporate-legal, ip-legal |
| **Courtroom5** | `https://mcp.courtroom5.com` | legal-clinic |

## Contract & Document Management

| Server | URL | Plugins |
|---|---|---|
| **Ironclad** | `https://mcp.na1.ironcladapp.com/mcp` | commercial-legal |
| **Definely** | `https://mcp.uk.definely.com/api/proxy/core-mcp` | commercial-legal, corporate-legal |
| **iManage** | `https://cloudimanage.com/mcp/work` | commercial-legal, corporate-legal |
| **DocuSign** | `https://mcp.docusign.com/mcp` | commercial-legal |
| **Box** | `https://mcp.box.com/mcp` | corporate-legal |

## E-Discovery & Litigation

| Server | URL | Plugins |
|---|---|---|
| **Everlaw** | `https://api.everlaw.com/v1/mcp` | litigation-legal |
| **Aurora (Consilio)** | `https://mcp.ai.consilio.com` | litigation-legal |

## Outside Counsel & Community

| Server | URL | Plugins |
|---|---|---|
| **TopCounsel** | `https://api.techgc.co/api/mcp/topcounsel` | commercial-legal, corporate-legal, litigation-legal |
| **Lawve AI** | `https://mcp.lawve.ai/mcp` | legal-builder-hub |

## Project Management

| Server | URL | Plugins |
|---|---|---|
| **Asana** | `https://mcp.asana.com/sse` | product-legal |
| **Atlassian** | `https://mcp.atlassian.com/v1/sse` | product-legal |
| **Linear** | `https://mcp.linear.app/mcp` | product-legal |

## Configuration

Each plugin declares its MCP servers in `agents/<plugin>/.mcp.json`. Servers are optional — plugins degrade gracefully when a server is not configured or unreachable.

The Python backend (`legal_agents/`) does not currently connect to these MCP servers directly. Per-agent MCP integrations can be added via `mcp_servers/__init__.py` by returning server configs from `get_mcp_config(slug)`.

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
