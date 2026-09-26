from healthcare.safety import check_safety


def test_chest_pain_is_flagged():
    result = check_safety("I have chest pain right now.")
    assert result["emergency"] is True


def test_stroke_sign_is_flagged():
    result = check_safety("The left side of my face is drooping.")
    assert result["emergency"] is True


def test_self_harm_is_flagged():
    result = check_safety("I want to kill myself.")
    assert result["emergency"] is True
    assert "mental_health_crisis" in result["matched_categories"]


def test_normal_question_is_not_emergency():
    result = check_safety("What is a migraine?")
    assert result["emergency"] is False
