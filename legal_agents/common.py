"""Shared configuration for all legal agents.

Provides factory functions for creating ClaudeAgentOptions and running
isolated reader subagents with schema validation.
"""

import json
import os
from datetime import date
from pathlib import Path
from typing import Any

import jsonschema

from claude_agent_sdk import query, ClaudeAgentOptions, ResultMessage

from sdk_tools.calculator import calculator_server
from sdk_tools.routing import routing_server
from mcp_servers import get_mcp_config

PROJECT_ROOT = Path(__file__).resolve().parent.parent

CLAUDE_MODEL = os.getenv("CLAUDE_MODEL", "us.anthropic.claude-opus-4-6-v1")
THINKING_ENABLED = os.getenv("THINKING_ENABLED", "false").lower() == "true"
THINKING_BUDGET = int(os.getenv("THINKING_BUDGET", "10000"))
MAX_TURNS = int(os.getenv("MAX_TURNS", "50"))
MAX_HANDOFF_DEPTH = int(os.getenv("MAX_HANDOFF_DEPTH", "3"))

AGENTS_DIR = os.path.join(os.path.dirname(__file__), "..", "agents")

TEMPLATES_DIR = os.path.join(os.path.dirname(__file__), "..", "templates")

_SKILL_INDEX: dict[str, str] = {}
for _plugin in os.listdir(AGENTS_DIR):
    _plugin_path = os.path.join(AGENTS_DIR, _plugin)
    _skills_dir = os.path.join(_plugin_path, "skills")
    if os.path.isdir(_skills_dir):
        for _skill in os.listdir(_skills_dir):
            _spath = os.path.join(_skills_dir, _skill)
            if os.path.isdir(_spath):
                _SKILL_INDEX[_skill] = _spath


def _thinking_config() -> dict[str, Any] | None:
    if THINKING_ENABLED:
        return {"type": "enabled", "budget_tokens": THINKING_BUDGET}
    return None


def create_agent_options(
    slug: str,
    session_id: str,
    system_prompt: str,
    *,
    extra_mcp: dict[str, Any] | None = None,
    include_routing: bool = True,
    max_turns: int | None = None,
) -> ClaudeAgentOptions:
    """Build ClaudeAgentOptions for a specialized agent."""
    mcp: dict[str, Any] = {
        **get_mcp_config(slug),
        "calculator": calculator_server,
    }
    if include_routing:
        mcp["routing"] = routing_server
    if extra_mcp:
        mcp.update(extra_mcp)

    allowed = [
        "Bash", "Read", "Write", "Edit", "Glob", "Grep",
        "mcp__calculator__calculate",
    ]
    if include_routing:
        allowed.extend(["mcp__routing__request_handoff"])

    for name in get_mcp_config(slug):
        allowed.append(f"mcp__{name}__*")

    if extra_mcp:
        for name in extra_mcp:
            if name not in ("calculator", "routing"):
                allowed.append(f"mcp__{name}__*")

    return ClaudeAgentOptions(
        system_prompt=system_prompt,
        allowed_tools=allowed,
        mcp_servers=mcp,
        permission_mode="bypassPermissions",
        cwd=str(PROJECT_ROOT),
        model=CLAUDE_MODEL,
        max_turns=max_turns or MAX_TURNS,
        thinking=_thinking_config(),
        setting_sources=[],
        strict_mcp_config=True,
    )


def create_orchestrator_options(session_id: str, system_prompt: str) -> ClaudeAgentOptions:
    """Build ClaudeAgentOptions for the orchestrator agent."""
    mcp: dict[str, Any] = {
        "calculator": calculator_server,
        "routing": routing_server,
    }

    return ClaudeAgentOptions(
        system_prompt=system_prompt,
        allowed_tools=[
            "mcp__calculator__calculate",
            "mcp__routing__route_to_agent",
        ],
        mcp_servers=mcp,
        permission_mode="bypassPermissions",
        cwd=str(PROJECT_ROOT),
        model=CLAUDE_MODEL,
        max_turns=15,
        thinking=_thinking_config(),
        setting_sources=[],
        strict_mcp_config=True,
    )


async def run_reader(
    task: str,
    system_prompt: str,
    schema: dict,
    session_id: str,
) -> dict:
    """Run an isolated reader subagent with calculator-only access and schema validation."""
    result = None
    async for msg in query(
        prompt=task,
        options=ClaudeAgentOptions(
            system_prompt=system_prompt,
            allowed_tools=["mcp__calculator__calculate"],
            mcp_servers={"calculator": calculator_server},
            output_format={"type": "json_schema", "schema": schema},
            max_turns=5,
            permission_mode="bypassPermissions",
            setting_sources=[],
            strict_mcp_config=True,
            model=CLAUDE_MODEL,
        ),
    ):
        if isinstance(msg, ResultMessage):
            if msg.subtype == "success" and msg.structured_output is not None:
                result = msg.structured_output
            elif msg.result:
                is_valid, validated = validate_output(msg.result, schema)
                if is_valid:
                    result = json.loads(validated)
                else:
                    raise RuntimeError(f"Reader validation failed: {validated}")
            else:
                raise RuntimeError(f"Reader failed with subtype: {msg.subtype}")

    if result is None:
        raise RuntimeError("Reader returned no output")

    is_valid, validated = validate_output(json.dumps(result), schema)
    if not is_valid:
        raise RuntimeError(f"Reader schema validation failed: {validated}")

    return result


