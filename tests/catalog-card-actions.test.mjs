import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import postcss from 'postcss';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const card = read('src/shared/ui/BusinessCatalogCard.jsx');
const css = postcss.parse(read('src/design/catalog-management.css'));
const declarations = rule => Object.fromEntries((rule?.nodes || []).filter(node => node.type === 'decl').map(node => [node.prop,node.value]));

test('business catalog cards have one named corner settings action and no inline action row', () => {
  assert.match(card, /aria-label=\{`Settings for \$\{name\}`\}/);
  assert.match(card, /aria-haspopup="dialog" aria-expanded=\{open\}/);
  assert.match(card, /aria-label=\{`View \$\{name\}`\}/);
  assert.doesNotMatch(card, /bb-business-card-actions|bb-public-product-actions/);
  assert.match(card, /useCallback\(\(\) => setOpen\(false\), \[\]\)/);
});

test('item actions use a portaled named modal with shared focus/Escape and explicit purposes', () => {
  assert.match(card, /createPortal\(/);
  assert.match(card, /document\.body/);
  assert.match(card, /useDetailDialog\(true, onClose\)/);
  assert.match(card, /role="dialog" aria-modal="true" aria-labelledby=\{titleId\}/);
  for (const [action,variant] of [['view','secondary'],['edit','secondary'],['delete','destructive']]) {
    assert.match(card, new RegExp(`action="${action}" variant="${variant}"`));
  }
  assert.match(card, /onClose\(\); action\?\.\(\)/);
});

test('products, services and stock share the new card without bypassing deletion confirmation', () => {
  for (const path of ['src/features/products/components/ProductCatalogCard.jsx','src/features/services/components/ServiceCatalogCard.jsx']) {
    const source = read(path);
    assert.match(source, /<BusinessCatalogCard/);
    assert.match(source, /onDelete=\{onRemove \? \(\) => setDeleting\(true\) : undefined\}/);
    assert.match(source, /deleting && <CatalogDeleteDialog/);
  }
  const files = read('src/features/products/pages/StockPage.jsx');
  assert.match(files, /ProductCatalogCard/);
});

test('card copy is left aligned and readable, with mobile touch targets scoped to business cards', () => {
  const name = declarations(css.nodes.find(node => node.selector === 'html body .native-ui .bb-business-catalog-card .bb-public-product-name'));
  assert.match(name.font, /600 17px\/1\.35/);
  assert.equal(name['text-align'],'left');
  assert.equal(name['overflow-wrap'],'anywhere');
  const price = declarations(css.nodes.find(node => node.selector === 'html body .native-ui .bb-business-catalog-card .bb-public-product-price'));
  assert.match(price.font, /400 15px/);
  assert.equal(price['text-align'],'left');
  const gear = declarations(css.nodes.find(node => node.selector === '.bb-business-card-settings'));
  assert.equal(gear.position,'absolute');
  assert.equal(gear.top,'12px');
  assert.equal(gear.right,'12px');
  const mobile = css.nodes.find(node => node.type === 'atrule' && node.params === '(max-width: 899px)');
  const mobileGear = declarations(mobile.nodes.find(node => node.selector === '.bb-business-card-settings'));
  assert.equal(mobileGear.width,'44px');
  assert.equal(mobileGear.height,'44px');
  const mobileClose = declarations(mobile.nodes.find(node => node.selector === '.bb-catalog-actions-close'));
  assert.equal(mobileClose.width,'44px');
  assert.equal(mobileClose.height,'44px');
});

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
