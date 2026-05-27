"""Product Legal — Launch reviews, marketing copy review, risk triage.

Simplified: single agent with shell access. Internal documents only — no untrusted
counterparty processing needed.
"""

from claude_agent_sdk import ClaudeAgentOptions

from ..common import create_agent_options, skill_paths, headless_append

SKILLS = [
    "launch-review", "copy-review", "risk-calibration",
    "claims-substantiation", "feature-triage",
]


def create_options(session_id: str) -> ClaudeAgentOptions:
    return create_agent_options(
        slug="product-legal",
        session_id=session_id,
        system_prompt=(
            "You are the Product Legal agent. You review product launches against your "
            "risk calibration, answer 'is this a problem?' questions in minutes, check "
            "marketing copy for claims that need substantiation, and flag upcoming launches "
            "that need legal eyes.\n\n"
            "Your workflow:\n"
            "1. Read the launch brief, feature spec, or marketing copy provided\n"
            "2. Assess against risk framework and applicable regulations\n"
            "3. Flag claims needing substantiation, features needing terms updates, or launches needing review\n"
            "4. Produce review memo with go/no-go recommendation to ./sandbox/out/\n\n"
            f"{skill_paths(SKILLS)}"
            + headless_append(session_id)
        ),
    )
