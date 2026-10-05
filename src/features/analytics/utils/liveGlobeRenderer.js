import { buildGlobeMesh, GLOBE_CAMERA_DISTANCE, GLOBE_FIELD_OF_VIEW } from './liveGlobeGeometry.js';

// The same pastel spectrum used by the flat map's native accent gradient.
export const GLOBE_TRAFFIC_STOPS = Object.freeze([[0, '#cbffb8'], [.12, '#f1ff9a'], [.24, '#c9ffbf'], [.38, '#b7fff0'], [.52, '#b9e3ff'], [.66, '#d2cbff'], [.80, '#ffd4f2'], [.88, '#d8ccff'], [.94, '#c1e7ff'], [.98, '#c0fff1'], [1, '#cbffb8']]);

/** Country silhouettes form the local Earth texture. No online image/map service. */
export function createGlobeTexture(countries, marketCodes = [], trafficCodes = [], worldwide = false) {
  const texture = document.createElement('canvas');
  texture.width = 2048; texture.height = 1024;
  const context = texture.getContext('2d');
  if (!context) throw new Error('Earth texture rendering is unavailable.');
  const traffic = new Set(trafficCodes);
  context.fillStyle = '#e8f5ff'; context.fillRect(0, 0, texture.width, texture.height);
  for (const country of countries) {
    context.fillStyle = '#e8edef';
    context.strokeStyle = '#ffffff'; context.lineWidth = 1;
    context.beginPath();
    let left = Infinity; let top = Infinity; let right = -Infinity; let bottom = -Infinity;
    for (const rings of country.polygons) for (const ring of rings) {
      ring.forEach(([longitude, latitude], index) => {
        const x = (longitude + 180) / 360 * texture.width;
        const y = (90 - latitude) / 180 * texture.height;
        left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
        if (index) context.lineTo(x, y); else context.moveTo(x, y);
      });
      context.closePath();
    }
    if (traffic.has(country.iso2) && Number.isFinite(left)) {
      const gradient = context.createLinearGradient(left, top, right, bottom);
      for (const [offset, colour] of GLOBE_TRAFFIC_STOPS) gradient.addColorStop(offset, colour);
      context.fillStyle = gradient;
      context.fill('evenodd');
      // Match the flat map's translucent white wash over the accent colours.
      const wash = context.createLinearGradient(0, top, 0, bottom);
      wash.addColorStop(0, 'rgba(255,255,255,.58)'); wash.addColorStop(1, 'rgba(255,255,255,.18)');
      context.fillStyle = wash;
    }
    context.fill('evenodd'); context.stroke();
  }
  return texture;
}

const vertexSource = `
precision mediump float;
attribute vec3 position;
attribute vec2 texcoord;
uniform vec2 rotation;
uniform float camera;
uniform float aspect;
varying vec2 uv;
varying vec3 normal;
void main() {
  float yaw = -rotation.x; float pitch = rotation.y;
  vec3 p = vec3(cos(yaw)*position.x + sin(yaw)*position.z, position.y, -sin(yaw)*position.x + cos(yaw)*position.z);
  p = vec3(p.x, cos(pitch)*p.y - sin(pitch)*p.z, sin(pitch)*p.y + cos(pitch)*p.z);
  float focal = min(1.0,aspect) / tan(${GLOBE_FIELD_OF_VIEW / 2 * Math.PI / 180});
  float z = p.z - camera;
  gl_Position = vec4(p.x*focal/aspect, p.y*focal, -1.01005*z - .201005, -z);
  normal = p; uv = texcoord;
}`;
const fragmentSource = `
precision mediump float;
uniform sampler2D earth;
uniform float camera;
varying vec2 uv;
varying vec3 normal;
void main() {
  vec3 n = normalize(normal);
  vec3 base = texture2D(earth, uv).rgb;
  float light = max(dot(n, normalize(vec3(-.45,.65,1.4))),0.0);
  float edge = pow(1.0-max(dot(n,normalize(vec3(0.0,0.0,camera)-n)),0.0),3.0);
  vec3 color = base*(.94 + .06*light);
  color = mix(color,vec3(.91,.96,1.0),edge*.04);
  gl_FragColor = vec4(color,1.0);
}`;

