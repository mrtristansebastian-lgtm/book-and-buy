import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import postcss from 'postcss';
import ts from 'typescript';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const controls = postcss.parse(read('src/design/universal-controls.css'));
const flow = postcss.parse(read('src/design/page-flow.css'));
const declarations = (rule) => Object.fromEntries((rule?.nodes || [])
  .filter((node) => node.type === 'decl').map((node) => [node.prop, node.value]));
const rootRule = controls.nodes.find((node) => node.type === 'rule' && node.selector === ':root');
const compact = controls.nodes.find((node) => node.type === 'atrule' && node.params === '(max-width: 899px)');

test('buttons, filters and fields retain independent tokens with comfortable mobile touch targets', () => {
  const tokens = declarations(rootRule);
  assert.equal(tokens['--bb-button-height'], '40px');
  assert.equal(tokens['--bb-filter-height'], '36px');
  assert.equal(tokens['--bb-control-height'], '40px');
  const mobileTokens = declarations(compact.nodes.find((node) => node.type === 'rule' && node.selector === ':root'));
  assert.equal(mobileTokens['--bb-control-height'], '44px', 'Fields keep their comfortable mobile target');
  assert.equal(mobileTokens['--bb-button-height'], '36px');
  assert.equal(mobileTokens['--bb-filter-height'], '32px');
  const button = declarations(controls.nodes.find((node) => node.type === 'rule' && node.selector === 'html body .bb-button[data-variant]'));
  const filter = declarations(controls.nodes.find((node) => node.type === 'rule' && node.selector === 'html body .bb-filter-chip'));
  assert.equal(button['min-height'], 'var(--bb-button-height)');
  assert.equal(filter['min-height'], 'var(--bb-filter-height)');
  assert.equal(button.height, 'auto', 'Long or enlarged labels can grow without clipping');
  assert.equal(filter.height, 'auto', 'Long filter labels can grow without clipping');
  assert.equal(button['white-space'], 'normal');
  assert.equal(filter['white-space'], 'normal');
});

test('mobile button padding supports touch targets without shrinking readable typography or count badges', () => {
  const button = declarations(compact.nodes.find((node) => node.type === 'rule' && node.selector === 'html body .bb-button[data-variant]'));
  assert.equal(button.padding, '6px 10px');
  const filter = declarations(compact.nodes.find((node) => node.type === 'rule' && node.selector === 'html body .bb-filter-chip'));
  assert.equal(filter.padding, '3px 10px');
  assert.equal(filter.gap, '6px');
  const busy = declarations(compact.nodes.find((node) => node.type === 'rule' && node.selector === 'html body .bb-button-busy-label'));
  assert.equal(busy.padding, button.padding, 'Busy text follows the same inner geometry');
  const base = declarations(controls.nodes.find((node) => node.type === 'rule' && node.selector === 'html body .bb-button[data-variant]'));
  assert.equal(base['font-size'], '13px');
  assert.equal(base['font-weight'], '550');
  const count = declarations(controls.nodes.find((node) => node.type === 'rule' && node.selector === 'html body .bb-count-badge'));
  assert.equal(count['min-width'], '22px');
  assert.equal(count.height, '22px');
  assert.equal(count.width, 'auto', 'Exact large counts may widen the badge');
  assert.equal(count['align-items'], 'center');
  assert.equal(count['justify-content'], 'center');
});

test('period toggles retain their inset capsule geometry within the mobile touch height', () => {
  const outer = declarations(controls.nodes.find((node) => node.type === 'rule' && node.selector === '.native-ui .bb-segment-period'));
  const inner = declarations(controls.nodes.find((node) => node.type === 'rule' && node.selector === '.native-ui .bb-segment-period > button'));
  assert.equal(outer.height, '40px');
  assert.equal(outer['min-height'], '40px');
  assert.equal(inner.height, '34px');
  const mobileOuter = declarations(compact.nodes.find((node) => node.type === 'rule' && node.selector === '.native-ui .bb-segment-period'));
  const mobileInner = declarations(compact.nodes.find((node) => node.type === 'rule' && node.selector === '.native-ui .bb-segment-period > button'));
  assert.equal(mobileOuter.height, 'var(--bb-button-height)');
  assert.equal(mobileInner.height, '30px');
  assert.equal(mobileInner['min-height'], '30px');
  const gradient = controls.nodes.find((node) => node.type === 'rule' && node.selector.includes('.bb-segment-period > button:is(:hover'));
  assert.ok(gradient?.selector.includes('[aria-pressed="true"]'), 'Selected capsule appearance remains intact');
});

