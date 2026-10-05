import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createGlobeTexture, createLiveGlobeRenderer, GLOBE_TRAFFIC_STOPS } from '../src/features/analytics/utils/liveGlobeRenderer.js';
import { globePointFromScreen, geographicPoint, rotateGlobePoint } from '../src/features/analytics/utils/liveGlobeGeometry.js';

function context2d() {
  return {
    copies: 0, output: null,
    createImageData: (width, height) => ({ width, height, data: new Uint8ClampedArray(width * height * 4) }),
    putImageData(image) { this.output = image; }, clearRect() {}, drawImage() { this.copies++; }
  };
}
function earthTexture(red = null) {
  const width = 32; const height = 16; const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const index = (y * width + x) * 4;
    data.set([red ?? x * 8, y * 16, 120, 255], index);
  }
  return { width, height, getContext: () => ({ getImageData: () => ({ data }) }) };
}
function graphics(options = {}) {
  const shaders = []; const state = { drawCount: 0, deleted: 0, uploadCount: 0, lost: false, error: 0 };
  const gl = {
    ...state, VERTEX_SHADER: 'vertex', FRAGMENT_SHADER: 'fragment', COMPILE_STATUS: 'compile', LINK_STATUS: 'link', NO_ERROR: 0,
    createShader: type => ({ type }), shaderSource(shader, source) { shader.source = source; shaders.push(shader); }, compileShader() {},
    getShaderParameter: () => !options.shaderFailure,
    createProgram: () => ({}), attachShader() {}, linkProgram() {},
    getProgramParameter: () => !options.linkFailure && new Set(shaders.map(shader => shader.source.match(/precision\s+(\w+)\s+float/)?.[1] || 'highp')).size === 1,
    useProgram() {}, createBuffer: () => ({}), bindBuffer() {}, bufferData() {}, getAttribLocation: () => 0,
    enableVertexAttribArray() {}, vertexAttribPointer() {}, createTexture: () => ({}), bindTexture() {}, texParameteri() {},
    texImage2D() { state.uploadCount++; if (state.uploadCount === options.textureFailureAt) state.error = 1282; },
    getError() { const error = state.error; state.error = 0; return error; },
    getUniformLocation: () => ({}), uniform1i() {}, uniform1f() {}, uniform2f() {}, enable() {}, viewport() {}, clearColor() {}, clear() {},
    drawElements() { if (options.drawFailure) throw new Error('Driver draw failed'); state.drawCount++; },
    isContextLost: () => state.lost,
    deleteBuffer() { state.deleted++; }, deleteShader() { state.deleted++; }, deleteTexture() { state.deleted++; }, deleteProgram() { state.deleted++; }
  };
  return { gl, state, shaders };
}
function canvases(gl = null, throwOnContext = false) {
  const context = context2d(); const visibleRequests = []; const listeners = new Map();
  const accelerated = { width: 0, height: 0, getContext(type) { assert.equal(type, 'webgl'); if (throwOnContext) throw new Error('GPU blocked'); return gl; },
    addEventListener: (type, callback) => listeners.set(type, callback), removeEventListener: type => listeners.delete(type) };
  const visible = { width: 0, height: 0, ownerDocument: { createElement: () => accelerated },
    getContext(type) { visibleRequests.push(type); assert.equal(type, '2d', 'The visible canvas must never become locked to a WebGL context'); return context; } };
  return { visible, accelerated, context, visibleRequests, listeners };
}
const centerPixel = image => [...image.data.slice((Math.floor(image.height / 2) * image.width + Math.floor(image.width / 2)) * 4,
  (Math.floor(image.height / 2) * image.width + Math.floor(image.width / 2)) * 4 + 4)];

