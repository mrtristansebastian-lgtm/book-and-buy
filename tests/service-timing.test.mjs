import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { getServiceTimingMode, serviceTimingOptions, validateServiceTiming } from '../functions/serviceTiming.js';
import { applyWorkspaceChanges } from '../functions/workspaceDomain.js';
import { validateBookingSlot } from '../functions/bookingDomain.js';
import { publicCommerceCatalog, serviceCommerceQuote } from '../functions/commerceRuntime.js';
import { getServiceTemplate } from '../functions/serviceTemplates.js';

const require = createRequire(import.meta.url);
const cache = new Map();
function load(path) {
  const file = new URL(path, import.meta.url);
  if (cache.has(file.href)) return cache.get(file.href);
  const module = { exports: {} }; cache.set(file.href, module.exports);
  const source = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const scopedRequire = id => {
    if (id.endsWith('.css')) return {};
    if (id.endsWith('/DateField') || id.endsWith('/TimeField')) {
      const name = id.split('/').at(-1);
      return { [name]: props => React.createElement('label', null, props.label, React.createElement('input', { value: props.value, readOnly: true })) };
    }
    if (!id.startsWith('.')) return require(id);
    const base = new URL(id, file);
    const target = [base, ...['.js', '.jsx', '.ts'].map(ext => new URL(base.href + ext))].find(existsSync);
    if (!target) throw new Error(`Cannot resolve ${id}`);
    return load(target.href);
  };
  new Function('module', 'exports', 'require', source)(module, module.exports, scopedRequire);
  return module.exports;
}
const { normalizeService } = load('../src/utils/services.js');
const { buildPublicWorkspaceSnapshot } = load('../src/shared/firebase/publicSnapshot.ts');
const { buildSetupSteps } = load('../src/features/services/components/serviceEditorUtils.js');
const { ServiceEditorWhenStep } = load('../src/features/services/components/ServiceEditorWhenStep.jsx');
const template = getServiceTemplate('service_yoga_class');
const service = { id: 'yoga', name: 'Yoga', price: 30, capacity: 12, scheduleType: 'class_session', catalogTemplateId: template.id, exploreMainCategoryId: template.mainCategoryId, exploreSubcategoryId: template.subcategoryId, serviceDetails: {} };
const save = row => applyWorkspaceChanges({}, [{ section: 'services', expectedRevision: 0, patch: { services: [row] } }]);

test('legacy timing defaults stay compatible and options follow the booking format', () => {
  assert.equal(getServiceTimingMode(service), 'fixed');
  assert.equal(getServiceTimingMode({ scheduleType: 'appointment' }), 'availability');
  assert.equal(getServiceTimingMode({ bookingType: 'Class Session' }), 'fixed');
  assert.deepEqual(serviceTimingOptions(service).map(row => row.id), ['fixed', 'arranged', 'to_be_announced']);
  assert.deepEqual(serviceTimingOptions({}).map(row => row.id), ['availability', 'arranged', 'to_be_announced']);
  assert.match(validateServiceTiming({ ...service, timingMode: 'availability' }), /valid timing/);
  assert.match(validateServiceTiming({ timingNotes: 'a'.repeat(601) }), /600/);
});

test('arranged and unannounced services save without invented dates and retain public timing details', () => {
  for (const timingMode of ['arranged', 'to_be_announced']) {
    const row = normalizeService({ ...service, timingMode, timingNotes: 'Weekly sessions agreed together.' });
    const workspace = save(row);
    assert.equal(workspace.services[0].timingMode, timingMode);
    for (const catalog of [publicCommerceCatalog(workspace), buildPublicWorkspaceSnapshot(workspace)]) {
      assert.equal(catalog.services[0].timingMode, timingMode);
      assert.equal(catalog.services[0].timingNotes, row.timingNotes);
    }
    assert.throws(() => save({ ...row, timingMode: 'fixed' }), /session start and end/);
  }
  assert.doesNotThrow(() => save({ ...service, timingMode: 'fixed', sessionStartDate: '2026-10-20', sessionEndDate: '2026-10-20', sessionStartTime: '10:00', sessionEndTime: '12:00' }));
});

test('old dates cannot allow checkout or booking while timing is pending', () => {
  for (const timingMode of ['arranged', 'to_be_announced']) {
    const row = { ...service, timingMode, sessionStartDate: '2026-10-20', sessionStartTime: '10:00' };
    const workspace = { timezone: 'UTC', services: [row] };
    assert.throws(() => serviceCommerceQuote(workspace, { serviceId: row.id }), /arrange|timing/i);
    assert.throws(() => validateBookingSlot(workspace, { serviceId: row.id }, { dateKey: '2026-10-20', time: '10:00' }, [], Date.parse('2026-10-10T08:00:00Z')), /arrange.*timing/i);
  }
});

test('When offers friendly choices and shows date inputs only for fixed dates', () => {
  for (const timingMode of ['fixed', 'arranged', 'to_be_announced']) {
    const markup = renderToStaticMarkup(React.createElement(ServiceEditorWhenStep, { draft: { ...service, timingMode }, patch: () => {} }));
    assert.match(markup, /Arrange with the client/);
    assert.match(markup, /Dates to be announced/);
    assert.match(markup, /Timing details/);
    assert.equal(markup.includes('Start date'), timingMode === 'fixed');
    assert.equal(markup.includes('End time'), timingMode === 'fixed');
  }
  const slotSteps = buildSetupSteps('appointment', true).map(row => row.id);
  assert.equal(slotSteps[slotSteps.indexOf('when') + 1], 'duration');
  assert.equal(buildSetupSteps('class_session', true).length, 9);
});
