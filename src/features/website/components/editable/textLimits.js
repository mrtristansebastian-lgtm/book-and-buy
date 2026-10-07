export const PROFILE_TEXT_LIMITS = { heading: 28, body: 180, story: 600, bio: 200, offerBody: 180, review: 240, faqQuestion: 120, faqAnswer: 500, offerPoints: 12 };
export function profileTextLimit({ className = '', multiline = false, placeholder = '' }) {
  if (className.includes('story-text')) return PROFILE_TEXT_LIMITS.story;
  if (className.includes('pillar-body')) return PROFILE_TEXT_LIMITS.offerBody;
  if (className.includes('review-quote')) return PROFILE_TEXT_LIMITS.review;
  if (className.includes('review-name')) return 60;
  if (placeholder === 'Question') return PROFILE_TEXT_LIMITS.faqQuestion;
  if (placeholder === 'Answer') return PROFILE_TEXT_LIMITS.faqAnswer;
  if (placeholder === 'Street address') return 180;
  return multiline ? PROFILE_TEXT_LIMITS.body : PROFILE_TEXT_LIMITS.heading;
}
export function limitProfileText(value, maximum) {
  return Array.from(String(value || '')).slice(0, maximum).join('');
}
