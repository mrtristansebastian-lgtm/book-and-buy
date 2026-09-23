const HARD_BLOCK_PATTERNS = [
  /(?:sexual|explicit)\s+(?:content\s+)?(?:with|involving)\s+(?:a\s+)?minor/i,
  /(?:buy|sell|share)\s+(?:child|minor)\s+(?:abuse|explicit)/i,
  /(?:credible|specific)\s+(?:bomb|mass shooting|terror)\s+(?:threat|plan)/i
];

const REVIEW_PATTERNS = [
  /\b(?:kill yourself|go die)\b/i,
  /\b(?:nudes?|explicit video)\b/i,
  /\b(?:buy followers|guaranteed followers|crypto giveaway)\b/i
];

export function evaluateSocialText(value) {
  const text = String(value || '').trim();
  if (!text) return { state: 'visible', reason: '', signals: [] };
  const signals = [];
  if (HARD_BLOCK_PATTERNS.some((pattern) => pattern.test(text))) {
    return { state: 'blocked', reason: 'high_confidence_safety', signals: ['high_confidence_safety'] };
  }
  if (REVIEW_PATTERNS.some((pattern) => pattern.test(text))) signals.push('sensitive_language');
  const links = text.match(/https?:\/\/|www\./gi) || [];
  if (links.length > 3) signals.push('link_burst');
  if (/(.)\1{14,}/i.test(text)) signals.push('repeated_characters');
  const words = text.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length >= 10 && new Set(words).size / words.length < 0.25) signals.push('repetitive_text');
  return signals.length
    ? { state: 'pending_review', reason: signals[0], signals }
    : { state: 'visible', reason: '', signals: [] };
}

export function managedSafetyConfiguration() {
  return {
    enabled: String(process.env.SOCIAL_MANAGED_SAFETY_ENABLED || '').toLowerCase() === 'true',
    imageProvider: 'google-vision',
    videoProvider: 'google-video-intelligence',
    textProvider: 'vertex-ai'
  };
}
