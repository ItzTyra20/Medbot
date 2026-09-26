import { describe, it, expect } from "vitest";
import { checkSafety } from "./safety.js";
import { assessTriage } from "./triage.js";

describe("HealthVoice safety layer", () => {
  const emergencyInputs = [
    "I have chest pain right now.",
    "I have crushing chest pain.",
    "I can't breathe.",
    "My face is drooping.",
    "I suddenly have weakness on one side.",
    "My father is unconscious and won't wake up.",
    "I have severe bleeding that won't stop.",
    "I took too many pills.",
    "My throat is closing.",
    "I am going to kill myself.",
    "I am having a seizure.",
  ];

  it.each(emergencyInputs)("flags possible emergency: %s", (input) => {
    const result = checkSafety(input);
    expect(result.emergency).toBe(true);
    expect(result.matchedRules.length).toBeGreaterThan(0);
    expect(result.message.length).toBeGreaterThan(0);
  });

  it("does not flag routine health education", () => {
    const result = checkSafety("What is high blood pressure?");
    expect(result.emergency).toBe(false);
    expect(result.matchedRules).toEqual([]);
  });

  it("does not flag general lung education", () => {
    expect(checkSafety("Explain how the lungs work.").emergency).toBe(false);
  });

  it("does not flag an unrecognized symptom as an emergency", () => {
    // This is not a safety clearance. It only means no predefined emergency
    // pattern matched the text.
    expect(checkSafety("I have a strange symptom.").emergency).toBe(false);
  });

  it("flags a mental-health crisis separately", () => {
    const result = checkSafety("I want to kill myself.");
    expect(result.matchedRules).toContain("mental_health_crisis");
    expect(result.message).toContain("988");
  });

  it("flags possible overdose separately", () => {
    const result = checkSafety("I took too many pills.");
    expect(result.matchedRules).toContain("overdose_or_poisoning");
    expect(result.message).toContain("Poison Control");
  });
});

describe("HealthVoice triage", () => {
  it("always gives emergency priority to a safety match", () => {
    const safety = checkSafety("I have chest pain.");
    const result = assessTriage("I have chest pain.", safety);
    expect(result.level).toBe("EMERGENCY");
  });

  it("routes worsening symptoms to urgent care", () => {
    const safety = checkSafety("My symptoms are getting worse.");
    const result = assessTriage("My symptoms are getting worse.", safety);
    expect(result.level).toBe("URGENT_CARE");
  });

  it("routes ongoing concerns to routine care", () => {
    const text = "I have had recurring symptoms for several months.";
    const safety = checkSafety(text);
    const result = assessTriage(text, safety);
    expect(result.level).toBe("ROUTINE_CARE");
  });

  it("routes educational questions to general information", () => {
    const text = "What is high blood pressure?";
    const safety = checkSafety(text);
    const result = assessTriage(text, safety);
    expect(result.level).toBe("GENERAL_INFORMATION");
  });
});
