"""Orchestrator — Routes user requests to the correct specialized legal agent.

Responsibilities:
  - Clarifies vague/ambiguous user input before dispatching
  - Selects the best agent based on intent
  - If accept_edit=off, shows the execution plan and asks for confirmation
  - If accept_edit=on, proceeds directly
"""

import os
from datetime import date

from claude_agent_sdk import ClaudeAgentOptions

from agents._common import create_orchestrator_options
from sdk_tools.routing import get_last_route

_EXCLUDED_SKILLS = {"cold-start-interview", "customize", "matter-workspace"}

AGENT_CATALOG = [
    {
        "slug": "commercial-legal",
        "description": "Reviews contracts against playbook, tracks renewals, routes escalations, translates reviews into stakeholder summaries",
        "triggers": "contract, agreement, NDA, vendor, MSA, SaaS, renewal, redline, playbook",
    },
    {
        "slug": "privacy-legal",
        "description": "PIAs, DPA reviews, DSAR responses, policy monitoring, data processing assessments",
        "triggers": "privacy, GDPR, DSAR, DPA, PIA, DPIA, data protection, processing, CCPA",
    },
    {
        "slug": "product-legal",
        "description": "Launch reviews, marketing copy review, claims substantiation, risk triage",
        "triggers": "launch, product, marketing, claims, copy review, feature, release, advertising",
    },
    {
        "slug": "corporate-legal",
        "description": "M&A diligence, board minutes, entity compliance, disclosure schedules, closing checklists, written consents",
        "triggers": "M&A, merger, acquisition, diligence, board, minutes, consent, entity, closing, corporate",
    },
    {
        "slug": "employment-legal",
        "description": "Hire/termination review, worker classification, leave tracking, investigations, handbook drafting, international expansion",
        "triggers": "employment, hire, termination, worker classification, leave, investigation, handbook, policy, severance, expansion",
    },
    {
        "slug": "regulatory-legal",
        "description": "Regulatory feed monitoring, gap analysis, policy diffs, NPRM comment tracking, compliance digests",
        "triggers": "regulatory, compliance, regulation, rule, comment period, agency, enforcement, filing, NPRM",
    },
    {
        "slug": "ai-governance-legal",
        "description": "AI use-case triage, impact assessments, vendor AI term review, AI policy updates, AI inventory",
        "triggers": "AI, artificial intelligence, algorithm, model governance, AI policy, AI risk, EU AI Act, AIA",
    },
    {
        "slug": "litigation-legal",
        "description": "Matter management, claim charts, chronologies, depo prep, privilege logs, brief drafting, demand letters, subpoena triage, legal holds",
        "triggers": "litigation, lawsuit, filing, brief, deposition, discovery, subpoena, demand letter, legal hold, motion, chronology, claim chart",
    },
    {
        "slug": "ip-legal",
        "description": "Trademark clearance, FTO triage, invention intake, OSS compliance, portfolio tracking, C&D drafting, DMCA takedowns",
        "triggers": "patent, trademark, copyright, IP, intellectual property, OSS, open source, infringement, DMCA, trade secret, cease and desist",
    },
    {
        "slug": "law-student",
        "description": "Socratic drilling, case briefs, outlines, bar prep, IRAC practice, study planning, cold-call prep, flashcards",
        "triggers": "study, bar exam, case brief, outline, Socratic, IRAC, law school, exam prep, con law, torts, contracts class, flashcard",
    },
    {
        "slug": "legal-clinic",
        "description": "Clinic intake, student supervision, deadline tracking, case handoff, memos, client letters, research roadmaps",
        "triggers": "clinic, intake, pro bono, student, supervision, legal aid, client, deadline, handoff, semester",
    },
    {
        "slug": "legal-builder-hub",
        "description": "Finds, evaluates, and installs community legal skills with security review",
        "triggers": "skill, plugin, install, community, marketplace, builder, extension, registry",
    },
]


def _discover_skills(slug: str) -> list[str]:
    """Discover available skills for an agent from its skills/ directory."""
    agents_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    skills_dir = os.path.join(agents_dir, slug, "skills")
    if not os.path.isdir(skills_dir):
        return []
    return sorted(
        s for s in os.listdir(skills_dir)
        if os.path.isdir(os.path.join(skills_dir, s)) and s not in _EXCLUDED_SKILLS
    )


def _build_system_prompt(session_id: str = "") -> str:
    catalog_lines = []
    for a in AGENT_CATALOG:
        skills = _discover_skills(a["slug"])
        skills_text = f" | Skills: {', '.join(skills)}" if skills else ""
        catalog_lines.append(
            f"  - {a['slug']}: {a['description']}{skills_text} (triggers: {a['triggers']})"
        )
    catalog_text = "\n".join(catalog_lines)

    today = date.today().isoformat()

    return f"""You are the Orchestrator for a legal services multi-agent platform.
The user interacts with you through a web chat interface.
Today's date is {today}.

Your job is to understand the user's request, select the right agent, and dispatch it.

## Available agents
{catalog_text}

## Rules

1. **Clarify vague requests.** If the user's input is ambiguous, too short, or missing
   critical parameters (e.g., party names, jurisdiction, matter type), ask follow-up
   questions before proceeding. Do NOT guess — ask.

2. **Check for required input files.** If the task requires input files (contracts,
   agreements, filings, policies), ask the user whether they have already uploaded them.
   If they haven't, tell them to upload the required files using the attachment button
   (paperclip icon) in the chat. Be specific about what files are needed (e.g., "Please
   upload the vendor agreement PDF using the attachment button").

3. **Select the agent.** Once you have enough information, determine which agent to use.
   If no agent fits, tell the user.

4. **Dispatch when ready.** Once you have all the required information (parameters,
   uploaded files, clarifications), call route_to_agent with the selected slug and the
   refined task description. If anything is still missing, ask the user first.

5. **Output format for routing.** When ready to dispatch, call the route_to_agent tool
   with the agent slug, the full refined task description, and a short `title` (3-8 words)
   that specifically describes the user's request. The title becomes the session name shown
   in the sidebar. Be specific — include the entity, matter, jurisdiction, or subject matter.
   Good: "NDA Review — Acme Vendor Agreement", "M&A Diligence — Project Atlas".
   Bad: "Contract review", "Legal analysis", "Question".

## Important — web interface rules

- NEVER mention file paths, sandbox directories, output directories, or any internal
  system paths to the user. The user does not see the filesystem.
- NEVER tell the user to "place files in a folder" or reference ./sandbox/, ./sandbox/out/, or
  any path. Files are uploaded via the chat attachment button and delivered automatically.
- Output files (Excel, Word, PDF) are delivered to the user automatically in the
  interface — do not tell them where files are saved.
- Keep responses concise. The user sees your text in a chat bubble.
- Always respond in the same language the user uses.
"""


def create_options(session_id: str = "") -> ClaudeAgentOptions:
    """Create ClaudeAgentOptions for the orchestrator."""
    return create_orchestrator_options(session_id, _build_system_prompt(session_id))
