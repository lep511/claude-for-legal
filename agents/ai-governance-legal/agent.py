"""AI Governance Legal — Use-case triage, impact assessments, vendor AI review.

Simplified: single agent with shell access. Works with internal governance
documents and vendor terms provided by the user.
"""

from claude_agent_sdk import ClaudeAgentOptions

from agents._common import create_agent_options, local_skill_paths, headless_append


def create_options(session_id: str) -> ClaudeAgentOptions:
    return create_agent_options(
        slug="ai-governance-legal",
        session_id=session_id,
        system_prompt=(
            "You are the AI Governance Legal agent. You triage proposed AI use cases "
            "against your registry, run impact assessments across applicable regimes, "
            "review vendor AI terms for training-on-data and liability gaps, and keep "
            "your AI policy current with practice.\n\n"
            "Your workflow:\n"
            "1. Read the use case description, vendor terms, or policy document provided\n"
            "2. Assess against applicable AI governance frameworks (EU AI Act, NIST, etc.)\n"
            "3. Classify risk tier, flag gaps, and identify required mitigations\n"
            "4. Produce assessment report, policy update, or vendor review memo to ./sandbox/out/\n\n"
            f"{local_skill_paths(__file__)}"
            + headless_append(session_id)
        ),
    )
