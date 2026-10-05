import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const parse = (file) => ts.createSourceFile(file,
  readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'),
  ts.ScriptTarget.Latest, true, ts.ScriptKind.JSX);
const find = (root, predicate) => {
  const matches = [];
  const visit = (node) => { if (predicate(node)) matches.push(node); ts.forEachChild(node, visit); };
  visit(root);
  return matches;
};

test('every interactive catalog preview passes its preview state to checkout', () => {
  for (const file of [
    'src/features/storefront/components/PublicCatalogDetail.jsx',
    'src/features/storefront/components/PublicStorefront.jsx',
    'src/features/booking/components/PublicBookingFlow.jsx'
  ]) {
    const source = parse(file);
    const checkouts = find(source, (node) => ts.isJsxSelfClosingElement(node) && node.tagName.getText(source) === 'PublicCartCheckout');
    assert.ok(checkouts.length, `${file} contains a checkout path`);
    for (const checkout of checkouts) {
      const lock = checkout.attributes.properties.find((attribute) => attribute.name?.getText(source) === 'lockedPreview');
      assert.equal(lock?.initializer?.expression?.getText(source), 'preview', `${file} must protect studio checkout`);
    }
  }
});

test('valid preview submissions exit before starting a request or changing checkout state', async () => {
  const source = parse('src/features/storefront/components/PublicCartCheckout.jsx');
  const submit = find(source, (node) => ts.isVariableDeclaration(node) && node.name.getText(source) === 'submit')[0];
  assert.ok(submit?.initializer);
  let requestsStarted = 0;
  const run = new Function('lockedPreview', 'canSubmit', 'setSubmitting',
    `return (${submit.initializer.getText(source)});`)(true, true, () => { requestsStarted += 1; });
  await run();
  assert.equal(requestsStarted, 0, 'A complete preview form must never begin submission');
});

test('booking card clicks open preview details without changing the cart', () => {
  const source = parse('src/features/booking/components/PublicBookingFlow.jsx');
  const openDetail = find(source, (node) => ts.isVariableDeclaration(node) && node.name.getText(source) === 'openDetail')[0];
  const card = find(source, (node) => ts.isJsxSelfClosingElement(node) && node.tagName.getText(source) === 'PublicOfferCard')[0];
  const onOpen = card?.attributes.properties.find((attribute) => attribute.name?.getText(source) === 'onOpen');
  assert.ok(openDetail?.initializer && onOpen?.initializer?.expression);
  assert.equal(card.attributes.properties.some((attribute) => attribute.name?.getText(source) === 'onAction'), false,
    'Catalog cards must browse details without exposing a cart action');
  const opened = [];
  let cartChanges = 0;
  let navigations = 0;
  const openPreview = new Function('studioNav', 'onOpenItem', 'preview', 'navigate', 'cart',
    `return (${openDetail.initializer.getText(source)});`)(true, (id) => opened.push(id), true,
    () => { navigations += 1; }, {
      addService: () => { cartChanges += 1; return true; }
    });
  const click = new Function('openDetail', 'item', `return (${onOpen.initializer.expression.getText(source)});`)(
    openPreview, { id: 'preview-service' });
  click();
  assert.deepEqual(opened, ['preview-service'], 'Clicking a studio card must open its detail preview');
  assert.equal(cartChanges, 0, 'A preview card must not change the cart');
  assert.equal(navigations, 0, 'Studio cards must stay within the preview');
});

test('preview checkout does not process payment return parameters', () => {
  const source = parse('src/features/storefront/components/PublicCartCheckout.jsx');
  const effect = find(source, (node) => ts.isCallExpression(node) && node.expression.getText(source) === 'useEffect' &&
    node.arguments[0]?.getText(source).includes('readCheckoutReturnParams'))[0];
  assert.ok(effect);
  let returnReads = 0;
  const run = new Function('lockedPreview', 'readCheckoutReturnParams',
    `return (${effect.arguments[0].getText(source)});`)(true, () => { returnReads += 1; return {}; });
  assert.equal(run(), undefined);
  assert.equal(returnReads, 0, 'Studio previews must not confirm real payments');
});

test('checkout analytics excludes owner visits and previews while customer checkout still records activity', () => {
  const source = parse('src/features/storefront/components/PublicCartCheckout.jsx');
  const enabled = find(source, (node) => ts.isVariableDeclaration(node) && node.name.getText(source) === 'analyticsEnabled')[0];
  const canTrack = new Function('publicMode', 'lockedPreview', 'user', 'workspace',
    `return (${enabled.initializer.getText(source)});`);
  const workspace = { ownerId: 'business-owner', slug: 'test-shop' };
  assert.equal(canTrack(true, false, { uid: 'business-owner' }, workspace), false);
  assert.equal(canTrack(true, true, { uid: 'customer' }, workspace), false);
  assert.equal(canTrack(false, false, { uid: 'customer' }, workspace), false);
  assert.equal(canTrack(true, false, null, workspace), true);
  assert.equal(canTrack(true, false, { uid: 'customer' }, workspace), true);

  const effect = find(source, (node) => ts.isCallExpression(node) && node.expression.getText(source) === 'useEffect' &&
    node.arguments[0]?.getText(source).includes("trackAnalyticsEvent('begin_checkout'"))[0];
  const tracked = [];
  const synced = [];
  const run = (analyticsEnabled) => new Function('analyticsEnabled', 'step', 'workspace', 'cart', 'trackAnalyticsEvent', 'upsertAnalyticsCart',
    `return (${effect.arguments[0].getText(source)});`)(analyticsEnabled, 'details', workspace,
    { subtotalCents: 1000, items: [{ productId: 'p1', quantity: 1 }] }, (...args) => tracked.push(args), (...args) => synced.push(args))();
  run(false);
  assert.equal(tracked.length, 0);
  assert.equal(synced.length, 0);
  run(true);
  assert.equal(tracked.length, 1);
  assert.equal(tracked[0][0], 'begin_checkout');
  assert.equal(synced[0][1].status, 'checkout');

  const attributionCalls = find(source, (node) => ts.isCallExpression(node) && node.expression.getText(source) === 'getAnalyticsAttribution');
  assert.equal(attributionCalls.length, 2, 'Both product and booking submissions obtain optional attribution');
  for (const call of attributionCalls) {
    const condition = call.parent.parent;
    assert.ok(ts.isConditionalExpression(condition));
    assert.equal(condition.condition.getText(source), 'analyticsEnabled', 'Owner submissions must also skip attribution session writes');
    assert.equal(condition.whenFalse.getText(source), '{}');
  }
  const purchase = find(source, (node) => ts.isCallExpression(node) && node.expression.getText(source) === 'trackAnalyticsEvent' &&
    node.arguments[0].getText(source) === "'purchase'")[0];
  const guards = [];
  for (let parent = purchase.parent; parent; parent = parent.parent) if (ts.isIfStatement(parent)) guards.push(parent.expression.getText(source));
  assert.ok(guards.includes('analyticsEnabled && ownerId && slug'), 'Conversion events must use the same analytics policy as checkout starts');
});