test('missing or blocked WebGL renders a real textured sphere with working rotation', () => {
  for (const blocked of [false, true]) {
    const { visible, context } = canvases(null, blocked);
    const renderer = createLiveGlobeRenderer(visible, earthTexture());
    assert.equal(renderer.mode, 'software');
    renderer.render({ longitude: 0, latitude: 0 }, 80, 60, 1);
    const first = centerPixel(context.output);
    assert.equal(first[3], 255);
    assert.equal(context.output.data[3], 0, 'Pixels outside the 3D sphere remain transparent');
    renderer.render({ longitude: 90, latitude: 0 }, 80, 60, 1);
    assert.notDeepEqual(centerPixel(context.output), first, 'Rotation samples a different real Earth longitude');
    renderer.dispose();
  }
});

test('shader, program and texture initialization failures preserve the interactive software globe', () => {
  for (const options of [{ shaderFailure: true }, { linkFailure: true }, { textureFailureAt: 1 }]) {
    const { gl, state } = graphics(options); const { visible, context } = canvases(gl);
    const renderer = createLiveGlobeRenderer(visible, earthTexture());
    assert.equal(renderer.mode, 'software');
    assert.ok(renderer.accelerationError);
    assert.ok(state.deleted > 0, 'Partially initialized GPU resources are released');
    renderer.render({ longitude: 24, latitude: -30 }, 80, 60, 1);
    assert.equal(centerPixel(context.output)[3], 255);
    renderer.dispose();
  }
});

test('WebGL shaders agree on shared precision and copy the real sphere into the visible canvas', () => {
  const { gl, state, shaders } = graphics(); const { visible, context, accelerated } = canvases(gl);
  const renderer = createLiveGlobeRenderer(visible, earthTexture());
  assert.equal(renderer.mode, 'webgl', 'Strict shader precision linking must succeed');
  assert.equal(shaders.length, 2);
  renderer.render({ longitude: 20, latitude: 12 }, 80, 60, 1);
  assert.equal(state.drawCount, 1); assert.equal(context.copies, 1);
  assert.equal(visible.width, accelerated.width); assert.equal(visible.height, accelerated.height);
  renderer.dispose(); assert.ok(state.deleted > 0);
});

test('GPU drawing or later texture failures switch to the same rotating 3D world', () => {
  for (const options of [{ drawFailure: true }, { textureFailureAt: 2 }]) {
    const { gl } = graphics(options); const { visible, context } = canvases(gl);
    const renderer = createLiveGlobeRenderer(visible, earthTexture());
    assert.equal(renderer.mode, 'webgl');
    renderer.updateTexture(earthTexture(200));
    renderer.render({ longitude: -60, latitude: 12 }, 80, 60, 1);
    assert.equal(renderer.mode, 'software');
    assert.ok(centerPixel(context.output)[0] > 140, 'Fallback uses the most recent local Earth texture');
    assert.equal(centerPixel(context.output)[3], 255);
    renderer.dispose();
  }
});

test('losing the GPU context redraws the last view immediately without an unavailable state', () => {
  const { gl } = graphics(); const { visible, context, listeners } = canvases(gl);
  const renderer = createLiveGlobeRenderer(visible, earthTexture());
  renderer.render({ longitude: 20, latitude: -10 }, 80, 60, 1);
  let prevented = false;
  listeners.get('webglcontextlost')({ preventDefault() { prevented = true; } });
  assert.equal(prevented, true); assert.equal(renderer.mode, 'software');
  assert.equal(centerPixel(context.output)[3], 255);
  renderer.dispose(); assert.equal(listeners.size, 0);
});

test('local Earth texture always draws the full world regardless of selling markets', () => {
  const geography = JSON.parse(readFileSync(new URL('../src/features/analytics/assets/worldGlobe.json', import.meta.url), 'utf8'));
  const originalDocument = globalThis.document;
  try {
    for (const marketCodes of [[], ['ZA'], ['GB', 'US']]) {
      let filled = 0;
      const context = { fillRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, closePath() {}, fill() { filled++; }, stroke() {} };
      globalThis.document = { createElement: () => ({ getContext: () => context }) };
      createGlobeTexture(geography.countries, marketCodes);
      assert.equal(filled, geography.countries.length);
      assert.ok(filled > 240);
    }
  } finally { if (originalDocument === undefined) delete globalThis.document; else globalThis.document = originalDocument; }
});

