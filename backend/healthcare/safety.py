"""
Conservative safety checks for HealthVoice.

This module is intentionally NOT a medical diagnosis system.
It looks for a small set of high-risk situations where the application
should not rely on a normal conversational response.

The LLM should still provide the conversational explanation, but these
checks give the application a deterministic safety layer.
"""

import re


# These are deliberately broad emergency indicators. They are not intended
# to diagnose a condition. They are used to decide when the application
# should strongly recommend emergency evaluation.
EMERGENCY_PATTERNS = {
    "possible_heart_or_circulatory_emergency": [
        r"\b(chest pain|chest pressure|chest tightness)\b.*\b("
        r"severe|crushing|pressure|tightness|pain"
        r")\b",
        r"\b(chest pain|chest pressure|chest tightness)\b",
        r"\bheart attack\b",
    ],
    "possible_stroke": [
        r"\b(face|facial)\b.*\b(droop|drooping|numb|weak)\b",
        r"\b(one side|one-sided)\b.*\b(weak|weakness|numb|numbness)\b",
        r"\b(speech|speaking)\b.*\b(slurred|cannot speak|can't speak|unable)\b",
        r"\b(sudden)\b.*\b(vision loss|blindness|confusion|weakness|numbness)\b",
        r"\b(stroke)\b",
    ],
    "possible_severe_breathing_problem": [
        r"\b(can't breathe|cannot breathe|unable to breathe)\b",
        r"\b(severe|extreme)\b.*\b(shortness of breath|difficulty breathing)\b",
        r"\b(stopped breathing|not breathing)\b",
    ],
    "possible_severe_allergic_reaction": [
        r"\b(anaphylaxis|anaphylactic)\b",
        r"\b(throat|tongue)\b.*\b(swelling|swollen)\b.*\b("
        r"breath|breathing"
        r")\b",
        r"\b(allergic reaction)\b.*\b("
        r"trouble breathing|difficulty breathing|throat swelling"
        r")\b",
    ],
    "possible_severe_bleeding": [
        r"\b(uncontrolled bleeding|severe bleeding|heavy bleeding)\b",
        r"\b(bleeding)\b.*\b(won't stop|cannot stop|can't stop)\b",
    ],
    "possible_loss_of_consciousness": [
        r"\b(unconscious|unresponsive|not responding)\b",
        r"\b(passed out|fainted)\b.*\b(and|but)\b.*\b("
        r"not awake|confused|injured"
        r")\b",
    ],
    "possible_severe_injury": [
        r"\b(severe head injury|major head injury)\b",
        r"\b(spinal injury|neck injury)\b.*\b(severe|serious)\b",
    ],
}

CRISIS_PATTERNS = [
    r"\bkill myself\b",
    r"\bsuicid(?:e|al)\b",
    r"\bend my life\b",
    r"\bwant to die\b",
    r"\bhurt myself\b",
    r"\bself[- ]harm\b",
    r"\bself harm\b",
]

DANGEROUS_MEDICATION_PATTERNS = [
    r"\bhow much\b.*\b(overdose|to overdose)\b",
    r"\bhow many\b.*\b(pills|tablets)\b.*\bto die\b",
    r"\bhow can i\b.*\boverdose\b",
]


def _matches(text: str, patterns: list[str]) -> bool:
    return any(re.search(pattern, text, flags=re.IGNORECASE) for pattern in patterns)


def check_safety(text: str) -> dict:
    normalized = " ".join(text.strip().split())

    matched_categories = []

    for category, patterns in EMERGENCY_PATTERNS.items():
        if _matches(normalized, patterns):
            matched_categories.append(category)

    crisis = _matches(normalized, CRISIS_PATTERNS)
    dangerous_medication = _matches(normalized, DANGEROUS_MEDICATION_PATTERNS)

    if crisis:
        matched_categories.append("mental_health_crisis")

    if dangerous_medication:
        matched_categories.append("dangerous_medication_request")

    emergency = bool(matched_categories)

    if crisis:
        reason = (
            "The user may be describing an immediate mental-health or "
            "self-harm crisis."
        )
        instructions = (
            "Do not provide instructions for self-harm or overdose. "
            "Encourage immediate help from emergency services or a crisis "
            "service and encourage the person to move away from anything "
            "they could use to hurt themselves. Keep the response calm "
            "and supportive."
        )
        response_override = (
            "I’m concerned that you may be in immediate danger. Please "
            "contact emergency services now or go to the nearest emergency "
            "department. If you can do so safely, stay with another person "
            "and move away from anything you could use to hurt yourself."
        )
    elif dangerous_medication:
        reason = (
            "The request appears to involve a potentially dangerous "
            "medication or overdose situation."
        )
        instructions = (
            "Do not provide dosing or overdose instructions. If an overdose "
            "may already have occurred, recommend immediate emergency help "
            "or poison-control assistance."
        )
        response_override = (
            "I can’t provide instructions for an overdose. If you or someone "
            "else may have taken too much medication, seek immediate medical "
            "help or contact your local poison center/emergency services now."
        )
    elif emergency:
        reason = (
            "The user's message contains a symptom or situation that may "
            "require immediate medical evaluation."
        )
        instructions = (
            "Do not reassure the user that the situation is safe. Clearly "
            "recommend emergency evaluation and avoid claiming a diagnosis."
        )
        response_override = (
            "Some of the symptoms you described can require immediate medical "
            "attention. Please call emergency services or go to the nearest "
            "emergency department now, especially if the symptoms are severe, "
            "sudden, worsening, or accompanied by trouble breathing, fainting, "
            "confusion, or severe pain."
        )
    else:
        instructions = (
            "Continue with general health information. Do not diagnose. "
            "Ask relevant follow-up questions when necessary and explain "
            "uncertainty."
        )
        reason = "No predefined high-risk pattern was detected."
        response_override = None

    return {
        "emergency": emergency,
        "matched_categories": matched_categories,
        "reason": reason,
        "instructions": instructions,
        "response_override": response_override,
    }
