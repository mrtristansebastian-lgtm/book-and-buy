import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import postcss from 'postcss';

const css = postcss.parse(readFileSync(new URL('../src/design/public-surface/studio.css', import.meta.url), 'utf8'));
const values = (rule) => Object.fromEntries((rule?.nodes || [])
  .filter((node) => node.type === 'decl').map((node) => [node.prop, node.value]));
const base = (selector) => css.nodes.find((node) => node.type === 'rule' && node.selector === selector);

test('website toolbar and preview belong to a single owner-page scroller', () => {
  const page = values(base('.bb-owner-main:has(> .bb-studio-canvas)'));
  assert.equal(page['overflow-y'], 'auto');
  assert.equal(page.display, 'block', 'The canvas must not be constrained to one flex viewport row');
  assert.equal(values(base('.bb-studio-canvas')).flex, '0 0 auto');
  const stage = values(base('.bb-studio-stage'));
  assert.equal(stage.overflow, 'visible');
  assert.equal(stage.flex, '0 0 auto');
});

test('mobile studio canvas grows with its page rather than holding a fixed toolbar above it', () => {
  const mobile = css.nodes.filter((node) => node.type === 'atrule' && node.params === '(max-width: 899px)');
  const canvas = mobile.flatMap((node) => node.nodes).find((node) => node.selector === '.bb-studio-canvas');
  assert.equal(values(canvas).height, 'auto');
  assert.equal(values(canvas)['min-height'], '0');
});

test('catalog preview wrappers release height locks without converting navigation or cards', () => {
  const rule = css.nodes.find((node) => node.type === 'rule' &&
    node.selector.includes('.bb-studio-surface:has(.bb-public-catalog-desk) .bb-public-profile-modules'));
  assert.ok(rule);
  assert.equal(values(rule).height, 'auto');
  assert.equal(values(rule)['max-height'], 'none');
  assert.equal(values(rule).overflow, 'visible');
  for (const property of ['height', 'max-height']) {
    assert.ok(rule.nodes.find((node) => node.prop === property).important,
      'The preview must override the desktop catalog viewport rules');
  }
  const surface = values(base('.bb-studio-stage:has(.bb-public-catalog-desk) > .bb-studio-surface'));
  assert.equal(surface.height, 'auto');
  assert.equal(surface['max-height'], 'none');
  assert.equal(values(base('.bb-studio-surface:has(.bb-public-catalog-desk) .bb-public-catalog-desk-grid')).overflow, 'visible');
  assert.equal(values(base('.bb-studio-surface:has(.bb-public-catalog-desk) .bb-public-catalog-side')).overflow, 'visible');
});
