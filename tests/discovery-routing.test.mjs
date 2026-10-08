import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const code = ts.transpileModule(readFileSync(new URL('../src/app/routing.js', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const exports = {};
vm.runInNewContext(code, { exports, require: () => ({ resolveWorkspaceTab: value => value }) });
test('Discovery is canonical and legacy Find bookmarks retain nested paths', () => {
  for (const path of ['/app', '/app/discovery', '/app/find', '/app/home', '/app/explore']) {
    assert.equal(exports.parseAppRoute(path).section, 'discovery');
  }
  assert.deepEqual(Array.from(exports.parseAppRoute('/app/find/buy').rest), ['buy']);
  assert.equal(exports.clientAppPath(), '/app/discovery');
  assert.equal(exports.clientAppPath('find', 'book'), '/app/discovery/book');
  assert.equal(exports.parseAppRoute('/app/messages/thread-1').section, 'messages');
  assert.equal(exports.clientAppPath('account', 'bookings'), '/app/account/bookings');
});
