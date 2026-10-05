import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import postcss from 'postcss';

const source = path => readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8');

function mobileDeclarations(path, selector) {
  const result = new Map();
  postcss.parse(source(path)).walkRules(rule => {
    if (rule.selector !== selector) return;
    if (rule.parent.type !== 'atrule' || !rule.parent.params.includes('max-width')) return;
    rule.walkDecls(declaration => result.set(declaration.prop, declaration.value));
  });
  return result;
}

test('operations and schedule mobile filter panels wrap without stretched grid cells', () => {
  const selectors = [
    ['design/ops-desk.css', '.bb-support-chips.bb-ops-filter-chips'],
    ['design/schedule-studio/desk.css', '.bb-schedule-desk .bb-schedule-booking-filters'],
    ['design/clients-directory.css', '.bb-clients .bb-clients-chips'],
    ['design/support-inbox.css', '.bb-support-list-head .bb-support-chips.bb-support-chips--named']
  ];
  for (const [path, selector] of selectors) {
    const declarations = mobileDeclarations(path, selector);
    assert.equal(declarations.get('display'), 'flex', selector);
    assert.equal(declarations.get('flex-wrap'), 'wrap', selector);
  }
});

test('client mobile search keeps useful width and can wrap beside the add action', () => {
  const tools = mobileDeclarations('design/clients-directory.css', '.bb-clients-tools');
  const search = mobileDeclarations('design/clients-directory.css', '.bb-clients-search');
  assert.equal(tools.get('padding-left'), '0');
  assert.equal(tools.get('flex-wrap'), 'wrap');
  assert.equal(search.get('flex'), '1 1 160px');
  assert.equal(search.get('min-width'), 'min(160px, 100%)');
});

test('the Google Calendar action uses its logo as one inline icon, not content stacked above text', () => {
  const page = source('features/schedule/pages/SchedulePage.jsx');
  const action = page.match(/<Button action="sync"[\s\S]*?<\/Button>/)?.[0];
  assert.ok(action);
  assert.match(action, /icon=\{<img src="\/review-logos\/google-calendar\.webp" alt="" \/>\}/);
  assert.match(action, />\s*Google Calendar\s*<\/Button>/);
  assert.match(action, /variant="secondary"/, 'An unconfigured calendar connection stays a secondary action');
  const declarations = new Map();
  postcss.parse(source('features/schedule/styles/schedule-agenda.css')).walkRules(rule => {
    if (rule.selector === '.bb-schedule-agenda-page .bb-agenda-google-button') rule.walkDecls(declaration => declarations.set(declaration.prop, declaration.value));
  });
  assert.equal(declarations.get('flex'), '0 0 auto');
});

test('availability page headings have space to wrap on narrow screens', () => {
  const declarations = mobileDeclarations('design/schedule-studio/availability.css', '.bb-schedule-avail-title-row .bb-page-title-wrap');
  assert.equal(declarations.get('width'), '100%');
  assert.equal(declarations.get('align-items'), 'flex-start');
});

test('mobile inbox action menus are constrained by the full action row and viewport height', () => {
  const row = mobileDeclarations('design/support-inbox.css', '.bb-support-header-actions');
  const wrapper = mobileDeclarations('design/support-inbox.css', '.bb-support-header-actions .bb-support-quick-menu');
  const popup = mobileDeclarations('design/support-inbox.css', '.bb-support-header-actions .bb-support-quick-panel');
  assert.equal(row.get('position'), 'relative');
  assert.equal(row.get('width'), '100%');
  assert.equal(wrapper.get('position'), 'static');
  assert.equal(popup.get('width'), 'min(16.5rem, 100%)');
  assert.match(popup.get('max-height'), /100dvh/);
});

test('compact text actions do not stretch to adjacent icon controls or date fields', () => {
  const checks = [
    ['design/clients-directory.css', '.bb-clients-actions', 'align-items'],
    ['design/date-field.css', '.bb-date-field-pick', 'align-self'],
    ['design/time-field.css', '.bb-time-field-pick', 'align-self']
  ];
  for (const [path, selector, property] of checks) {
    let alignment;
    postcss.parse(source(path)).walkRules(rule => {
      if (rule.selector === selector) rule.walkDecls(property, declaration => alignment = declaration.value);
    });
    assert.equal(alignment, 'center', selector);
  }
});
