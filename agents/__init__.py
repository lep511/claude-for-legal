"""Legal agents package — loads agent.py from each kebab-case plugin directory."""

import importlib.util
import sys
from pathlib import Path
from types import ModuleType

_AGENTS_DIR = Path(__file__).resolve().parent

AGENT_MAP = {
    "ai_governance_legal": "ai-governance-legal",
    "commercial_legal": "commercial-legal",
    "corporate_legal": "corporate-legal",
    "employment_legal": "employment-legal",
    "ip_legal": "ip-legal",
    "law_student": "law-student",
    "legal_builder_hub": "legal-builder-hub",
    "legal_clinic": "legal-clinic",
    "litigation_legal": "litigation-legal",
    "privacy_legal": "privacy-legal",
    "product_legal": "product-legal",
    "regulatory_legal": "regulatory-legal",
}


def _load_agent(python_name: str, kebab_name: str) -> ModuleType:
    agent_file = _AGENTS_DIR / kebab_name / "agent.py"
    module_name = f"agents.{python_name}"
    spec = importlib.util.spec_from_file_location(module_name, agent_file)
    module = importlib.util.module_from_spec(spec)
    module.__package__ = "agents"
    sys.modules[module_name] = module
    spec.loader.exec_module(module)
    return module


for _py_name, _kebab_name in AGENT_MAP.items():
    globals()[_py_name] = _load_agent(_py_name, _kebab_name)

__all__ = list(AGENT_MAP.keys())
