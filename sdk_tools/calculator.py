"""Calculator MCP server — provides a safe calculation tool for isolated readers.

Readers processing untrusted documents get only this tool (no shell access).
"""

from typing import Any

from claude_agent_sdk import tool, create_sdk_mcp_server


@tool(
    "calculate",
    "Evaluate a mathematical expression safely. Supports basic arithmetic, "
    "percentages, and common financial calculations.",
    {"expression": str},
)
async def calculate(args: dict[str, Any]) -> dict[str, Any]:
    expr = args["expression"]
    allowed_names = {"abs": abs, "round": round, "min": min, "max": max, "sum": sum}
    try:
        result = eval(expr, {"__builtins__": {}}, allowed_names)  # noqa: S307
        return {"content": [{"type": "text", "text": str(result)}]}
    except Exception as e:
        return {"content": [{"type": "text", "text": f"Error: {e}"}]}


calculator_server = create_sdk_mcp_server("calculator", tools=[calculate])
