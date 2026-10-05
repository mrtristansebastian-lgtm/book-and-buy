import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

function dialogHarness() {
  const effects = [];
  const frames = new Map();
  let frameId = 0;
  const document = { body: { style: { overflow: 'auto' } }, activeElement: null };
  const control = (visible = true) => ({
    isConnected: true,
    getClientRects: () => visible ? [{}] : [],
    focus() { document.activeElement = this; }
  });
  const panel = () => {
    const buttons = [control(), control(false), control()];
    const listeners = new Map();
    return {
      ...control(), buttons, listeners,
      querySelectorAll: () => buttons,
      contains: (item) => buttons.includes(item),
      addEventListener: (name, listener) => listeners.set(name, listener),
      removeEventListener: (name) => listeners.delete(name)
    };
  };
  const module = { exports: {} };
  const { outputText } = ts.transpileModule(read('src/shared/ui/useDialogFocus.js'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  });
  new Function('module', 'exports', 'require', 'document', 'requestAnimationFrame', 'cancelAnimationFrame', outputText)(
    module, module.exports,
    () => ({ useRef: (current) => ({ current }), useEffect: (effect) => effects.push(effect) }),
    document,
    (callback) => { frames.set(++frameId, callback); return frameId; },
    (id) => frames.delete(id)
  );
  return {
    document, control, panel,
    open: (element, onClose) => {
      module.exports.useDialogFocus({ current: element }, true, onClose);
      const cleanup = effects.pop()();
      for (const [id, callback] of frames) { frames.delete(id); callback(); }
      return cleanup;
    }
  };
}

test('modal focus enters visible controls, traps Tab, handles Escape and returns to the opener', () => {
  const harness = dialogHarness();
  const opener = harness.control(); opener.focus();
  const dialog = harness.panel();
  let closes = 0;
  const cleanup = harness.open(dialog, () => { closes += 1; });
  assert.equal(harness.document.activeElement, dialog.buttons[0]);
  assert.equal(harness.document.body.style.overflow, 'hidden');
  const key = (name, shiftKey = false) => {
    let prevented = false;
    dialog.listeners.get('keydown')({ key: name, shiftKey,
      preventDefault: () => { prevented = true; }, stopPropagation() {} });
    return prevented;
  };
  dialog.buttons[2].focus();
  assert.ok(key('Tab'));
  assert.equal(harness.document.activeElement, dialog.buttons[0]);
  assert.ok(key('Tab', true));
  assert.equal(harness.document.activeElement, dialog.buttons[2]);
  assert.ok(key('Escape'));
  assert.equal(closes, 1);
  cleanup();
  assert.equal(harness.document.activeElement, opener);
  assert.equal(harness.document.body.style.overflow, 'auto');
  assert.equal(dialog.listeners.size, 0);
});

test('closing a nested calendar retains its parent scroll lock and restores parent focus', () => {
  const harness = dialogHarness();
  const opener = harness.control(); opener.focus();
  const outer = harness.panel();
  const closeOuter = harness.open(outer, () => {});
  const outerFocus = harness.document.activeElement;
  const inner = harness.panel();
  const closeInner = harness.open(inner, () => {});
  closeInner();
  assert.equal(harness.document.body.style.overflow, 'hidden');
  assert.equal(harness.document.activeElement, outerFocus);
  closeOuter();
  assert.equal(harness.document.body.style.overflow, 'auto');
  assert.equal(harness.document.activeElement, opener);
});

test('a dialog with temporarily disabled actions keeps keyboard focus on its panel', () => {
  const harness = dialogHarness();
  const opener = harness.control(); opener.focus();
  const dialog = harness.panel();
  dialog.querySelectorAll = () => [];
  const cleanup = harness.open(dialog, () => {});
  assert.equal(harness.document.activeElement, dialog);
  for (const shiftKey of [false, true]) {
    let prevented = false;
    dialog.listeners.get('keydown')({ key: 'Tab', shiftKey,
      preventDefault: () => { prevented = true; }, stopPropagation() {} });
    assert.ok(prevented, 'Tab cannot escape while every action is disabled');
    assert.equal(harness.document.activeElement, dialog);
  }
  cleanup();
  assert.equal(harness.document.activeElement, opener);
  assert.equal(harness.document.body.style.overflow, 'auto');
});

test('common sheets, sorting and period pickers connect their focusable panel to the shared dialog hook', () => {
  for (const file of [
    'src/shared/ui/AppSheet.jsx',
    'src/shared/ui/SortField.jsx',
    'src/shared/ui/PeriodCustomPicker.jsx',
    'src/features/booking/components/PublicServiceSlotSheet.jsx',
    'src/features/bookings/components/ManualBookingSheet.jsx'
  ]) {
    const source = read(file);
    assert.match(source, /useDialogFocus\(panelRef,/, file);
    assert.match(source, /ref=\{panelRef\}\s+tabIndex=\{-1\}/, file);
  }
});
