import test from 'node:test';
import assert from 'node:assert/strict';
import { needsEmailVerification } from '../src/features/auth/emailVerification.js';
import { workspaceConnectionError } from '../src/features/workspace/workspaceConnectionError.js';
test('password accounts wait for verification while Google and guest sessions retain their flow', () => {
  assert.equal(needsEmailVerification(null), false);
  assert.equal(needsEmailVerification({emailVerified:false,providerData:[{providerId:'password'}]}), true);
  assert.equal(needsEmailVerification({emailVerified:true,providerData:[{providerId:'password'}]}), false);
  assert.equal(needsEmailVerification({emailVerified:false,providerData:[{providerId:'google.com'}]}), false);
});
test('connection failures provide recovery copy without exposing raw server messages', () => {
  assert.match(workspaceConnectionError({code:'functions/internal',message:'internal'}), /temporarily unavailable/);
  assert.match(workspaceConnectionError({code:'functions/permission-denied'}), /verify your email/);
  assert.doesNotMatch(workspaceConnectionError({message:'secret server detail'}), /secret/);
});
