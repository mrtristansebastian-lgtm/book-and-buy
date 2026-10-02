import test from 'node:test';
import assert from 'node:assert/strict';
import { chatAttachmentMetadata, mediaDurationSeconds, MAX_VOICE_DURATION_MS } from '../src/features/support/utils/voiceMedia.js';

test('voice upload metadata satisfies the message contract and removes codec parameters', () => {
  const data = chatAttachmentMetadata({type:'audio/webm;codecs=opus', name:'voice.webm', size:1024}, 42);
  assert.equal(data.type, 'voice'); assert.equal(data.kind, 'voice');
  assert.equal(data.mimeType, 'audio/webm'); assert.equal(data.durationMs, 0);
  assert.equal(data.createdAtMs, 42); assert.equal(data.size, 1024);
});
test('documents keep legacy presentation kind and canonical document type', () => {
  const data = chatAttachmentMetadata({type:'application/pdf',name:'a'.repeat(200),size:100});
  assert.equal(data.kind,'file'); assert.equal(data.type,'document'); assert.equal(data.name.length,120);
});
test('streaming browser duration uses recorded duration, not infinity', () => {
  assert.equal(mediaDurationSeconds(Infinity,2400),2.4);
  assert.equal(mediaDurationSeconds(NaN,2400),2.4);
  assert.equal(mediaDurationSeconds(3,2400),3);
  assert.equal(MAX_VOICE_DURATION_MS,5*60*1000);
});
