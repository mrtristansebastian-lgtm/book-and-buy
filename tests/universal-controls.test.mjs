import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import * as statusMapping from '../src/shared/ui/controlStatus.js';
import * as buttonActions from '../src/shared/ui/buttonActions.js';
import { Plus } from 'lucide-react';
import postcss from 'postcss';

const require = createRequire(import.meta.url);
// Compile JSX in memory; no generated source files or application side effects.
function loadComponent(name) {
  const source = readFileSync(new URL(`../src/shared/ui/${name}.jsx`, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  });
  const module = { exports: {} };
  const scopedRequire = (id) => id === './controlStatus' ? statusMapping : id === './buttonActions' ? buttonActions : require(id);
  new Function('module', 'exports', 'require', outputText)(module, module.exports, scopedRequire);
  return module.exports[name];
}
const Button = loadComponent('Button');
const FilterChip = loadComponent('FilterChip');
const StatusBadge = loadComponent('StatusBadge');
const markup = (Component, props, child) => renderToStaticMarkup(React.createElement(Component, props, child));

test('action appearance is explicit, never guessed from its label', () => {
  assert.match(markup(Button, {}, 'Delete'), /data-variant="secondary"/);
  assert.match(markup(Button, { variant: 'positive' }, 'Accept'), /data-variant="positive"/);
  assert.match(markup(Button, { variant: 'destructive' }, 'Delete'), /data-variant="destructive"/);
  assert.match(markup(Button, { variant: 'primary' }, 'Save'), /data-variant="primary"/);
  assert.match(markup(Button, { variant: 'invalid' }, 'Save'), /data-variant="secondary"/);
});

test('buttons default to a non-submitting action and preserve native form props', () => {
  assert.match(markup(Button, {}, 'Save'), /type="button"/);
  const html = markup(Button, { type: 'submit', name: 'action', value: 'save', form: 'profile', 'aria-label': 'Save profile' }, 'Save');
  assert.match(html, /type="submit"/);
  assert.match(html, /name="action"/);
  assert.match(html, /form="profile"/);
  assert.match(html, /aria-label="Save profile"/);
});

test('action links keep navigation semantics without invalid button attributes', () => {
  const html = markup(Button, { as: 'a', href: 'https://example.com', target: '_blank', rel: 'noopener' }, 'Connect');
  assert.match(html, /^<a /);
  assert.match(html, /href="https:\/\/example.com"/);
  assert.match(html, /target="_blank"/);
  assert.doesNotMatch(html, /type=|disabled=/);
  const busy = markup(Button, { as: 'a', href: 'https://example.com', busy: true }, 'Connect');
  assert.match(busy, /aria-disabled="true"/);
  assert.match(busy, /tabindex="-1"/);
  assert.doesNotMatch(busy, / href=| disabled=/);
});

test('busy buttons block repeated clicks, expose busy state and keep their original sizing label', () => {
  const onClick = () => {};
  const element = Button.render({ busy: true, busyLabel: 'Saving…', onClick, children: 'Save profile' }, null);
  assert.equal(element.props.disabled, true);
  assert.equal(element.props.onClick, undefined);
  const html = markup(Button, { busy: true, busyLabel: 'Saving…' }, 'Save profile');
  assert.match(html, /aria-busy="true"/);
  assert.match(html, /class="bb-button-label" aria-hidden="true">.*Save profile/);
  assert.match(html, /class="bb-button-busy-label">Saving…/);
  assert.equal(Button.render({ onClick, children: 'Save' }, null).props.onClick, onClick);
});

test('button icons come from explicit semantic action keys rather than visible labels', () => {
  const html = markup(Button, { action: 'save' }, 'Save profile');
  assert.match(html, /data-action="save"/);
  assert.equal((html.match(/<svg /g) || []).length, 1);
  assert.match(html, /bb-button-icon/);
  assert.match(html, /data-bb-keep-icon="true"/);
  assert.match(html, /stroke-width="1.6"/);
  assert.match(html, /aria-hidden="true"/);
  assert.doesNotMatch(markup(Button, {}, 'Save'), /<svg/);
  assert.doesNotMatch(markup(Button, { action: 'futureAction' }, 'Save'), /<svg/);
  assert.equal(buttonActions.getButtonActionIcon('__proto__'), null);
  assert.equal(buttonActions.getButtonActionIcon('delete'), buttonActions.getButtonActionIcon('remove'));
});

test('an explicit icon override renders once and can be disabled', () => {
  assert.equal((markup(Button, { action: 'save', icon: Plus }, 'Add').match(/<svg /g) || []).length, 1);
  assert.equal((markup(Button, { action: 'save', icon: React.createElement(Plus) }, 'Add').match(/<svg /g) || []).length, 1);
  assert.doesNotMatch(markup(Button, { action: 'save', icon: false }, 'Save'), /<svg/);
});

