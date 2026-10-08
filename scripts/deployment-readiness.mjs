import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { modelConfig } from '../functions/ai/config.js';
import { oauthConfig } from '../functions/ai/oauth.js';

const origin = value => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.pathname === '/' && !url.search && !url.hash && !url.username && !url.password ? url.origin : '';
  } catch { return ''; }
};

// This is a local configuration check. Never prints credentials or calls a provider.
export function deploymentReadiness({ env = {}, firebase = {}, projectConfig = {}, hosting = {} } = {}) {
  const checks = [], add = (id, status, detail) => checks.push({ id, status, detail });
  const appOrigin = origin(env.APP_PUBLIC_BASE_URL), websiteOrigin = origin(env.WEBSITE_PUBLIC_BASE_URL);
  add('website-origins', appOrigin && websiteOrigin && appOrigin !== websiteOrigin ? 'ready' : 'blocked', 'Set distinct HTTPS owner app and public website origins.');
  const projectId = projectConfig.projects?.default;
  add('firebase-project', projectId && firebase.projectId === projectId && !projectId.startsWith('demo-') ? 'ready' : 'blocked', 'The browser Firebase project must match the release project.');
  add('workspace-namespace', (env.APP_ID || 'book-and-buy-v1') === (env.VITE_APP_ID || 'book-and-buy-v1') ? 'ready' : 'blocked', 'Browser and server workspace namespaces must match existing records.');
  add('storage-bucket', Boolean(firebase.storageBucket) ? 'ready' : 'blocked', 'Include the configured Storage bucket in the browser Firebase config.');
  add('google-redirect-origin', appOrigin && firebase.authDomain === new URL(appOrigin).hostname ? 'ready' : 'blocked', 'Use the owner Hosting domain as authDomain for reliable Google redirect recovery.');
  add('google-console', 'manual', 'Confirm Google and email/password providers, authorized owner domains, and the exact /__/auth/handler OAuth redirect in Firebase and Google Console.');
  add('review-app-check', env.VITE_FIREBASE_APPCHECK_SITE_KEY && ['v3', 'enterprise'].includes(env.VITE_FIREBASE_APPCHECK_PROVIDER || 'v3') ? 'ready' : 'blocked', 'Configure a registered production App Check key and matching provider for protected review requests.');
  add('review-app-check-registration', 'manual', 'Verify the production domain restrictions, Firebase App Check registration, and an attested review request from the hosted app.');
  const storefrontTargets = projectConfig.targets?.[projectId]?.hosting?.storefront || [];
  const storefront = storefrontTargets.length === 1 ? storefrontTargets[0] : '';
  const renderer = (hosting.hosting || []).find(site => site.target === 'storefront');
  add('storefront-target', storefront && storefront !== projectId && renderer?.rewrites?.some(rule => rule.source === '/api/website' && rule.function?.functionId === 'websiteGateway') ? 'ready' : 'blocked', 'Bind the storefront target to a dedicated second Hosting site with the website gateway rewrite.');
  if (env.CUSTOM_DOMAINS_ENABLED === 'true') add('custom-domains', storefront && env.CUSTOM_DOMAIN_SITE_ID === storefront ? 'ready' : 'blocked', 'Custom domains must use the dedicated storefront site and service-account Hosting permissions.');
  else add('custom-domains', 'gated', 'Custom domains remain disabled until the dedicated site and permissions are verified.');
  const openai = modelConfig('openai', env);
  add('ai-models', openai.configured ? 'ready' : 'blocked', 'Configure the exact OpenAI API models available to this project and a matching default.');
  add('ai-credential-storage', String(env.AI_SETTINGS_ENCRYPTION_KEY || '').length >= 32 ? 'ready' : 'blocked', 'Mount AI_SETTINGS_ENCRYPTION_KEY from Secret Manager; preserve it across releases.');
  const included = String(env.AI_INCLUDED_PROVIDERS || '').split(',').map(value => value.trim()).filter(Boolean);
  if (included.some(provider => provider !== 'openai')) add('ai-provider-scope', 'blocked', 'This release uses OpenAI; leave other included providers disabled.');
  if (included.includes('openai')) add('included-ai', env.OPENAI_API_KEY && Number.isSafeInteger(Number(env.AI_INCLUDED_DAILY_TOKENS)) && Number(env.AI_INCLUDED_DAILY_TOKENS) > 0 ? 'ready' : 'blocked', 'Included AI needs a mounted OpenAI API credential and a positive workspace allowance.');
  else add('included-ai', 'gated', 'Included AI remains unavailable until platform funding is configured.');
  if (env.AI_CHATGPT_OAUTH_ENABLED === 'true') {
    const config = oauthConfig(env);
    add('chatgpt-registration', config && config.inference && config.origin === appOrigin && new URL(config.redirectUri).pathname === '/api/ai/chatgpt' ? 'ready' : 'blocked', 'Enable only after approved commercial registration, inference permission, and the exact first-party callback are configured.');
    add('chatgpt-partner-approval', 'manual', 'Confirm approved OpenAI partner access independently; configuration flags are not evidence of approval.');
  } else add('chatgpt-registration', env.AI_CHATGPT_INFERENCE_APPROVED === 'true' ? 'blocked' : 'gated', 'ChatGPT account sign-in stays disabled while partner approval is pending.');
  if (env.VITE_INITIAL_AUTH_TOKEN || env.VITE_FIREBASE_APPCHECK_DEBUG_TOKEN) add('browser-development-credentials', 'blocked', 'Remove development auth and App Check debug tokens from release builds.');
  add('database-and-jobs', 'manual', 'Deploy Firestore indexes/rules, Storage rules, and stock, AI recovery, OAuth cleanup, and Butler scheduled functions; confirm jobs execute.');
  add('provider-and-browser-verification', 'manual', 'Verify real Google sign-in, private cloud drafts, isolated public checkout, rollback, and payment sandbox returns before a staged release.');
  return { configured: checks.every(check => check.status !== 'blocked'), checks };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let firebase = {};
  try { firebase = JSON.parse(process.env.VITE_FIREBASE_CONFIG || '{}'); } catch { /* Report the config gate without exposing its contents. */ }
  const readJSON = name => JSON.parse(readFileSync(new URL(`../${name}`, import.meta.url), 'utf8'));
  const report = deploymentReadiness({ env: process.env, firebase, projectConfig: readJSON('.firebaserc'), hosting: readJSON('firebase.json') });
  for (const check of report.checks) console.log(`${check.status.toUpperCase()} ${check.id}: ${check.detail}`);
  console.log('Local configuration report only. External approvals and live services require independent verification.');
  process.exitCode = report.configured ? 0 : 1;
}
