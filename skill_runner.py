"""Skill discovery and execution for the legal agents platform.

Exposes skills as API-invocable workflows. Each skill is a SKILL.md file
containing instructions that the agent follows when the skill is triggered.
"""

import os
import re
from pathlib import Path
from typing import Any

AGENTS_DIR = Path(__file__).parent / "agents"

FRONTMATTER_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.DOTALL)
FIELD_RE = re.compile(r"^(\w[\w-]*):\s*(.+?)$", re.MULTILINE)
BLOCK_SCALAR_RE = re.compile(r"^(\w[\w-]*):\s*>\s*\n((?:\s+.+\n?)+)", re.MULTILINE)


def _parse_frontmatter(content: str) -> dict[str, str]:
    """Parse simple YAML frontmatter from SKILL.md files."""
    match = FRONTMATTER_RE.match(content)
    if not match:
        return {}
    fm_text = match.group(1)
    result = {}
    for m in BLOCK_SCALAR_RE.finditer(fm_text):
        key = m.group(1)
        value = " ".join(line.strip() for line in m.group(2).splitlines() if line.strip())
        result[key] = value
    for m in FIELD_RE.finditer(fm_text):
        key = m.group(1)
        if key not in result:
            value = m.group(2).strip().strip('"').strip("'")
            result[key] = value
    return result


def _skill_body(content: str) -> str:
    """Get the body of a SKILL.md (everything after frontmatter)."""
    match = FRONTMATTER_RE.match(content)
    if match:
        return content[match.end():]
    return content


def list_skills(slug: str) -> list[dict[str, str]]:
    """List available skills for an agent with name and description."""
    agent_dir = AGENTS_DIR / slug
    skills_dir = agent_dir / "skills"
    if not skills_dir.is_dir():
        return []

    skills = []
    for name in sorted(os.listdir(skills_dir)):
        skill_path = skills_dir / name / "SKILL.md"
        if not skill_path.exists():
            continue
        content = skill_path.read_text()
        fm = _parse_frontmatter(content)
        skills.append({
            "name": name,
            "description": fm.get("description", ""),
            "argument_hint": fm.get("argument-hint", ""),
        })
    return skills


def get_skill_content(slug: str, skill_name: str) -> str | None:
    """Get the full content of a SKILL.md file."""
    skill_path = AGENTS_DIR / slug / "skills" / skill_name / "SKILL.md"
    if not skill_path.exists():
        return None
    return skill_path.read_text()


def get_skill_instructions(slug: str, skill_name: str) -> str | None:
    """Get the body (instructions) of a skill, without frontmatter."""
    content = get_skill_content(slug, skill_name)
    if content is None:
        return None
    return _skill_body(content)


def build_skill_prompt(slug: str, skill_name: str, params: dict[str, Any] | None = None) -> str | None:
    """Build a prompt that instructs the agent to execute a specific skill.

    Returns None if the skill doesn't exist.
    """
    instructions = get_skill_instructions(slug, skill_name)
    if instructions is None:
        return None

    prompt_parts = [
        f"Execute the '{skill_name}' workflow for the {slug} practice area.",
        "Follow these instructions precisely:",
        "",
        instructions,
    ]

    if params:
        prompt_parts.extend([
            "",
            "Parameters provided by the user:",
            "",
        ])
        for key, value in params.items():
            prompt_parts.append(f"- {key}: {value}")

    return "\n".join(prompt_parts)