function softwareRenderer(canvas, texture, context = canvas.getContext('2d')) {
  if (!context) throw new Error('Canvas rendering is unavailable.');
  let source = texture.getContext('2d').getImageData(0, 0, texture.width, texture.height);
  let rays = null; let rayKey = ''; let output = null;
  return { mode: 'software', updateTexture(next) { texture = next; source = texture.getContext('2d').getImageData(0, 0, texture.width, texture.height); },
    render(rotation, width, height, zoom) {
      // Software fallback still ray-traces a 3D sphere. Its canvas is capped to
      // keep drag gestures responsive on devices without WebGL acceleration.
      const scale = Math.min(1, 420 / Math.max(width, height));
      const nextWidth = Math.max(1, Math.round(width * scale)); const nextHeight = Math.max(1, Math.round(height * scale));
      if (canvas.width !== nextWidth || canvas.height !== nextHeight) { canvas.width = nextWidth; canvas.height = nextHeight; }
      // Rotation does not change the sphere's silhouette or lighting. Cache its
      // ray intersections, so dragging only rotates the geographic surface.
      const nextKey = `${canvas.width}:${canvas.height}:${zoom}`;
      if (rayKey !== nextKey) {
        rayKey = nextKey; rays = new Float32Array(canvas.width * canvas.height * 4);
        output = context.createImageData(canvas.width, canvas.height);
        const extent = Math.min(canvas.width, canvas.height);
        const focal = 1 / Math.tan(GLOBE_FIELD_OF_VIEW * Math.PI / 360);
        const camera = GLOBE_CAMERA_DISTANCE / zoom;
        for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
          const dx = (2 * (x + .5) - canvas.width) / extent / focal;
          const dy = (canvas.height - 2 * (y + .5)) / extent / focal;
          const a = dx * dx + dy * dy + 1;
          const discriminant = 4 * camera * camera - 4 * a * (camera * camera - 1);
          if (discriminant < 0) continue;
          const distance = (2 * camera - Math.sqrt(discriminant)) / (2 * a);
          const px = distance * dx; const py = distance * dy; const pz = camera - distance;
          const target = (y * canvas.width + x) * 4;
          rays[target] = px; rays[target + 1] = py; rays[target + 2] = pz;
          rays[target + 3] = .94 + .06 * Math.max(0, (-.45 * px + .65 * py + 1.4 * pz) / 1.6078);
        }
      }
      const pitch = rotation.latitude * Math.PI / 180; const yaw = rotation.longitude * Math.PI / 180;
      const cosPitch = Math.cos(pitch); const sinPitch = Math.sin(pitch); const cosYaw = Math.cos(yaw); const sinYaw = Math.sin(yaw);
      for (let target = 0; target < rays.length; target += 4) {
        const px = rays[target]; const py = rays[target + 1]; const pz = rays[target + 2];
        if (!pz) continue;
        const y0 = cosPitch * py + sinPitch * pz; const z0 = -sinPitch * py + cosPitch * pz;
        const x0 = cosYaw * px + sinYaw * z0; const z1 = -sinYaw * px + cosYaw * z0;
        const tx = Math.max(0, Math.min(texture.width - 1, Math.floor((Math.atan2(x0, z1) / (2 * Math.PI) + .5) * texture.width)));
        const ty = Math.max(0, Math.min(texture.height - 1, Math.floor((.5 - Math.asin(Math.max(-1, Math.min(1, y0))) / Math.PI) * texture.height)));
        const input = (ty * texture.width + tx) * 4;
        for (let channel = 0; channel < 3; channel++) output.data[target + channel] = source.data[input + channel] * rays[target + 3];
        output.data[target + 3] = 255;
      }
      context.putImageData(output, 0, 0);
    }, dispose() {} };
}

