import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import * as presets from '../src/features/media/imagePresets.js';

const module = { exports: {} };
const { outputText } = ts.transpileModule(readFileSync('src/features/media/cropImage.js', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
});
new Function('module', 'exports', 'require', outputText)(module, module.exports, () => presets);
const { getCoverSize, clampImagePan, exportFramedImage, moveCropSelection, resizeCropSelection, fitCropSelection } = module.exports;

test('auto fit uses the largest possible crop without unnecessary margins', () => {
  assert.deepEqual(fitCropSelection({ width:600, height:400 }, 1.5), { x:0, y:0, width:600, height:400 });
  assert.deepEqual(fitCropSelection({ width:600, height:400 }, 3), { x:0, y:100, width:600, height:200 });
  assert.deepEqual(fitCropSelection({ width:600, height:400 }, 1), { x:100, y:0, width:400, height:400 });
});

test('crop selection moves and resizes within photo bounds without changing ratio', () => {
  const bounds = { width: 600, height: 400 };
  const selection = { x: 60, y: 40, width: 480, height: 320 };
  assert.deepEqual(moveCropSelection(selection, 900, -900, bounds), { x: 120, y: 0, width: 480, height: 320 });
  for (const corner of ['top-left', 'top-right', 'bottom-left', 'bottom-right']) {
    for (const delta of [-1000, -50, 50, 1000]) {
      const next = resizeCropSelection(selection, corner, delta, delta, bounds);
      assert.ok(next.x >= 0 && next.y >= 0);
      assert.ok(next.x + next.width <= bounds.width && next.y + next.height <= bounds.height);
      assert.ok(Math.abs(next.width / next.height - 1.5) < 0.0001);
      assert.ok(next.width >= 48);
    }
  }
});

test('fixed crop ratios survive passing resolved presets through the modal', () => {
  for (const id of ['logo', 'socialBanner', 'profileBanner', 'about', 'venue', 'hero', 'catalogCard']) {
    const resolved = presets.resolveImagePreset(id);
    for (const sourceAspect of [0.5, 1, 16 / 9, 4]) {
      assert.equal(presets.resolveFrameAspect(sourceAspect, resolved), resolved.aspect);
    }
    assert.equal(presets.resolveImagePreset(resolved).ratioOptions, null);
  }
  assert.equal(presets.resolveFrameAspect(2, presets.resolveImagePreset('productPhoto')), 2);
});

test('portrait and landscape uploads cover every fixed frame at all zoom levels', () => {
  for (const naturalAspect of [0.5, 1, 1.5, 3]) {
    for (const frameAspect of [1, 3, 1.5]) {
      for (const zoom of [1, 1.8, 3]) {
        const viewportW = 300, viewportH = 300 / frameAspect;
        const size = getCoverSize({ naturalAspect, viewportW, viewportH, zoom });
        const pan = clampImagePan({ x: -100000, y: 100000 }, size.width, size.height, viewportW, viewportH);
        assert.ok(size.width >= viewportW && size.height >= viewportH);
        assert.ok(pan.x <= 0 && pan.y <= 0);
        assert.ok(pan.x + size.width >= viewportW && pan.y + size.height >= viewportH);
      }
    }
  }
});

test('exports preserve slot ratios, crop bounds and transparent logos', async () => {
  const originalDocument = globalThis.document;
  try {
    for (const id of ['socialBanner', 'logo', 'about', 'venue']) {
      const preset = presets.IMAGE_PRESETS[id];
      let draw, filled = false;
      const canvas = {
        getContext: () => ({ fillRect: () => { filled = true; }, drawImage: (...args) => { draw = args; } }),
        toBlob: callback => callback(new Blob(['image'], { type: preset.mime }))
      };
      globalThis.document = { createElement: () => canvas };
      const viewportW = 320, viewportH = Math.round(320 / preset.aspect);
      const size = getCoverSize({ naturalAspect: 1.5, viewportW, viewportH });
      const file = await exportFramedImage({ tagName: 'IMG', naturalWidth: 3000, naturalHeight: 2000 }, {
        viewportW, viewportH, frameAspect: preset.aspect, zoom: 1,
        pan: { x: (viewportW - size.width) / 2, y: (viewportH - size.height) / 2 }
      }, preset);
      assert.equal(file.type, preset.mime);
      assert.ok(Math.abs(canvas.width / canvas.height - preset.aspect) < 0.002);
      assert.ok(draw[1] >= 0 && draw[2] >= 0);
      assert.ok(draw[1] + draw[3] <= 3000 && draw[2] + draw[4] <= 2000);
      assert.equal(filled, id !== 'logo');
      assert.ok(canvas.width >= preset.width - 1);
    }
  } finally { globalThis.document = originalDocument; }
});

test('demo uploads stay local while real uploads still require sign-in', async () => {
  const source = readFileSync('src/shared/firebase/integrations.ts', 'utf8');
  const functionSource = source.slice(source.indexOf('export async function uploadPublicImage('), source.indexOf('export const MAX_VIDEO_BYTES'));
  const { outputText } = ts.transpileModule(functionSource, { compilerOptions: { module: ts.ModuleKind.CommonJS } });
  const uploadModule = { exports: {} };
  let firebaseCalls = 0;
  new Function('exports', 'getFirebase', 'fileToDataUrl', 'MAX_IMAGE_BYTES', 'formatBytes', outputText)(
    uploadModule.exports, () => { firebaseCalls++; return { auth: { currentUser: null } }; },
    async () => 'data:image/jpeg;base64,test', 6 * 1024 * 1024, String
  );
  const file = new File(['image'], 'photo.jpg', { type: 'image/jpeg' });
  const demo = await uploadModule.exports.uploadPublicImage(file, 'venue', { demo: true });
  assert.equal(demo.localOnly, true);
  assert.equal(firebaseCalls, 0);
  await assert.rejects(uploadModule.exports.uploadPublicImage(file, 'venue'), /Sign in/);
  assert.equal(firebaseCalls, 1);
  await assert.rejects(uploadModule.exports.uploadPublicImage(new File(['text'], 'bad.txt', { type: 'text/plain' }), 'venue', { demo: true }), /Choose an image/);
});

test('export saves the selected rectangle rather than the entire preview', async () => {
  const originalDocument = globalThis.document;
  let draw;
  try {
    const canvas = { getContext: () => ({ fillRect() {}, drawImage: (...args) => { draw = args; } }),
      toBlob: callback => callback(new Blob(['image'], { type: 'image/jpeg' })) };
    globalThis.document = { createElement: () => canvas };
    await exportFramedImage({ tagName: 'IMG', naturalWidth: 3000, naturalHeight: 2000 }, {
      viewportW: 600, viewportH: 400, zoom: 1, pan: { x: 0, y: 0 }, frameAspect: 1.5,
      selection: { x: 100, y: 50, width: 300, height: 200 }
    }, 'venue');
    assert.deepEqual(draw.slice(1, 5), [500, 250, 1500, 1000]);
  } finally { globalThis.document = originalDocument; }
});
