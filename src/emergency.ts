/**
 * Client-side safety net for the voice assistant.
 *
 * The model is instructed to redirect to emergency services when it hears
 * emergency symptoms, but that instruction can fail silently (a missed
 * transcription, a distracted turn, a model that just doesn't do it). This
 * is a deterministic backstop that does not depend on the LLM noticing or
 * behaving correctly: it scans the caller's own transcribed words for a
 * fixed list of emergency phrases and flips a flag the UI always shows,
 * regardless of what the assistant says or does.
 *
 * This is intentionally broad (favors false positives over false
 * negatives) and intentionally simple (plain regex, no model call) so it
 * can't fail for the same reasons the assistant might.
 */

export const EMERGENCY_PATTERNS: RegExp[] = [
  // Cardiac
  /\bchest pain\b/i,
  /\bcrushing (chest )?pain\b/i,
  /\bheart attack\b/i,
  /\bpain (radiating|going) (down|into) (my )?(left )?arm\b/i,

  // Breathing
  /\bcan'?t breathe\b/i,
  /\bcannot breathe\b/i,
  /\b(difficulty|trouble) breathing\b/i,
  /\bnot breathing\b/i,
  /\bchoking\b/i,
  /\bthroat('?s| is)? closing\b/i,

  // Stroke
  /\bstroke\b/i,
  /\bface (is )?droop(ing|y)\b/i,
  /\bslurred speech\b/i,
  /\b(numb|numbness|can'?t feel) (on )?(my )?(one side|left side|right side|arm|leg|face)\b/i,

  // Bleeding / trauma / consciousness
  /\bsevere bleeding\b/i,
  /\bbleeding (a lot|heavily|won'?t stop)\b/i,
  /\bunconscious\b/i,
  /\bpassed out\b/i,
  /\bnot responding\b/i,
  /\bseizure\b/i,
  /\bconvulsion/i,
  /\banaphylax/i,
  /\bsevere allergic reaction\b/i,

  // Overdose / self-harm
  /\boverdose\b/i,
  /\btoo many (pills|tablets|pain ?killers)\b/i,
  /\bkill myself\b/i,
  /\bsuicid/i,
  /\bwant to die\b/i,
  /\bend my life\b/i,
  /\bhurt myself\b/i,
];

export function detectEmergency(text: string): boolean {
  if (!text) return false;
  return EMERGENCY_PATTERNS.some((pattern) => pattern.test(text));
}
