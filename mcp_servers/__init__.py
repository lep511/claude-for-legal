"""MCP server configurations per agent slug.

Returns additional MCP servers an agent should have access to beyond
the base set (calculator + routing).
"""

from typing import Any


def get_mcp_config(slug: str) -> dict[str, Any]:
    """Return MCP server configs for a given agent slug.

    Legal agents currently rely on the base tools (Bash, Read, Write, etc.)
    plus calculator and routing. Per-agent MCP servers can be added here
    as integrations are configured (e.g., CLM connectors, docket APIs).
    """
    return {}