test('only explicit Delete and Remove actions become accessible dustbin-only buttons', () => {
  for (const action of ['delete', 'remove']) {
    const html = markup(Button, { action, variant: 'destructive', icon: false }, 'Delete product');
    assert.match(html, /is-icon-only/);
    assert.match(html, /title="Delete product"/);
    assert.match(html, /class="bb-button-text bb-control-sr-only">Delete product/);
    assert.equal((html.match(/<svg /g) || []).length, 1);
    assert.match(html, /lucide-trash2/);
  }
  for (const action of ['cancel', 'decline', 'withdraw', 'save']) {
    assert.doesNotMatch(markup(Button, { action }, 'Delete'), /is-icon-only|bb-control-sr-only/);
  }
  assert.doesNotMatch(markup(Button, {}, 'Delete'), /is-icon-only/);
  assert.match(markup(Button, { action: 'delete', 'aria-label': 'Delete shift on Friday' }, 'Delete'), /aria-label="Delete shift on Friday"/);
  const busy = markup(Button, { action: 'delete', busy: true, busyLabel: 'Deleting…' }, 'Delete product');
  assert.match(busy, /disabled=""/);
  assert.match(busy, /aria-busy="true"/);
  assert.match(busy, /bb-delete-busy-icon/);
  assert.match(busy, /bb-control-sr-only">Deleting…/);
});

test('dustbin geometry is square, centered and compact, without shrinking other actions', () => {
  const css = postcss.parse(readFileSync(new URL('../src/design/universal-controls.css', import.meta.url), 'utf8'));
  const values = node => Object.fromEntries(node.nodes.filter(n => n.type === 'decl').map(n => [n.prop,n.value]));
  const base = values(css.nodes.find(n => n.selector === 'html body .bb-button.is-icon-only[data-variant]'));
  assert.equal(base.width, '36px');
  assert.equal(base['min-height'], '36px');
  assert.equal(base.padding, '0');
  const mobile = css.nodes.find(n => n.type === 'atrule' && n.params === '(max-width: 899px)');
  const compact = values(mobile.nodes.find(n => n.selector === 'html body .bb-button.is-icon-only[data-variant]'));
  assert.equal(compact.width, '32px');
  assert.equal(compact['min-height'], '32px');
  const label = values(css.nodes.find(n => n.selector === 'html body .bb-control-sr-only'));
  assert.equal(label['clip-path'], 'inset(50%)');
  assert.notEqual(label.display, 'none');
});

test('selected appearance does not infer toggle semantics or alter busy sizing content', () => {
  const selected = markup(Button, { action: 'edit', selected: true }, 'Edit');
  assert.match(selected, /data-selected="true"/);
  assert.doesNotMatch(selected, /aria-pressed=/);
  const busy = markup(Button, { action: 'save', busy: true, busyLabel: 'Saving…' }, 'Save changes');
  assert.match(busy, /class="bb-button-label" aria-hidden="true"><svg/);
  assert.match(busy, /Save changes/);
  assert.match(busy, /bb-button-busy-label/);
});

test('all registered action icons render with one consistent light-weight geometry', () => {
  for (const action of Object.keys(buttonActions.BUTTON_ACTION_ICONS)) {
    const html = markup(Button, { action }, 'Action');
    assert.equal((html.match(/<svg /g) || []).length, 1, action);
    assert.match(html, /width="16" height="16"/, action);
    assert.match(html, /stroke-width="1.6"/, action);
    assert.match(html, /class="[^"]*bb-button-icon/, action);
    assert.match(html, /aria-hidden="true"/, action);
  }
});

test('literal Button and OpsAction action keys throughout the app exist in the shared registry', () => {
  const unknown = [];
  let keysChecked = 0;
  const sourceRoot = new URL('../src/', import.meta.url);
  function inspectDirectory(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const file = new URL(entry.name + (entry.isDirectory() ? '/' : ''), directory);
      if (entry.isDirectory()) { inspectDirectory(file); continue; }
      if (!/\.jsx$/.test(entry.name)) continue;
      const source = readFileSync(file, 'utf8');
      const ast = ts.createSourceFile(file.pathname, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JSX);
      function check(node) {
        if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && ['Button', 'OpsAction'].includes(node.tagName.getText(ast))) {
          const action = node.attributes.properties.find((attribute) => ts.isJsxAttribute(attribute) && attribute.name.getText(ast) === 'action');
          if (action?.initializer) {
            function checkLiteral(value) {
              if (ts.isStringLiteral(value)) {
                keysChecked++;
                if (!buttonActions.getButtonActionIcon(value.text)) {
                  const line = ast.getLineAndCharacterOfPosition(node.getStart(ast)).line + 1;
                  unknown.push(`${file.pathname}:${line} action="${value.text}"`);
                }
              } else if (ts.isJsxExpression(value) && value.expression) {
                checkLiteral(value.expression);
              } else if (ts.isConditionalExpression(value)) {
                checkLiteral(value.whenTrue);
                checkLiteral(value.whenFalse);
              }
            }
            checkLiteral(action.initializer);
          }
        }
        ts.forEachChild(node, check);
      }
      check(ast);
    }
  }
  inspectDirectory(sourceRoot);
  assert.ok(keysChecked >= 50, 'Expected the app migration to exercise explicit action keys');
  assert.deepEqual(unknown, []);
});