test('active countries use the original pastel gradient while oceans stay light blue and inactive land stays neutral', () => {
  const brandCss = readFileSync(new URL('../src/design/native-accent-system.css', import.meta.url), 'utf8');
  const brandGradient = brandCss.match(/--native-brand-gradient:\s*linear-gradient\(115deg,([^;]+)\);/)[1];
  const brandStops = [...brandGradient.matchAll(/(#[0-9a-f]{6})\s+([\d.]+)%/gi)].map(([, colour, percent]) => [Number(percent) / 100, colour]);
  assert.deepEqual(GLOBE_TRAFFIC_STOPS, brandStops, 'Globe colours stay identical to the shared map/button brand palette');
  const originalDocument = globalThis.document;
  const fills = [], gradients = [];
  const context = { fillRect() { fills.push(this.fillStyle); }, beginPath() {}, moveTo() {}, lineTo() {}, closePath() {},
    fill() { fills.push(this.fillStyle); }, stroke() {}, createLinearGradient() { const stops = []; gradients.push(stops); return { addColorStop: (offset, colour) => stops.push([offset, colour]) }; } };
  try {
    globalThis.document = { createElement: () => ({ getContext: () => context }) };
    const polygons = [[[[0, 0], [5, 0], [5, 5], [0, 5], [0, 0]]]];
    createGlobeTexture([{ iso2: 'ZA', polygons }, { iso2: 'GB', polygons }], ['GB'], ['ZA']);
    assert.equal(fills[0], '#e8f5ff');
    assert.deepEqual(gradients[0], GLOBE_TRAFFIC_STOPS);
    assert.deepEqual(gradients[1], [[0, 'rgba(255,255,255,.58)'], [1, 'rgba(255,255,255,.18)']]);
    assert.equal(fills.at(-1), '#e8edef', 'Selling markets without live visitors do not acquire activity colours');
  } finally { if (originalDocument === undefined) delete globalThis.document; else globalThis.document = originalDocument; }
});

test('software surface pixels agree with country hit testing after rotation, resize and zoom', () => {
  const { visible, context } = canvases(); const texture = earthTexture();
  const renderer = createLiveGlobeRenderer(visible, texture);
  for (const [width, height] of [[80, 60], [60, 80]]) for (const zoom of [.75, 1.2]) for (const rotation of [{ longitude: 24, latitude: -30 }, { longitude: -68, latitude: 42 }]) {
    renderer.render(rotation, width, height, zoom);
    for (const [x, y] of [[Math.floor(width / 2), Math.floor(height / 2)], [Math.floor(width * .55), Math.floor(height * .45)]]) {
      const location = globePointFromScreen(x + .5, y + .5, rotation, width, height, zoom);
      assert.ok(location);
      const tx = Math.min(texture.width - 1, Math.floor((location.longitude + 180) / 360 * texture.width));
      const ty = Math.min(texture.height - 1, Math.floor((90 - location.latitude) / 180 * texture.height));
      const point = rotateGlobePoint(geographicPoint(location.longitude, location.latitude), rotation);
      const brightness = .94 + .06 * Math.max(0, (-.45 * point.x + .65 * point.y + 1.4 * point.z) / 1.6078);
      const expected = new Uint8ClampedArray([tx * 8 * brightness, ty * 16 * brightness, 120 * brightness, 255]);
      const actual = context.output.data.slice((y * width + x) * 4, (y * width + x) * 4 + 4);
      for (let channel = 0; channel < 4; channel++) assert.ok(Math.abs(actual[channel] - expected[channel]) <= 1, `Pixel aligns with country selection at ${width}x${height}, zoom ${zoom}`);
    }
  }
  renderer.dispose();
});
