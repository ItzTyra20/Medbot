import type { SafetyResult } from "./safety.js";

export type TriageLevel =
  | "GENERAL_INFORMATION"
  | "ROUTINE_CARE"
  | "URGENT_CARE"
  | "EMERGENCY";

export type TriageResult = {
  level: TriageLevel;
  label: string;
  reason: string;
};

const urgentPatterns: RegExp[] = [
  /\bsevere pain\b/i,
  /\bgetting worse\b/i,
  /\bworsening\b/i,
  /\bhigh fever\b/i,
  /\bcan't keep (anything|food|water|fluids) down\b/i,
  /\bcannot keep (anything|food|water|fluids) down\b/i,
  /\bdehydrated\b/i,
  /\bconfusion\b/i,
  /\bfainted\b/i,
  /\bpassing out\b/i,
  /\bpersistent vomiting\b/i,
];

const routinePatterns: RegExp[] = [
  /\bfor (several|many) (weeks|months)\b/i,
  /\bfor the past (few|several|couple) (weeks|months)\b/i,
  /\bongoing\b/i,
  /\bchronic\b/i,
  /\brecurring\b/i,
  /\brecurring symptoms\b/i,
  /\broutine (checkup|appointment)\b/i,
  /\bcheckup\b/i,
];

const informationPatterns: RegExp[] = [
  /^\s*what is\b/i,
  /^\s*what are\b/i,
  /^\s*how does\b/i,
  /^\s*how do\b/i,
  /^\s*explain\b/i,
  /^\s*define\b/i,
  /^\s*what does .* mean\b/i,
];

function matchesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

export function assessTriage(text: string, safety: SafetyResult): TriageResult {
  const normalized = text.trim().replace(/\s+/g, " ");

  if (safety.emergency) {
    return {
      level: "EMERGENCY",
      label: "Emergency evaluation",
      reason: "The safety layer detected a potentially high-risk situation.",
    };
  }

  if (matchesAny(normalized, urgentPatterns)) {
    return {
      level: "URGENT_CARE",
      label: "Prompt medical evaluation",
      reason:
        "The message contains a concern that may warrant prompt evaluation by a healthcare professional.",
    };
  }

  if (matchesAny(normalized, routinePatterns)) {
    return {
      level: "ROUTINE_CARE",
      label: "Routine medical care",
      reason:
        "The concern appears ongoing or appropriate for a routine discussion with a healthcare professional.",
    };
  }

  if (matchesAny(normalized, informationPatterns)) {
    return {
      level: "GENERAL_INFORMATION",
      label: "General health information",
      reason: "The user appears to be asking an educational health question.",
    };
  }

  return {
    level: "GENERAL_INFORMATION",
    label: "General health information",
    reason:
      "No higher triage category was identified by the application rules.",
  };
}
