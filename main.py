#!/usr/bin/env python3
"""
Legal Services Multi-Agent Platform

Uses an orchestrator agent to understand user intent, clarify vague requests,
and route to the best specialized agent. Each run is tracked as a session.

Usage:
    python main.py                    # New session
    python main.py --resume <id>      # Resume a previous session
    python main.py --sessions         # List all sessions
    python main.py --list             # List available agents

Environment:
    ACCEPT_EDIT=on                    # Auto-execute without confirmation
    ACCEPT_EDIT=off (default)         # Show plan and ask before executing
"""

import asyncio
import os
import readline  # noqa: F401 — enables arrow keys, history, and line editing in input()
import sys
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

from claude_agent_sdk import (
    query,
    ClaudeSDKClient,
    ClaudeAgentOptions,
    AssistantMessage,
    ResultMessage,
    SystemMessage,
    StreamEvent,
)
from claude_agent_sdk.types import TextBlock, ToolUseBlock

from agents import (
    ai_governance_legal,
    commercial_legal,
    corporate_legal,
    employment_legal,
    ip_legal,
    law_student,
    legal_builder_hub,
    legal_clinic,
    litigation_legal,
    privacy_legal,
    product_legal,
    regulatory_legal,
)
from agents._orchestrator.agent import create_options as create_orchestrator_options
from agents._common import MAX_HANDOFF_DEPTH
from sdk_tools.routing import get_last_route, get_pending_handoff, clear_last_route, clear_pending_handoff
from session_manager import Session

AGENTS = {
    "commercial-legal": {
        "module": commercial_legal,
        "description": "Reviews contracts against playbook, tracks renewals, routes escalations",
        "example": "Review this vendor agreement against our standard playbook",
    },
    "privacy-legal": {
        "module": privacy_legal,
        "description": "PIAs, DPA reviews, DSAR responses, policy monitoring",
        "example": "Review this DPA from our cloud vendor — are we compliant as controller?",
    },
    "product-legal": {
        "module": product_legal,
        "description": "Launch reviews, marketing copy review, risk triage",
        "example": "Review this landing page copy for claims that need substantiation",
    },
    "corporate-legal": {
        "module": corporate_legal,
        "description": "M&A diligence, board minutes, entity compliance",
        "example": "Review VDR documents for Project Atlas — flag risk items",
    },
    "employment-legal": {
        "module": employment_legal,
        "description": "Hire/termination review, worker classification, investigations",
        "example": "Review this separation agreement for California-specific risks",
    },
    "regulatory-legal": {
        "module": regulatory_legal,
        "description": "Reg monitoring, gap analysis, comment tracking, compliance digests",
        "example": "Analyze this new SEC rule against our current compliance posture",
    },
    "ai-governance-legal": {
        "module": ai_governance_legal,
        "description": "AI use-case triage, impact assessments, vendor AI review",
        "example": "Triage this proposed AI use case against our governance framework",
    },
    "litigation-legal": {
        "module": litigation_legal,
        "description": "Matter management, claim charts, chronologies, brief drafting",
        "example": "Build a chronology from these case filings",
    },
    "ip-legal": {
        "module": ip_legal,
        "description": "Trademark clearance, FTO triage, invention intake, OSS compliance",
        "example": "Run trademark clearance for 'NovaBridge' in Class 9",
    },
    "law-student": {
        "module": law_student,
        "description": "Socratic drilling, case briefs, outlines, bar prep",
        "example": "Drill me on personal jurisdiction — International Shoe through Bristol-Myers",
    },
    "legal-clinic": {
        "module": legal_clinic,
        "description": "Clinic intake, student supervision, deadline tracking",
        "example": "Run intake interview for new housing dispute client",
    },
    "legal-builder-hub": {
        "module": legal_builder_hub,
        "description": "Finds, evaluates, installs community legal skills",
        "example": "Find a skill for lease abstraction and evaluate its security",
    },
}


def _print_assistant_message(msg: AssistantMessage):
    """Print text and tool names from an AssistantMessage."""
    for block in msg.content:
        if isinstance(block, TextBlock):
            print(block.text, end="")
        elif isinstance(block, ToolUseBlock):
            print(f"\n  [{block.name}]")


async def _run_agent(options: ClaudeAgentOptions, task: str, session: Session, slug: str) -> str:
    """Run a specialized agent via query() and return its text response."""
    task_with_session = f"{task}\n\nWrite all output files to: {session.output_dir}/"
    response_text = ""

    async for msg in query(prompt=task_with_session, options=options):
        if isinstance(msg, AssistantMessage):
            for block in msg.content:
                if isinstance(block, TextBlock):
                    response_text += block.text
                    print(block.text, end="")
                elif isinstance(block, ToolUseBlock):
                    print(f"\n  [{block.name}]")
        elif isinstance(msg, ResultMessage):
            if msg.result:
                response_text = msg.result

    print()
    return response_text


