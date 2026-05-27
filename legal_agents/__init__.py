"""Legal agents built with Anthropic Agent SDK.

Each subpackage exports a create_options() function that returns ClaudeAgentOptions
for use with query() or ClaudeSDKClient.
"""

from . import (
    ai_governance_legal,
    chart_generator,
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

__all__ = [
    "ai_governance_legal",
    "chart_generator",
    "commercial_legal",
    "corporate_legal",
    "employment_legal",
    "ip_legal",
    "law_student",
    "legal_builder_hub",
    "legal_clinic",
    "litigation_legal",
    "privacy_legal",
    "product_legal",
    "regulatory_legal",
]
