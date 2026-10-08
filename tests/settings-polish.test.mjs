import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import postcss from 'postcss';

const css = postcss.parse(readFileSync(new URL('../src/design/settings-polish.css', import.meta.url), 'utf8'));
function declaration(selector, property) {
  const matches = [];
  css.walkRules((rule) => {
    if (!rule.selector.includes(selector)) return;
    rule.walkDecls(property, (decl) => matches.push(decl));
  });
  return matches;
}

test('Business hours span the whole settings panel, independent of the paired identity fields', () => {
  assert.ok(declaration('.bb-settings-content--general > .bb-settings-business-hours', 'grid-template-columns')
    .some((decl) => decl.value === 'minmax(0, 1fr)'));
  assert.ok(declaration('.bb-settings-business-hours > .bb-schedule-avail-settings-section', 'grid-column')
    .some((decl) => decl.value === '1 / -1'));
});

test('narrow Business hours give picker actions their own row without hiding either time', () => {
  const compact = css.nodes.find((node) => node.type === 'atrule' && node.params === '(max-width: 400px)');
  assert.ok(compact);
  const fields = compact.nodes.find((node) => node.selector?.endsWith('.bb-time-field-control'));
  assert.ok(fields.nodes.some((decl) => decl.prop === 'grid-template-columns' && decl.value === 'minmax(0, 1fr)'));
  assert.ok(fields.nodes.every((decl) => !['display', 'overflow', 'visibility'].includes(decl.prop)));
});

test('settings reserve space for reveal, clear and search indicators over the shared padding rule', () => {
  assert.ok(declaration('.bb-pay-secret-row input', 'padding-right').some((decl) => decl.value === '52px' && decl.important));
  assert.ok(declaration('.bb-place-field-control input', 'padding-right').some((decl) => decl.value === '52px' && decl.important));
  assert.ok(declaration('.bb-catalog-search input', 'padding-left').some((decl) => decl.value === '40px' && decl.important));
});

test('long policy editing preserves a useful textarea size over the single-line field bridge', () => {
  assert.ok(declaration('.bb-settings-content--policies textarea', 'min-height').some((decl) => decl.value === '192px' && decl.important));
});

test('settings typography uses an explicit section hierarchy and preserves shared control styling', () => {
  assert.ok(declaration('.bb-settings-main .bb-settings-content', '--native-h2-size').some((decl) => decl.value === '18px'));
  assert.ok(declaration('.bb-settings-main .bb-settings-content', '--native-h3-size').some((decl) => decl.value === '16px'));
  assert.ok(declaration('.bb-settings-main .bb-settings-content', '--native-label-weight').some((decl) => decl.value === '500'));
  css.walkRules((rule) => {
    if (/\.bb-(?:button|filter-chip)(?:\b|\[)/.test(rule.selector)) {
      assert.fail('Shared buttons and chips must not gain settings-specific overrides');
    }
  });
});

test('provider, market and domain states reuse the shared non-interactive status presentation', () => {
  for (const page of ['MarketsSettingsPage', 'ShippingSettingsPage', 'DomainsSettingsPage']) {
    const source = readFileSync(new URL(`../src/features/settings/pages/${page}.jsx`, import.meta.url), 'utf8');
    assert.match(source, /import \{ StatusBadge \} from '\.\.\/\.\.\/\.\.\/shared\/ui\/StatusBadge'/, page);
    assert.match(source, /<StatusBadge(?:\s|>)/, page);
  }
});

test('mobile settings reuse shared panel spacing without a competing blanket button height', () => {
  assert.ok(declaration('.bb-settings-content > .bb-panel', 'padding').some((decl) => decl.value === 'var(--bb-panel-padding, 1rem)'));
  assert.ok(declaration('.bb-settings-content', 'gap').some((decl) => decl.value === '12px'));
  css.walkRules((rule) => {
    if (rule.selector === '.bb-settings-content :is(button, a.bb-btn, summary)') {
      assert.fail('Settings must not override the shared mobile button geometry');
    }
  });
});
