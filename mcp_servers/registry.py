"""MCP server registry — maps logical server names to connection config.

Returns dict[str, McpServerConfig] suitable for ClaudeAgentOptions.mcp_servers.

Configuration is driven by environment variables:

  HTTP transport (remote endpoint, most Cowork MCP servers):
    MCP_<SERVER>_TRANSPORT=http
    MCP_<SERVER>_URL=<url>
    MCP_<SERVER>_HEADERS=<key1>=<val1>,<key2>=<val2> (optional)

  SSE transport (remote SSE endpoint):
    MCP_<SERVER>_TRANSPORT=sse
    MCP_<SERVER>_URL=<url>
    MCP_<SERVER>_HEADERS=<key1>=<val1>,<key2>=<val2> (optional)

  Stdio transport (local process):
    MCP_<SERVER>_TRANSPORT=stdio
    MCP_<SERVER>_COMMAND=<command>       (e.g., uvx, npx, python)
    MCP_<SERVER>_ARGS=<arg1>,<arg2>     (comma-separated)
    MCP_<SERVER>_ENV=<K1>=<V1>,<K2>=<V2> (optional env vars for the process)

  Token-only shortcut (uses pre-configured URL from registry):
    <TOKEN_ENV_VAR>=<token>  (e.g., IRONCLAD_TOKEN=sk-...)

Available servers (19 total — same as Claude Code/Cowork plugins):
  See MCP-INFO.md in this directory for the full inventory.
"""

from __future__ import annotations

import os
import sys
from typing import Any


MCP_SERVERS = {
    # --- Universal (all 12 plugins) ---
    "google_drive": {
        "description": "Search, read, and fetch documents from Google Drive",
        "url": "https://drivemcp.googleapis.com/mcp/v1",
        "transport": "http",
        "agents": [
            "commercial-legal", "privacy-legal", "product-legal",
            "corporate-legal", "employment-legal", "regulatory-legal",
            "ai-governance-legal", "litigation-legal", "ip-legal",
            "law-student", "legal-clinic", "legal-builder-hub",
        ],
    },
    "slack": {
        "description": "Search messages, read channels, find discussions across your workspace",
        "url": "https://mcp.slack.com/mcp",
        "transport": "http",
        "agents": [
            "commercial-legal", "privacy-legal", "product-legal",
            "corporate-legal", "employment-legal", "regulatory-legal",
            "ai-governance-legal", "litigation-legal", "ip-legal",
            "law-student", "legal-clinic", "legal-builder-hub",
        ],
    },
    # --- Legal Research ---
    "courtlistener": {
        "description": "Court docket search, opinions, and PACER integration",
        "url": "https://mcp.courtlistener.com/",
        "transport": "http",
        "agents": ["ip-legal", "law-student", "legal-clinic", "litigation-legal"],
    },
    "descrybe": {
        "description": "Legal research — case law, statutes, secondary sources",
        "url": "https://mcp.descrybe.com/mcp",
        "transport": "http",
        "agents": ["ip-legal", "law-student", "legal-clinic"],
    },
    "trellis": {
        "description": "State court analytics — judges, rulings, docket data",
        "url": "https://mcp.trellis.law/anthropic",
        "transport": "http",
        "agents": ["litigation-legal"],
    },
    "solve_intelligence": {
        "description": "Patent analysis — claims mapping, prior art, FTO",
        "url": "https://api.solveintelligence.com/mcp/",
        "transport": "http",
        "token_env": "SOLVE_TOKEN",
        "agents": ["corporate-legal", "ip-legal"],
    },
    "courtroom5": {
        "description": "Pro se litigation guidance and court procedure",
        "url": "https://mcp.courtroom5.com",
        "transport": "http",
        "agents": ["legal-clinic"],
    },
    # --- Contract & Document Management ---
    "ironclad": {
        "description": "Contract lifecycle management — search, workflows, repository",
        "url": "https://mcp.na1.ironcladapp.com/mcp",
        "transport": "http",
        "token_env": "IRONCLAD_TOKEN",
        "agents": ["commercial-legal"],
    },
    "definely": {
        "description": "Contract structure — definitions, cross-references, structural diffs",
        "url": "https://mcp.uk.definely.com/api/proxy/core-mcp",
        "transport": "http",
        "token_env": "DEFINELY_TOKEN",
        "agents": ["commercial-legal", "corporate-legal"],
    },
    "imanage": {
        "description": "Document management — governed iManage content, permission-bound access",
        "url": "https://cloudimanage.com/mcp/work",
        "transport": "http",
        "token_env": "IMANAGE_TOKEN",
        "agents": ["commercial-legal", "corporate-legal"],
    },
    "docusign": {
        "description": "Agreement search, status tracking, and signature workflows",
        "url": "https://mcp.docusign.com/mcp",
        "transport": "http",
        "token_env": "DOCUSIGN_TOKEN",
        "agents": ["commercial-legal"],
    },
    "box": {
        "description": "Data room and document management",
        "url": "https://mcp.box.com/mcp",
        "transport": "http",
        "token_env": "BOX_TOKEN",
        "agents": ["corporate-legal"],
    },
    # --- E-Discovery & Litigation ---
    "everlaw": {
        "description": "E-discovery platform — document review, productions",
        "url": "https://api.everlaw.com/v1/mcp",
        "transport": "http",
        "token_env": "EVERLAW_TOKEN",
        "agents": ["litigation-legal"],
    },
    "aurora": {
        "description": "Consilio Aurora — litigation analytics and AI-assisted review",
        "url": "https://mcp.ai.consilio.com",
        "transport": "http",
        "token_env": "AURORA_TOKEN",
        "agents": ["litigation-legal"],
    },
    # --- Outside Counsel & Community ---
    "topcounsel": {
        "description": "Outside counsel recommendations from The L Suite community",
        "url": "https://api.techgc.co/api/mcp/topcounsel",
        "transport": "http",
        "agents": ["commercial-legal", "corporate-legal", "litigation-legal"],
    },
    "lawve_ai": {
        "description": "Legal skill marketplace and community resources",
        "url": "https://mcp.lawve.ai/mcp",
        "transport": "http",
        "agents": ["legal-builder-hub"],
    },
    # --- Project Management ---
    "asana": {
        "description": "Project and task management for product launches",
        "url": "https://mcp.asana.com/sse",
        "transport": "sse",
        "agents": ["product-legal"],
    },
    "atlassian": {
        "description": "Jira issues and Confluence pages",
        "url": "https://mcp.atlassian.com/v1/sse",
        "transport": "sse",
        "agents": ["product-legal"],
    },
    "linear": {
        "description": "Linear issues and project tracking",
        "url": "https://mcp.linear.app/mcp",
        "transport": "http",
        "agents": ["product-legal"],
    },
}


