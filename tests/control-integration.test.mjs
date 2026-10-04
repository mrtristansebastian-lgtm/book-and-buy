import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import * as statusMapping from '../src/shared/ui/controlStatus.js';
import * as buttonActions from '../src/shared/ui/buttonActions.js';

const require = createRequire(import.meta.url);
const cache = new Map();
function loadComponent(file) {
  if (cache.has(file)) return cache.get(file);
  const source = readFileSync(new URL(`../src/${file}.jsx`, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  });
  const module = { exports: {} };
  const scopedRequire = id => {
    if (id.endsWith('/Button')) return loadComponent('shared/ui/Button');
    if (id.endsWith('/FilterChip')) return loadComponent('shared/ui/FilterChip');
    if (id.endsWith('/StatusBadge')) return loadComponent('shared/ui/StatusBadge');
    if (id === './controlStatus') return statusMapping;
    if (id === './buttonActions') return buttonActions;
    return require(id);
  };
  new Function('module', 'exports', 'require', outputText)(module, module.exports, scopedRequire);
  cache.set(file, module.exports);
  return module.exports;
}

const { OpsDeskTabs, OpsAction, OpsDeclineAction, OpsChatAction, OpsStatusBadge } = loadComponent('features/ops-desk/components/OpsDeskPrimitives');
const markup = (Component, props) => renderToStaticMarkup(React.createElement(Component, props));

test('orders and requests filter counts use the shared text-only chip', () => {
  const html = markup(OpsDeskTabs, { ariaLabel: 'Orders', value: 'pending', options: [{ id: 'pending', label: 'New', count: 1234 }] });
  assert.match(html, /bb-filter-chip is-active/);
  assert.match(html, /aria-pressed="true"/);
  assert.match(html, /class="bb-count-badge">1234/);
  assert.doesNotMatch(html, /<svg/);
});

test('operation actions retain explicitly assigned purpose and submission state', () => {
  assert.match(markup(OpsAction, { variant: 'positive', children: 'Accept' }), /data-variant="positive"/);
  assert.match(markup(OpsAction, { children: 'Cancel' }), /data-variant="secondary"/);
  assert.match(markup(OpsDeclineAction, { label: 'Cancel order' }), /data-variant="destructive"/);
  const busy = markup(OpsAction, { busy: true, busyLabel: 'Accepting…', variant: 'positive', children: 'Accept' });
  assert.match(busy, /aria-busy="true"/);
  assert.match(busy, /disabled=""/);
  assert.match(busy, /Accepting…/);
  assert.match(busy, />Accept<\/span>/);
  const chat = markup(OpsChatAction, {});
  assert.match(chat, /data-action="chat"/);
  assert.match(chat, /bb-button-icon/);
  assert.equal((chat.match(/<svg/g) || []).length, 1);
});

test('operations status wrapper uses central badge semantics with one confirmed check', () => {
  const confirmed = markup(OpsStatusBadge, { status: 'confirmed', label: 'Confirmed' });
  assert.match(confirmed, /data-tone="positive"/);
  assert.equal((confirmed.match(/class="bb-status-check"/g) || []).length, 1);
  assert.match(markup(OpsStatusBadge, { status: 'cancelled', label: 'Cancelled' }), /data-tone="danger"/);
});
