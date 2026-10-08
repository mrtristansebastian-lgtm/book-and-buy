import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { deploymentReadiness } from '../scripts/deployment-readiness.mjs';

const configuration = () => ({
  env:{APP_PUBLIC_BASE_URL:'https://owner.example',WEBSITE_PUBLIC_BASE_URL:'https://sites.example',VITE_FIREBASE_APPCHECK_SITE_KEY:'production-test-site-key',VITE_FIREBASE_APPCHECK_PROVIDER:'enterprise',AI_OPENAI_MODELS:'gpt-6.1-sol',AI_OPENAI_DEFAULT_MODEL:'gpt-6.1-sol',AI_SETTINGS_ENCRYPTION_KEY:'k'.repeat(32),AI_CHATGPT_OAUTH_ENABLED:'false',AI_CHATGPT_INFERENCE_APPROVED:'false'},
  firebase:{projectId:'production-project',authDomain:'owner.example',storageBucket:'production-project.firebasestorage.app'},
  projectConfig:{projects:{default:'production-project'},targets:{'production-project':{hosting:{storefront:['public-sites']}}}},
  hosting:JSON.parse(readFileSync(new URL('../firebase.json',import.meta.url),'utf8'))
});
test('local release check permits intentionally gated ChatGPT and never reports external verification as completed',()=>{
  const report=deploymentReadiness(configuration());
  assert.equal(report.configured,true);
  assert.equal(report.checks.find(row=>row.id==='chatgpt-registration').status,'gated');
  assert.equal(report.checks.find(row=>row.id==='google-console').status,'manual');
  assert.equal(JSON.stringify(report).includes('k'.repeat(32)),false);
});
test('release check blocks same-origin generated sites, cross-project auth, debug credentials and incorrect domain routing',()=>{
  const input=configuration(); input.env.WEBSITE_PUBLIC_BASE_URL=input.env.APP_PUBLIC_BASE_URL; input.firebase.projectId='another';input.env.VITE_INITIAL_AUTH_TOKEN='test-only-do-not-display-credential';input.env.CUSTOM_DOMAINS_ENABLED='true';input.env.CUSTOM_DOMAIN_SITE_ID='production-project';
  const report=deploymentReadiness(input);assert.equal(report.configured,false);
  for(const id of ['website-origins','firebase-project','browser-development-credentials','custom-domains']) assert.equal(report.checks.find(row=>row.id===id).status,'blocked');
  assert.equal(JSON.stringify(report).includes(input.env.VITE_INITIAL_AUTH_TOKEN),false);
});
test('included AI requires explicit funding and ChatGPT enabled flags cannot bypass registered callback checks',()=>{
  const input=configuration(); input.env.AI_INCLUDED_PROVIDERS='openai';input.env.AI_INCLUDED_DAILY_TOKENS='1000';
  assert.equal(deploymentReadiness(input).checks.find(row=>row.id==='included-ai').status,'blocked');
  input.env.OPENAI_API_KEY='secret-test-credential';assert.equal(deploymentReadiness(input).checks.find(row=>row.id==='included-ai').status,'ready');
  input.env.AI_CHATGPT_OAUTH_ENABLED='true';input.env.AI_CHATGPT_INFERENCE_APPROVED='true';
  const report=deploymentReadiness(input);assert.equal(report.checks.find(row=>row.id==='chatgpt-registration').status,'blocked');assert.equal(JSON.stringify(report).includes(input.env.OPENAI_API_KEY),false);
});
test('required recovery and draft query indexes are tracked for deployment',()=>{
  const config=JSON.parse(readFileSync(new URL('../firestore.indexes.json',import.meta.url),'utf8'));
  assert.ok(config.indexes.some(row=>row.collectionGroup==='aiRuns' && row.queryScope==='COLLECTION_GROUP' && row.fields.some(field=>field.fieldPath==='leaseUntil')));
  assert.ok(config.indexes.some(row=>row.collectionGroup==='websiteDraftVersions' && row.fields.some(field=>field.fieldPath==='savedAt')));
  assert.ok(config.fieldOverrides.some(row=>row.collectionGroup==='aiCancellationRequests' && row.indexes.some(index=>index.queryScope==='COLLECTION_GROUP')));
});

test('protected reviews cannot release without a supported production attestation configuration',()=>{
  const input=configuration();
  delete input.env.VITE_FIREBASE_APPCHECK_SITE_KEY;
  assert.equal(deploymentReadiness(input).checks.find(row=>row.id==='review-app-check').status,'blocked');
  input.env.VITE_FIREBASE_APPCHECK_SITE_KEY='production-test-site-key';
  input.env.VITE_FIREBASE_APPCHECK_PROVIDER='unknown';
  assert.equal(deploymentReadiness(input).checks.find(row=>row.id==='review-app-check').status,'blocked');
  input.env.VITE_FIREBASE_APPCHECK_PROVIDER='v3';
  assert.equal(deploymentReadiness(input).checks.find(row=>row.id==='review-app-check').status,'ready');
  assert.equal(deploymentReadiness(input).checks.find(row=>row.id==='review-app-check-registration').status,'manual');
});
