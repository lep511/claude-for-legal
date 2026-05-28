"""Routing MCP server — provides route_to_agent and request_handoff tools.

The orchestrator uses route_to_agent to dispatch to specialized agents.
Specialized agents use request_handoff to hand work to another agent.
"""

from typing import Any

from claude_agent_sdk import tool, create_sdk_mcp_server

_last_route: dict[str, Any] = {}
_pending_handoff: dict[str, Any] = {}


@tool(
    "route_to_agent",
    "Route the user's request to a specialized agent. Used by the orchestrator.",
    {"slug": str, "task": str, "title": str},
)
async def route_to_agent(args: dict[str, Any]) -> dict[str, Any]:
    global _last_route
    _last_route = {
        "agent_slug": args["slug"],
        "task": args["task"],
        "title": args.get("title", ""),
    }
    return {
        "content": [
            {"type": "text", "text": f"Routed to {args['slug']}: {args['task']}"}
        ]
    }


@tool(
    "request_handoff",
    "Hand off work to another specialized agent. Include full context the target needs.",
    {"target_slug": str, "task": str, "context": str},
)
async def request_handoff(args: dict[str, Any]) -> dict[str, Any]:
    global _pending_handoff
    _pending_handoff = {
        "target_agent": args["target_slug"],
        "task": args["task"],
        "reason": args.get("context", ""),
    }
    return {
        "content": [
            {
                "type": "text",
                "text": f"Handoff requested to {args['target_slug']}: {args['task']}",
            }
        ]
    }


def get_last_route() -> dict[str, Any]:
    return _last_route


def get_pending_handoff() -> dict[str, Any]:
    return _pending_handoff


def clear_last_route() -> None:
    global _last_route
    _last_route = {}


def clear_pending_handoff() -> None:
    global _pending_handoff
    _pending_handoff = {}


routing_server = create_sdk_mcp_server(
    "routing", tools=[route_to_agent, request_handoff]
)
