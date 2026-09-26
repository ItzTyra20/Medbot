export type SafetyCategory =
  | "possible_cardiac_emergency"
  | "possible_stroke"
  | "severe_breathing_problem"
  | "severe_allergic_reaction"
  | "severe_bleeding"
  | "loss_of_consciousness"
  | "severe_injury"
  | "possible_seizure"
  | "overdose_or_poisoning"
  | "mental_health_crisis";

export type SafetyResult = {
  emergency: boolean;
  reason: string;
  message: string;
  matchedRules: SafetyCategory[];
  instructions: string;
};

type SafetyRule = {
  name: SafetyCategory;
  patterns: RegExp[];
};

// This is an application safety layer, not a medical diagnostic system.
// It deliberately favors catching potentially serious situations over
// avoiding false positives. A negative result never means a person is safe.
const emergencyRules: SafetyRule[] = [
  {
    name: "possible_cardiac_emergency",
    patterns: [
      /\bchest pain\b/i,
      /\bchest pressure\b/i,
      /\bchest tightness\b/i,
      /\bcrushing (chest )?pain\b/i,
      /\bheart attack\b/i,
      /\bchest (pain|pressure|tightness)\b.*\b(shortness of breath|sweating|faint|fainting|nausea)\b/i,
    ],
  },
  {
    name: "possible_stroke",
    patterns: [
      /\bface (is )?droop(ing|ed|y)?\b/i,
      /\bslurred speech\b/i,
      /\bsudden (difficulty|trouble) speaking\b/i,
      /\b(can't|cannot) speak\b/i,
      /\b(one side|left side|right side)\b.*\b(weak|weakness|numb|numbness)\b/i,
      /\b(weak|weakness|numb|numbness)\b.*\b(one side|left side|right side)\b/i,
      /\bsudden\b.*\b(vision loss|vision changes|blindness)\b/i,
      /\bstroke\b/i,
    ],
  },
  {
    name: "severe_breathing_problem",
    patterns: [
      /\b(can't|cannot|unable to) breathe\b/i,
      /\bnot breathing\b/i,
      /\bbarely breathing\b/i,
      /\bsevere (difficulty|trouble|shortness of) breathing\b/i,
      /\bsevere shortness of breath\b/i,
      /\bchoking\b/i,
    ],
  },
  {
    name: "severe_allergic_reaction",
    patterns: [
      /\banaphylax(is|ia)\b/i,
      /\bthroat (is )?closing\b/i,
      /\btongue (is )?swelling\b.*\b(breathe|breathing)\b/i,
      /\b(allergic reaction)\b.*\b(breathe|breathing|throat swelling|tongue swelling)\b/i,
      /\bsevere allergic reaction\b/i,
    ],
  },
  {
    name: "severe_bleeding",
    patterns: [
      /\bsevere bleeding\b/i,
      /\b(uncontrolled|heavy) bleeding\b/i,
      /\bbleeding\b.*\b(won't|will not|can't|cannot) stop\b/i,
      /\bcan't stop the bleeding\b/i,
    ],
  },
  {
    name: "loss_of_consciousness",
    patterns: [
      /\bunconscious\b/i,
      /\bunresponsive\b/i,
      /\bnot responding\b/i,
      /\bwon't wake up\b/i,
      /\bwill not wake up\b/i,
      /\bnot waking up\b/i,
    ],
  },
  {
    name: "severe_injury",
    patterns: [
      /\bsevere head injury\b/i,
      /\bmajor head injury\b/i,
      /\bserious head injury\b/i,
      /\bspinal injury\b/i,
    ],
  },
  {
    name: "possible_seizure",
    patterns: [
      /\bseizure\b/i,
      /\bconvulsion\b/i,
      /\bconvulsing\b/i,
    ],
  },
  {
    name: "overdose_or_poisoning",
    patterns: [
      /\boverdose\b/i,
      /\btook too many (pills|tablets)\b/i,
      /\btook more than prescribed\b/i,
      /\bpoisoned\b/i,
      /\bpoisoning\b/i,
      /\bswallowed something poisonous\b/i,
    ],
  },
  {
    name: "mental_health_crisis",
    patterns: [
      /\bkill myself\b/i,
      /\bsuicid(e|al)\b/i,
      /\bwant to die\b/i,
      /\bend my life\b/i,
      /\bhurt myself\b/i,
      /\bself[- ]harm\b/i,
      /\bgoing to kill myself\b/i,
    ],
  },
];

function findMatches(input: string): SafetyCategory[] {
  return emergencyRules
    .filter((rule) => rule.patterns.some((pattern) => pattern.test(input)))
    .map((rule) => rule.name);
}

export function checkSafety(input: string): SafetyResult {
  const normalized = input.trim().replace(/\s+/g, " ");
  const matchedRules = findMatches(normalized);

  if (matchedRules.includes("mental_health_crisis")) {
    return {
      emergency: true,
      reason: "The message may describe an immediate mental-health or self-harm crisis.",
      matchedRules,
      message:
        "If you may be in immediate danger or may hurt yourself, call 911 or go to the nearest emergency department now. In the U.S., you can also call or text 988 for crisis support.",
      instructions:
        "Do not provide self-harm or overdose instructions. Keep the response calm and supportive. Encourage immediate human help and emergency services when there is immediate danger.",
    };
  }

  if (matchedRules.includes("overdose_or_poisoning")) {
    return {
      emergency: true,
      reason: "The message may describe an overdose or poisoning.",
      matchedRules,
      message:
        "If someone may have overdosed or been poisoned, seek immediate medical help. In the U.S., call 911 for severe or life-threatening symptoms and contact Poison Control at 1-800-222-1222 for poisoning guidance.",
      instructions:
        "Do not provide instructions for causing an overdose or for dangerous medication use. If an overdose may already have occurred, prioritize immediate professional help.",
    };
  }

  if (matchedRules.length > 0) {
    return {
      emergency: true,
      reason: "The message contains a symptom or situation that may require immediate medical evaluation.",
      matchedRules,
      message:
        "Some symptoms you described can require immediate medical attention. If the symptoms are happening now or are severe, sudden, or worsening, call 911 or go to the nearest emergency department. Do not wait for an AI response.",
      instructions:
        "Do not reassure the user that the situation is safe. Clearly recommend emergency evaluation and do not claim a diagnosis.",
    };
  }

  return {
    emergency: false,
    reason: "No predefined high-risk pattern was detected.",
    matchedRules: [],
    message: "",
    instructions:
      "Provide general health information without diagnosing. Ask relevant follow-up questions when necessary and communicate uncertainty.",
  };
}