test('page heading and filter bands scroll while preserving splash positioning', () => {
  const headingRule = flow.nodes.find((node) => node.type === 'rule' && node.selector.includes('.bb-page-chrome'));
  assert.ok(headingRule);
  for (const selector of [
    '.bb-page-chrome', '.bb-launcher-header', '.bb-clients-header', '.bb-finance-header',
    '.bb-analytics-header', '.bb-studio-toolbar', '.bb-settings-mobile-index-head',
    '.bb-settings-main-head', '.bb-schedule-desk-header', '.bb-services-desk-header',
    '.bb-client-top', '.bb-client-ig-top', '.bb-client-social-chips',
    '.bb-client-desk.has-tabs .bb-client-desk-rail', '.bb-public-header',
    '.bb-public-profile-tabs', '.bb-services-sheet.is-page .bb-services-sheet-head'
  ]) assert.ok(headingRule.selector.includes(selector), `${selector} must join ordinary page flow`);
  const heading = declarations(headingRule);
  assert.equal(heading.position, 'relative', 'Relative flow retains the native heading splash containing block');
  assert.equal(heading.top, 'auto');
  assert.equal(heading.bottom, 'auto');
  assert.equal(heading['z-index'], 'auto');
  for (const property of ['position', 'top', 'bottom', 'z-index']) {
    assert.ok(headingRule.nodes.find((node) => node.type === 'decl' && node.prop === property).important);
  }
});

test('non-sticky page chrome is narrowly scoped and leaves navigation, calendar axes and dialogs alone', () => {
  flow.walkRules((rule) => {
    assert.doesNotMatch(rule.selector, /\.bb-(?:owner-dock|client-tabs|schedule-resource-axis|schedule-resource-person|schedule-board-times|schedule-board-day|date-calendar|time-clock|support-chat-head|services-sheet-foot)/);
    assert.doesNotMatch(rule.selector, /(?:^|,)\s*(?:header|\*)\s*(?:,|$)/, 'No blanket header or universal reset');
  });
  const schedule = postcss.parse(read('src/design/schedule-studio/desk.css'));
  for (const selector of ['.bb-schedule-board-times', '.bb-schedule-resource-axis', '.bb-schedule-resource-person']) {
    let sticky = false;
    schedule.walkRules((rule) => {
      if (rule.selector.includes(selector) && declarations(rule).position === 'sticky') sticky = true;
    });
    assert.ok(sticky, `${selector} still provides the specialised table orientation aid`);
  }
});

test('page-flow overrides load after legacy page chrome and shared controls', () => {
  const sheet = postcss.parse(read('src/design/index.css'));
  const imports = sheet.nodes.filter((node) => node.type === 'atrule' && node.name === 'import').map((node) => node.params);
  for (const legacy of ["'./app-shell.css'", "'./client-app.css'", "'./public-surface/index.css'"]) {
    assert.ok(imports.indexOf("'./page-flow.css'") > imports.indexOf(legacy), `Flow overrides follow ${legacy}`);
  }
  assert.ok(imports.indexOf("'./page-flow.css'") > imports.indexOf("'./universal-controls.css'"));
});

test('customer shell places its ordinary page heading inside the content scroller, not a pinned sibling row', () => {
  const file = ts.createSourceFile('ClientAppShell.jsx', read('src/features/client-app/ClientAppShell.jsx'), ts.ScriptTarget.Latest, true, ts.ScriptKind.JSX);
  let main;
  let header;
  let nav;
  function visit(node) {
    if (ts.isJsxElement(node)) {
      const tag = node.openingElement.tagName.getText(file);
      if (tag === 'main') main = node;
      if (tag === 'header') header = node;
      if (tag === 'nav') nav = node;
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
  assert.ok(main && header && nav);
  let ancestor = header.parent;
  while (ancestor && ancestor !== main) ancestor = ancestor.parent;
  assert.equal(ancestor, main);
  ancestor = nav.parent;
  while (ancestor && ancestor !== main) ancestor = ancestor.parent;
  assert.notEqual(ancestor, main, 'Navigation remains independently docked');
  const shell = flow.nodes.find((node) => node.type === 'rule' && node.selector === '.bb-client-shell.has-flowing-header');
  assert.equal(declarations(shell)['grid-template-rows'], 'minmax(0, 1fr) var(--bb-client-tab-h)');
});

test('customer dock hiding retains the new two-row shell while immersive-view exceptions remain', () => {
  const mobile = flow.nodes.find((node) => node.type === 'atrule' && node.params === '(max-width: 899px)');
  const hidden = mobile.nodes.find((node) => node.type === 'rule' && node.selector.includes('.bb-client-shell.has-flowing-header.is-dock-hidden'));
  assert.ok(hidden);
  assert.equal(declarations(hidden)['grid-template-rows'], 'minmax(0, 1fr) 0');
  assert.ok(hidden.selector.includes(':not(:has(.bb-client-home-feed.is-vertical-open))'));
  assert.ok(hidden.selector.includes(':not(:has(.bb-client-ig-explore.is-immersive .bb-vertical-watch))'));
});

test('desktop customer headers do not add a second dock-width gutter after joining the scroller', () => {
  const desktop = flow.nodes.find((node) => node.type === 'atrule' && node.params === '(min-width: 900px)');
  const header = desktop.nodes.find((node) => node.type === 'rule' && node.selector === '.bb-client-shell.has-flowing-header .bb-client-top');
  assert.equal(declarations(header)['padding-inline'], 'var(--bb-client-gutter)');
  const client = postcss.parse(read('src/design/client-app.css'));
  const desktopShell = [];
  client.walkRules('.bb-client-shell', (rule) => {
    if (rule.parent.type === 'atrule' && rule.parent.params === '(min-width: 900px)') desktopShell.push(rule);
  });
  assert.ok(desktopShell.some((rule) => declarations(rule).display === 'flex'), 'Desktop keeps its flex layout and independently positioned dock');
});
