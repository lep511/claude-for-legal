"""Profile management for legal agent practice profiles.

Handles reading/writing practice profile configurations, rendering templates
with user-provided values, and extracting schema information from CLAUDE.md templates.
"""

import json
import os
import re
from pathlib import Path
from typing import Any

AGENTS_DIR = Path(__file__).parent / "agents"
PROFILES_DIR = Path(__file__).parent / "sandbox" / "profiles"

PLACEHOLDER_RE = re.compile(r"\[PLACEHOLDER(?:\s*[—–-]\s*(.+?))?\]")

AGENT_SLUGS = [
    "ai-governance-legal",
    "commercial-legal",
    "corporate-legal",
    "employment-legal",
    "ip-legal",
    "law-student",
    "legal-builder-hub",
    "legal-clinic",
    "litigation-legal",
    "privacy-legal",
    "product-legal",
    "regulatory-legal",
]


def _agent_dir(slug: str) -> Path:
    path = AGENTS_DIR / slug
    if not path.is_dir():
        raise ValueError(f"Unknown agent: {slug}")
    return path


def _template_path(slug: str) -> Path:
    return _agent_dir(slug) / "CLAUDE.md"


def _profile_path(slug: str) -> Path:
    return PROFILES_DIR / f"{slug}.json"


def _rendered_path(slug: str) -> Path:
    return PROFILES_DIR / "rendered" / f"{slug}.md"


def _schema_path(slug: str) -> Path:
    return _agent_dir(slug) / "profile-schema.json"


def extract_placeholders(slug: str) -> list[dict[str, Any]]:
    """Extract all PLACEHOLDER markers from a template, with line numbers and hints."""
    template = _template_path(slug).read_text()
    results = []
    for i, line in enumerate(template.splitlines(), 1):
        for match in PLACEHOLDER_RE.finditer(line):
            hint = match.group(1) or ""
            field_id = f"line_{i}_{match.start()}"
            results.append({
                "id": field_id,
                "line": i,
                "hint": hint.strip(),
                "context": line.strip()[:120],
                "full_match": match.group(0),
            })
    return results


def get_schema(slug: str) -> dict[str, Any]:
    """Get the profile schema for an agent.

    Returns enriched schema if profile-schema.json exists,
    otherwise auto-generates from PLACEHOLDER extraction.
    """
    schema_file = _schema_path(slug)
    if schema_file.exists():
        return json.loads(schema_file.read_text())

    placeholders = extract_placeholders(slug)
    return {
        "title": f"{slug} Profile",
        "slug": slug,
        "auto_generated": True,
        "fields": [
            {
                "id": p["id"],
                "label": p["hint"] or p["context"],
                "type": "text",
                "placeholder": p["hint"],
                "line": p["line"],
            }
            for p in placeholders
        ],
    }


def get_values(slug: str) -> dict[str, str]:
    """Get saved profile values for an agent."""
    path = _profile_path(slug)
    if not path.exists():
        return {}
    return json.loads(path.read_text())


def save_values(slug: str, values: dict[str, str]) -> dict[str, Any]:
    """Save profile values and render the populated CLAUDE.md."""
    PROFILES_DIR.mkdir(parents=True, exist_ok=True)
    path = _profile_path(slug)
    path.write_text(json.dumps(values, indent=2, ensure_ascii=False))
    render_profile(slug)
    return {"status": "saved", "fields_set": len(values)}


def render_profile(slug: str) -> str:
    """Render a CLAUDE.md template with saved profile values.

    Replaces [PLACEHOLDER ...] markers with values from the profile store.
    Values are matched by order of appearance (positional) since the same
    template structure is used to generate the schema.
    """
    template = _template_path(slug).read_text()
    values = get_values(slug)

    if not values:
        return template

    rendered_dir = PROFILES_DIR / "rendered"
    rendered_dir.mkdir(parents=True, exist_ok=True)

    placeholders = extract_placeholders(slug)
    id_to_value = values

    lines = template.splitlines()
    for placeholder in reversed(placeholders):
        field_id = placeholder["id"]
        if field_id in id_to_value and id_to_value[field_id]:
            line_idx = placeholder["line"] - 1
            line = lines[line_idx]
            line = line.replace(placeholder["full_match"], id_to_value[field_id], 1)
            lines[line_idx] = line

    rendered = "\n".join(lines)
    _rendered_path(slug).write_text(rendered)
    return rendered


def get_status(slug: str) -> str:
    """Return configuration status: 'configured', 'partial', or 'unconfigured'."""
    values = get_values(slug)
    if not values:
        return "unconfigured"

    placeholders = extract_placeholders(slug)
    total = len(placeholders)
    filled = sum(1 for p in placeholders if p["id"] in values and values[p["id"]])

    if filled == 0:
        return "unconfigured"
    if filled >= total:
        return "configured"
    return "partial"


def get_all_statuses() -> list[dict[str, Any]]:
    """Return configuration status for all agents."""
    results = []
    for slug in AGENT_SLUGS:
        placeholders = extract_placeholders(slug)
        values = get_values(slug)
        filled = sum(1 for p in placeholders if p["id"] in values and values[p["id"]])
        results.append({
            "slug": slug,
            "status": get_status(slug),
            "total_fields": len(placeholders),
            "filled_fields": filled,
        })
    return results


def reset_profile(slug: str) -> dict[str, str]:
    """Reset a profile to unconfigured state."""
    path = _profile_path(slug)
    if path.exists():
        path.unlink()
    rendered = _rendered_path(slug)
    if rendered.exists():
        rendered.unlink()
    return {"status": "reset", "slug": slug}


def get_rendered_or_template(slug: str) -> str:
    """Get the rendered profile if it exists, otherwise the template.

    This is what agents should read at runtime.
    """
    rendered = _rendered_path(slug)
    if rendered.exists():
        return rendered.read_text()
    return _template_path(slug).read_text()
