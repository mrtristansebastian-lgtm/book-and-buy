import test from 'node:test';
import assert from 'node:assert/strict';
import { PROFILE_TEXT_LIMITS, limitProfileText, profileTextLimit } from '../src/features/website/components/editable/textLimits.js';

test('profile limits preserve short copy and cap headings, body and bio', () => {
  for (const maximum of [PROFILE_TEXT_LIMITS.heading, PROFILE_TEXT_LIMITS.body, PROFILE_TEXT_LIMITS.bio]) {
    assert.equal(limitProfileText('Short copy', maximum), 'Short copy');
    assert.equal(limitProfileText('a'.repeat(maximum + 30), maximum).length, maximum);
    assert.equal(limitProfileText('', maximum), '');
  }
});
test('limits are tailored to the density of each section', () => {
  assert.equal(profileTextLimit({}), 28);
  assert.equal(profileTextLimit({ multiline: true }), 180);
  assert.equal(profileTextLimit({ className: 'bb-profile-story-text', multiline: true }), 600);
  assert.equal(profileTextLimit({ className: 'bb-public-review-quote', multiline: true }), 240);
  assert.equal(profileTextLimit({ placeholder: 'Question' }), 120);
  assert.equal(profileTextLimit({ placeholder: 'Answer', multiline: true }), 500);
});
test('limits count whole Unicode characters without splitting emoji', () => {
  assert.equal(limitProfileText('🙂'.repeat(100), 80), '🙂'.repeat(80));
  assert.equal(PROFILE_TEXT_LIMITS.offerPoints, 12);
});
