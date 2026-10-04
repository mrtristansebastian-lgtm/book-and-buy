import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  BILLING_PLANS,
  FREE_PROFILE_PLAN_ID,
  createDefaultPlanFields,
  getPlan
} from '../src/config/billingPlans.js';
import { coordinateOrNull, readExploreViewState } from '../src/features/client-app/exploreViewState.js';

const source = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('new business signup starts with an active free profile, not a trial or subscription', () => {
  assert.deepEqual(createDefaultPlanFields(), {
    planId: FREE_PROFILE_PLAN_ID,
    billingInterval: 'month',
    planStatus: 'active',
    trialEndsAt: null
  });
  assert.equal(getPlan().id, 'free');
  assert.equal(getPlan('free').monthlyPrice, 0);
  assert.equal(getPlan('free').annualPrice, 0);
});

test('free signup does not mutate legacy paid plan information or demo access', () => {
  assert.deepEqual(createDefaultPlanFields({ isDemo: true }), {
    planId: 'business', billingInterval: 'month', planStatus: 'active', trialEndsAt: null
  });
  assert.deepEqual(['starter', 'studio', 'business'].map((id) => [
    getPlan(id).id, BILLING_PLANS[id].monthlyPrice, BILLING_PLANS[id].annualPrice
  ]), [['starter', 299, 2990], ['studio', 699, 6990], ['business', 1299, 12990]]);
  const blank = source('src/data/blankWorkspace.js');
  assert.ok(blank.indexOf('...planFields') < blank.indexOf('...overrides,'), 'Existing workspace plan overrides stay authoritative');
});

test('Places opens the same published business profile instead of a second modal interface', () => {
  const places = source('src/features/client-app/PlacesCards.jsx');
  assert.match(places, /navigate\(publicPagePath\(item\.slug, 'home'\)\)/);
  assert.match(places, /View \$\{item\.brandName\} business profile/);
  assert.doesNotMatch(places, /BusinessCard|createPortal|bb-places-dialog|setSelected/);
  assert.ok(places.indexOf('reportDiscoveryVisit(') < places.indexOf('navigate(publicPagePath('), 'Places attribution remains before navigation');
  const offers = source('src/features/client-app/ExploreBusinessOffers.jsx');
  assert.match(offers, /bb-marketplace-business-identity[\s\S]*?publicPagePath\(biz\.slug, 'home'\)/);
  assert.match(offers, /publicItemPath\(biz\.slug, page, item\.id\)/, 'Actual offers retain their direct detail route');
});

test('E-Business retains its category and stable routes while its entry describes the profile', () => {
  const config = source('src/config/routeConfig.js');
  const launcher = source('src/config/appLauncher.js');
  assert.match(config, /website: 'Business profile'/);
  assert.match(config, /'e-business': 'website'/);
  assert.match(launcher, /label: 'E-Business'/);
  assert.match(launcher, /website: 'Banner, profile and details'/);
});

test('profile signup and Settings communicate free access without enabling paid upgrades', () => {
  const onboarding = source('src/features/onboarding/BusinessOnboardingPage.jsx');
  assert.match(onboarding, /Set up your free business profile/);
  assert.match(onboarding, /No subscription or card required/);
  const plans = source('src/features/settings/pages/PlanSettingsPage.jsx');
  assert.match(plans, /isFreeProfile && !workspace\.isDemo \? \[FREE_PROFILE_PLAN_ID\]/);
  assert.match(plans, /disabled=\{isCurrent \|\| !workspace\.isDemo\}/);
  const billing = source('src/features/settings/pages/BillingSettingsPage.jsx');
  assert.match(billing, /No subscription charge/);
  assert.match(billing, /There are no subscription invoices for your free profile/);
});

test('opening a business profile and returning restores Find tab and search from local profile preferences', () => {
  const saved = { kind: 'client', exploreContentTab: 'buy', exploreQueryText: 'artisan bread' };
  assert.deepEqual(readExploreViewState(saved), { filter: 'buy', queryText: 'artisan bread' });
  assert.deepEqual(readExploreViewState({ exploreContentTab: 'not-a-tab', exploreQueryText: null }), { filter: 'places', queryText: '' });
  assert.deepEqual(readExploreViewState(null), { filter: 'places', queryText: '' });
  const page = source('src/features/client-app/pages/ClientExplorePage.jsx');
  assert.match(page, /readExploreViewState\(profile\)/);
  assert.match(page, /updateExplorePrefs\(\{ exploreContentTab:/);
  assert.match(page, /updateExplorePrefs\(\{ exploreQueryText:/);
  assert.doesNotMatch(page, /useState\('places'\)|useState\(''\).*queryText/);
  const profile = source('src/features/client-app/clientProfile.js');
  assert.match(profile, /exploreContentTab: readExploreViewState\(parsed\)\.filter/);
  assert.match(profile, /exploreQueryText: readExploreViewState\(parsed\)\.queryText/);
});

test('missing location stays missing; valid zero coordinates are not lost when choosing a place', () => {
  for (const absent of [null, undefined, '', ' ', false, true, NaN, Infinity, {}, []]) {
    assert.equal(coordinateOrNull(absent), null);
  }
  assert.equal(coordinateOrNull(0), 0);
  assert.equal(coordinateOrNull('0'), 0);
  assert.equal(coordinateOrNull(-33.9249, 90), -33.9249);
  assert.equal(coordinateOrNull(91, 90), null);
  assert.equal(coordinateOrNull(-181), null);
  const discovery = source('src/features/client-app/exploreDiscovery.js');
  assert.match(discovery, /if \(!hasClientLocation\) return \[\]/);
  const page = source('src/features/client-app/pages/ClientExplorePage.jsx');
  assert.match(page, /const hasLocation = lat != null && lng != null/);
  assert.doesNotMatch(page, /place\.lat \|\| null|if \(place\.lat\)/);
});

test('publishing a business profile does not require a paid plan or subscription', () => {
  const integrations = source('src/shared/firebase/integrations.ts');
  const publisher = integrations.slice(integrations.indexOf('export async function publishWorkspaceToFirestore('));
  assert.doesNotMatch(publisher, /planId|planStatus|trialEndsAt|subscription|billing/);
  const rules = source('firestore.rules');
  const publicRules = rules.slice(rules.indexOf('match /artifacts/{appId}/public/data/workspaces/{slug}'), rules.indexOf('match /artifacts/{appId}/notificationJobs'));
  assert.doesNotMatch(publicRules, /planId|planStatus|trialEndsAt|subscription|billing/);
});
