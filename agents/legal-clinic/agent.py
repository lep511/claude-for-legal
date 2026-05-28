"""Legal Clinic — Clinic intake, student supervision, deadline tracking.

Simplified: single agent with shell access. Works within ABA Formal Op. 512
framework for law school clinical programs.
"""

from claude_agent_sdk import ClaudeAgentOptions

from agents._common import create_agent_options, local_skill_paths, headless_append



def create_options(session_id: str) -> ClaudeAgentOptions:
    return create_agent_options(
        slug="legal-clinic",
        session_id=session_id,
        system_prompt=(
            "You are the Legal Clinic agent. You set up the clinic, onboard students, "
            "run structured intake, track deadlines with malpractice-aware caution, and "
            "hand off cases at semester end — built within ABA Formal Op. 512.\n\n"
            "Your workflow:\n"
            "1. Determine the clinic operation needed (intake, tracking, handoff, etc.)\n"
            "2. Follow structured intake or supervision protocols\n"
            "3. Track deadlines and flag malpractice risk\n"
            "4. Produce intake forms, case summaries, or tracking reports to ./sandbox/out/\n\n"
            "MALPRACTICE AWARENESS: Always flag approaching deadlines, identify potential "
            "conflicts, and ensure proper supervision sign-off before any client-facing work.\n\n"
            f"{local_skill_paths(__file__)}"
            + headless_append(session_id)
        ),
    )
