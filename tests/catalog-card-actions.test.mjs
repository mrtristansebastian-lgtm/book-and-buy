import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import postcss from 'postcss';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const declarations = rule => Object.fromEntries((rule?.nodes || []).filter(node => node.type === 'decl').map(node => [node.prop,node.value]));

test('Home grid tracks can shrink so 320px headings and period controls wrap instead of clipping', () => {
  const home = postcss.parse(read('src/design/app-launcher.css'));
  const launcher = declarations(home.nodes.find(node => node.selector === '.bb-launcher'));
  assert.equal(launcher['grid-template-columns'],'minmax(0, 1fr)');
  assert.equal(declarations(home.nodes.find(node => node.selector === '.bb-launcher-header'))['min-width'],'0');
  assert.equal(declarations(home.nodes.find(node => node.selector === '.bb-launcher-header-copy'))['grid-template-columns'],'minmax(0, 1fr)');
});

test('Home utility actions stay grouped and compact without stretching the public-profile row', () => {
  const overview = read('src/features/dashboard/pages/OverviewPage.jsx');
  const map = read('src/features/analytics/components/AnalyticsLiveWorldMap.jsx');
  const styles = postcss.parse(read('src/design/insight-dashboards.css'));
  assert.match(overview, /role="group" aria-label="Public profile actions"/);
  assert.equal((overview.match(/className="bb-launcher-live-btn bb-home-utility-action"/g) || []).length, 2);
  assert.match(map, /className="bb-live-world-toolbar"/);
  assert.match(map, /aria-label="Open Live Stats"/);
  const button = declarations(styles.nodes.find(node => node.selector === 'html body .bb-launcher .bb-button.bb-home-utility-action[data-variant]'));
  assert.equal(button['min-height'], '32px');
  assert.equal(button['font-size'], '12px');
  const mobile = styles.nodes.find(node => node.type === 'atrule' && node.params === '(max-width: 899px)');
  assert.equal(declarations(mobile.nodes.find(node => node.selector === 'html body .bb-launcher .bb-button.bb-home-utility-action[data-variant]'))['min-height'], '30px');
  assert.equal(declarations(styles.nodes.find(node => node.selector === '.bb-launcher .bb-launcher-live')).width, 'auto');
});