test('shared actions cannot regress to runtime text or class guessing', () => {
  const buttonSource = readFileSync(new URL('../src/shared/ui/Button.jsx', import.meta.url), 'utf8');
  const registrySource = readFileSync(new URL('../src/shared/ui/buttonActions.js', import.meta.url), 'utf8');
  const appSource = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
  assert.match(buttonSource, /getButtonActionIcon\(action\)/);
  assert.doesNotMatch(buttonSource + registrySource, /MutationObserver|querySelector|textContent|innerText|visibleLabel/);
  assert.doesNotMatch(appSource, /useTextButtonStyle/);
});

test('resting action controls stay solid while the native gradient belongs only to interaction states', () => {
  const css = postcss.parse(readFileSync(new URL('../src/design/universal-controls.css', import.meta.url), 'utf8'));
  const rules = [];
  css.walkRules((rule) => rules.push(rule));
  const buttonBase = rules.find((rule) => rule.selector === 'html body .bb-button[data-variant]');
  const declarations = (rule) => Object.fromEntries((rule.nodes || []).filter((node) => node.type === 'decl').map((node) => [node.prop, node.value]));
  const base = declarations(buttonBase);
  assert.equal(base.background, '#fff');
  assert.equal(base['font-weight'], '550');
  assert.equal(base['font-size'], '13px');
  assert.equal(base['border-radius'], 'var(--bb-button-radius)');
  const gradientRules = rules.filter((rule) => (rule.selector.includes('.bb-button') || rule.selector.includes('.bb-filter-chip')) && (rule.nodes || []).some((node) => node.type === 'decl' && /native-accent-gradient/.test(node.value)));
  assert.ok(gradientRules.length >= 2);
  for (const rule of gradientRules) {
    assert.match(rule.selector, /:hover|:focus-visible|is-active|aria-pressed|aria-selected|data-selected/);
    assert.match(rule.selector, /:not\(:disabled\)/);
  }
  const iconRule = rules.find((rule) => rule.selector === 'html body .bb-button[data-variant] .bb-button-icon[data-bb-keep-icon]');
  const icon = declarations(iconRule);
  assert.equal(icon.width, '16px');
  assert.equal(icon.height, '16px');
  assert.equal(icon['stroke-width'], '1.6');
  assert.equal(icon.color, '#98a2b3');
});

test('busy actions keep their original icon and label in layout with an accessible overlay', () => {
  const normal = Button.render({ action: 'save', children: 'Save a long profile name' }, null);
  const busy = Button.render({ action: 'save', busy: true, busyLabel: 'Saving…', children: 'Save a long profile name' }, null);
  assert.equal(normal.props.children[0].type, busy.props.children[0].type);
  assert.equal(normal.props.children[0].props.children[1].props.children, busy.props.children[0].props.children[1].props.children);
  assert.equal(busy.props.children[0].props['aria-hidden'], true);
  assert.equal(busy.props.children[1].props.children, 'Saving…');
  const css = postcss.parse(readFileSync(new URL('../src/design/universal-controls.css', import.meta.url), 'utf8'));
  const hiddenLabelRule = css.nodes.find((node) => node.type === 'rule' && node.selector === '.bb-button.is-busy .bb-button-label');
  assert.ok(hiddenLabelRule.nodes.some((node) => node.type === 'decl' && node.prop === 'opacity' && node.value === '0'));
  assert.ok(!hiddenLabelRule.nodes.some((node) => node.type === 'decl' && node.prop === 'display' && node.value === 'none'));
  const overlayRule = css.nodes.find((node) => node.type === 'rule' && node.selector === '.bb-button-busy-label');
  assert.ok(overlayRule.nodes.some((node) => node.type === 'decl' && node.prop === 'position' && node.value === 'absolute'));
});