def headless_append(session_id: str) -> str:
    """Generate the headless instructions with a session-specific sandbox path."""
    sandbox_path = f"./sandbox/{session_id}"
    today = date.today().isoformat()
    return (
        f" Today's date is {today}."
        " You are running headless. Write output files to the directory specified in the task "
        "(usually ./sandbox/out/<session_id>/). Do not assume an open Office document. "
        "If a subagent returns a FATAL error, do NOT retry the same call. "
        "Instead, inform the user of the limitation and STOP.\n\n"
        "TEMPLATE RULE: When producing .xlsx or .docx files, ALWAYS copy from the templates first:\n"
        "  - Excel: copy ./templates/report.xlsx then modify (preserves named styles: "
        "title, subtitle, header, data, data_label, section, highlight_pos, highlight_neg, pct, currency, currency_m)\n"
        "  - Word: copy ./templates/report.docx then modify (preserves styled Heading 1/2/3, "
        "Normal, table style 'Medium Shading 1 Accent 1')\n"
        "  Use: shutil.copy('templates/report.xlsx', '<output_path>') then open with openpyxl/python-docx.\n"
        "  Delete the example 'Template' sheet after adding your own sheets.\n\n"
        f"SCOPE RULE: You may ONLY read input files from the {sandbox_path}/ folder, ./templates/, "
        "and ./agents/. Write output files ONLY to the output directory specified in the task. "
        "NEVER access files outside these paths — no /etc, /usr, /var, .venv, .cache, or any other "
        f"system path. Do not use `find /` or search the entire filesystem. If the required input "
        f"data is not in {sandbox_path}/, report it as missing immediately.\n\n"
        "BREVITY RULE: Keep your final response concise. State what you did, what worked, "
        "and what failed in a few sentences. Do not repeat full file listings, do not dump "
        "raw command output, and do not produce lengthy markdown tables unless the user asked for them.\n\n"
        "CRITICAL RULE — NO FABRICATED DATA: You must NEVER invent, estimate, or generate "
        "illustrative data when real data is unavailable. If a data source fails, returns "
        "an error, or no input files are found, you MUST stop and ask the user to provide "
        "the missing files. Your response must include:\n"
        "  1. What files or data you need (be specific about format and content)\n"
        "  2. Why they are needed for the task\n"
        f"  3. Where the user should place them: {sandbox_path}/\n"
        "  4. A clear request asking the user to provide the files so you can continue\n"
        "Do NOT produce deliverables with placeholder, synthetic, or illustrative figures. "
        "Do NOT silently skip missing data — always ask the user explicitly.\n\n"
        "HANDOFF RULE: If your work produces output that another specialized agent should "
        "continue processing, use the request_handoff tool. Include in the task description "
        "the full context the target agent needs (file paths, parameters, what you produced). "
        "Available targets: commercial-legal, privacy-legal, product-legal, corporate-legal, "
        "employment-legal, regulatory-legal, ai-governance-legal, litigation-legal, ip-legal, "
        "law-student, legal-clinic, legal-builder-hub. "
        "Only hand off when the next step is clearly outside your domain."
    )


def skill_paths(names: list[str]) -> str:
    """Return a formatted block listing skill file paths for system prompts."""
    lines = []
    for name in names:
        if name in _SKILL_INDEX:
            lines.append(f"  - {name}: cat {_SKILL_INDEX[name]}/SKILL.md")
    if not lines:
        return ""
    return "Available skill docs (read with shell when needed):\n" + "\n".join(lines) + "\n\n"


def validate_output(output: str, schema: dict) -> tuple[bool, str]:
    """Validate subagent output against a JSON schema."""
    try:
        data = json.loads(output)
    except (json.JSONDecodeError, TypeError):
        start = output.find("{")
        end = output.rfind("}") + 1
        if start == -1 or end == 0:
            return False, "Output is not valid JSON"
        try:
            data = json.loads(output[start:end])
        except json.JSONDecodeError:
            return False, "Output is not valid JSON"

    try:
        jsonschema.validate(instance=data, schema=schema)
        return True, json.dumps(data)
    except jsonschema.ValidationError as e:
        path = "/".join(str(p) for p in e.absolute_path)
        return False, f"Schema validation failed at /{path}: {e.message}"
