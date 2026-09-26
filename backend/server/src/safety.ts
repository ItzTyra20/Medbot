export type SafetyResult = {
  emergency: boolean;
  reason: string;
  message: string;
  matchedRule?: string;
};

// Conservative demo-only keyword checks; not validated clinical triage.
// A negative result does NOT mean a person is medically safe.
const emergencyPatterns: Array<{ name: string; pattern: RegExp }> = [
  { name: "chest pain", pattern: /\b(crushing chest pain|severe chest pain|chest pressure right now)\b/i },
  { name: "breathing emergency", pattern: /\b(can't breathe|cannot breathe|barely breathe|severe difficulty breathing)\b/i },
  { name: "possible stroke", pattern: /\b(face drooping|sudden slurred speech|sudden weakness on one side)\b/i },
  { name: "unconsciousness", pattern: /\b(unconscious|won't wake up|not waking up|unresponsive)\b/i },
  { name: "severe bleeding", pattern: /\b(severe bleeding|bleeding won't stop|can't stop the bleeding)\b/i },
  { name: "overdose", pattern: /\b(overdose|took too many pills|took more than prescribed and feel unwell)\b/i },
  { name: "severe allergic reaction", pattern: /\b(throat is closing|anaphylaxis|tongue is swelling and can't breathe)\b/i },
  { name: "imminent self-harm", pattern: /\b(going to kill myself|suicide plan tonight|about to hurt myself)\b/i }
];

export function checkSafety(input: string): SafetyResult {
  for (const rule of emergencyPatterns) {
    if (rule.pattern.test(input.trim())) {
      return {
        emergency: true,
        reason: "Potential emergency signal detected",
        matchedRule: rule.name,
        message: "This may be an emergency. In the United States, call 911 now if there is immediate danger or severe symptoms. Do not wait for an AI response. If possible, ask someone nearby to help."
      };
    }
  }
  return { emergency: false, reason: "", message: "" };
}
