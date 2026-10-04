import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import postcss from 'postcss';

const readSource = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

function attribute(node, name) {
  return node.attributes.properties.find((prop) => ts.isJsxAttribute(prop) && prop.name.getText() === name);
}

function walk(node, visit) {
  visit(node);
  ts.forEachChild(node, (child) => walk(child, visit));
}

for (const path of [
  'src/features/auth/AppLoginScreen.jsx',
  'src/features/client-app/pages/ClientAuthPage.jsx'
]) {
  test(`${path}: authentication inputs keep a visible associated label`, () => {
    const file = ts.createSourceFile(path, readSource(path), ts.ScriptTarget.Latest, true, ts.ScriptKind.JSX);
    const inputs = [];
    walk(file, (node) => {
      if (!ts.isJsxSelfClosingElement(node) || node.tagName.getText() !== 'input') return;
      inputs.push(node);
      let label = node.parent;
      while (label && !(ts.isJsxElement(label) && label.openingElement.tagName.getText() === 'label')) {
        label = label.parent;
      }
      assert.ok(label, 'Auth fields need a persistent label, not only a disappearing placeholder');
      assert.ok(label.children.some((child) => ts.isJsxElement(child) && child.openingElement.tagName.getText() === 'span'));
      assert.ok(attribute(node, 'disabled'), 'Auth fields remain blocked during submissions');
    });
    assert.equal(inputs.length, 3);
  });

  test(`${path}: only the initiated authentication action shows progress`, () => {
    const file = ts.createSourceFile(path, readSource(path), ts.ScriptTarget.Latest, true, ts.ScriptKind.JSX);
    let progressControls = 0;
    walk(file, (node) => {
      if (!ts.isJsxOpeningElement(node) || node.tagName.getText() !== 'Button') return;
      const busy = attribute(node, 'busy');
      if (!busy) return;
      progressControls += 1;
      assert.match(busy.initializer.getText(), /busyAction\s*===\s*['"](?:email|google|local|demo)['"]/);
      assert.ok(attribute(node, 'busyLabel'), 'Progress text stays separate from the stable button label');
      assert.ok(attribute(node, 'disabled'), 'Other auth actions cannot submit concurrently');
    });
    assert.equal(progressControls, 4);
  });
}

test('small public-card footers can stack without altering business-card actions', () => {
  const sheet = postcss.parse(readSource('src/design/public-surface/catalog.css'));
  let narrowRule;
  sheet.walkRules('.bb-public-product-actions:not(.bb-business-card-actions)', (rule) => {
    if (rule.parent.type === 'atrule' && rule.parent.params === '(max-width: 359px)') narrowRule = rule;
  });
  assert.ok(narrowRule, 'The smallest public-card footers need a readable single-column fallback');
  assert.ok(narrowRule.nodes.some((decl) => decl.prop === 'grid-template-columns' && decl.value === 'minmax(0, 1fr)'));
});

test('checkout selects share input width and long summaries have a wrapping escape', () => {
  const sheet = postcss.parse(readSource('src/design/public-surface/checkout-flow.css'));
  let selectFields = false;
  let summaryWrap = false;
  sheet.walkRules((rule) => {
    if (rule.selector.includes('.bb-checkout-field select')) {
      selectFields = rule.nodes.some((decl) => decl.prop === 'width' && decl.value === '100%');
    }
    if (rule.selector.includes('.bb-checkout-summary__row > *')) {
      summaryWrap = rule.nodes.some((decl) => decl.prop === 'overflow-wrap' && decl.value === 'anywhere');
    }
  });
  assert.ok(selectFields);
  assert.ok(summaryWrap);
});

test('Find business headers grow with readable location details instead of clipping tiny text', () => {
  const sheet = postcss.parse(readSource('src/design/client-app.css'));
  const mobile = sheet.nodes.findLast((node) => node.type === 'atrule' && node.params === '(max-width: 899px)' &&
    node.nodes.some((rule) => rule.selector === '.bb-marketplace-business-head'));
  assert.ok(mobile);
  const declarations = (selector) => mobile.nodes.find((rule) => rule.selector === selector)?.nodes || [];
  assert.ok(declarations('.bb-marketplace-business-head').some((decl) => decl.prop === 'min-height' && decl.value === '0'));
  const location = declarations('.bb-marketplace-business-details .bb-public-profile-location');
  assert.ok(location.some((decl) => decl.prop === 'font-size' && decl.value === '0.75rem'));
  assert.ok(location.some((decl) => decl.prop === 'white-space' && decl.value === 'normal'));
  assert.ok(location.some((decl) => decl.prop === 'overflow-wrap' && decl.value === 'anywhere'));
  const details = declarations('.bb-marketplace-business-copy .bb-marketplace-business-details');
  assert.ok(details.some((decl) => decl.prop === 'flex-wrap' && decl.value === 'wrap'));
});

test('mobile catalog and customer panels reduce whitespace without overriding shared control geometry', () => {
  const sheet = postcss.parse(readSource('src/design/public-surface/catalog.css'));
  const compact = sheet.nodes.findLast((node) => node.type === 'atrule' && node.params === '(max-width: 899px)');
  assert.ok(compact.nodes.find((rule) => rule.selector === '.bb-public-buy-section')
    .nodes.some((decl) => decl.prop === 'gap' && decl.value === '12px'));
  compact.walkDecls((decl) => assert.ok(!['font-size', 'height', 'min-height'].includes(decl.prop)));
});
