import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CHAT_ATTACHMENT_MAX_BYTES,
  buildChatAttachmentPreviewText,
  formatChatFileSize,
  formatVoiceDuration,
  getBaseMimeType,
  getMessagePreviewText,
  sanitizeChatFileName,
  validateChatAttachmentFile
} from './chatAttachments.js';

const file = (name, type, size = 1200) => ({ name, type, size });

test('validates allowed chat image and document files', () => {
  assert.equal(validateChatAttachmentFile(file('kitchen-photo.webp', 'image/webp'), { type: 'image' }).ok, true);
  assert.equal(validateChatAttachmentFile(file('recipe.pdf', 'application/pdf'), { type: 'document' }).ok, true);
  assert.equal(validateChatAttachmentFile(file('notes.csv', 'text/csv'), { type: 'document' }).ok, true);
});

test('blocks risky or mismatched chat uploads', () => {
  assert.equal(validateChatAttachmentFile(file('invoice.svg', 'image/svg+xml'), { type: 'image' }).ok, false);
  assert.equal(validateChatAttachmentFile(file('photo.pdf', 'application/pdf'), { type: 'image' }).ok, false);
  assert.equal(validateChatAttachmentFile(file('script.exe', 'application/octet-stream')).ok, false);
  assert.equal(validateChatAttachmentFile(file('huge.pdf', 'application/pdf', CHAT_ATTACHMENT_MAX_BYTES + 1), { type: 'document' }).ok, false);
});

test('formats voice durations, file sizes, and previews', () => {
  assert.equal(formatVoiceDuration(18_400), '0:18');
  assert.equal(formatVoiceDuration(61_000), '1:01');
  assert.equal(formatChatFileSize(1024), '1KB');
  assert.equal(formatChatFileSize(2.5 * 1024 * 1024), '2.5MB');
  assert.equal(buildChatAttachmentPreviewText({ type: 'voice', durationMs: 18_000 }), 'Voice note · 0:18');
  assert.equal(getMessagePreviewText({ text: '', attachments: [{ type: 'document', name: 'recipe.pdf' }] }), 'Document: recipe.pdf');
});

test('normalizes filenames and MIME values', () => {
  assert.equal(sanitizeChatFileName('../My Recipe!.pdf'), 'My-Recipe.pdf');
  assert.equal(getBaseMimeType('audio/webm;codecs=opus'), 'audio/webm');
});