async def main():
    if "--list" in sys.argv:
        print("Available agents:\n")
        for slug, info in AGENTS.items():
            print(f"  {slug:24s} {info['description']}")
        print()
        return

    if "--sessions" in sys.argv:
        sessions = Session.list_sessions()
        if not sessions:
            print("No sessions found.")
            return
        print(f"\n  {'ID':<14s} {'Created':<22s} {'Turns':<7s} Agents")
        print("  " + "-" * 70)
        for s in sessions:
            created = s["created_at"][:19].replace("T", " ")
            agents = ", ".join(s["agents_used"]) or "(none)"
            print(f"  {s['session_id']:<14s} {created:<22s} {s['turns']:<7d} {agents}")
        print()
        return

    session = None
    if "--resume" in sys.argv:
        idx = sys.argv.index("--resume")
        if idx + 1 < len(sys.argv):
            try:
                session = Session.load(sys.argv[idx + 1])
                print(f"\n  Resumed session: {session.id}")
            except FileNotFoundError:
                print(f"  [error] Session '{sys.argv[idx + 1]}' not found.", file=sys.stderr)
                return
        else:
            print("  [error] --resume requires a session ID.", file=sys.stderr)
            return
    elif "--test" in sys.argv:
        session = Session(session_id="test_001")
    else:
        session = Session()

    accept_edit = os.getenv("ACCEPT_EDIT", "off").lower() in ("on", "true", "1")

    print("\n  Legal Services Multi-Agent Platform")
    print("  " + "=" * 42)
    print(f"\n  Session: {session.id}")
    print(f"  Sandbox: {session.sandbox_dir}/")
    print(f"  Output:  {session.output_dir}/")
    print(f"  Mode:    {'auto-execute' if accept_edit else 'confirm-first'}")
    print("\n  Describe what you need — the orchestrator will route to the right agent.\n")
    print("  Examples:")
    for info in AGENTS.values():
        print(f"    \"{info['example']}\"")
    print("\n  Type 'q' to quit.\n")

    orch_options = create_orchestrator_options(session.id)

    async with ClaudeSDKClient(options=orch_options) as orchestrator:
      while True:
        try:
            user_input = await asyncio.to_thread(input, "You> ")
            user_input = user_input.strip()
        except (KeyboardInterrupt, EOFError):
            break

        if not user_input:
            continue
        if user_input.lower() in ("exit", "quit", "q"):
            break

        session.add_turn("user", user_input)
        clear_last_route()
        clear_pending_handoff()

        # --- Orchestrator phase ---
        orch_response = ""
        try:
            orch_message = user_input
            if not accept_edit:
                orch_message = f"{user_input}\n\n[SYSTEM: auto-execute is OFF. Present your plan and ask the user to confirm before calling route_to_agent.]"

            await orchestrator.query(orch_message)
            async for msg in orchestrator.receive_response():
                if isinstance(msg, AssistantMessage):
                    for block in msg.content:
                        if isinstance(block, TextBlock):
                            orch_response += block.text
                            print(block.text, end="")
                elif isinstance(msg, ResultMessage):
                    pass
        except KeyboardInterrupt:
            print("\n\n  [interrupted]\n")
            continue
        except Exception as e:
            print(f"\n  [orchestrator error] {type(e).__name__}: {e}\n", file=sys.stderr)
            continue

        if orch_response:
            session.add_turn("orchestrator", orch_response)

        # Check if orchestrator decided to route
        routed = get_last_route()
        if not routed:
            print("\n")
            continue

        slug = routed["agent_slug"]
        task = routed["task"]

        session.set_name(routed.get("title") or task)

        if slug not in AGENTS:
            print(f"\n  [error] Unknown agent: {slug}\n", file=sys.stderr)
            continue

        # --- Execute specialized agent (with handoff chain) ---
        handoff_depth = 0
        while True:
            if slug not in AGENTS:
                print(f"\n  [handoff error] Unknown target agent: {slug}\n", file=sys.stderr)
                break

            info = AGENTS[slug]
            print(f"\n  → [{slug}] {info['description']}\n")

            try:
                agent_options = info["module"].create_options(session.id)
                response = await _run_agent(agent_options, task, session, slug)
            except KeyboardInterrupt:
                print("\n\n  [interrupted] Agent stopped. You can continue with a new request.\n")
                break
            except Exception as e:
                print(f"\n  [error] {type(e).__name__}: {e}\n", file=sys.stderr)
                break

            if response:
                session.add_turn("agent", response, agent=slug)

            # Check for handoff
            handoff = get_pending_handoff()
            if not handoff:
                break

            handoff_depth += 1
            if handoff_depth >= MAX_HANDOFF_DEPTH:
                print(f"\n  [handoff limit] Reached max depth ({MAX_HANDOFF_DEPTH}). Stopping chain.\n")
                break

            print(f"\n  ⤳ handoff to [{handoff['target_agent']}]: {handoff['reason']}")
            slug = handoff["target_agent"]
            task = handoff["task"]

    session.save()
    print(f"\n  Session saved: {session.file_path}")
    print("Done.")


if __name__ == "__main__":
    asyncio.run(main())