test('mobile actions stay compact globally and in narrow profile previews without shrinking fields or clipping labels', () => {
  const css = postcss.parse(readFileSync(new URL('../src/design/universal-controls.css', import.meta.url), 'utf8'));
  const declarations = (rule) => Object.fromEntries((rule.nodes || []).filter((node) => node.type === 'decl').map((node) => [node.prop, node.value]));
  const mobile = css.nodes.find((node) => node.type === 'atrule' && node.name === 'media' && node.params === '(max-width: 899px)');
  const tokens = declarations(mobile.nodes.find((node) => node.selector === ':root'));
  assert.equal(tokens['--bb-button-height'], '32px');
  assert.equal(tokens['--bb-filter-height'], '30px');
  assert.equal(tokens['--bb-control-height'], '44px', 'Fields retain their comfortable input geometry');
  const base = declarations(css.nodes.find((node) => node.selector === 'html body .bb-button[data-variant]'));
  assert.equal(base['align-self'], 'center', 'Grid rows must not stretch action height');
  assert.equal(base.height, 'auto');
  assert.equal(base['white-space'], 'normal');
  assert.equal(base['overflow-wrap'], 'anywhere');
  assert.equal(base['font-size'], '13px');
  const mobileIcon = declarations(mobile.nodes.find((node) => node.selector === 'html body .bb-button[data-variant] .bb-button-icon[data-bb-keep-icon]'));
  assert.equal(mobileIcon.width, '14px');
  assert.equal(mobileIcon.height, '14px');
  const counts = declarations(css.nodes.find((node) => node.selector === 'html body .bb-count-badge'));
  assert.equal(counts.height, '22px', 'Exact counts retain their centered badge, not truncated tiny circles');
  const profile = postcss.parse(readFileSync(new URL('../src/design/business-profile.css', import.meta.url), 'utf8'));
  const narrow = profile.nodes.find((node) => node.type === 'atrule' && node.name === 'container' && node.params === 'bb-profile-width (max-width: 600px)');
  assert.equal(declarations(narrow.nodes.find((node) => node.selector === '.bb-business-profile'))['--bb-button-height'], '32px');
});

test('filter chips preserve zero and arbitrarily large exact counts', () => {
  assert.match(markup(FilterChip, { selected: true, count: 0 }, 'Unread'), /aria-pressed="true"/);
  assert.match(markup(FilterChip, { count: 0 }, 'Unread'), /class="bb-count-badge">0/);
  assert.match(markup(FilterChip, { count: '123456789' }, 'All'), /class="bb-count-badge">123456789/);
  assert.doesNotMatch(markup(FilterChip, {}, 'Bookings'), /bb-count-badge/);
  assert.doesNotMatch(markup(FilterChip, {}, 'Bookings'), /<svg/);
});

test('filter tabs retain tab selection semantics rather than pressed-button semantics', () => {
  const html = markup(FilterChip, { role: 'tab', selected: true }, 'All');
  assert.match(html, /role="tab"/);
  assert.match(html, /aria-selected="true"/);
  assert.doesNotMatch(html, /aria-pressed=/);
});

test('status synonyms resolve centrally, with unsupported values safely neutral', () => {
  for (const status of ['Confirmed', 'accepted', 'paid', 'fulfilled', 'active', 'working', 'available']) assert.equal(statusMapping.getStatusTone(status), 'positive');
  for (const status of ['pending', 'awaiting_payment', 'Awaiting EFT']) assert.equal(statusMapping.getStatusTone(status), 'pending');
  for (const status of ['shipped', 'processing', 'reschedule_requested']) assert.equal(statusMapping.getStatusTone(status), 'info');
  for (const status of ['waitlist', 'waitlisted', 'wait list', 'leave']) assert.equal(statusMapping.getStatusTone(status), 'waitlist');
  for (const status of ['declined', 'cancelled', 'canceled', 'failed']) assert.equal(statusMapping.getStatusTone(status), 'danger');
  for (const status of ['draft', 'inactive', 'unknown', 'off', 'off day', 'business-closed', 'future-status', null, '__proto__', 'constructor']) assert.equal(statusMapping.getStatusTone(status), 'neutral');
});

test('badges preserve supplied wording and only Confirmed includes its approved check', () => {
  const html = markup(StatusBadge, { status: 'confirmed', label: 'Confirmed' });
  assert.match(html, /data-tone="positive"/);
  assert.match(html, /class="bb-status-check"/);
  assert.match(html, /aria-hidden="true"/);
  assert.match(html, />Confirmed<\/span>/);
  const accepted = markup(StatusBadge, { status: 'accepted', label: 'Accepted by business' });
  assert.doesNotMatch(accepted, /<svg/);
  assert.match(accepted, /Accepted by business/);
  assert.doesNotMatch(html, /<button|role="button"|tabindex/);
});