function webglRenderer(canvas, texture) {
  const gl = canvas.getContext('webgl', { alpha: true, antialias: true, depth: true, powerPreference: 'low-power', preserveDrawingBuffer: true });
  if (!gl) return null;
  const shaders = []; const buffers = [];
  let program; let image;
  const dispose = () => { buffers.forEach(buffer => gl.deleteBuffer(buffer)); shaders.forEach(shader => gl.deleteShader(shader)); if (image) gl.deleteTexture(image); if (program) gl.deleteProgram(program); };
  try {
  const compile = (type, source) => {
    const shader = gl.createShader(type); shaders.push(shader); gl.shaderSource(shader, source); gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error('Globe shader could not initialize.');
    return shader;
  };
  program = gl.createProgram();
  gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexSource)); gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentSource)); gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Globe renderer could not initialize.');
  gl.useProgram(program);
  const mesh = buildGlobeMesh();
  const bindAttribute = (name, data, size) => {
    const buffer = gl.createBuffer(); buffers.push(buffer); gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    const attribute = gl.getAttribLocation(program, name); gl.enableVertexAttribArray(attribute); gl.vertexAttribPointer(attribute, size, gl.FLOAT, false, 0, 0);
  };
  bindAttribute('position', mesh.positions, 3); bindAttribute('texcoord', mesh.coordinates, 2);
  const index = gl.createBuffer(); buffers.push(index); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);
  image = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, image);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const uploadTexture = next => {
    gl.bindTexture(gl.TEXTURE_2D, image);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, next);
    if (gl.getError() !== gl.NO_ERROR) throw new Error('Earth texture could not initialize.');
  };
  uploadTexture(texture);
  const uniforms = { rotation: gl.getUniformLocation(program, 'rotation'), camera: gl.getUniformLocation(program, 'camera'), aspect: gl.getUniformLocation(program, 'aspect') };
  gl.uniform1i(gl.getUniformLocation(program, 'earth'), 0); gl.enable(gl.DEPTH_TEST);
  return { mode: 'webgl', updateTexture: uploadTexture,
    render(rotation, width, height, zoom) {
      if (gl.isContextLost()) throw new Error('Globe acceleration was interrupted.');
      const dpr = Math.min(globalThis.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.round(width * dpr)); const h = Math.max(1, Math.round(height * dpr));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      gl.viewport(0, 0, w, h); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.uniform2f(uniforms.rotation, rotation.longitude * Math.PI / 180, rotation.latitude * Math.PI / 180);
      gl.uniform1f(uniforms.camera, GLOBE_CAMERA_DISTANCE / zoom); gl.uniform1f(uniforms.aspect, width / height);
      gl.drawElements(gl.TRIANGLES, mesh.indices.length, gl.UNSIGNED_SHORT, 0);
      if (gl.getError() !== gl.NO_ERROR) throw new Error('Globe acceleration could not draw.');
    }, dispose };
  } catch (error) { dispose(); throw error; }
}

/** The visible canvas stays 2D so GPU failure can never lock out the sphere fallback. */
export function createLiveGlobeRenderer(canvas, texture) {
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas rendering is unavailable.');
  const acceleratedCanvas = (canvas.ownerDocument || document).createElement('canvas');
  let currentTexture = texture; let accelerator = null; let software = null; let lastFrame = null; let disposed = false;
  let accelerationError = '';
  const fallback = error => {
    if (error) accelerationError = error.message || 'Globe acceleration is unavailable.';
    accelerator?.dispose(); accelerator = null;
    if (!software) software = softwareRenderer(canvas, currentTexture, context);
    return software;
  };
  try { accelerator = webglRenderer(acceleratedCanvas, texture); }
  catch (error) { fallback(error); }
  if (!accelerator) fallback();
  const renderer = {
    get mode() { return accelerator ? 'webgl' : 'software'; },
    get accelerationError() { return accelerationError; },
    updateTexture(next) {
      currentTexture = next;
      if (accelerator) {
        try { accelerator.updateTexture(next); }
        catch (error) { fallback(error); }
      } else software.updateTexture(next);
    },
    render(rotation, width, height, zoom = 1) {
      if (disposed || !(width > 0 && height > 0)) return;
      lastFrame = [rotation, width, height, zoom];
      if (accelerator) {
        try {
          accelerator.render(rotation, width, height, zoom);
          if (canvas.width !== acceleratedCanvas.width || canvas.height !== acceleratedCanvas.height) { canvas.width = acceleratedCanvas.width; canvas.height = acceleratedCanvas.height; }
          context.clearRect(0, 0, canvas.width, canvas.height);
          context.drawImage(acceleratedCanvas, 0, 0);
          return;
        } catch (error) { fallback(error); }
      }
      software.render(rotation, width, height, zoom);
    },
    dispose() {
      disposed = true;
      acceleratedCanvas.removeEventListener('webglcontextlost', lost);
      accelerator?.dispose(); software?.dispose(); accelerator = null;
    }
  };
  const lost = event => {
    event.preventDefault();
    if (disposed) return;
    fallback(new Error('Globe acceleration was interrupted.'));
    if (lastFrame) renderer.render(...lastFrame);
  };
  acceleratedCanvas.addEventListener('webglcontextlost', lost);
  return renderer;
}