def _parse_csv(value: str) -> list[str]:
    return [v.strip() for v in value.split(",") if v.strip()] if value else []


def _parse_kv(value: str) -> dict[str, str]:
    if not value:
        return {}
    return dict(kv.split("=", 1) for kv in value.split(",") if "=" in kv)


def _is_server_configured_via_env(server_name: str) -> bool:
    """Check if a server has explicit MCP_* env vars set (override mode)."""
    prefix = f"MCP_{server_name.upper()}"
    transport = os.environ.get(f"{prefix}_TRANSPORT", "").lower()
    if transport == "stdio":
        return f"{prefix}_COMMAND" in os.environ
    elif transport in ("sse", "http"):
        return f"{prefix}_URL" in os.environ
    return False


def _build_stdio_config(server_name: str) -> dict[str, Any]:
    prefix = f"MCP_{server_name.upper()}"
    command = os.environ[f"{prefix}_COMMAND"]
    args = _parse_csv(os.environ.get(f"{prefix}_ARGS", ""))
    env = _parse_kv(os.environ.get(f"{prefix}_ENV", ""))

    config: dict[str, Any] = {"command": command}
    if args:
        config["args"] = args
    if env:
        config["env"] = env
    return config


def _build_remote_config(server_name: str, transport: str) -> dict[str, Any]:
    prefix = f"MCP_{server_name.upper()}"
    url = os.environ[f"{prefix}_URL"]
    headers = _parse_kv(os.environ.get(f"{prefix}_HEADERS", ""))

    config: dict[str, Any] = {"type": transport, "url": url}
    if headers:
        config["headers"] = headers
    return config


def _build_from_registry(server_def: dict[str, Any]) -> dict[str, Any] | None:
    """Build config from the registry entry (default URL + optional token)."""
    transport = server_def.get("transport", "http")
    config: dict[str, Any] = {"type": transport, "url": server_def["url"]}

    token_env = server_def.get("token_env")
    if token_env:
        token = os.getenv(token_env, "")
        if not token:
            return None
        config["headers"] = {"Authorization": f"Bearer {token}"}

    return config


def get_mcp_config(agent_slug: str) -> dict[str, Any]:
    """Get MCP server configurations for a given agent.

    Returns a dict suitable for ClaudeAgentOptions.mcp_servers:
        {"server_name": McpServerConfig, ...}

    Resolution order for each server:
      1. Explicit MCP_<SERVER>_* env vars (override — supports stdio/sse/http)
      2. Registry defaults (pre-configured URL + optional token from env)

    Servers requiring a token (token_env) are skipped if the token is not set.
    Servers without token requirements are always included.

    Returns an empty dict if no servers are available (graceful degradation).
    """
    configs: dict[str, Any] = {}
    for server_name, server_def in MCP_SERVERS.items():
        if agent_slug not in server_def["agents"]:
            continue

        # Priority 1: explicit env var override
        if _is_server_configured_via_env(server_name):
            prefix = f"MCP_{server_name.upper()}"
            transport = os.environ[f"{prefix}_TRANSPORT"].lower()
            try:
                if transport == "stdio":
                    configs[server_name] = _build_stdio_config(server_name)
                elif transport in ("sse", "http"):
                    configs[server_name] = _build_remote_config(server_name, transport)
                else:
                    print(f"  [mcp] Unknown transport '{transport}' for {server_name}", file=sys.stderr)
            except Exception as e:
                print(f"  [mcp] Failed to build config for {server_name}: {e}", file=sys.stderr)
            continue

        # Priority 2: registry defaults
        config = _build_from_registry(server_def)
        if config is not None:
            configs[server_name] = config

    return configs
