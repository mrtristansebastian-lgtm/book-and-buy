import test from 'node:test';
import assert from 'node:assert/strict';
import { captureWorkspaceIntent, prepareWorkspaceIntent } from '../src/shared/firebase/workspaceSaveIntent.js';

const base = {brandName:'Original',tagline:'First',products:[],sectionRevisions:{general:0,products:0}};
test('queued local edits advance through their own saves without rewriting remote untouched fields', () => {
  const draft = {...base,brandName:'Later'};
  const intent = captureWorkspaceIntent(base,draft);
  const remote = {...base,brandName:'Earlier',products:[{id:'p',name:'Remote item'}],sectionRevisions:{general:1,products:1}};
  assert.deepEqual(prepareWorkspaceIntent(intent,remote,[{section:'general',from:0,to:1}]),[{section:'general',patch:{brandName:'Later'},expectedRevision:1}]);
});
test('a queued undo still reverses an earlier pending save', () => {
  const pending = {...base,brandName:'Changed'};
  const undo = captureWorkspaceIntent(base,base,pending);
  assert.deepEqual(prepareWorkspaceIntent(undo,{...pending,sectionRevisions:{general:1}},[{section:'general',from:0,to:1}]),[{section:'general',patch:{brandName:'Original'},expectedRevision:1}]);
});
test('external competing revisions are never silently rebased and failed saves remain retryable', () => {
  const draft = {...base,brandName:'Mine'};
  const retry = captureWorkspaceIntent(base,draft,draft);
  const external = {...base,brandName:'Other session',sectionRevisions:{general:2}};
  assert.equal(prepareWorkspaceIntent(retry,external,[{section:'general',from:0,to:1}])[0].expectedRevision,1);
  assert.equal(prepareWorkspaceIntent(retry,base)[0].expectedRevision,0);
});
