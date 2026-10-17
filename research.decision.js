const RESEARCH_PATTERNS = [
  /\btoday\b/i,
  /\btonight\b/i,
  /\byesterday\b/i,
  /\blatest\b/i,
  /\brecent\b/i,
  /\bcurrent\b/i,
  /\bcurrently\b/i,
  /\bnow\b/i,
  /\bnews\b/i,
  /\bprice\b/i,
  /\bweather\b/i,
  /\b2026\b/i,
  /\bwho is\b/i,
  /\bwhat happened\b/i,
];

export const shouldResearch = (message) => {
  if (
    typeof message !== "string" ||
    !message.trim()
  ) {
    return false;
  }

  return RESEARCH_PATTERNS.some(
    (pattern) => pattern.test(message)
  );
};
