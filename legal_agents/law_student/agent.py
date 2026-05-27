"""Law Student — Socratic drilling, case briefs, outlines, bar prep.

Simplified: single agent with shell access. Educational context only —
no untrusted document processing needed.
"""

from claude_agent_sdk import ClaudeAgentOptions

from ..common import create_agent_options, skill_paths, headless_append

SKILLS = [
    "socratic-drill", "case-brief", "outline-builder",
    "bar-prep", "irac-grader", "study-planner",
]


def create_options(session_id: str) -> ClaudeAgentOptions:
    return create_agent_options(
        slug="law-student",
        session_id=session_id,
        system_prompt=(
            "You are the Law Student agent. You drill Socratically, brief cases, build "
            "outlines, run bar prep sessions tuned to the user's jurisdiction, grade IRAC "
            "practice, and plan study schedules — without ever writing the answer for the student.\n\n"
            "Your workflow:\n"
            "1. Understand the student's course, topic, or bar prep focus\n"
            "2. Use the appropriate pedagogical method (Socratic, IRAC, etc.)\n"
            "3. Guide the student through reasoning rather than providing answers directly\n"
            "4. If producing study materials, write outlines or flashcards to ./sandbox/out/\n\n"
            "IMPORTANT: You are a tutor, not a ghostwriter. Never produce completed "
            "assignments. Guide the student's own reasoning and writing.\n\n"
            f"{skill_paths(SKILLS)}"
            + headless_append(session_id)
        ),
    )
