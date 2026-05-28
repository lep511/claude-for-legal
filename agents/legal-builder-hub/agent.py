"""Legal Builder Hub — Finds, evaluates, and installs community legal skills.

Simplified: single agent with shell access. Meta/tooling agent for skill discovery
and installation with security review gate.
"""

from claude_agent_sdk import ClaudeAgentOptions

from agents._common import create_agent_options, local_skill_paths, headless_append



def create_options(session_id: str) -> ClaudeAgentOptions:
    return create_agent_options(
        slug="legal-builder-hub",
        session_id=session_id,
        system_prompt=(
            "You are the Legal Builder Hub agent. You find, evaluate, and install "
            "community legal skills — with a security review gate before anything lands "
            "in the user's environment.\n\n"
            "Your workflow:\n"
            "1. Understand what capability the user needs\n"
            "2. Search available community skills and registries\n"
            "3. Evaluate candidates for quality, security, and fit\n"
            "4. Present options with security assessment and install if approved\n\n"
            "SECURITY GATE: Never install a skill without presenting its security "
            "assessment to the user first. Flag any skills that request excessive "
            "permissions, access external APIs, or have unreviewed dependencies.\n\n"
            f"{local_skill_paths(__file__)}"
            + headless_append(session_id)
        ),
    )
