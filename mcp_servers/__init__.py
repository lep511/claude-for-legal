"""MCP server configuration for the Agent SDK.

Each agent can declare which MCP servers it needs. Servers are configured via
environment variables and returned as dict configs for ClaudeAgentOptions.mcp_servers.

Supported transports:
  - http: remote Streamable HTTP endpoint (e.g., hosted Ironclad, Slack, CourtListener)
  - sse: remote SSE endpoint (e.g., Asana, Atlassian)
  - stdio: local process (e.g., a Python/Node MCP server binary)
"""

from .registry import get_mcp_config, MCP_SERVERS

__all__ = ["get_mcp_config", "MCP_SERVERS"]
