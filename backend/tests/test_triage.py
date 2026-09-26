from healthcare.safety import check_safety
from healthcare.triage import assess_triage


def test_emergency_takes_priority():
    text = "I have severe chest pain."
    safety = check_safety(text)
    result = assess_triage(text, safety)

    assert result["level"] == "EMERGENCY"


def test_general_question():
    text = "What is a migraine?"
    safety = check_safety(text)
    result = assess_triage(text, safety)

    assert result["level"] == "GENERAL_INFORMATION"


def test_routine_concern():
    text = "I have had recurring symptoms for several months."
    safety = check_safety(text)
    result = assess_triage(text, safety)

    assert result["level"] == "ROUTINE_CARE"
