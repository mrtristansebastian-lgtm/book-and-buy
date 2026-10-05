import { buildGlobeMesh, GLOBE_CAMERA_DISTANCE, GLOBE_FIELD_OF_VIEW, globePointFromScreen, geographicPoint, rotateGlobePoint } from './liveGlobeGeometry';

/** Country silhouettes form the local Earth texture. No online image/map service. */
export function createGlobeTexture(countries, marketCodes = [], trafficCodes = [], worldwide = false) {
  const texture = document.createElement('canvas');
  texture.width = 2048; texture.height = 1024;
  const context = texture.getContext('2d');
  const markets = new Set(marketCodes); const traffic = new Set(trafficCodes);
  context.fillStyle = '#e4eaf1'; context.fillRect(0, 0, texture.width, texture.height);
  for (const country of countries) {
    context.fillStyle = traffic.has(country.iso2) ? '#d1a76b' : worldwide || markets.has(country.iso2) ? '#c9d5cf' : '#f8f9f7';
    context.strokeStyle = 'rgba(111,126,133,.42)'; context.lineWidth = .65;
    context.beginPath();
    for (const rings of country.polygons) for (const ring of rings) {
      ring.forEach(([longitude, latitude], index) => {
        const x = (longitude + 180) / 360 * texture.width;
        const y = (90 - latitude) / 180 * texture.height;
        if (index) context.lineTo(x, y); else context.moveTo(x, y);
      });
      context.closePath();
    }
    context.fill('evenodd'); context.stroke();
  }
  return texture;
}

const vertexSource = `
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
  vec3 color = base*(.70 + .30*light);
  color = mix(color,vec3(.58,.70,.81),edge*.18);
  gl_FragColor = vec4(color,1.0);
}`;

function softwareRenderer(canvas, texture) {
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas rendering is unavailable.');
  let source = texture.getContext('2d').getImageData(0, 0, texture.width, texture.height);
  return { mode: 'software', updateTexture(next) { texture = next; source = texture.getContext('2d').getImageData(0, 0, texture.width, texture.height); },
    render(rotation, width, height, zoom) {
      // Software fallback still ray-traces a 3D sphere. Its canvas is capped to
      // keep drag gestures responsive on devices without WebGL acceleration.
      const scale = Math.min(1, 420 / Math.max(width, height));
      canvas.width = Math.max(1, Math.round(width * scale)); canvas.height = Math.max(1, Math.round(height * scale));
      const output = context.createImageData(canvas.width, canvas.height);
      for (let y = 0; y < canvas.height; y += 1) for (let x = 0; x < canvas.width; x += 1) {
        const location = globePointFromScreen(x + .5, y + .5, rotation, canvas.width, canvas.height, zoom);
        if (!location) continue;
        const tx = Math.min(texture.width - 1, Math.floor((location.longitude + 180) / 360 * texture.width));
        const ty = Math.min(texture.height - 1, Math.floor((90 - location.latitude) / 180 * texture.height));
        const input = (ty * texture.width + tx) * 4; const target = (y * canvas.width + x) * 4;
        const point = rotateGlobePoint(geographicPoint(location.longitude, location.latitude), rotation);
        const light = Math.max(0, (-.45 * point.x + .65 * point.y + 1.4 * point.z) / 1.6078);
        for (let channel = 0; channel < 3; channel += 1) output.data[target + channel] = source.data[input + channel] * (.7 + .3 * light);
        output.data[target + 3] = 255;
      }
      context.putImageData(output, 0, 0);
    }, dispose() {} };
}

export function createLiveGlobeRenderer(canvas, texture) {
  const gl = canvas.getContext('webgl', { alpha: true, antialias: true, depth: true, powerPreference: 'low-power', preserveDrawingBuffer: true });
  if (!gl) return softwareRenderer(canvas, texture);
  const shaders = []; const buffers = [];
  const compile = (type, source) => {
    const shader = gl.createShader(type); shaders.push(shader); gl.shaderSource(shader, source); gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error('Globe shader could not initialize.');
    return shader;
  };
  const program = gl.createProgram();
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
  const image = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, image);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture);
  const uniforms = { rotation: gl.getUniformLocation(program, 'rotation'), camera: gl.getUniformLocation(program, 'camera'), aspect: gl.getUniformLocation(program, 'aspect') };
  gl.uniform1i(gl.getUniformLocation(program, 'earth'), 0); gl.enable(gl.DEPTH_TEST);
  return { mode: 'webgl', updateTexture(next) { gl.bindTexture(gl.TEXTURE_2D, image); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, next); },
    render(rotation, width, height, zoom) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.round(width * dpr)); const h = Math.max(1, Math.round(height * dpr));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      gl.viewport(0, 0, w, h); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.uniform2f(uniforms.rotation, rotation.longitude * Math.PI / 180, rotation.latitude * Math.PI / 180);
      gl.uniform1f(uniforms.camera, GLOBE_CAMERA_DISTANCE / zoom); gl.uniform1f(uniforms.aspect, width / height);
      gl.drawElements(gl.TRIANGLES, mesh.indices.length, gl.UNSIGNED_SHORT, 0);
    }, dispose() { buffers.forEach(buffer => gl.deleteBuffer(buffer)); shaders.forEach(shader => gl.deleteShader(shader)); gl.deleteTexture(image); gl.deleteProgram(program); } };
}
