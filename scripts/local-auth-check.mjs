import { createRequire } from 'node:module';
import { join } from 'node:path';

const project = 'build-a-booking-ai';
const require = createRequire(import.meta.url);
const cli = require(join(process.env.APPDATA, 'npm/node_modules/firebase-tools/lib/auth.js'));
const account = cli.getProjectDefaultAccount(process.cwd()) || cli.getGlobalDefaultAccount();
if (!account?.tokens?.refresh_token) throw new Error('Sign in to the Firebase CLI first.');
console.log(JSON.stringify({ cliAccount: account.user?.email || 'Unknown', project }));
const token = await cli.getAccessToken(account.tokens.refresh_token, ['https://www.googleapis.com/auth/cloud-platform']);
async function request(path, options = {}) {
  const response = await fetch(`https://identitytoolkit.googleapis.com/${path}`, {
    ...options, headers: { Authorization: `Bearer ${token.access_token}`, 'Content-Type': 'application/json' }
  });
  if (!response.ok) throw new Error(`Firebase Auth request failed (${response.status}): ${(await response.text()).slice(0, 500)}`);
  return response.json();
}
const path = `admin/v2/projects/${project}/config`;
let config = await request(path);
if (process.argv.includes('--authorize-local')) {
  const authorizedDomains = [...new Set([...(config.authorizedDomains || []), '127.0.0.1', 'localhost'])];
  if (authorizedDomains.length !== config.authorizedDomains?.length) {
    await request(`${path}?updateMask=authorizedDomains`, { method: 'PATCH', body: JSON.stringify({ name: `projects/${project}/config`, authorizedDomains }) });
  }
  config = await request(path);
}
console.log(JSON.stringify({ project, localOrigin: 'http://127.0.0.1:5173', authorizedDomains: config.authorizedDomains,
  emailPasswordEnabled: config.signIn?.email?.enabled, passwordRequired: config.signIn?.email?.passwordRequired }));
const email = process.argv.find(arg => arg.startsWith('--email='))?.slice(8);
if (process.argv.includes('--billing-status')) {
  for (const [label, url] of [
    ['projectBilling', `https://cloudbilling.googleapis.com/v1/projects/${project}/billingInfo`],
    ['billingAccounts', 'https://cloudbilling.googleapis.com/v1/billingAccounts']
  ]) {
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token.access_token}` } });
    const data = await response.json();
    console.log(JSON.stringify({ [label]: label === 'billingAccounts'
      ? (data.billingAccounts || []).map(row => ({ name: row.name, open: row.open, displayName: row.displayName }))
      : { billingEnabled: data.billingEnabled, billingAccountName: data.billingAccountName }, status: response.status }));
  }
}
if (email) {
  const result = await request(`v1/projects/${project}/accounts:lookup`, { method: 'POST', body: JSON.stringify({ email: [email] }) });
  console.log(JSON.stringify({ accountExists: Boolean(result.users?.length), verified: result.users?.[0]?.emailVerified === true,
    providers: result.users?.[0]?.providerUserInfo?.map(provider => provider.providerId) || [] }));
}
