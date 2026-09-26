"""
Simple application-level triage categories.

This is not a medical diagnosis model. It is a conservative routing layer
for deciding how the assistant should frame its response.
"""

import re


GENERAL_PATTERNS = [
    r"\bwhat is\b",
    r"\bwhat are\b",
    r"\bhow does\b",
    r"\bexplain\b",
    r"\bmeaning of\b",
    r"\bdefine\b",
]

URGENT_PATTERNS = [
    r"\bsevere pain\b",
    r"\bgetting worse\b",
    r"\bworsening\b",
    r"\bhigh fever\b",
    r"\bcan't keep\b.*\bfluids\b",
    r"\bcannot keep\b.*\bfluids\b",
    r"\bdehydrated\b",
    r"\bconfusion\b",
    r"\bfainted\b",
    r"\bpassing out\b",
]

ROUTINE_PATTERNS = [
    r"\bweeks?\b",
    r"\bmonths?\b",
    r"\bongoing\b",
    r"\bchronic\b",
    r"\brecurring\b",
    r"\bappointment\b",
    r"\bcheckup\b",
]


def _matches(text: str, patterns: list[str]) -> bool:
    return any(re.search(pattern, text, flags=re.IGNORECASE) for pattern in patterns)


def assess_triage(text: str, safety: dict | None = None) -> dict:
    safety = safety or {}
    normalized = " ".join(text.strip().split())

    if safety.get("emergency"):
        return {
            "level": "EMERGENCY",
            "label": "Emergency evaluation",
            "reason": "A high-risk pattern was detected by the safety layer.",
        }

    if _matches(normalized, URGENT_PATTERNS):
        return {
            "level": "URGENT_CARE",
            "label": "Prompt medical evaluation",
            "reason": "The message contains symptoms that may warrant prompt evaluation.",
        }

    if _matches(normalized, ROUTINE_PATTERNS):
        return {
            "level": "ROUTINE_CARE",
            "label": "Routine medical care",
            "reason": "The concern appears ongoing or appropriate for a routine discussion with a healthcare professional.",
        }

    if _matches(normalized, GENERAL_PATTERNS):
        return {
            "level": "GENERAL_INFORMATION",
            "label": "General health information",
            "reason": "The user appears to be requesting general information.",
        }

    return {
        "level": "GENERAL_INFORMATION",
        "label": "General health information",
        "reason": "No higher triage category was identified by the application rules.",
    }
