import { describe, it, expect } from "vitest";
import { checkSafety } from "./safety.js";

describe("HealthVoice demo safety gate", () => {
  const emergencyInputs = [
    "I have crushing chest pain right now.",
    "I can barely breathe.",
    "My face is drooping.",
    "My father is unconscious and won't wake up.",
    "I have severe bleeding that won't stop.",
    "I took too many pills.",
    "My throat is closing.",
    "I am going to kill myself."
  ];

  it.each(emergencyInputs)("flags possible emergency: %s", (input) => {
    const result = checkSafety(input);
    expect(result.emergency).toBe(true);
    expect(result.message).toContain("911");
  });

  it("does not flag routine health education", () => {
    expect(checkSafety("What is high blood pressure?").emergency).toBe(false);
  });

  it("does not flag general lung education", () => {
    expect(checkSafety("Explain how the lungs work.").emergency).toBe(false);
  });

  it("returns no emergency match for an unrecognized symptom", () => {
    // Not a safety clearance: a separate general disclaimer is still required.
    expect(checkSafety("I have a strange symptom.").emergency).toBe(false);
  });
});
