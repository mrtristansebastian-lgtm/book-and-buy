import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const agents = {
  ask: {
    name: 'Buy', color: '#1E6BFF', accent: '#70A3FF', role: 'Products & commerce', icon: 'package',
    features: [
    ]
  },
  plan: {
    name: 'Book', color: '#12D97A', accent: '#6EE8AD', role: 'Bookings & services', icon: 'calendar',
    features: [
    ]
  },
  research: {
    name: 'Messages', color: '#8B3FFF', accent: '#B982FF', role: 'Your customer conversations', icon: 'message',
    features: [
    ]
  },
  manage: {
    name: 'Analytics', color: '#FFC400', accent: '#FFE16A', role: 'Live business analytics', icon: 'chart',
    features: [
    ]
  },
  execute: {
    name: 'Office', color: '#FF6A1A', accent: '#FFA16B', role: 'Business administration', icon: 'briefcase',
    features: [
    ]
  },
  ebusiness: {
    name: 'E-Business', color: '#15181D', accent: '#F4F7FA', role: 'Your E-Business platform', icon: 'globe',
    features: [
    ]
  }
};

const state = {
  selected: new Set(),
  busy: false,
  currentAgent: null,
  interactingAgent: null
};

const $ = s => document.querySelector(s);
const sceneLabels = $('#sceneLabels');
const sceneLoader = $('#sceneLoader');
const sceneError = $('#sceneError');
const agentDialog = $('#agentDialog');
const dialogBackdrop = $('#dialogBackdrop');
const dialogCategory = $('#dialogCategory');
const dialogRole = $('#dialogRole');
const dialogQuestion = $('#dialogQuestion');
const dialogOptions = $('#dialogOptions');
const dialogIcon = $('#dialogIcon');
const dialogClose = $('#dialogClose');
const homeHint = $('#homeHint');
const toast = $('#toast');
if (sceneLabels) sceneLabels.dataset.disabled = 'true';
let configured = false;
let returnFocus = null;
let reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const featureIcons = {
  products: 'package', orders: 'clipboard', stock: 'boxes', services: 'briefcase',
  requests: 'inbox', staff: 'calendar', availability: 'calendarClock',
  communications: 'message', 'business-overview': 'chart', 'live-stats': 'radio',
  analytics: 'chart', 'finance-reports': 'card', finance: 'card', clients: 'users',
  settings: 'gear', website: 'globe', 'website-book': 'book', 'website-buy': 'bag',
  'website-checkout': 'cart'
};
function postToParent(message) {
  if (window.parent !== window) window.parent.postMessage(message, location.origin);
}
function normaliseBadge(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : 0;
}
function renderFeatures(agent) {
  dialogOptions.replaceChildren();
  for (const [index, feature] of agent.features.entries()) {
    const button = document.createElement('button');
    button.className = 'feature-choice';
    button.type = 'button';
    button.dataset.feature = feature.id;
    button.style.setProperty('--delay', `${index * 45}ms`);
    const icon = document.createElement('span');
    icon.className = 'feature-choice-icon';
    icon.innerHTML = iconSVG(featureIcons[feature.id] || agent.icon);
    const label = document.createElement('span');
    label.className = 'feature-choice-label';
    label.textContent = feature.label;
    if (feature.badge > 0) {
      const badge = document.createElement('span');
      badge.className = 'feature-choice-badge';
      badge.textContent = feature.badge > 99 ? '99+' : String(feature.badge);
      badge.setAttribute('aria-label', `${feature.badge} awaiting your attention`);
      label.appendChild(badge);
    }
    const arrow = document.createElement('span');
    arrow.className = 'feature-arrow';
    arrow.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>';
    button.append(icon, label, arrow);
    button.addEventListener('click', () => {
      if (!agent.features.some(item => item.id === feature.id)) return;
      postToParent({ type: 'bookbuy:hq-navigate', tab: feature.id });
    });
    dialogOptions.appendChild(button);
  }
}
function applyConfiguration(message) {
  if (!Array.isArray(message.departments)) return;
  for (const department of message.departments) {
    const agent = Object.hasOwn(agents, department?.id) ? agents[department.id] : null;
    if (!agent || typeof department.name !== 'string' || typeof department.role !== 'string' || !Array.isArray(department.features)) continue;
    agent.name = department.name.slice(0, 80);
    agent.role = department.role.slice(0, 160);
    agent.badge = normaliseBadge(department.badge);
    agent.features = department.features.filter(feature => typeof feature?.id === 'string' && typeof feature?.label === 'string').map(feature => ({
      id: feature.id.slice(0, 80), label: feature.label.slice(0, 100), badge: normaliseBadge(feature.badge)
    }));
  }
  configured = true;
  reducedMotion = Boolean(message.reducedMotion);
  document.documentElement.classList.toggle('reduced-motion', reducedMotion);
  sceneApi.updateConfiguration();
  if (state.interactingAgent) {
    const agent = agents[state.interactingAgent];
    const focusedFeature = document.activeElement?.dataset?.feature;
    dialogCategory.textContent = agent.name;
    dialogRole.textContent = agent.role;
    renderFeatures(agent);
    const button = [...dialogOptions.querySelectorAll('button')].find(item => item.dataset.feature === focusedFeature);
    if (button) button.focus({ preventScroll: true });
  }
}

function iconSVG(type) {
  const common = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
  const paths = {
    package: '<path d="M21 8l-9 5-9-5 9-5 9 5Z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>',
    clipboard: '<rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 4.5V3h6v1.5"/><path d="M9 9h6M9 13h6M9 17h4"/>',
    boxes: '<path d="m12 2 4 2.3v4.6L12 11 8 8.9V4.3L12 2Z"/><path d="m5 11 4 2.3v4.6L5 20l-4-2.1v-4.6L5 11ZM19 11l4 2.3v4.6L19 20l-4-2.1v-4.6L19 11Z"/>',
    briefcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V4h8v3M3 12h18M10 12v2h4v-2"/>',
    inbox: '<path d="M4 4h16l2 10v5H2v-5L4 4Z"/><path d="M2 14h6l2 3h4l2-3h6"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01"/>',
    calendarClock: '<rect x="3" y="5" width="16" height="16" rx="2"/><path d="M7 3v4M15 3v4M3 10h16"/><circle cx="18" cy="17" r="4"/><path d="M18 15v2l1.5 1"/>',
    share: '<circle cx="5" cy="12" r="2.5"/><circle cx="18" cy="5" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m7.2 10.8 8.6-4.6M7.2 13.2l8.6 4.6"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/>',
    message: '<path d="M4 4h16v12H8l-4 4V4Z"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20V7"/>',
    radio: '<circle cx="12" cy="12" r="2"/><path d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4M4.2 4.2a11 11 0 0 0 0 15.6M19.8 4.2a11 11 0 0 1 0 15.6"/>',
    card: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21h-4v-.1A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3v-4h.1A1.7 1.7 0 0 0 4.6 8.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3h4v.1A1.7 1.7 0 0 0 15.4 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.2.37.6.75 1 .9.34.14.7.2 1.1.2H21v4h-.1c-.4 0-.76.06-1.1.2-.4.15-.8.53-1  .9Z"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.4 2.5 3.6 5.5 3.6 9S14.4 18.5 12 21M12 3C9.6 5.5 8.4 8.5 8.4 12S9.6 18.5 12 21"/>',
    book: '<path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H12v18H7.5A3.5 3.5 0 0 0 4 23V5.5ZM20 5.5A3.5 3.5 0 0 0 16.5 2H12v18h4.5A3.5 3.5 0 0 1 20 23V5.5Z"/>',
    bag: '<path d="M5 8h14l1 13H4L5 8Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/>',
    cart: '<path d="M3 4h2l2.5 11h9.7l2.1-7H6"/><circle cx="9" cy="20" r="1.2"/><circle cx="17" cy="20" r="1.2"/>'
  };
  return `<svg ${common}>${paths[type] || paths.globe}</svg>`;
}

function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.remove('hidden');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.add('hidden'), 1400);
}

function openAgentInteraction(id) {
  const agent = Object.hasOwn(agents, id) ? agents[id] : null;
  if (!configured || !agent || !agentDialog || !agent.features.length) return;

  // If the same Buddy is already open, do nothing. If another Buddy is open,
  // switch cleanly without flashing the old dialog back on screen.
  clearTimeout(openAgentInteraction.revealTimer);
  const previous = state.interactingAgent;
  if (previous === id) return;
  if (!previous) returnFocus = document.activeElement;
  postToParent({ type: 'bookbuy:hq-opened', id });

  state.interactingAgent = id;
  state.selected.clear();
  state.selected.add(id);
  document.body.classList.add('agent-interacting');
  homeHint?.classList.add('faded');

  agentDialog.classList.remove('visible');
  agentDialog.classList.add('hidden');
  dialogBackdrop.classList.remove('visible');
  dialogBackdrop.classList.remove('hidden');

  agentDialog.style.setProperty('--agent-color', agent.color);
  agentDialog.style.setProperty('--agent-accent', agent.accent || agent.color);
  dialogCategory.textContent = agent.name;
  dialogRole.textContent = agent.role;
  dialogQuestion.textContent = 'What would you like to work on?';
  dialogIcon.innerHTML = iconSVG(agent.icon);
  renderFeatures(agent);

  // Activation and camera movement happen first. The question appears only once
  // the Buddy has visibly powered up and the camera is nearly settled.
  sceneApi.beginInteraction(id, previous);
  sceneApi.focusInteraction(id);
  requestAnimationFrame(() => dialogBackdrop.classList.add('visible'));

  openAgentInteraction.revealTimer = setTimeout(() => {
    if (state.interactingAgent !== id) return;
    agentDialog.classList.remove('hidden');
    requestAnimationFrame(() => {
      agentDialog.classList.add('visible');
      dialogClose.focus({ preventScroll: true });
    });
  }, reducedMotion ? 0 : 880);
}

function closeAgentInteraction() {
  const id = state.interactingAgent;
  if (!id) return;
  clearTimeout(openAgentInteraction.revealTimer);

  state.interactingAgent = null;
  state.selected.clear();
  agentDialog?.classList.remove('visible');
  dialogBackdrop?.classList.remove('visible');
  document.body.classList.remove('agent-interacting');
  homeHint?.classList.remove('faded');
  postToParent({ type: 'bookbuy:hq-closed' });
  if (returnFocus?.isConnected && returnFocus !== document.body) returnFocus.focus({ preventScroll: true });
  returnFocus = null;

  // Reverse the exact activation choreography while the camera eases home.
  sceneApi.endInteraction(id);
  sceneApi.resetCamera();

  setTimeout(() => {
    if (!state.interactingAgent) {
      agentDialog?.classList.add('hidden');
      dialogBackdrop?.classList.add('hidden');
    }
  }, reducedMotion ? 0 : 300);
}

// -----------------------------------------------------------------------------
// REAL 3D OFFICE
// -----------------------------------------------------------------------------
const sceneApi = (() => {
  const container = $('#threeScene');
  let renderer, scene, camera, clock, resizeObserver;
  let failed = false;
  let animationFrame = 0;
  let loaded = false;
  let pointer = new THREE.Vector2(0, 0);
  let rayPointer = new THREE.Vector2();
  let raycaster = new THREE.Raycaster();
  let pointerDirty = false;
  let pointerRect = { left: 0, top: 0, width: 1, height: 1 };
  let lastFrameMs = 0;
  let lastShadowMs = 0;
  let activityUntil = 0;
  let sceneVisible = !document.hidden;
  let sceneActive = true;
  let currentPixelRatio = 1;
  let slowFrameScore = 0;
  let hoveredAgent = null;
  let focusedAgent = null;
  let workingAgent = null;
  let focusHold = 0;
  const runtimes = new Map();
  const workstations = new Map();
  const hitMeshes = [];
  const meetingCenter = new THREE.Vector3(.25, 0, 1.9);
  const meetingSpots = new Map();
  let meetingMode = false;
  let smartTableScreenMat = null;
  const smartTableEdgeMats = [];
  let oceanMaterial = null;
  let coastalRoot = null;
  const defaultCameraPos = new THREE.Vector3(-5.9, 7.55, 13.55);
  const homeCameraPos = defaultCameraPos.clone();
  const defaultLook = new THREE.Vector3(0.55, 1.15, -1.05);
  const homeLook = defaultLook.clone();
  const cameraDesired = defaultCameraPos.clone();
  const lookDesired = new THREE.Vector3(0.55, 1.15, -1.05);
  const lookCurrent = lookDesired.clone();
  const tmpVec = new THREE.Vector3();
  const labels = new Map();
  const deviceMemory = Number(navigator.deviceMemory || 8);
  const cpuCores = Number(navigator.hardwareConcurrency || 8);
  const constrainedDevice = deviceMemory <= 4 || cpuCores <= 4;
  const performanceProfile = {
    pixelRatioCap: constrainedDevice ? 1.35 : 1.65,
    idleFps: constrainedDevice ? 28 : 36,
    activeFps: 60,
    shadowFps: constrainedDevice ? 18 : 30
  };
  const buddyPositions = {
    research: new THREE.Vector3(-4.55, 0.06, -2.1),
    manage: new THREE.Vector3(-1.45, 0.06, -2.45),
    execute: new THREE.Vector3(2.25, 0.06, -2.45),
    ask: new THREE.Vector3(-3.75, 0.06, 2.15),
    ebusiness: new THREE.Vector3(.12, 0.06, 2.10),
    plan: new THREE.Vector3(3.65, 0.06, 1.9)
  };

  function markActivity(ms = 1200) {
    activityUntil = Math.max(activityUntil, performance.now() + ms);
  }

  function setSceneActive(active) {
    sceneActive = !!active;
    if (sceneActive) {
      lastFrameMs = performance.now();
      clock?.getDelta();
      markActivity(900);
      if (renderer) renderer.shadowMap.needsUpdate = true;
    }
  }

  function damp(lambda, dt) {
    if (reducedMotion) return 1;
    return 1 - Math.exp(-lambda * dt);
  }

  function failScene(error) {
    if (failed) return;
    failed = true;
    sceneActive = false;
    cancelAnimationFrame(animationFrame);
    resizeObserver?.disconnect();
    sceneLoader?.classList.add('hidden');
    sceneError?.classList.remove('hidden');
    postToParent({ type: 'bookbuy:hq-status', status: 'error' });
    console.error('Headquarters could not start', error);
  }

  function init() {
    try {
      scene = new THREE.Scene();
      scene.background = new THREE.Color('#f6f5f1');
      scene.fog = null;

      camera = new THREE.PerspectiveCamera(28, 1, 0.1, 80);
      camera.position.copy(defaultCameraPos);
      camera.lookAt(lookCurrent);

      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
        precision: 'highp'
      });
      currentPixelRatio = Math.min(window.devicePixelRatio || 1, performanceProfile.pixelRatioCap);
      renderer.setPixelRatio(currentPixelRatio);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.shadowMap.autoUpdate = false;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.1;
      renderer.sortObjects = true;
      container.appendChild(renderer.domElement);
      renderer.domElement.setAttribute('aria-hidden', 'true');
      renderer.domElement.addEventListener('webglcontextlost', event => {
        event.preventDefault();
        failScene(new Error('The graphics context was lost.'));
      });

      clock = new THREE.Clock();
      bindPointer();
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(container);
      document.addEventListener('visibilitychange', () => {
        sceneVisible = !document.hidden;
        if (sceneVisible && !failed) {
          clock.getDelta();
          markActivity(700);
          if (renderer) renderer.shadowMap.needsUpdate = true;
          if (!animationFrame) animationFrame = requestAnimationFrame(animate);
        } else {
          cancelAnimationFrame(animationFrame);
          animationFrame = 0;
        }
      });
      resize();

      // Let the loader/UI paint first. Heavy scene construction starts on the next
      // browser frame so cold starts feel instant even on integrated graphics.
      requestAnimationFrame(() => {
        try {
          if (failed) return;
          addLighting();
          buildOffice();
          renderer.shadowMap.needsUpdate = true;
          loadBuddies();
          markActivity(1800);
          animate();
        } catch (error) { failScene(error); }
      });
    } catch (err) {
      failScene(err);
    }
  }

  function addLighting() {
    const hemi = new THREE.HemisphereLight(0xffffff, 0xd8d0c2, 2.7);
    scene.add(hemi);

    const key = new THREE.DirectionalLight(0xffffff, 4.45);
    key.position.set(4.8, 11.5, 7.6);
    key.castShadow = true;
    const shadowSize = constrainedDevice ? 1024 : 2048;
    key.shadow.mapSize.set(shadowSize, shadowSize);
    key.shadow.camera.left = -9;
    key.shadow.camera.right = 9;
    key.shadow.camera.top = 8;
    key.shadow.camera.bottom = -8;
    key.shadow.camera.near = 0.5;
    key.shadow.camera.far = 30;
    key.shadow.bias = -0.00015;
    scene.add(key);

    const fill = new THREE.DirectionalLight(0xfff4e6, 1.5);
    fill.position.set(-6.2, 6.4, 4.2);
    scene.add(fill);

    const windowLight = new THREE.DirectionalLight(0xe6f4ff, 2.0);
    windowLight.position.set(10.5, 7.8, -1.2);
    scene.add(windowLight);
  }

  function mat(color, roughness = .45, metalness = 0) {
    return new THREE.MeshStandardMaterial({ color, roughness, metalness });
  }

  let softGlowTexture = null;
  function getSoftGlowTexture() {
    if (softGlowTexture) return softGlowTexture;
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(64, 64, 4, 64, 64, 62);
    grad.addColorStop(0, 'rgba(255,255,255,.92)');
    grad.addColorStop(.32, 'rgba(255,255,255,.42)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    softGlowTexture = new THREE.CanvasTexture(c);
    return softGlowTexture;
  }

  function box(name, size, pos, material, cast = true, receive = true) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
    mesh.name = name;
    mesh.position.set(...pos);
    mesh.castShadow = cast;
    mesh.receiveShadow = receive;
    scene.add(mesh);
    return mesh;
  }

  function buildOffice() {
    const floorTex = makeWoodTexture();
    floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
    floorTex.repeat.set(1.02, .92);
    floorTex.colorSpace = THREE.SRGBColorSpace;

    const floorShape = new THREE.Shape();
    floorShape.moveTo(-7.05, -5.38);
    floorShape.lineTo(7.0, -5.38);
    floorShape.lineTo(7.0, 4.82);
    floorShape.lineTo(3.55, 4.82);
    floorShape.lineTo(1.85, 5.92);
    floorShape.lineTo(-5.95, 5.92);
    floorShape.lineTo(-7.05, 4.82);
    floorShape.lineTo(-7.05, -5.38);

    const floorMat = new THREE.MeshPhysicalMaterial({ map: floorTex, color: '#ffffff', roughness: .31, metalness: 0, clearcoat: .26, clearcoatRoughness: .24, reflectivity: .34 });
    const floor = new THREE.Mesh(new THREE.ShapeGeometry(floorShape), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // The plinth sits fully below the visible floor. Keeping its top surface away
    // from y=0 prevents coplanar depth fighting (the old flashing floor bug).
    const floorBorder = new THREE.Mesh(
      new THREE.ExtrudeGeometry(floorShape, { depth: .14, bevelEnabled: false }),
      mat('#cfd1d3', .46)
    );
    floorBorder.rotation.x = -Math.PI / 2;
    floorBorder.position.y = -.20;
    floorBorder.receiveShadow = false;
    scene.add(floorBorder);

    const wallMat = mat('#f5f3ef', .84);
    box('left-wall', [.18, 4.9, 10.9], [-7.12, 2.45, -.28], wallMat, false, true);

    // The old command wall is now a full-height glazed coastal facade.
    // Slim beams preserve the room structure without blocking the view.
    box('back-top-beam', [14.2, .16, .18], [-.02, 4.74, -5.43], mat('#f7f6f2', .54), false, true);
    box('back-floor-track', [14.2, .09, .18], [-.02, .06, -5.43], mat('#d8d9db', .4, .08), false, true);
    box('left-baseboard', [.07, .13, 10.55], [-6.98, .075, -.20], mat('#ddd9d2', .58), false, true);
    const coveMat = new THREE.MeshBasicMaterial({ color: '#fff7e9', transparent: true, opacity: .68, toneMapped: false });
    box('left-cove-light', [.025, .035, 7.7], [-6.93, 4.48, -.45], coveMat, false, false);

    // The exterior is now a real layered 3D coastal scene rather than a flat card.
    // Glass uses a very cheap view-angle shader for believable reflections without
    // expensive transmission/refraction passes.
    const glassMat = makeArchitecturalGlassMaterial();
    createCoastalEnvironment();

    for (let z = -4.4; z <= 3.6; z += 2) {
      const pane = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 4.25), glassMat);
      pane.position.set(7.02, 2.2, z);
      pane.rotation.y = -Math.PI / 2;
      pane.renderOrder = 6;
      scene.add(pane);
    }

    const frameMat = mat('#737b84', .28, .28);
    for (let z = -5.35; z <= 4.7; z += 2) box('window-frame', [.065, 4.55, .055], [7.01, 2.3, z], frameMat, false, false);
    box('window-top', [.065, .085, 10.3], [7.01, 4.55, -.2], frameMat, false, false);
    box('window-bottom', [.065, .085, 10.3], [7.01, .07, -.2], frameMat, false, false);

    // Close the rear-right glazing junction so no exterior blue peeks through at the corner.
    box('window-corner-post', [.19, 4.6, .19], [6.93, 2.3, -5.34], mat('#f5f3ef', .58), false, true);
    box('window-corner-cap-x', [.34, .11, .18], [6.88, .08, -5.34], mat('#d9dbdd', .42, .12), false, true);
    box('window-corner-cap-z', [.18, .11, .34], [6.93, .08, -5.28], mat('#d9dbdd', .42, .12), false, true);

    // Continuous interior marble thresholds hide any exterior/ocean geometry at
    // the floor-to-glass junction and give the glazing a finished architectural base.
    const sillMat = new THREE.MeshPhysicalMaterial({
      color: '#f4f4f2', roughness: .30, metalness: 0,
      clearcoat: .24, clearcoatRoughness: .22
    });
    const backSill = new THREE.Mesh(new THREE.BoxGeometry(13.72, .055, .42), sillMat);
    backSill.position.set(-.02, .035, -5.16);
    backSill.receiveShadow = true;
    scene.add(backSill);

    const sideSill = new THREE.Mesh(new THREE.BoxGeometry(.42, .055, 10.28), sillMat.clone());
    sideSill.position.set(6.79, .035, -.20);
    sideSill.receiveShadow = true;
    scene.add(sideSill);

    const cornerSill = new THREE.Mesh(new THREE.BoxGeometry(.52, .06, .52), sillMat.clone());
    cornerSill.position.set(6.77, .038, -5.14);
    cornerSill.receiveShadow = true;
    scene.add(cornerSill);

    createBackGlassWall(glassMat, frameMat);

    createDesk(-4.35, -3.35, 2.12, 1.12, 'research');
    createDesk(-1.35, -3.55, 2.16, 1.12, 'manage');
    createDesk(2.35, -3.55, 2.16, 1.12, 'execute');
    createDesk(-3.7, 1.15, 2.30, 1.14, 'ask');
    createDesk(.12, 1.08, 2.34, 1.14, 'ebusiness');
    createDesk(3.75, .95, 2.30, 1.14, 'plan');
    createCurtains();
    createPlant(-5.95, 0, 3.42, .72, 'snake');
    createPlant(6.02, 0, -4.18, .86, 'bird');
    createPlant(6.02, 0, 4.05, .78, 'olive');
    createPlant(-6.08, 0, -4.45, .64, 'snake');

    // Everything built so far is static architecture/furniture. Freeze its local
    // transforms so Three.js does less CPU work every frame; visual quality is unchanged.
    scene.traverse(obj => {
      if (obj === scene || obj.isLight || obj.isCamera || obj.userData.dynamic) return;
      obj.updateMatrix();
      obj.matrixAutoUpdate = false;
    });
  }

  function makeWoodTexture() {
    const c = document.createElement('canvas');
    c.width = c.height = 2048;
    const g = c.getContext('2d');

    const base = g.createLinearGradient(0, 0, c.width, c.height);
    base.addColorStop(0, '#f8f8f6');
    base.addColorStop(.48, '#eceeed');
    base.addColorStop(1, '#f9f9f7');
    g.fillStyle = base;
    g.fillRect(0, 0, c.width, c.height);

    for (let i = 0; i < 190; i++) {
      const x = (i * 193 + 71) % c.width;
      const y = (i * 317 + 113) % c.height;
      const radius = 90 + (i % 7) * 34;
      const grad = g.createRadialGradient(x, y, 0, x, y, radius);
      const dark = i % 3 === 0;
      grad.addColorStop(0, dark ? 'rgba(104,110,116,.03)' : 'rgba(255,255,255,.18)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grad;
      g.beginPath(); g.arc(x, y, radius, 0, Math.PI * 2); g.fill();
    }

    function vein(seed, yBase, amp, width, alpha, branches = 4) {
      const pts = [];
      for (let i = 0; i <= 28; i++) {
        const t = i / 28;
        const x = -220 + t * 2500;
        const y = yBase + Math.sin(t * 7.1 + seed) * amp + Math.sin(t * 18.8 + seed * 1.7) * amp * .22;
        pts.push([x, y]);
      }
      g.save();
      g.lineCap = 'round'; g.lineJoin = 'round';
      g.strokeStyle = `rgba(91,98,105,${alpha})`;
      g.lineWidth = width;
      g.beginPath();
      pts.forEach(([x,y],i) => i ? g.lineTo(x,y) : g.moveTo(x,y));
      g.stroke();
      g.strokeStyle = `rgba(161,166,171,${alpha * .55})`;
      g.lineWidth = Math.max(.7, width * .34);
      g.beginPath();
      pts.forEach(([x,y],i) => i ? g.lineTo(x,y + Math.sin(i*.8)*5) : g.moveTo(x,y));
      g.stroke();
      for (let b = 0; b < branches; b++) {
        const idx = 4 + ((b * 5 + Math.floor(seed * 3)) % 19);
        const [sx, sy] = pts[idx];
        const dir = b % 2 ? -1 : 1;
        g.strokeStyle = `rgba(112,119,126,${alpha * .58})`;
        g.lineWidth = Math.max(.6, width * .23);
        g.beginPath(); g.moveTo(sx, sy);
        g.bezierCurveTo(sx + 80, sy + dir * 65, sx + 155, sy + dir * 100, sx + 240, sy + dir * (62 + b * 11));
        g.stroke();
      }
      g.restore();
    }

    g.save();
    g.translate(c.width * .5, c.height * .5);
    g.rotate(-0.31);
    g.translate(-c.width * .5, -c.height * .5);
    vein(1.1, 350, 98, 10, .12, 5);
    vein(2.6, 790, 74, 5.5, .078, 4);
    vein(4.0, 1320, 108, 11, .095, 5);
    vein(5.4, 1715, 62, 4, .055, 3);
    g.restore();

    for (let i = 0; i < 700; i++) {
      const x = (i * 89 + 23) % c.width;
      const y = (i * 157 + 61) % c.height;
      const a = .015 + (i % 5) * .0035;
      g.fillStyle = i % 4 === 0 ? `rgba(88,94,101,${a})` : `rgba(255,255,255,${a * 2.4})`;
      g.beginPath(); g.arc(x, y, .6 + (i % 3) * .35, 0, Math.PI * 2); g.fill();
    }

    const slab = 1024;
    g.strokeStyle = 'rgba(104,110,116,.08)';
    g.lineWidth = 2;
    g.beginPath(); g.moveTo(slab, 0); g.lineTo(slab, c.height); g.stroke();
    g.beginPath(); g.moveTo(0, slab); g.lineTo(c.width, slab); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.32)';
    g.lineWidth = 1;
    g.beginPath(); g.moveTo(slab + 2, 0); g.lineTo(slab + 2, c.height); g.stroke();
    g.beginPath(); g.moveTo(0, slab + 2); g.lineTo(c.width, slab + 2); g.stroke();

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = renderer ? Math.min(8, renderer.capabilities.getMaxAnisotropy()) : 4;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = true;
    return tex;
  }

  function makeSkyTexture3D() {
    const c = document.createElement('canvas');
    c.width = 1536; c.height = 768;
    const g = c.getContext('2d');
    const w = c.width, h = c.height;

    const sky = g.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#70b5d7');
    sky.addColorStop(.28, '#9bcce2');
    sky.addColorStop(.62, '#cfe4eb');
    sky.addColorStop(.82, '#edf0e9');
    sky.addColorStop(1, '#f5e8d2');
    g.fillStyle = sky; g.fillRect(0,0,w,h);

    const sun = g.createRadialGradient(w*.72,h*.28,2,w*.72,h*.28,230);
    sun.addColorStop(0,'rgba(255,251,230,.92)');
    sun.addColorStop(.18,'rgba(255,244,208,.28)');
    sun.addColorStop(.52,'rgba(255,241,218,.09)');
    sun.addColorStop(1,'rgba(255,255,255,0)');
    g.fillStyle=sun; g.fillRect(0,0,w,h);

    g.save();
    g.filter='blur(24px)';
    const clouds=[
      [140,165,170,36,.26],[390,110,230,48,.19],[820,180,260,45,.22],
      [1180,125,230,42,.18],[1440,205,165,34,.20]
    ];
    clouds.forEach(([x,y,rx,ry,a])=>{
      const cg=g.createRadialGradient(x,y,5,x,y,rx);
      cg.addColorStop(0,`rgba(255,255,255,${a})`);
      cg.addColorStop(.58,`rgba(255,255,255,${a*.43})`);
      cg.addColorStop(1,'rgba(255,255,255,0)');
      g.fillStyle=cg; g.beginPath(); g.ellipse(x,y,rx,ry,0,0,Math.PI*2); g.fill();
    });
    g.restore();

    // Fine atmospheric grain prevents a sterile CG gradient.
    for(let i=0;i<520;i++){
      const x=(i*83)%w, y=(i*137)%h;
      g.fillStyle=`rgba(255,255,255,${.006+(i%4)*.003})`;
      g.fillRect(x,y,1,1);
    }

    const tex=new THREE.CanvasTexture(c);
    tex.colorSpace=THREE.SRGBColorSpace;
    tex.minFilter=THREE.LinearFilter;
    tex.magFilter=THREE.LinearFilter;
    tex.generateMipmaps=false;
    return tex;
  }

  function makeSandTexture() {
    const c=document.createElement('canvas');
    c.width=c.height=1024;
    const g=c.getContext('2d');
    const grad=g.createLinearGradient(0,0,0,1024);
    grad.addColorStop(0,'#c3ac82');
    grad.addColorStop(.22,'#d2bc91');
    grad.addColorStop(.58,'#dfc99f');
    grad.addColorStop(1,'#e6d2aa');
    g.fillStyle=grad; g.fillRect(0,0,1024,1024);

    let seed=92653;
    const rnd=()=>{seed=(seed*1664525+1013904223)>>>0; return seed/4294967296;};
    for(let i=0;i<2200;i++){
      const x=rnd()*1024,y=rnd()*1024;
      const a=.014+rnd()*.028;
      g.fillStyle=rnd()>.45?`rgba(255,255,255,${a})`:`rgba(82,62,42,${a*.58})`;
      const s=.6+rnd()*1.6; g.fillRect(x,y,s,s);
    }
    // soft wind streaks
    for(let i=0;i<90;i++){
      const y=14+i*11;
      g.strokeStyle=`rgba(255,255,255,${.012+(i%5)*.004})`;
      g.lineWidth=1; g.beginPath(); g.moveTo(0,y); g.bezierCurveTo(290,y-5,700,y+4,1024,y); g.stroke();
    }
    const tex=new THREE.CanvasTexture(c);
    tex.colorSpace=THREE.SRGBColorSpace;
    tex.wrapS=tex.wrapT=THREE.RepeatWrapping;
    tex.repeat.set(3.5,2.4);
    tex.anisotropy=renderer?Math.min(6,renderer.capabilities.getMaxAnisotropy()):2;
    return tex;
  }

  function makeArchitecturalGlassMaterial() {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      uniforms: {},
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vWorldNormal;
        varying vec3 vViewDir;
        void main(){
          vUv=uv;
          vec4 worldPos=modelMatrix*vec4(position,1.0);
          vWorldNormal=normalize(mat3(modelMatrix)*normal);
          vViewDir=normalize(cameraPosition-worldPos.xyz);
          gl_Position=projectionMatrix*viewMatrix*worldPos;
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        varying vec3 vWorldNormal;
        varying vec3 vViewDir;
        void main(){
          float fresnel=pow(1.0-abs(dot(normalize(vWorldNormal),normalize(vViewDir))),2.15);
          float topGlow=smoothstep(.35,1.0,vUv.y)*.028;
          float band1=exp(-pow((vUv.x+vUv.y*.32-.42)*5.6,2.0))*.075;
          float band2=exp(-pow((vUv.x-vUv.y*.22-.64)*7.2,2.0))*.045;
          float edge=smoothstep(.0,.06,vUv.x)*(1.0-smoothstep(.94,1.0,vUv.x));
          edge*=smoothstep(.0,.05,vUv.y)*(1.0-smoothstep(.95,1.0,vUv.y));
          float alpha=.028+fresnel*.13+topGlow+band1+band2;
          alpha*=mix(.86,1.0,edge);
          vec3 tint=mix(vec3(.78,.91,.97),vec3(1.0),.50+band1*2.0);
          gl_FragColor=vec4(tint,clamp(alpha,.025,.23));
        }
      `
    });
  }

  function backShoreZ(x) {
    return -13.02 + Math.sin(x * .33) * .28 + Math.sin(x * .81 + .7) * .12;
  }

  function sideShoreX(z) {
    return 14.62 + Math.sin(z * .27 + .5) * .25 + Math.sin(z * .75) * .10;
  }

  function buildCoastlinePoints() {
    const points = [];
    const backStart = -28;
    const cornerX = 14.62;
    const backCount = 52;
    for (let i = 0; i <= backCount; i++) {
      const t = i / backCount;
      const x = THREE.MathUtils.lerp(backStart, cornerX, t);
      points.push(new THREE.Vector2(x, backShoreZ(x)));
    }

    // Hand-shaped corner transition prevents the old hard 90-degree water seam.
    const cornerZ = points[points.length - 1].y;
    const corner = [
      [14.78, cornerZ + .18],
      [14.88, cornerZ + .48],
      [14.92, cornerZ + .86]
    ];
    corner.forEach(([x, z]) => points.push(new THREE.Vector2(x, z)));

    const sideStartZ = cornerZ + 1.05;
    const sideEndZ = 28;
    const sideCount = 48;
    for (let i = 0; i <= sideCount; i++) {
      const t = i / sideCount;
      const z = THREE.MathUtils.lerp(sideStartZ, sideEndZ, t);
      points.push(new THREE.Vector2(sideShoreX(z), z));
    }
    return points;
  }

  function shapeFromWorldXZ(points) {
    const shape = new THREE.Shape();
    points.forEach((p, i) => {
      const sx = p.x;
      const sy = -p.y;
      if (i === 0) shape.moveTo(sx, sy); else shape.lineTo(sx, sy);
    });
    shape.closePath();
    const geo = new THREE.ShapeGeometry(shape);
    geo.rotateX(-Math.PI / 2);
    return geo;
  }

  function offsetPolyline(points, amount) {
    return points.map((p, i) => {
      const prev = points[Math.max(0, i - 1)];
      const next = points[Math.min(points.length - 1, i + 1)];
      const dx = next.x - prev.x;
      const dz = next.y - prev.y;
      const len = Math.max(.0001, Math.hypot(dx, dz));
      // The coastline is ordered from back-left toward the right-side horizon.
      // This normal points mostly toward the ocean side of the path.
      const nx = -dz / len;
      const nz = dx / len;
      return new THREE.Vector2(p.x + nx * amount, p.y + nz * amount);
    });
  }

  function createCoastRibbon(points, width, material, y = -.005) {
    const half = width * .5;
    const verts = [];
    const uvs = [];
    const idx = [];
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const prev = points[Math.max(0, i - 1)];
      const next = points[Math.min(points.length - 1, i + 1)];
      const dx = next.x - prev.x;
      const dz = next.y - prev.y;
      const len = Math.max(.0001, Math.hypot(dx, dz));
      const nx = -dz / len;
      const nz = dx / len;
      verts.push(
        p.x + nx * half, y, p.y + nz * half,
        p.x - nx * half, y, p.y - nz * half
      );
      const t = i / Math.max(1, points.length - 1);
      uvs.push(t, 0, t, 1);
      if (i < points.length - 1) {
        const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
        idx.push(a, b, c, b, d, c);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, material);
    mesh.renderOrder = 1;
    coastalRoot.add(mesh);
    return mesh;
  }

  function makeStillOceanMaterial() {
    return new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      uniforms: {},
      vertexShader: `
        varying vec3 vWorld;
        varying vec3 vViewDir;
        void main(){
          vec4 world = modelMatrix * vec4(position, 1.0);
          vWorld = world.xyz;
          vViewDir = normalize(cameraPosition - world.xyz);
          gl_Position = projectionMatrix * viewMatrix * world;
        }
      `,
      fragmentShader: `
        varying vec3 vWorld;
        varying vec3 vViewDir;

        float backZ(float x){
          return -13.02 + sin(x*.33)*.28 + sin(x*.81+.7)*.12;
        }
        float sideX(float z){
          return 14.62 + sin(z*.27+.5)*.25 + sin(z*.75)*.10;
        }

        void main(){
          float dBack = max(0.0, backZ(vWorld.x) - vWorld.z);
          float dSide = max(0.0, vWorld.x - sideX(vWorld.z));
          float d = min(dBack > .001 ? dBack : 999.0, dSide > .001 ? dSide : 999.0);
          if(d > 998.0) d = max(dBack, dSide);
          d = clamp(d, 0.0, 42.0);

          float shallow = exp(-d * .17);
          float shelf = exp(-d * .055);
          vec3 deep = vec3(.035, .255, .355);
          vec3 mid = vec3(.045, .405, .505);
          vec3 aqua = vec3(.22, .64, .66);
          vec3 lagoon = vec3(.38, .73, .69);

          vec3 col = mix(deep, mid, clamp(1.0 - d / 46.0, 0.0, 1.0));
          col = mix(col, aqua, shelf * .48);
          col = mix(col, lagoon, shallow * .62);

          // Static micro-normal pattern: gives glassy depth without moving a vertex.
          float sx = sin(vWorld.x * 1.85 + vWorld.z * .43);
          float sz = sin(vWorld.z * 2.15 - vWorld.x * .31);
          float sx2 = sin((vWorld.x + vWorld.z) * 3.25) * .45;
          vec3 N = normalize(vec3((sx + sx2) * .022, 1.0, sz * .019));
          vec3 V = normalize(vViewDir);
          float fresnel = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 3.2);
          col = mix(col, vec3(.31, .60, .68), fresnel * .34);

          // Fine, stationary surface streaks and small specular glints.
          float rippleA = sin(vWorld.x * 3.6 + vWorld.z * 1.15) * .5 + .5;
          float rippleB = sin(vWorld.z * 5.1 - vWorld.x * .62) * .5 + .5;
          float line = smoothstep(.93, .995, rippleA * .62 + rippleB * .38);
          col += vec3(.25, .34, .34) * line * (.035 + shallow * .035);

          vec3 sunDir = normalize(vec3(-.35, .82, .32));
          vec3 R = reflect(-sunDir, N);
          float spec = pow(max(dot(R, V), 0.0), 72.0);
          col += vec3(1.0, .93, .72) * spec * .34;

          // Slight vertical depth cue toward the horizon.
          float horizon = smoothstep(-42.0, -18.0, vWorld.z);
          col += vec3(.018, .035, .038) * horizon * .3;

          gl_FragColor = vec4(col, 1.0);
        }
      `
    });
  }

  function makePalmLeafGeometry() {
    const segments=9, verts=[], idx=[];
    for(let i=0;i<=segments;i++){
      const t=i/segments;
      const width=Math.sin(Math.PI*t)*.14*(1.0-t*.25);
      const z=t*1.82;
      const y=-.22*t*t+.04*Math.sin(t*Math.PI);
      verts.push(-width,y,z, width,y,z);
      if(i<segments){
        const a=i*2,b=a+1,c=a+2,d=a+3;
        idx.push(a,b,c,b,d,c);
      }
    }
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
    geo.setIndex(idx); geo.computeVertexNormals();
    return geo;
  }

  let palmLeafGeometry=null;
  function createOutdoorPalm(x,z,scale=1,lean=.08) {
    const palm=new THREE.Group(); palm.position.set(x,0,z); palm.scale.setScalar(scale); coastalRoot.add(palm);
    const trunkMat=new THREE.MeshStandardMaterial({color:'#7b6043',roughness:.86,metalness:0});
    const trunkLight=new THREE.MeshStandardMaterial({color:'#9a7a53',roughness:.83,metalness:0});
    const segments=6, segH=.68;
    for(let i=0;i<segments;i++){
      const seg=new THREE.Mesh(new THREE.CylinderGeometry(.055-i*.004,.076-i*.004,segH,9),i%2?trunkLight:trunkMat);
      seg.position.set(Math.sin(i*.52)*lean*i*.22, .34+i*segH*.93, Math.cos(i*.47)*lean*i*.08);
      seg.rotation.z=-lean*.55;
      seg.rotation.x=lean*.12;
      seg.castShadow=true; palm.add(seg);
    }
    const crownY=.34+(segments-1)*segH*.93+segH*.48;
    const crownX=Math.sin((segments-1)*.52)*lean*(segments-1)*.22;
    const leafGeo=palmLeafGeometry||(palmLeafGeometry=makePalmLeafGeometry());
    const greens=['#2f7555','#3e8660','#4b9567','#397b57'];
    for(let i=0;i<11;i++){
      const leaf=new THREE.Mesh(leafGeo,new THREE.MeshStandardMaterial({color:greens[i%greens.length],roughness:.72,side:THREE.DoubleSide}));
      leaf.position.set(crownX,crownY,0);
      leaf.rotation.y=i/11*Math.PI*2+(i%2)*.08;
      leaf.rotation.x=-.12-(i%3)*.07;
      leaf.scale.setScalar(.92+(i%4)*.055);
      leaf.castShadow=true; palm.add(leaf);
    }
    const crown=new THREE.Mesh(new THREE.SphereGeometry(.11,12,8),new THREE.MeshStandardMaterial({color:'#516f46',roughness:.8}));
    crown.position.set(crownX,crownY,0); palm.add(crown);
  }

  function createDuneShrub(x,z,scale=.55) {
    const g=new THREE.Group(); g.position.set(x,.02,z); g.scale.setScalar(scale); coastalRoot.add(g);
    const mat1=new THREE.MeshStandardMaterial({color:'#708b62',roughness:.9});
    const mat2=new THREE.MeshStandardMaterial({color:'#8ba174',roughness:.9});
    for(let i=0;i<9;i++){
      const m=new THREE.Mesh(new THREE.IcosahedronGeometry(.22+(i%3)*.05,1),i%2?mat1:mat2);
      const a=i/9*Math.PI*2, r=.28+(i%3)*.08;
      m.position.set(Math.cos(a)*r,.14+(i%2)*.08,Math.sin(a)*r);
      m.scale.set(1,.65,1.35); m.castShadow=true; g.add(m);
    }
  }

  function createBeachSetup(x, z, scale = 1, rotation = 0, fabricColor = '#f2eee7') {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = rotation;
    g.scale.setScalar(scale);
    coastalRoot.add(g);

    const woodMat = new THREE.MeshStandardMaterial({ color: '#b99469', roughness: .72, metalness: 0 });
    const metalMat = new THREE.MeshStandardMaterial({ color: '#d6d9da', roughness: .36, metalness: .35 });
    const fabricMat = new THREE.MeshStandardMaterial({ color: fabricColor, roughness: .88, metalness: 0, side: THREE.DoubleSide });
    const darkFabric = new THREE.MeshStandardMaterial({ color: '#c9d2d8', roughness: .9, side: THREE.DoubleSide });

    // Umbrella pole and weighted base.
    const base = new THREE.Mesh(new THREE.CylinderGeometry(.16, .2, .07, 24), metalMat);
    base.position.set(0, .035, 0);
    base.castShadow = true;
    g.add(base);

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(.025, .03, 2.05, 14), woodMat);
    pole.position.y = 1.04;
    pole.castShadow = true;
    g.add(pole);

    // Soft segmented parasol canopy.
    const canopy = new THREE.Group();
    canopy.position.y = 2.03;
    g.add(canopy);
    for (let i = 0; i < 10; i++) {
      const a0 = i / 10 * Math.PI * 2;
      const a1 = (i + 1) / 10 * Math.PI * 2;
      const geo = new THREE.BufferGeometry();
      const verts = new Float32Array([
        0, .18, 0,
        Math.cos(a0) * .82, 0, Math.sin(a0) * .82,
        Math.cos(a1) * .82, 0, Math.sin(a1) * .82
      ]);
      geo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
      geo.computeVertexNormals();
      const panelMat = fabricMat.clone();
      if (i % 2) panelMat.color.offsetHSL(0, 0, -.035);
      const panel = new THREE.Mesh(geo, panelMat);
      panel.castShadow = true;
      canopy.add(panel);
    }
    const cap = new THREE.Mesh(new THREE.SphereGeometry(.055, 12, 8), woodMat);
    cap.position.y = .19;
    canopy.add(cap);

    // Two low-profile resort loungers angled slightly toward the ocean.
    const loungers = [[-1.0, .26, .12], [1.0, .26, -.10]];
    loungers.forEach(([lx, lz, yaw], idx) => {
      const chair = new THREE.Group();
      chair.position.set(lx, .03, lz + .35);
      chair.rotation.y = yaw;
      g.add(chair);

      const frame = new THREE.Mesh(new THREE.BoxGeometry(.58, .07, 1.5), woodMat);
      frame.position.y = .18;
      frame.castShadow = true;
      chair.add(frame);

      const seat = new THREE.Mesh(new THREE.BoxGeometry(.5, .045, 1.12), idx ? darkFabric : fabricMat);
      seat.position.set(0, .235, .13);
      seat.castShadow = true;
      chair.add(seat);

      const back = new THREE.Mesh(new THREE.BoxGeometry(.5, .045, .72), idx ? darkFabric : fabricMat);
      back.position.set(0, .52, -.48);
      back.rotation.x = -.58;
      back.castShadow = true;
      chair.add(back);

      for (const sx of [-.23, .23]) {
        const leg1 = new THREE.Mesh(new THREE.BoxGeometry(.045, .22, .045), woodMat);
        leg1.position.set(sx, .08, .46); chair.add(leg1);
        const leg2 = leg1.clone(); leg2.position.z = -.45; chair.add(leg2);
      }
    });

    // Small side table keeps each setup feeling intentional rather than decorative clutter.
    const sideTop = new THREE.Mesh(new THREE.CylinderGeometry(.23, .23, .045, 24), metalMat);
    sideTop.position.set(0, .37, .9);
    sideTop.castShadow = true;
    g.add(sideTop);
    const sideStem = new THREE.Mesh(new THREE.CylinderGeometry(.025, .03, .34, 12), metalMat);
    sideStem.position.set(0, .18, .9);
    g.add(sideStem);
  }

  function createCoastalEnvironment() {
    coastalRoot = new THREE.Group();
    coastalRoot.name = 'CoastalEnvironment';
    scene.add(coastalRoot);

    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(58, 36, 20),
      new THREE.MeshBasicMaterial({ map: makeSkyTexture3D(), side: THREE.BackSide, depthWrite: false, toneMapped: false })
    );
    sky.position.set(4, 5, -5);
    sky.renderOrder = -10;
    coastalRoot.add(sky);

    const coast = buildCoastlinePoints();
    const coastLeft = coast[0];
    const coastTop = coast[coast.length - 1];

    // One continuous ocean polygon wraps the whole glazed corner. Because its
    // inner edge is the exact same curve used by the sand, water can never slide
    // over the beach or reveal the old overlapping-plane artifacts.
    const oceanPoly = [
      new THREE.Vector2(-30, -60),
      new THREE.Vector2(60, -60),
      new THREE.Vector2(60, 30),
      ...[...coast].reverse()
    ];
    oceanMaterial = makeStillOceanMaterial();
    const ocean = new THREE.Mesh(shapeFromWorldXZ(oceanPoly), oceanMaterial);
    ocean.position.y = -.11;
    ocean.receiveShadow = false;
    coastalRoot.add(ocean);

    // The beach uses the same coastline points, forming an actual L-shaped shore
    // around the corner office rather than two intersecting rectangles.
    const sandPoly = [
      new THREE.Vector2(-30, -5.5),
      new THREE.Vector2(7.05, -5.5),
      new THREE.Vector2(7.05, 30),
      new THREE.Vector2(coastTop.x, 30),
      ...[...coast].reverse(),
      new THREE.Vector2(coastLeft.x, -5.5)
    ];
    const sandTex = makeSandTexture();
    const sandMat = new THREE.MeshStandardMaterial({
      map: sandTex, color: '#e7d0a3', roughness: .96, metalness: 0, side: THREE.DoubleSide
    });
    const beach = new THREE.Mesh(shapeFromWorldXZ(sandPoly), sandMat);
    beach.position.y = -.045;
    beach.receiveShadow = true;
    coastalRoot.add(beach);

    // Layered static shoreline: wet sand, translucent aqua wash and two crisp
    // foam contours. Nothing moves, so the edge stays photographically stable.
    const wetMat = new THREE.MeshBasicMaterial({
      color: '#9da99e', transparent: true, opacity: .22,
      side: THREE.DoubleSide, depthWrite: false
    });
    createCoastRibbon(coast, 1.65, wetMat, -.018);

    const shallowPath = offsetPolyline(coast, .34);
    const shallowMat = new THREE.MeshBasicMaterial({
      color: '#69c8c2', transparent: true, opacity: .22,
      side: THREE.DoubleSide, depthWrite: false
    });
    createCoastRibbon(shallowPath, .92, shallowMat, -.014);

    const foamMat = new THREE.MeshBasicMaterial({
      color: '#f7ffff', transparent: true, opacity: .78,
      side: THREE.DoubleSide, depthWrite: false
    });
    createCoastRibbon(offsetPolyline(coast, .06), .22, foamMat, .006);

    const foamSoftMat = new THREE.MeshBasicMaterial({
      color: '#dff6f2', transparent: true, opacity: .32,
      side: THREE.DoubleSide, depthWrite: false
    });
    createCoastRibbon(offsetPolyline(coast, .52), .13, foamSoftMat, -.002);

    // Small dry-sand tonal band behind the shoreline adds beach depth without
    // introducing any moving geometry.
    const dryEdgeMat = new THREE.MeshBasicMaterial({
      color: '#ead6ae', transparent: true, opacity: .22,
      side: THREE.DoubleSide, depthWrite: false
    });
    createCoastRibbon(offsetPolyline(coast, -.78), 1.0, dryEdgeMat, -.01);

    // Parallax vegetation stays completely static. Keep palms comfortably inland
    // so they read as growing from dunes rather than from the shoreline edge.
    createOutdoorPalm(-11.2, -8.1, .68, .075);
    createOutdoorPalm(1.2, -7.95, .82, .07);
    createOutdoorPalm(9.1, -7.45, .58, .09);
    createOutdoorPalm(11.25, 5.6, .72, .065);
    createOutdoorPalm(11.05, -2.55, .9, .05);
    createOutdoorPalm(10.7, -7.15, .52, .075);
    createBeachSetup(-7.8, -8.9, .82, -.10, '#f5efe6');
    createBeachSetup(2.9, -8.55, .76, .12, '#dbeaf2');
    createBeachSetup(9.9, -5.15, .72, -.18, '#efe1cf');
    createBeachSetup(10.65, 3.65, .68, .16, '#e7edf4');

    const headlandMat = new THREE.MeshBasicMaterial({
      color: '#6f8c7f', transparent: true, opacity: .18,
      side: THREE.DoubleSide, depthWrite: false
    });
    const head1 = new THREE.Mesh(new THREE.SphereGeometry(7.5, 24, 10, 0, Math.PI * 2, 0, Math.PI * .42), headlandMat);
    head1.scale.set(2.4, .42, .8);
    head1.position.set(-16, 1.2, -42);
    coastalRoot.add(head1);
    const head2 = new THREE.Mesh(new THREE.SphereGeometry(6.2, 24, 10, 0, Math.PI * 2, 0, Math.PI * .42), headlandMat.clone());
    head2.scale.set(2.0, .36, .72);
    head2.position.set(29, 1.0, -38);
    coastalRoot.add(head2);
  }

  function createBackGlassWall(glassMat, frameMat) {
    const paneWidth=2.17;
    const paneHeight=4.48;
    for(let i=0;i<7;i++){
      const x=-5.43+i*2.17;
      const pane=new THREE.Mesh(new THREE.PlaneGeometry(paneWidth-.08,paneHeight),glassMat);
      pane.position.set(x,2.31,-5.43);
      pane.renderOrder=6;
      scene.add(pane);
    }
    for(let x=-6.52;x<=6.52;x+=2.17){
      box('back-window-mullion',[.062,4.58,.064],[x,2.31,-5.39],frameMat,false,false);
    }
    box('back-window-top',[13.12,.075,.064],[0,4.57,-5.39],frameMat,false,false);
    box('back-window-bottom',[13.12,.075,.064],[0,.07,-5.39],frameMat,false,false);

    const curtainMat = new THREE.MeshPhysicalMaterial({
      color:'#f6f3ed', roughness:.98, transparent:true, opacity:.84,
      side:THREE.DoubleSide, sheen:.28, sheenColor:new THREE.Color('#ffffff')
    });
    const backTrackMat = new THREE.MeshPhysicalMaterial({
      color:'#c5c9cc', roughness:.25, metalness:.44, clearcoat:.12
    });
    const backTrack = new THREE.Mesh(new THREE.BoxGeometry(12.82, .045, .07), backTrackMat);
    backTrack.position.set(0, 4.49, -5.22);
    scene.add(backTrack);

    function backCurtainStack(x, width=.74, opacity=.88) {
      const geo = new THREE.PlaneGeometry(width, 4.18, 28, 24);
      const pos = geo.attributes.position;
      for (let i=0;i<pos.count;i++) {
        const lx = pos.getX(i), ly = pos.getY(i);
        const nx = lx / width;
        const folds = Math.sin(nx*Math.PI*14.0)*.095 + Math.sin(nx*Math.PI*28.0+.45)*.022;
        const topGather = 1 - Math.max(0,(ly-1.48)/.64)*.22;
        pos.setZ(i, folds*topGather);
      }
      pos.needsUpdate = true;
      geo.computeVertexNormals();
      const m = curtainMat.clone(); m.opacity = opacity;
      const mesh = new THREE.Mesh(geo,m);
      mesh.position.set(x,2.27,-5.235);
      mesh.castShadow = true; mesh.receiveShadow = true;
      scene.add(mesh);

      const carrierMat = new THREE.MeshStandardMaterial({color:'#d0d4d7',roughness:.32,metalness:.45});
      const hookCount = 6;
      for (let i=0;i<hookCount;i++) {
        const hx = x - width*.42 + (width*.84)*(i/(hookCount-1));
        const carrier = new THREE.Mesh(new THREE.SphereGeometry(.022,10,8),carrierMat);
        carrier.position.set(hx,4.465,-5.205); scene.add(carrier);
        const drop = new THREE.Mesh(new THREE.CylinderGeometry(.007,.007,.08,8),carrierMat);
        drop.position.set(hx,4.415,-5.22); scene.add(drop);
      }
      const hem = new THREE.Mesh(new THREE.BoxGeometry(width*.9,.024,.018),new THREE.MeshStandardMaterial({color:'#ded9d0',roughness:.9}));
      hem.position.set(x,.19,-5.225); scene.add(hem);
    }

    // Narrow, gathered stacks leave most of the panoramic view unobstructed.
    backCurtainStack(-5.78,.78,.90);
    backCurtainStack(-2.05,.62,.76);
    backCurtainStack(2.02,.62,.76);
    backCurtainStack(5.76,.78,.90);
  }

  function makeWallDisplayTexture() {
    const c = document.createElement('canvas');
    c.width = 1280; c.height = 640;
    const g = c.getContext('2d');

    const grad = g.createLinearGradient(0, 0, c.width, c.height);
    grad.addColorStop(0, '#11151b');
    grad.addColorStop(1, '#090c10');
    g.fillStyle = grad;
    g.fillRect(0, 0, c.width, c.height);

    // Fine grid gives the dashboard depth without visual noise.
    g.strokeStyle = 'rgba(255,255,255,.035)';
    g.lineWidth = 1;
    for (let x = 64; x < c.width; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, c.height); g.stroke(); }
    for (let y = 64; y < c.height; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(c.width, y); g.stroke(); }

    g.fillStyle = 'rgba(255,255,255,.92)';
    g.font = '700 42px Inter, Arial';
    g.fillText('Book & Buy HQ', 74, 92);
    g.fillStyle = 'rgba(255,255,255,.42)';
    g.font = '500 20px Inter, Arial';
    g.fillText('Your business, in one place', 76, 128);

    const cols = Object.values(agents).map(agent => agent.color);
    const names = Object.values(agents).map(agent => agent.name.toUpperCase());
    const xs = cols.map((_, index) => 92 + index * 184);

    // Agent cards.
    cols.forEach((col, i) => {
      const x = xs[i];
      g.fillStyle = 'rgba(255,255,255,.035)';
      roundRect(g, x, 190, 178, 250, 24); g.fill();
      g.strokeStyle = 'rgba(255,255,255,.06)';
      g.stroke();

      g.fillStyle = col;
      roundRect(g, x + 18, 210, 42, 7, 4); g.fill();

      g.fillStyle = 'rgba(255,255,255,.86)';
      g.font = '700 18px Inter, Arial';
      g.fillText(names[i], x + 18, 258, 142);

      const heights = [74, 110, 92, 132, 118];
      for (let b = 0; b < 4; b++) {
        const h = heights[(i + b) % heights.length] * (.48 + b * .12);
        g.globalAlpha = .22 + b * .13;
        g.fillStyle = col;
        roundRect(g, x + 18 + b * 34, 402 - h, 16, h, 6); g.fill();
      }
      g.globalAlpha = 1;

      g.fillStyle = 'rgba(255,255,255,.12)';
      roundRect(g, x + 18, 414, 142, 5, 3); g.fill();
      g.fillStyle = col;
      roundRect(g, x + 18, 414, 58 + i * 16, 5, 3); g.fill();
    });

    g.fillStyle = 'rgba(255,255,255,.3)';
    g.font = '500 17px Inter, Arial';
    g.fillText('YOUR DEPARTMENTS', 76, 544);
    cols.forEach((col, i) => {
      g.fillStyle = col;
      g.beginPath(); g.arc(230 + i * 34, 538, 6, 0, Math.PI * 2); g.fill();
    });
    g.fillStyle = 'rgba(255,255,255,.20)';
    g.fillRect(76, 576, 1120, 1);

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    tex.userData.hqKind = 'wall';
    return tex;
  }

  function makeTeamPanelTexture() {
    const c = document.createElement('canvas');
    c.width = 640; c.height = 720;
    const g = c.getContext('2d');
    g.fillStyle = '#f7f6f2';
    g.fillRect(0, 0, c.width, c.height);

    g.fillStyle = '#181b20';
    g.font = '700 30px Inter, Arial';
    g.fillText('YOUR BUDDIES', 52, 78);
    g.fillStyle = 'rgba(24,27,32,.45)';
    g.font = '500 17px Inter, Arial';
    g.fillText('ALL YOUR BUSINESS PAGES', 52, 108);

    const ids = Object.keys(agents);
    ids.forEach((id, i) => {
      const y = 172 + i * 76;
      g.fillStyle = agents[id].color;
      roundRect(g, 52, y - 18, 12, 36, 6); g.fill();
      g.fillStyle = '#20242a';
      g.font = '700 19px Inter, Arial';
      g.fillText(agents[id].name, 90, y - 1);
      g.fillStyle = 'rgba(32,36,42,.34)';
      roundRect(g, 90, y + 16, 340 - i * 18, 7, 4); g.fill();
      g.fillStyle = agents[id].color;
      roundRect(g, 90, y + 16, 110 + i * 34, 7, 4); g.fill();
      g.fillStyle = 'rgba(32,36,42,.18)';
      g.beginPath(); g.arc(542, y, 11, 0, Math.PI * 2); g.fill();
      g.fillStyle = agents[id].color;
      g.beginPath(); g.arc(542, y, 5, 0, Math.PI * 2); g.fill();
    });

    g.fillStyle = 'rgba(32,36,42,.08)';
    g.fillRect(52, 630, 536, 1);
    g.fillStyle = 'rgba(32,36,42,.45)';
    g.font = '600 16px Inter, Arial';
    g.fillText(`${ids.length} BUDDIES READY`, 52, 670);

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    tex.userData.hqKind = 'team';
    return tex;
  }

  function agentAccent(id) {
    return agents[id]?.accent || agents[id]?.color || '#ffffff';
  }

  function makeMonitorTexture(role, status = 'ready', progress = 0) {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 300;
    const g = c.getContext('2d');
    const col = agentAccent(role);
    const statusLabel = {
      ready: 'READY', queued: 'QUEUED', meeting: 'COLLABORATING',
      working: 'WORKING', review: 'REVIEWING', complete: 'COMPLETE'
    }[status] || 'READY';

    const grad = g.createLinearGradient(0, 0, c.width, c.height);
    grad.addColorStop(0, '#13171d');
    grad.addColorStop(1, '#0a0e13');
    g.fillStyle = grad;
    g.fillRect(0, 0, c.width, c.height);

    g.fillStyle = 'rgba(255,255,255,.035)';
    g.fillRect(16, 16, 480, 268);
    g.fillStyle = col;
    g.fillRect(38, 42, 7, 214);

    g.fillStyle = 'rgba(255,255,255,.88)';
    g.font = '700 26px Inter, Arial';
    g.fillText(agents[role].name.toUpperCase(), 68, 76, 390);
    g.fillStyle = status === 'complete' ? '#ffffff' : col;
    g.font = '700 15px Inter, Arial';
    g.fillText(agents[role].badge > 0 ? `${agents[role].badge} TO CHECK` : statusLabel, 68, 104, 390);

    const lineAlpha = status === 'working' || status === 'review' ? .78 : .38;
    g.fillStyle = `rgba(255,255,255,${lineAlpha})`;
    g.font = '500 17px system-ui, Arial';
    agents[role].features.slice(0, 4).forEach((feature, i) => g.fillText(feature.label, 68, 143 + i * 25, 270));

    // Lightweight data panel. It is redrawn only when state changes, not per frame.
    g.globalAlpha = status === 'working' || status === 'review' ? .34 : .16;
    g.fillStyle = col;
    g.fillRect(354, 132, 104, 76);
    g.globalAlpha = 1;
    for (let i = 0; i < 5; i++) {
      const h = 14 + ((i * 19 + role.length * 11) % 42);
      g.fillStyle = i === 4 && status === 'complete' ? '#ffffff' : col;
      g.globalAlpha = .38 + i * .09;
      g.fillRect(367 + i * 16, 194 - h, 8, h);
    }
    g.globalAlpha = 1;

    const normalized = status === 'complete' ? 1 : status === 'working' || status === 'review' ? Math.max(.18, progress || .56) : status === 'queued' ? .12 : .04;
    g.fillStyle = 'rgba(255,255,255,.10)';
    g.fillRect(68, 245, 390, 5);
    g.fillStyle = status === 'complete' ? '#ffffff' : col;
    g.fillRect(68, 245, 390 * Math.min(1, normalized), 5);

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    return tex;
  }

  function setWorkstationVisual(role, status = 'ready', progress = 0) {
    const station = workstations.get(role);
    if (!station) return;
    if (station.status === status && Math.abs((station.progress || 0) - progress) < .05) return;
    station.status = status;
    station.progress = progress;
    const oldMap = station.screen.material.map;
    const nextMap = makeMonitorTexture(role, status, progress);
    station.screen.material.map = nextMap;
    station.screen.material.needsUpdate = true;
    if (oldMap && oldMap !== nextMap) oldMap.dispose?.();
    station.accent.material.opacity = status === 'working' || status === 'review' ? 1 : status === 'complete' ? .88 : .58;
    station.accent.material.needsUpdate = true;
    const ledOpacity = status === 'working' || status === 'review' ? .98 : status === 'complete' ? .82 : status === 'queued' ? .48 : .34;
    (station.towerLEDs || []).forEach(mat => {
      mat.opacity = ledOpacity;
      if ('emissiveIntensity' in mat) mat.emissiveIntensity = status === 'working' || status === 'review' ? 2.2 : 1.2;
      mat.needsUpdate = true;
    });
  }

  function setWorkstations(ids = [], status = 'ready', activeId = null) {
    const selected = new Set(ids);
    workstations.forEach((station, id) => {
      if (!selected.has(id)) {
        setWorkstationVisual(id, 'ready', 0);
      } else if (activeId === id) {
        setWorkstationVisual(id, id === 'manage' ? 'review' : 'working', .58);
      } else if (status === 'complete') {
        setWorkstationVisual(id, 'complete', 1);
      } else {
        setWorkstationVisual(id, status, status === 'queued' ? .12 : 0);
      }
    });
    markActivity(700);
  }

  function setWorkstationComplete(id) {
    setWorkstationVisual(id, 'complete', 1);
    markActivity(500);
  }

  function createDesk(x, z, w, d, role) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.userData.role = role;
    scene.add(group);

    const roleColor = new THREE.Color(agentAccent(role));
    const white = new THREE.MeshPhysicalMaterial({ color: '#faf9f6', roughness: .34, metalness: 0, clearcoat: .16, clearcoatRoughness: .28 });
    const trim = mat('#d6d4cf', .48);
    const black = new THREE.MeshPhysicalMaterial({ color: '#111419', roughness: .24, metalness: .18, clearcoat: .28, clearcoatRoughness: .12 });
    const gunmetal = new THREE.MeshPhysicalMaterial({ color: '#252b32', roughness: .26, metalness: .38, clearcoat: .18, clearcoatRoughness: .18 });
    const softBlack = new THREE.MeshStandardMaterial({ color: '#20252b', roughness: .58, metalness: .04 });

    // Sleek floating workstation: rounded top, recessed architectural pedestals
    // and a hidden structural spine. This removes the generic four-leg table look.
    const desktopMat = new THREE.MeshPhysicalMaterial({
      color: '#f4f2ed', roughness: .34, metalness: 0,
      clearcoat: .16, clearcoatRoughness: .28
    });
    const edgeMat = new THREE.MeshPhysicalMaterial({
      color: '#d9d4cc', roughness: .42, metalness: .02,
      clearcoat: .08, clearcoatRoughness: .34
    });
    const frameMat = new THREE.MeshPhysicalMaterial({
      color: '#c9ced3', roughness: .24, metalness: .62,
      clearcoat: .22, clearcoatRoughness: .16
    });
    const insetMat = new THREE.MeshStandardMaterial({ color: '#9ea6ad', roughness: .42, metalness: .34 });

    // Rounded desktop slab with a softly beveled edge.
    const topShape = new THREE.Shape();
    const hw = w * .5, hd = d * .5, rr = Math.min(.16, d * .16);
    topShape.moveTo(-hw + rr, -hd);
    topShape.lineTo(hw - rr, -hd);
    topShape.quadraticCurveTo(hw, -hd, hw, -hd + rr);
    topShape.lineTo(hw, hd - rr);
    topShape.quadraticCurveTo(hw, hd, hw - rr, hd);
    topShape.lineTo(-hw + rr, hd);
    topShape.quadraticCurveTo(-hw, hd, -hw, hd - rr);
    topShape.lineTo(-hw, -hd + rr);
    topShape.quadraticCurveTo(-hw, -hd, -hw + rr, -hd);
    const topGeo = new THREE.ExtrudeGeometry(topShape, {
      depth: .072, bevelEnabled: true, bevelSegments: 2,
      bevelSize: .015, bevelThickness: .012, curveSegments: 10
    });
    topGeo.rotateX(-Math.PI / 2);
    const top = new THREE.Mesh(topGeo, desktopMat);
    top.position.y = .785;
    top.castShadow = top.receiveShadow = true;
    group.add(top);

    // Thin darker lower lip gives the slab a premium layered profile.
    const lowerLip = new THREE.Mesh(new THREE.BoxGeometry(w * .94, .035, d * .86), edgeMat);
    lowerLip.position.set(0, .735, -.015);
    lowerLip.castShadow = true;
    group.add(lowerLip);

    // Recessed center spine hides cables and visually floats the desktop.
    const spine = new THREE.Mesh(new THREE.BoxGeometry(w * .56, .11, .11), frameMat);
    spine.position.set(0, .64, -d * .31);
    spine.castShadow = true;
    group.add(spine);
    const spineInset = new THREE.Mesh(new THREE.BoxGeometry(w * .42, .045, .018), insetMat);
    spineInset.position.set(0, .64, -d * .395);
    group.add(spineInset);

    // Two inset architectural pedestal panels replace exposed legs entirely.
    const pedestalW = .105;
    const pedestalD = d * .37;
    const pedestalH = .535;
    for (const sx of [-1, 1]) {
      const pedestal = new THREE.Mesh(new THREE.BoxGeometry(pedestalW, pedestalH, pedestalD), frameMat);
      pedestal.position.set(sx * w * .365, .345, -.035);
      pedestal.castShadow = true;
      pedestal.receiveShadow = true;
      group.add(pedestal);

      // Inset face makes the support read as a designed extrusion, not a slab.
      const recess = new THREE.Mesh(new THREE.BoxGeometry(.012, pedestalH * .52, pedestalD * .58), insetMat);
      recess.position.set(sx * w * .365 - sx * (pedestalW * .515), .37, -.025);
      group.add(recess);

      // Low plinth visually anchors each pedestal while keeping the body floating.
      const plinth = new THREE.Mesh(
        new THREE.BoxGeometry(.18, .025, pedestalD * .72),
        new THREE.MeshPhysicalMaterial({ color: '#b8bec4', roughness: .28, metalness: .55, clearcoat: .12 })
      );
      plinth.position.set(sx * w * .365, .032, -.02);
      group.add(plinth);

      const supportCap = new THREE.Mesh(
        new THREE.BoxGeometry(pedestalW * 1.28, .024, pedestalD * .94),
        new THREE.MeshPhysicalMaterial({ color: '#d5d9dd', roughness: .18, metalness: .70, clearcoat: .18, clearcoatRoughness: .12 })
      );
      supportCap.position.set(sx * w * .365, .622, -.035);
      supportCap.castShadow = true;
      group.add(supportCap);
    }

    // Hidden cable shelf between pedestals.
    const cableShelf = new THREE.Mesh(new THREE.BoxGeometry(w * .48, .035, d * .26), insetMat);
    cableShelf.position.set(0, .49, -d * .29);
    group.add(cableShelf);

    // Role stripe is now a flush front-edge light blade.
    const accentMat = new THREE.MeshBasicMaterial({ color: agents[role].color, transparent: true, opacity: .78, toneMapped: false });
    const accentStrip = new THREE.Mesh(new THREE.BoxGeometry(w * .25, .012, .035), accentMat);
    accentStrip.position.set(-w * .33, .824, d * .505);
    group.add(accentStrip);

    // Very restrained underside glow for depth, no dynamic lighting.
    const underGlow = new THREE.Mesh(
      new THREE.BoxGeometry(w * .40, .008, .025),
      new THREE.MeshBasicMaterial({ color: agentAccent(role), transparent: true, opacity: .08, toneMapped: false })
    );
    underGlow.position.set(0, .706, d * .40);
    group.add(underGlow);

    // Premium ultrawide display: thinner housing, slightly wider panel and cleaner arm.
    const monitor = new THREE.Group();
    monitor.position.set(.10, .84, -.09);
    group.add(monitor);

    const screenW = Math.min(1.18, w * .53);
    const screenH = screenW * .52;
    const shell = new THREE.Mesh(new THREE.BoxGeometry(screenW + .034, screenH + .034, .042), black);
    shell.position.y = .43;
    shell.castShadow = true;
    monitor.add(shell);

    // Rear sculpting strip makes the monitor feel less like a flat box.
    const rearSpine = new THREE.Mesh(new THREE.BoxGeometry(screenW * .34, screenH * .54, .032), gunmetal);
    rearSpine.position.set(0, .43, -.032);
    monitor.add(rearSpine);

    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(screenW, screenH),
      new THREE.MeshBasicMaterial({ map: makeMonitorTexture(role, 'ready', 0), toneMapped: false })
    );
    screen.position.set(0, .43, .0215);
    screen.rotation.y = 0;
    monitor.add(screen);

    // Soft lower-bezel status light.
    const monitorLedMat = new THREE.MeshBasicMaterial({ color: agentAccent(role), transparent: true, opacity: .5, toneMapped: false });
    const monitorLed = new THREE.Mesh(new THREE.BoxGeometry(.085, .008, .005), monitorLedMat);
    monitorLed.position.set(0, .102, .0225);
    monitor.add(monitorLed);

    // Articulated monitor arm with circular cable-management base.
    const armBase = new THREE.Mesh(new THREE.CylinderGeometry(.115, .125, .032, 28), gunmetal);
    armBase.position.set(0, .022, .09); monitor.add(armBase);
    const lowerArm = new THREE.Mesh(new THREE.BoxGeometry(.045, .265, .055), gunmetal);
    lowerArm.position.set(0, .16, .09); lowerArm.rotation.x = .05; monitor.add(lowerArm);
    const elbow = new THREE.Mesh(new THREE.SphereGeometry(.043, 16, 12), gunmetal);
    elbow.position.set(0, .29, .065); monitor.add(elbow);
    const upperArm = new THREE.Mesh(new THREE.BoxGeometry(.045, .20, .055), gunmetal);
    upperArm.position.set(0, .35, .035); upperArm.rotation.x = -.29; monitor.add(upperArm);
    const hinge = new THREE.Mesh(new THREE.CylinderGeometry(.052, .052, .035, 18), gunmetal);
    hinge.rotation.x = Math.PI / 2; hinge.position.set(0, .407, .005); monitor.add(hinge);

    // Large desk mat, low-profile mechanical keyboard and sculpted mouse.
    const deskMat = new THREE.Mesh(
      new THREE.BoxGeometry(1.04, .012, .37),
      new THREE.MeshStandardMaterial({ color: '#252a30', roughness: .82, metalness: 0 })
    );
    deskMat.position.set(.06, .851, .30); group.add(deskMat);

    const keyboardBase = new THREE.Mesh(new THREE.BoxGeometry(.60, .032, .205), black);
    keyboardBase.position.set(-.04, .874, .29); keyboardBase.rotation.x = -.035; keyboardBase.castShadow = true; group.add(keyboardBase);
    // Suggest individual key rows without hundreds of meshes.
    for (let row = 0; row < 4; row++) {
      const keyRow = new THREE.Mesh(
        new THREE.BoxGeometry(.53 - row * .018, .006, .026),
        new THREE.MeshBasicMaterial({ color: row === 3 ? agentAccent(role) : '#7e858e', transparent: true, opacity: row === 3 ? .23 : .13, toneMapped: false })
      );
      keyRow.position.set(-.04, .894, .235 + row * .038);
      group.add(keyRow);
    }
    const mouse = new THREE.Mesh(new THREE.SphereGeometry(.058, 20, 12), black);
    mouse.scale.set(.76, .34, 1.08); mouse.position.set(.41, .884, .30); mouse.castShadow = true; group.add(mouse);
    const mouseLine = new THREE.Mesh(new THREE.BoxGeometry(.008, .005, .06), monitorLedMat);
    mouseLine.position.set(.41, .905, .292); group.add(mouseLine);

    // ---------------------------------------------------------
    // PREMIUM GLASS-SIDED CREATOR / GAMING TOWER
    // ---------------------------------------------------------
    const tower = new THREE.Group();
    const towerX = -w * .355;
    tower.position.set(towerX, .84, -.08);
    group.add(tower);

    const towerW = .43, towerH = .72, towerD = .49;
    const towerLEDs = [monitorLedMat];
    const ledMat = new THREE.MeshStandardMaterial({
      color: roleColor.clone().multiplyScalar(.58), emissive: roleColor, emissiveIntensity: 1.35,
      transparent: true, opacity: .42, roughness: .28, metalness: .06, toneMapped: false
    });
    towerLEDs.push(ledMat);

    // Matte inner chassis, intentionally inset so the glass edge is visible.
    const chassis = new THREE.Mesh(
      new THREE.BoxGeometry(towerW * .91, towerH * .94, towerD * .91),
      new THREE.MeshPhysicalMaterial({ color: '#111419', roughness: .28, metalness: .28, clearcoat: .16, clearcoatRoughness: .16 })
    );
    chassis.position.y = towerH * .5;
    chassis.castShadow = true;
    tower.add(chassis);

    // Raised corner rails create a real case silhouette/chamfer illusion.
    const railMat = new THREE.MeshPhysicalMaterial({ color: '#30363d', roughness: .20, metalness: .55, clearcoat: .22, clearcoatRoughness: .12 });
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(.025, towerH, .025), railMat);
        rail.position.set(sx * towerW * .485, towerH * .5, sz * towerD * .485);
        tower.add(rail);
      }
    }

    // Tempered glass side with thin metal border and subtle reflective tint.
    const glassBorder = new THREE.Mesh(new THREE.BoxGeometry(.018, towerH * .90, towerD * .89), railMat);
    glassBorder.position.set(towerW * .497, towerH * .5, 0);
    tower.add(glassBorder);
    const glassPanel = new THREE.Mesh(
      new THREE.PlaneGeometry(towerD * .84, towerH * .84),
      new THREE.MeshPhysicalMaterial({
        color: '#6c7f8e', roughness: .055, metalness: .02, transparent: true,
        opacity: .20, side: THREE.DoubleSide, depthWrite: false,
        clearcoat: .72, clearcoatRoughness: .04
      })
    );
    glassPanel.rotation.y = Math.PI / 2;
    glassPanel.position.set(towerW * .508, towerH * .51, 0);
    glassPanel.renderOrder = 5;
    tower.add(glassPanel);

    // Motherboard with layered heatsinks/VRM blocks.
    const motherboard = new THREE.Mesh(new THREE.BoxGeometry(.018, .37, .30), mat('#283039', .46, .12));
    motherboard.position.set(towerW * .38, .39, .015); tower.add(motherboard);
    for (const [yy, zz, ww] of [[.52, -.07, .085],[.49,.08,.07],[.37,-.10,.06]]) {
      const sink = new THREE.Mesh(new THREE.BoxGeometry(.025, .065, ww), gunmetal);
      sink.position.set(towerW * .40, yy, zz); tower.add(sink);
    }

    // Horizontal GPU with metallic backplate and luminous edge.
    const gpu = new THREE.Mesh(new THREE.BoxGeometry(.04, .105, .31), gunmetal);
    gpu.position.set(towerW * .41, .285, .012); tower.add(gpu);
    const gpuPlate = new THREE.Mesh(new THREE.BoxGeometry(.046, .055, .26), black);
    gpuPlate.position.set(towerW * .435, .285, .012); tower.add(gpuPlate);
    const gpuStrip = new THREE.Mesh(new THREE.BoxGeometry(.008, .014, .255), ledMat);
    gpuStrip.position.set(towerW * .458, .335, .012); tower.add(gpuStrip);

    // CPU pump block + two visible coolant tubes.
    const cooler = new THREE.Mesh(new THREE.CylinderGeometry(.058, .058, .034, 28), gunmetal);
    cooler.rotation.z = Math.PI / 2; cooler.position.set(towerW * .405, .475, -.005); tower.add(cooler);
    const coolerRing = new THREE.Mesh(new THREE.TorusGeometry(.041, .007, 10, 28), ledMat);
    coolerRing.rotation.y = Math.PI / 2; coolerRing.position.copy(cooler.position); tower.add(coolerRing);
    for (const zOff of [-.022, .022]) {
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(.008, .008, .23, 10), softBlack);
      tube.rotation.z = Math.PI / 2.7;
      tube.position.set(towerW * .27, .545, zOff + .04);
      tower.add(tube);
    }

    // Two large side intake fans, easier to read through the glass than tiny rings.
    for (let i = 0; i < 2; i++) {
      const fan = new THREE.Group();
      fan.position.set(towerW * .515, .25 + i * .245, -.105);
      fan.rotation.y = Math.PI / 2;
      const fanBack = new THREE.Mesh(new THREE.CylinderGeometry(.085, .085, .012, 28), softBlack);
      fanBack.rotation.x = Math.PI / 2; fan.add(fanBack);
      const fanRing = new THREE.Mesh(new THREE.TorusGeometry(.075, .008, 12, 36), ledMat); fan.add(fanRing);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(.019, .019, .014, 16), gunmetal);
      hub.rotation.x = Math.PI / 2; fan.add(hub);
      for (let b = 0; b < 7; b++) {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(.012, .052, .005), mat('#3a4149', .48, .10));
        blade.position.y = .032; blade.rotation.z = b * Math.PI * 2 / 7 + .16; fan.add(blade);
      }
      tower.add(fan);
    }

    // Front panel: recessed ventilation with three premium RGB intake rings.
    const frontPanel = new THREE.Mesh(new THREE.BoxGeometry(towerW * .84, towerH * .88, .018), black);
    frontPanel.position.set(0, towerH * .5, towerD * .505); tower.add(frontPanel);
    const ventInset = new THREE.Mesh(new THREE.BoxGeometry(towerW * .68, towerH * .74, .010), mat('#090b0e', .58, .22));
    ventInset.position.set(0, towerH * .50, towerD * .518); tower.add(ventInset);
    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(.066, .0065, 10, 32), ledMat);
      ring.position.set(0, .20 + i * .17, towerD * .526);
      ring.rotation.x = Math.PI / 2;
      tower.add(ring);
      const fanHub = new THREE.Mesh(new THREE.CylinderGeometry(.015, .015, .008, 14), gunmetal);
      fanHub.position.copy(ring.position); fanHub.rotation.x = Math.PI / 2; tower.add(fanHub);
    }

    // Top mesh vent and I/O strip.
    const topVent = new THREE.Mesh(new THREE.BoxGeometry(towerW * .66, .012, towerD * .48), mat('#171c22', .5, .28));
    topVent.position.set(0, towerH * 1.005, -.03); tower.add(topVent);
    for (let i = -2; i <= 2; i++) {
      const slit = new THREE.Mesh(new THREE.BoxGeometry(.018, .006, towerD * .36), mat('#4a5159', .4, .35));
      slit.position.set(i * .055, towerH * 1.014, -.03); tower.add(slit);
    }
    const power = new THREE.Mesh(new THREE.CylinderGeometry(.018, .018, .009, 18), ledMat);
    power.position.set(towerW * .27, towerH * 1.016, towerD * .26); tower.add(power);

    // Small aluminium feet float the case slightly above the desktop.
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const caseFoot = new THREE.Mesh(new THREE.CylinderGeometry(.018, .022, .028, 12), railMat);
        caseFoot.position.set(sx * towerW * .32, -.012, sz * towerD * .33);
        tower.add(caseFoot);
      }
    }

    workstations.set(role, {
      role, group, monitor, screen, accent: accentStrip,
      tower, towerLEDs, status: 'ready', progress: 0
    });
  }

  function makeSmartTableTexture() {
    const c = document.createElement('canvas');
    c.width = c.height = 1024;
    const g = c.getContext('2d');

    const bg = g.createLinearGradient(0, 0, 1024, 1024);
    bg.addColorStop(0, '#11161c');
    bg.addColorStop(.55, '#0b1015');
    bg.addColorStop(1, '#070a0e');
    g.fillStyle = bg;
    g.fillRect(0, 0, 1024, 1024);

    // Fine technical grid.
    g.strokeStyle = 'rgba(255,255,255,.035)';
    g.lineWidth = 1;
    for (let i = 64; i < 1024; i += 64) {
      g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 1024); g.stroke();
      g.beginPath(); g.moveTo(0, i); g.lineTo(1024, i); g.stroke();
    }

    // Soft central collaboration glow.
    const glow = g.createRadialGradient(512, 520, 20, 512, 520, 350);
    glow.addColorStop(0, 'rgba(255,255,255,.12)');
    glow.addColorStop(.45, 'rgba(120,180,255,.05)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = glow;
    g.fillRect(0, 0, 1024, 1024);

    g.fillStyle = 'rgba(255,255,255,.82)';
    g.font = '700 42px Inter, Arial';
    g.textAlign = 'center';
    g.fillText('BOOK & BUY', 512, 128);
    g.fillStyle = 'rgba(255,255,255,.38)';
    g.font = '500 22px Inter, Arial';
    g.fillText('YOUR BUSINESS HQ', 512, 168);

    const roles = Object.values(agents).map(agent => [agent.name.toUpperCase(), agent.color]);

    const cx = 512, cy = 530, radius = 248;
    roles.forEach(([name, color], i) => {
      const a = -Math.PI / 2 + i * Math.PI * 2 / roles.length;
      const x = cx + Math.cos(a) * radius;
      const y = cy + Math.sin(a) * radius;

      g.strokeStyle = color;
      g.lineWidth = 7;
      g.globalAlpha = .8;
      g.beginPath(); g.arc(x, y, 56, 0, Math.PI * 2); g.stroke();
      g.globalAlpha = .14;
      g.fillStyle = color;
      g.beginPath(); g.arc(x, y, 48, 0, Math.PI * 2); g.fill();
      g.globalAlpha = 1;
      g.fillStyle = '#ffffff';
      g.font = '700 17px Inter, Arial';
      g.fillText(name, x, y + 6, 104);

      g.strokeStyle = 'rgba(255,255,255,.13)';
      g.lineWidth = 2;
      g.beginPath(); g.moveTo(cx, cy); g.lineTo(x, y); g.stroke();
    });

    g.strokeStyle = 'rgba(255,255,255,.26)';
    g.lineWidth = 3;
    g.beginPath(); g.arc(cx, cy, 100, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.08)';
    g.beginPath(); g.arc(cx, cy, 150, 0, Math.PI * 2); g.stroke();

    g.fillStyle = 'rgba(255,255,255,.9)';
    g.font = '700 34px Inter, Arial';
    g.fillText('B', cx, cy + 12);
    g.fillStyle = 'rgba(255,255,255,.35)';
    g.font = '600 18px Inter, Arial';
    g.fillText('READY', cx, cy + 48);

    // Low-key status strip.
    g.fillStyle = 'rgba(255,255,255,.055)';
    g.fillRect(222, 890, 580, 4);
    const cols = roles.map(r => r[1]);
    cols.forEach((col, i) => {
      g.fillStyle = col;
      g.globalAlpha = .72;
      g.fillRect(234 + i * 92, 888, 64, 8);
    });
    g.globalAlpha = 1;

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    tex.userData.hqKind = 'table';
    return tex;
  }

  function roundedSquareGeometry(size = 2.52, radius = .18, depth = .12) {
    const h = size / 2;
    const s = new THREE.Shape();
    s.moveTo(-h + radius, -h);
    s.lineTo(h - radius, -h);
    s.quadraticCurveTo(h, -h, h, -h + radius);
    s.lineTo(h, h - radius);
    s.quadraticCurveTo(h, h, h - radius, h);
    s.lineTo(-h + radius, h);
    s.quadraticCurveTo(-h, h, -h, h - radius);
    s.lineTo(-h, -h + radius);
    s.quadraticCurveTo(-h, -h, -h + radius, -h);
    s.closePath();
    const geo = new THREE.ExtrudeGeometry(s, {
      depth,
      bevelEnabled: true,
      bevelSegments: 2,
      bevelSize: .035,
      bevelThickness: .025,
      curveSegments: 5
    });
    geo.center();
    geo.rotateX(Math.PI / 2);
    return geo;
  }

  function createMeetingTable() {
    const group = new THREE.Group();
    group.position.copy(meetingCenter);
    scene.add(group);

    // Minimal square rug anchors the new smart table without competing with it.
    const rug = new THREE.Mesh(
      roundedSquareGeometry(4.55, .42, .018),
      new THREE.MeshStandardMaterial({ color: '#e9e6df', roughness: .97, metalness: 0 })
    );
    rug.position.y = .012;
    rug.receiveShadow = true;
    group.add(rug);

    const table = new THREE.Group();
    group.add(table);

    // Premium white shell with a dark inset smart display.
    const shellMat = new THREE.MeshPhysicalMaterial({
      color: '#f7f6f2', roughness: .28, metalness: .015,
      clearcoat: .24, clearcoatRoughness: .24
    });
    const top = new THREE.Mesh(roundedSquareGeometry(2.58, .2, .13), shellMat);
    top.position.y = .83;
    top.castShadow = top.receiveShadow = true;
    table.add(top);

    const underside = new THREE.Mesh(
      roundedSquareGeometry(2.42, .17, .065),
      new THREE.MeshStandardMaterial({ color: '#d8d5cf', roughness: .46, metalness: .05 })
    );
    underside.position.y = .745;
    underside.castShadow = true;
    table.add(underside);

    // Inset black glass bezel and LED screen.
    const glassBezel = new THREE.Mesh(
      new THREE.BoxGeometry(1.94, .034, 1.94),
      new THREE.MeshPhysicalMaterial({
        color: '#11161c', roughness: .11, metalness: .04,
        clearcoat: .72, clearcoatRoughness: .07
      })
    );
    glassBezel.position.y = .905;
    glassBezel.castShadow = true;
    table.add(glassBezel);

    smartTableScreenMat = new THREE.MeshBasicMaterial({
      map: makeSmartTableTexture(), transparent: true, opacity: .62,
      toneMapped: false, side: THREE.DoubleSide
    });
    const ledScreen = new THREE.Mesh(new THREE.PlaneGeometry(1.82, 1.82), smartTableScreenMat);
    ledScreen.rotation.x = -Math.PI / 2;
    ledScreen.position.y = .924;
    ledScreen.renderOrder = 3;
    table.add(ledScreen);

    // Soft role-colour edge LEDs. They are emissive-looking Basic meshes rather than lights.
    const edgeColors = ['#1E6BFF', '#8B3FFF', '#12D97A', '#FFC400', '#FF6A1A'];
    const edgeSpecs = [
      [0, .895, -1.265, 2.12, .026],
      [0, .895, 1.265, 2.12, .026],
      [-1.265, .895, 0, .026, 2.12],
      [1.265, .895, 0, .026, 2.12]
    ];
    edgeSpecs.forEach((spec, i) => {
      const m = new THREE.MeshBasicMaterial({
        color: edgeColors[i], transparent: true, opacity: .28,
        toneMapped: false, depthWrite: false
      });
      smartTableEdgeMats.push(m);
      const strip = new THREE.Mesh(new THREE.BoxGeometry(spec[3], .018, spec[4]), m);
      strip.position.set(spec[0], spec[1], spec[2]);
      table.add(strip);
    });

    // Fifth role accent: small central W ring, flush with the display.
    const centerRingMat = new THREE.MeshBasicMaterial({
      color: edgeColors[4], transparent: true, opacity: .26,
      toneMapped: false, depthWrite: false
    });
    smartTableEdgeMats.push(centerRingMat);
    const centerRing = new THREE.Mesh(new THREE.RingGeometry(.13, .16, 40), centerRingMat);
    centerRing.rotation.x = -Math.PI / 2;
    centerRing.position.y = .929;
    centerRing.renderOrder = 4;
    table.add(centerRing);

    // Sculpted central pedestal with a square footprint keeps the table futuristic.
    const pedestalMat = new THREE.MeshPhysicalMaterial({
      color: '#e5e2dc', roughness: .34, metalness: .04,
      clearcoat: .12, clearcoatRoughness: .3
    });
    const pedestal = new THREE.Mesh(roundedSquareGeometry(.82, .12, .62), pedestalMat);
    pedestal.position.y = .39;
    pedestal.castShadow = true;
    table.add(pedestal);

    const base = new THREE.Mesh(
      roundedSquareGeometry(1.12, .16, .065),
      new THREE.MeshStandardMaterial({ color: '#d2cfc9', roughness: .5, metalness: .04 })
    );
    base.position.y = .055;
    base.castShadow = true;
    table.add(base);

    // Five standing positions arranged around the square rather than a perfect pentagon.
    const spots = {
      ask:      [-1.42,  1.48],
      research: [-1.52, -1.05],
      manage:   [ 0.00, -1.62],
      execute:  [ 1.52, -1.05],
      plan:     [ 1.42,  1.48]
    };
    Object.entries(spots).forEach(([id, [x, z]]) => {
      const facing = Math.atan2(-x, -z);
      meetingSpots.set(id, {
        position: new THREE.Vector3(meetingCenter.x + x, buddyPositions[id].y + .08, meetingCenter.z + z),
        rotationY: facing
      });
    });
  }

  function createFloorLamp(x, z) {
    const group = new THREE.Group(); group.position.set(x, 0, z); scene.add(group);
    const metal = mat('#2b2f34', .28, .18);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(.22, .24, .045, 32), metal); base.position.y = .025; base.castShadow = true; group.add(base);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(.025, .025, 1.72, 16), metal); pole.position.y = .89; pole.castShadow = true; group.add(pole);
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(.22, .34, .36, 32, 1, true), new THREE.MeshStandardMaterial({ color: '#f5ede0', roughness: .75, side: THREE.DoubleSide }));
    shade.position.y = 1.68; shade.castShadow = true; group.add(shade);
    const glow = new THREE.PointLight(0xffe6bf, .6, 3.4, 2); glow.position.y = 1.58; group.add(glow);
  }

  function createBookcase() {
    const group = new THREE.Group(); group.position.set(-6.42, 0, -3.68); scene.add(group);
    const wood = mat('#c7a883', .63);
    const darkWood = mat('#aa8966', .68);
    const sideGeo = new THREE.BoxGeometry(.12, 2.5, .72);
    const s1 = new THREE.Mesh(sideGeo, wood); s1.position.set(-.73, 1.25, 0); s1.castShadow = true; group.add(s1);
    const s2 = s1.clone(); s2.position.x = .73; group.add(s2);
    for (let y = .12; y <= 2.48; y += .59) {
      const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.52, .09, .72), darkWood); shelf.position.set(0, y, 0); shelf.castShadow = true; group.add(shelf);
    }
    const bookColors = ['#7767aa', '#594d84', '#a08fce', '#d0c6e8', '#565b68', '#b8a0d9'];
    for (let row = 0; row < 4; row++) {
      for (let i = 0; i < 6; i++) {
        const h = .28 + ((i + row) % 3) * .045;
        const book = new THREE.Mesh(new THREE.BoxGeometry(.15, h, .43), mat(bookColors[(i + row * 2) % bookColors.length], .72));
        book.position.set(-.53 + i * .205, .25 + row * .59 + h / 2, .02);
        book.castShadow = true; group.add(book);
      }
    }
  }

  function createFeatureWall() {
    const group = new THREE.Group();
    group.position.set(.38, 0, -5.22);
    scene.add(group);

    // Full architectural backing panel - this reads as one intentional installation.
    const reveal = new THREE.Mesh(
      new THREE.BoxGeometry(10.65, 3.38, .055),
      new THREE.MeshStandardMaterial({ color: '#d9d5ce', roughness: .62, metalness: .01 })
    );
    reveal.position.set(0, 2.7, -.055);
    reveal.castShadow = false;
    group.add(reveal);

    const backing = new THREE.Mesh(
      new THREE.BoxGeometry(10.48, 3.22, .105),
      new THREE.MeshPhysicalMaterial({ color: '#ebe8e2', roughness: .72, metalness: 0, clearcoat: .025 })
    );
    backing.position.set(0, 2.7, .015);
    backing.castShadow = true;
    backing.receiveShadow = true;
    group.add(backing);

    // Slim recessed light reveals. They are emissive-looking Basic meshes rather than lights.
    const glowMat = new THREE.MeshBasicMaterial({ color: '#fff7e8', transparent: true, opacity: .86, toneMapped: false });
    const topGlow = new THREE.Mesh(new THREE.BoxGeometry(10.02, .035, .025), glowMat);
    topGlow.position.set(0, 4.22, .08); group.add(topGlow);
    const bottomGlow = new THREE.Mesh(new THREE.BoxGeometry(10.02, .025, .02), glowMat.clone());
    bottomGlow.material.opacity = .42;
    bottomGlow.position.set(0, 1.18, .08); group.add(bottomGlow);

    // Left fluted strip adds architectural texture without filling the whole wall with slats.
    const fluteMat = new THREE.MeshStandardMaterial({ color: '#dfdbd4', roughness: .78, metalness: 0 });
    for (let i = 0; i < 7; i++) {
      const flute = new THREE.Mesh(new THREE.BoxGeometry(.075, 2.68, .08), fluteMat);
      flute.position.set(-4.73 + i * .13, 2.7, .10);
      flute.castShadow = true;
      group.add(flute);
    }

    // Main command display.
    const screenFrame = new THREE.Mesh(
      new THREE.BoxGeometry(5.7, 2.38, .115),
      new THREE.MeshPhysicalMaterial({ color: '#20242a', roughness: .24, metalness: .12, clearcoat: .26, clearcoatRoughness: .18 })
    );
    screenFrame.position.set(-1.25, 2.72, .145);
    screenFrame.castShadow = true;
    group.add(screenFrame);

    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(5.42, 2.10),
      new THREE.MeshBasicMaterial({ map: makeWallDisplayTexture(), toneMapped: false })
    );
    screen.position.set(-1.25, 2.72, .205);
    group.add(screen);

    // A very slim under-display shelf makes the wall feel physically built-in.
    const shelf = new THREE.Mesh(
      new THREE.BoxGeometry(5.95, .075, .26),
      new THREE.MeshPhysicalMaterial({ color: '#f6f4ef', roughness: .48, metalness: .01, clearcoat: .04 })
    );
    shelf.position.set(-1.25, 1.42, .20);
    shelf.castShadow = true;
    group.add(shelf);

    // Right status panel, visually separate but part of the same wall system.
    const statusFrame = new THREE.Mesh(
      new THREE.BoxGeometry(2.72, 2.38, .09),
      new THREE.MeshStandardMaterial({ color: '#f7f6f2', roughness: .52, metalness: 0 })
    );
    statusFrame.position.set(3.15, 2.72, .13);
    statusFrame.castShadow = true;
    group.add(statusFrame);

    const statusScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(2.48, 2.12),
      new THREE.MeshBasicMaterial({ map: makeTeamPanelTexture(), toneMapped: false })
    );
    statusScreen.position.set(3.15, 2.72, .182);
    group.add(statusScreen);

    // One restrained colour rail ties the five Buddy identities into the architecture.
    const colors = ['#1E6BFF','#8B3FFF','#12D97A','#FFC400','#FF6A1A'];
    colors.forEach((color, i) => {
      const pip = new THREE.Mesh(
        new THREE.BoxGeometry(.34, .035, .025),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .76, toneMapped: false })
      );
      pip.position.set(2.48 + i * .34, 1.42, .20);
      group.add(pip);
    });
  }

  function createCurtains() {
    const group = new THREE.Group();
    group.position.set(6.90, 0, -.18);
    scene.add(group);

    const trackMat = new THREE.MeshPhysicalMaterial({ color: '#c5c9cc', roughness: .25, metalness: .44, clearcoat: .12 });
    const track = new THREE.Mesh(new THREE.BoxGeometry(.075, .045, 10.18), trackMat);
    track.position.set(-.015, 4.53, 0);
    group.add(track);

    const fabricBase = new THREE.MeshPhysicalMaterial({
      color: '#f4f0e8', roughness: .98, metalness: 0,
      transparent: true, opacity: .90, side: THREE.DoubleSide,
      sheen: .34, sheenColor: new THREE.Color('#fffdf8'), depthWrite: true
    });

    function panel(z, width=.92, fullness=.105, opacity=.9) {
      const geo = new THREE.PlaneGeometry(width, 4.22, 30, 26);
      const pos = geo.attributes.position;
      for (let i=0;i<pos.count;i++) {
        const lx=pos.getX(i), ly=pos.getY(i), nx=lx/width;
        const folds = Math.sin(nx*Math.PI*14.2)*fullness + Math.sin(nx*Math.PI*28.4+.5)*fullness*.22;
        const gather = 1 - Math.max(0,(ly-1.48)/.68)*.22;
        pos.setZ(i, folds*gather);
      }
      pos.needsUpdate=true; geo.computeVertexNormals();
      const mat=fabricBase.clone(); mat.opacity=opacity;
      const mesh=new THREE.Mesh(geo,mat);
      mesh.position.set(-.045,2.27,z);
      mesh.rotation.y=-Math.PI/2;
      mesh.castShadow=true; mesh.receiveShadow=true;
      group.add(mesh);

      const carrierMat = new THREE.MeshStandardMaterial({color:'#d0d4d7',roughness:.32,metalness:.45});
      const hookCount=6;
      for(let i=0;i<hookCount;i++){
        const hz=z-width*.42+(width*.84)*(i/(hookCount-1));
        const carrier=new THREE.Mesh(new THREE.SphereGeometry(.022,10,8),carrierMat);
        carrier.position.set(-.01,4.505,hz); group.add(carrier);
        const drop=new THREE.Mesh(new THREE.CylinderGeometry(.007,.007,.08,8),carrierMat);
        drop.position.set(-.025,4.455,hz); group.add(drop);
      }
      const hem=new THREE.Mesh(new THREE.BoxGeometry(.022,.024,width*.9),new THREE.MeshStandardMaterial({color:'#ded9d0',roughness:.9}));
      hem.position.set(-.05,.18,z); group.add(hem);
    }

    // Gathered to the extreme sides so the glass view remains dominant.
    panel(-4.55, 1.00, .115, .94);
    panel(4.50, 1.00, .115, .94);
    panel(-3.62, .42, .07, .34);
    panel(3.58, .42, .07, .34);
  }

  let indoorLeafGeometry = null;
  function makeIndoorLeafGeometry(width = .28, height = 1.0, bend = .16, segments = 10) {
    const positions = [];
    const uvs = [];
    const indices = [];
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const taper = Math.pow(Math.sin(Math.PI * Math.min(.999, t)), .62) * (1 - t * .16);
      const half = width * .5 * taper;
      const y = height * t;
      const z = Math.sin(t * Math.PI * .92) * bend + Math.pow(t, 2.3) * bend * .22;
      positions.push(-half, y, z, half, y, z);
      uvs.push(0, t, 1, t);
    }
    for (let i = 0; i < segments; i++) {
      const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
      indices.push(a, c, b, b, c, d);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }

  function addCylinderBetween(parent, a, b, radius, material, radialSegments = 10) {
    const dir = b.clone().sub(a);
    const len = dir.length();
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 1.08, len, radialSegments), material);
    mesh.position.copy(a).add(b).multiplyScalar(.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  }

  function createPremiumPlanter(group, variant = 0) {
    const ceramicColors = ['#f4f1ea', '#ebe7df', '#f8f6f1'];
    const potMat = new THREE.MeshPhysicalMaterial({
      color: ceramicColors[variant % ceramicColors.length], roughness: .48, metalness: 0,
      clearcoat: .16, clearcoatRoughness: .34
    });
    const rimMat = new THREE.MeshStandardMaterial({ color: '#d8d3ca', roughness: .6, metalness: .02 });
    const woodMat = new THREE.MeshStandardMaterial({ color: '#a9825c', roughness: .64, metalness: 0 });
    const soilMat = new THREE.MeshStandardMaterial({ color: '#4c3b2e', roughness: .96, metalness: 0 });

    // Gently tapered ceramic planter with a real rim and foot/saucer.
    const profile = [
      new THREE.Vector2(.235, 0), new THREE.Vector2(.255, .04),
      new THREE.Vector2(.29, .42), new THREE.Vector2(.305, .50),
      new THREE.Vector2(.315, .54), new THREE.Vector2(.292, .56)
    ];
    const pot = new THREE.Mesh(new THREE.LatheGeometry(profile, 32), potMat);
    pot.position.y = .31;
    pot.castShadow = true;
    pot.receiveShadow = true;
    group.add(pot);

    const rim = new THREE.Mesh(new THREE.TorusGeometry(.303, .018, 12, 36), rimMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = .865;
    group.add(rim);

    const soil = new THREE.Mesh(new THREE.CylinderGeometry(.274, .274, .026, 28), soilMat);
    soil.position.y = .847;
    group.add(soil);

    // A few visible pebbles make the pot top read much more realistically at this camera distance.
    const pebbleMatA = new THREE.MeshStandardMaterial({ color: '#b9b0a3', roughness: .92 });
    const pebbleMatB = new THREE.MeshStandardMaterial({ color: '#887d70', roughness: .94 });
    for (let i = 0; i < 9; i++) {
      const a = i * 2.399;
      const r = .08 + (i % 3) * .045;
      const peb = new THREE.Mesh(new THREE.IcosahedronGeometry(.025 + (i % 2) * .008, 1), i % 2 ? pebbleMatA : pebbleMatB);
      peb.scale.set(1.2, .55, .9);
      peb.position.set(Math.cos(a) * r, .87, Math.sin(a) * r);
      peb.rotation.set(i * .21, i * .37, i * .17);
      group.add(peb);
    }

    const saucer = new THREE.Mesh(new THREE.CylinderGeometry(.31, .325, .035, 32), rimMat);
    saucer.position.y = .035;
    saucer.castShadow = true;
    group.add(saucer);

    // Slim elevated wood stand.
    const stand = new THREE.Group();
    stand.position.y = -.015;
    group.add(stand);
    for (const [lx, lz] of [[-.22,-.22],[.22,-.22],[-.22,.22],[.22,.22]]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(.018, .024, .34, 10), woodMat);
      leg.position.set(lx, .17, lz);
      leg.castShadow = true;
      stand.add(leg);
    }
    const standRing = new THREE.Mesh(new THREE.TorusGeometry(.31, .014, 10, 32), woodMat);
    standRing.rotation.x = Math.PI / 2;
    standRing.position.y = .34;
    stand.add(standRing);

    return .88;
  }

  function createSnakePlant(group, baseY) {
    const greens = [
      new THREE.MeshStandardMaterial({ color: '#315e45', roughness: .72, side: THREE.DoubleSide }),
      new THREE.MeshStandardMaterial({ color: '#497b58', roughness: .70, side: THREE.DoubleSide }),
      new THREE.MeshStandardMaterial({ color: '#244f3a', roughness: .76, side: THREE.DoubleSide })
    ];
    const stripeMat = new THREE.MeshBasicMaterial({ color: '#93aa68', transparent: true, opacity: .5, side: THREE.DoubleSide, toneMapped: true });

    const heights = [1.04,.86,1.18,.94,1.28,.78,1.12,.90,1.22,.82,1.04,1.14];
    heights.forEach((h, i) => {
      const a = i / heights.length * Math.PI * 2 + (i % 3) * .18;
      const rad = .05 + (i % 4) * .028;
      const geo = makeIndoorLeafGeometry(.18 + (i % 3) * .025, h, .08 + (i % 2) * .035, 12);
      const leaf = new THREE.Mesh(geo, greens[i % greens.length]);
      leaf.position.set(Math.cos(a) * rad, baseY, Math.sin(a) * rad);
      leaf.rotation.y = a + Math.PI * .5;
      leaf.rotation.z = Math.cos(a) * (.07 + (i % 2) * .035);
      leaf.castShadow = true;
      group.add(leaf);

      // Narrow central variegation stripe laid just in front of the leaf.
      const stripeGeo = makeIndoorLeafGeometry(.025, h * .94, .081 + (i % 2) * .035, 12);
      const stripe = new THREE.Mesh(stripeGeo, stripeMat);
      stripe.position.copy(leaf.position);
      stripe.position.y += .015;
      stripe.rotation.copy(leaf.rotation);
      stripe.scale.z = 1.01;
      group.add(stripe);
    });
  }

  function createBirdOfParadise(group, baseY) {
    const stemMat = new THREE.MeshStandardMaterial({ color: '#557a50', roughness: .78 });
    const leafMats = [
      new THREE.MeshStandardMaterial({ color: '#3c754f', roughness: .68, side: THREE.DoubleSide }),
      new THREE.MeshStandardMaterial({ color: '#4f8a5c', roughness: .66, side: THREE.DoubleSide }),
      new THREE.MeshStandardMaterial({ color: '#2f6847', roughness: .72, side: THREE.DoubleSide })
    ];
    const veins = new THREE.MeshBasicMaterial({ color: '#b7c990', transparent: true, opacity: .24, side: THREE.DoubleSide, toneMapped: true });

    const specs = [
      [-.18, .02, 1.02, -.54, .06], [.18,.01,1.16,.58,.04], [-.04,.10,1.32,-.20,.05],
      [.08,-.08,1.06,.34,.03], [-.16,-.10,.90,-.78,.04], [.20,.08,.94,.82,.025], [0,-.02,1.22,.12,.04]
    ];
    specs.forEach((s, i) => {
      const [sx, sz, stemH, lean, twist] = s;
      const start = new THREE.Vector3(sx * .35, baseY, sz * .35);
      const end = new THREE.Vector3(sx + lean * .18, baseY + stemH, sz + Math.sin(i * 1.3) * .08);
      addCylinderBetween(group, start, end, .018 + (i % 2) * .003, stemMat, 10);

      const geo = makeIndoorLeafGeometry(.40 + (i % 2) * .06, .72 + (i % 3) * .08, .15 + (i % 2) * .04, 12);
      const leaf = new THREE.Mesh(geo, leafMats[i % leafMats.length]);
      leaf.position.copy(end);
      leaf.rotation.y = Math.atan2(end.x, end.z) + (i % 2 ? .4 : -.3) + twist;
      leaf.rotation.z = lean * .54;
      leaf.rotation.x = -.08 + (i % 3) * .04;
      leaf.castShadow = true;
      group.add(leaf);

      const veinGeo = makeIndoorLeafGeometry(.025, .67 + (i % 3) * .07, .151 + (i % 2) * .04, 12);
      const vein = new THREE.Mesh(veinGeo, veins);
      vein.position.copy(leaf.position);
      vein.rotation.copy(leaf.rotation);
      vein.position.y += .015;
      group.add(vein);
    });
  }

  function createOlivePlant(group, baseY) {
    const trunkMat = new THREE.MeshStandardMaterial({ color: '#77634b', roughness: .88 });
    const branchMat = new THREE.MeshStandardMaterial({ color: '#806b50', roughness: .86 });
    const leafMats = [
      new THREE.MeshStandardMaterial({ color: '#6f8468', roughness: .78, side: THREE.DoubleSide }),
      new THREE.MeshStandardMaterial({ color: '#829477', roughness: .76, side: THREE.DoubleSide }),
      new THREE.MeshStandardMaterial({ color: '#5f785d', roughness: .8, side: THREE.DoubleSide })
    ];

    const trunkBase = new THREE.Vector3(0, baseY, 0);
    const trunkTop = new THREE.Vector3(.015, baseY + 1.08, .01);
    addCylinderBetween(group, trunkBase, trunkTop, .045, trunkMat, 12);

    const branchTips = [
      new THREE.Vector3(-.38,baseY+1.48,.05), new THREE.Vector3(.34,baseY+1.58,.08),
      new THREE.Vector3(-.27,baseY+1.73,-.14), new THREE.Vector3(.23,baseY+1.82,-.09),
      new THREE.Vector3(.05,baseY+1.96,.06), new THREE.Vector3(-.43,baseY+1.35,-.12),
      new THREE.Vector3(.42,baseY+1.40,-.06)
    ];
    branchTips.forEach((tip, i) => {
      const join = new THREE.Vector3((i % 2 ? .018 : -.014), baseY + .88 + (i % 3) * .08, (i % 3 - 1) * .015);
      addCylinderBetween(group, join, tip, .018 + (i % 2) * .003, branchMat, 9);

      // Olive leaf clusters: many small narrow leaves with varied orientation.
      for (let j = 0; j < 7; j++) {
        const t = .34 + j / 10;
        const pos = join.clone().lerp(tip, Math.min(.94, t));
        const side = j % 2 ? 1 : -1;
        const leaf = new THREE.Mesh(makeIndoorLeafGeometry(.10, .28, .035, 6), leafMats[(i + j) % leafMats.length]);
        leaf.position.copy(pos);
        leaf.position.x += side * (.035 + (j % 3) * .014);
        leaf.rotation.y = i * .68 + side * .85 + j * .18;
        leaf.rotation.z = side * (.78 + (j % 3) * .08);
        leaf.rotation.x = -.15 + (j % 3) * .12;
        leaf.castShadow = j % 2 === 0;
        group.add(leaf);
      }
    });
  }

  function createPlant(x, y, z, scale = .55, style = 'snake') {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    group.scale.setScalar(scale);
    scene.add(group);

    const baseY = createPremiumPlanter(group, style === 'bird' ? 1 : style === 'olive' ? 2 : 0);
    if (style === 'snake') createSnakePlant(group, baseY);
    else if (style === 'bird') createBirdOfParadise(group, baseY);
    else createOlivePlant(group, baseY);
  }

  function loadBuddies() {
    const loader = new GLTFLoader();
    loader.load('assets/ask_agent.glb', gltf => {
      try {
      if (failed) return;
      const base = gltf.scene;
      base.traverse(o => {
        if (o.isMesh) {
          o.castShadow = true;
          o.receiveShadow = true;
        }
      });

      for (const id of Object.keys(agents)) createBuddy(base, id);
      loaded = true;
      sync();
      fitHomeCamera();
      resetCamera();
      camera.position.copy(homeCameraPos);
      lookCurrent.copy(homeLook);
      camera.lookAt(lookCurrent);
      camera.updateMatrixWorld();
      updateConfiguration();
      renderer.shadowMap.needsUpdate = true;
      markActivity(1600);

      // Render one complete frame immediately, then reveal the scene. This keeps
      // the loader from waiting on a second full-scene shader warm-up pass.
      renderer.render(scene, camera);
      sceneError?.classList.add('hidden');
      requestAnimationFrame(() => sceneLoader.classList.add('hidden'));
      postToParent({ type: 'bookbuy:hq-status', status: 'ready' });
      } catch (error) { failScene(error); }
    }, undefined, err => {
      failScene(err);
    });
  }

  function createBuddy(base, id) {
    const root = base.clone(true);
    root.name = `Buddy_${id}`;
    root.scale.setScalar(.56);
    root.position.copy(buddyPositions[id]);
    root.position.y = state.selected.has(id) ? buddyPositions[id].y + .08 : .005;
    root.rotation.y = 0;

    root.traverse(o => {
      if (o.isMesh) {
        if (Array.isArray(o.material)) o.material = o.material.map(m => m.clone());
        else if (o.material) o.material = o.material.clone();
        o.castShadow = true;
        o.receiveShadow = true;
        o.userData.agentId = id;
        hitMeshes.push(o);
      }
    });

    skinRole(root, id);
    tintGlow(root, id);

    const face = root.getObjectByName('Face_Display');
    const glowMeshes = ['Body_Seam_Glow', 'Base_Glow_Ring']
      .map(name => root.getObjectByName(name))
      .filter(Boolean);
    const initiallyActive = state.selected.has(id);
    if (face?.material?.color) face.material.color.setScalar(initiallyActive ? 1 : .035);
    glowMeshes.forEach(mesh => {
      if (mesh.material && 'emissiveIntensity' in mesh.material) {
        mesh.userData.fullEmissiveIntensity = mesh.material.emissiveIntensity || 1.75;
        mesh.material.emissiveIntensity = initiallyActive ? mesh.userData.fullEmissiveIntensity : .02;
      }
    });

    // Make the head a real transform rig so it can nod/look around independently.
    const headRig = new THREE.Group();
    headRig.name = `HeadRig_${id}`;
    headRig.position.set(0, 2.26, 0);
    root.add(headRig);
    ['Head_White', 'Face_Housing', 'Face_Display', 'Side_Button_White', 'Side_Button_Ring'].forEach(name => {
      const part = root.getObjectByName(name);
      if (part) headRig.attach(part);
    });

    // Selection/working illumination beneath the supplied floating base.
    const ringMat = new THREE.MeshBasicMaterial({ color: agentAccent(id), transparent: true, opacity: initiallyActive ? .42 : 0, toneMapped: false });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.57, .028, 14, 64), ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = .055;
    root.add(ring);
    const glow = new THREE.Mesh(
      new THREE.PlaneGeometry(1.55, 1.55),
      new THREE.MeshBasicMaterial({
        map: getSoftGlowTexture(), color: agentAccent(id), transparent: true,
        opacity: initiallyActive ? .13 : 0, depthWrite: false,
        blending: THREE.AdditiveBlending, toneMapped: false
      })
    );
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = .012;
    glow.renderOrder = 2;
    root.add(glow);

    const runtime = {
      id, root, headRig, ring, glow, face, glowMeshes,
      basePos: buddyPositions[id].clone(),
      baseScale: .56,
      phase: Object.keys(agents).indexOf(id) * 1.13,
      active: initiallyActive,
      working: false,
      interacting: false,
      meeting: false,
      meetingStart: 0,
      power: initiallyActive ? 1 : 0,
      pulseUntil: 0,
      toggleUntil: 0,
      toggleMode: 'activate',
      targetRingOpacity: initiallyActive ? .48 : 0,
      targetGlowIntensity: initiallyActive ? .62 : 0,
      label: makeLabel(id)
    };
    runtimes.set(id, runtime);
    scene.add(root);
  }

  function skinRole(root, id) {
    const role = agents[id];
    const whiteMat = new THREE.MeshPhysicalMaterial({ color: '#F2F2F5', roughness: .42, metalness: 0, clearcoat: .18, clearcoatRoughness: .34 });
    const bodyMat = new THREE.MeshPhysicalMaterial({ color: role.color, roughness: .23, metalness: 0, clearcoat: .45, clearcoatRoughness: .2 });
    const trimMat = new THREE.MeshPhysicalMaterial({ color: '#2B2E33', roughness: .36, metalness: .05, clearcoat: .2, clearcoatRoughness: .25 });
    const faceHousingMat = new THREE.MeshPhysicalMaterial({ color: '#2B2E33', roughness: .14, metalness: .03, clearcoat: .62, clearcoatRoughness: .08 });

    const body = root.getObjectByName('Body_Blue');
    if (body) body.material = bodyMat;
    ['Head_White', 'Side_Button_White', 'Underside_White'].forEach(name => {
      const mesh = root.getObjectByName(name);
      if (mesh) mesh.material = whiteMat;
    });
    ['Side_Button_Ring', 'Base_Foot'].forEach(name => {
      const mesh = root.getObjectByName(name);
      if (mesh) mesh.material = trimMat;
    });
    const faceHousing = root.getObjectByName('Face_Housing');
    if (faceHousing) faceHousing.material = faceHousingMat;

    const face = root.getObjectByName('Face_Display');
    if (face) {
      const tex = makeIconTexture(id, agentAccent(id), false);
      face.material = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, side: THREE.DoubleSide, transparent: true });
    }
  }

  function tintGlow(root, id) {
    const color = new THREE.Color(agentAccent(id));
    ['Body_Seam_Glow', 'Base_Glow_Ring'].forEach(name => {
      const mesh = root.getObjectByName(name);
      if (!mesh || !mesh.material) return;
      const m = mesh.material.clone();
      if ('color' in m) m.color.copy(color).lerp(new THREE.Color('#ffffff'), .1);
      if ('emissive' in m) m.emissive.copy(color);
      m.emissiveIntensity = 1.75;
      mesh.material = m;
    });
  }

  function makeIconTexture(id, color, chest = false) {
    const c = document.createElement('canvas');
    c.width = chest ? 512 : 768;
    c.height = chest ? 420 : 512;
    const g = c.getContext('2d');
    const w = c.width, h = c.height;
    g.clearRect(0, 0, w, h);
    const r = chest ? 78 : 108;
    roundRect(g, chest ? 30 : 18, chest ? 24 : 10, w - (chest ? 60 : 36), h - (chest ? 48 : 20), r);
    g.fillStyle = '#15181d';
    g.fill();
    const grad = g.createRadialGradient(w * .45, h * .4, 10, w * .45, h * .4, chest ? 250 : 320);
    grad.addColorStop(0, 'rgba(255,255,255,.055)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fill();
    g.strokeStyle = 'rgba(255,255,255,.1)';
    g.lineWidth = chest ? 6 : 8;
    g.stroke();
    g.save();
    g.translate(w / 2, h / 2);
    const scale = chest ? .68 : 1;
    g.scale(scale, scale);
    g.strokeStyle = '#ffffff';
    g.fillStyle = '#ffffff';
    g.lineWidth = chest ? 22 : 26;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.shadowColor = color;
    g.shadowBlur = chest ? 26 : 40;
    drawRoleIcon(g, id, chest);
    g.restore();
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    tex.needsUpdate = true;
    return tex;
  }

  function roundRect(g, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    g.beginPath();
    g.moveTo(x + rr, y); g.arcTo(x + w, y, x + w, y + h, rr); g.arcTo(x + w, y + h, x, y + h, rr); g.arcTo(x, y + h, x, y, rr); g.arcTo(x, y, x + w, y, rr); g.closePath();
  }

  function drawRoleIcon(g, id, chest = false) {
    const s = chest ? .82 : 1;
    g.scale(s, s);

    if (id === 'ask') {
      // BUY — clean isometric package cube.
      g.beginPath();
      g.moveTo(0, -94); g.lineTo(92, -48); g.lineTo(0, 0); g.lineTo(-92, -48); g.closePath(); g.stroke();
      g.beginPath(); g.moveTo(-92, -48); g.lineTo(-92, 48); g.lineTo(0, 98); g.lineTo(0, 0); g.stroke();
      g.beginPath(); g.moveTo(92, -48); g.lineTo(92, 48); g.lineTo(0, 98); g.stroke();
      g.beginPath(); g.moveTo(0, -94); g.lineTo(0, 0); g.stroke();
      return;
    }

    if (id === 'plan') {
      // BOOK — calendar / bookings.
      roundRect(g, -100, -76, 200, 166, 24); g.stroke();
      g.beginPath(); g.moveTo(-100, -30); g.lineTo(100, -30); g.stroke();
      [-54, 0, 54].forEach(x => { g.beginPath(); g.arc(x, 15, 8, 0, Math.PI * 2); g.fill(); });
      [-54, 0, 54].forEach(x => { g.beginPath(); g.arc(x, 54, 8, 0, Math.PI * 2); g.fill(); });
      g.beginPath(); g.moveTo(-52, -98); g.lineTo(-52, -58); g.moveTo(52, -98); g.lineTo(52, -58); g.stroke();
      return;
    }

    if (id === 'research') {
      // MESSAGES — a customer conversation bubble.
      g.beginPath();
      g.moveTo(-78, -76); g.lineTo(76, -76);
      g.quadraticCurveTo(98, -76, 98, -54); g.lineTo(98, 36);
      g.quadraticCurveTo(98, 58, 76, 58); g.lineTo(-26, 58);
      g.lineTo(-78, 94); g.lineTo(-78, 58);
      g.quadraticCurveTo(-98, 58, -98, 36); g.lineTo(-98, -54);
      g.quadraticCurveTo(-98, -76, -78, -76); g.closePath(); g.stroke();
      [-42, 0, 42].forEach(x => { g.beginPath(); g.arc(x, -8, 8, 0, Math.PI * 2); g.fill(); });
      return;
    }

    if (id === 'manage') {
      // ANALYTICS — bars + trend line.
      const bars = [[-86, 48, 34, 58], [-30, 22, 34, 84], [26, -10, 34, 116], [82, -50, 34, 156]];
      bars.forEach(([x,y,w,h]) => { roundRect(g, x - w/2, y - h/2, w, h, 8); g.fill(); });
      g.beginPath(); g.moveTo(-104, -4); g.lineTo(-48, -32); g.lineTo(5, -10); g.lineTo(58, -62); g.lineTo(104, -88); g.stroke();
      return;
    }

    if (id === 'execute') {
      // OFFICE — briefcase.
      roundRect(g, -104, -54, 208, 142, 24); g.stroke();
      roundRect(g, -44, -98, 88, 48, 16); g.stroke();
      g.beginPath(); g.moveTo(-104, 2); g.lineTo(104, 2); g.stroke();
      g.beginPath(); g.moveTo(-18, -10); g.lineTo(18, -10); g.lineTo(18, 18); g.lineTo(-18, 18); g.closePath(); g.fill();
      return;
    }

    if (id === 'ebusiness') {
      // E-BUSINESS — connected globe/platform.
      g.beginPath(); g.arc(0, 0, 94, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.ellipse(0, 0, 42, 94, 0, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.ellipse(0, 0, 94, 38, 0, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.moveTo(-88, -42); g.lineTo(88, -42); g.moveTo(-88, 42); g.lineTo(88, 42); g.stroke();
      return;
    }
  }

  function makeLabel(id) {
    const el = document.createElement('div');
    el.className = 'agent-label';
    el.style.setProperty('--agent-color', agents[id].color);
    el.append(document.createTextNode(agents[id].name));
    const caption = document.createElement('small');
    caption.textContent = 'Idle';
    el.appendChild(caption);
    sceneLabels.appendChild(el);
    labels.set(id, el);
    return el;
  }

  function bindPointer() {
    container.addEventListener('pointermove', e => {
      const r = pointerRect;
      const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
      const ny = -((e.clientY - r.top) / r.height) * 2 + 1;
      pointer.set(nx, ny);
      rayPointer.set(nx, ny);
      pointerDirty = true;
      markActivity(450);
    }, { passive: true });
    container.addEventListener('pointerleave', () => {
      pointer.set(0, 0); pointerDirty = false; hoveredAgent = null; renderer.domElement.classList.remove('agent-hover');
    });
    container.addEventListener('click', event => {
      // Touch can click without ever firing pointermove. Use this click's position.
      pointerRect = renderer.domElement.getBoundingClientRect();
      rayPointer.set(((event.clientX - pointerRect.left) / pointerRect.width) * 2 - 1, -((event.clientY - pointerRect.top) / pointerRect.height) * 2 + 1);
      updateHover(); pointerDirty = false;
      if (!hoveredAgent) return;
      openAgentInteraction(hoveredAgent);
    });
    container.addEventListener('dblclick', e => {
      e.preventDefault();
      if (pointerDirty) { updateHover(); pointerDirty = false; }
      if (hoveredAgent) openAgentInteraction(hoveredAgent);
    });
  }

  function updateHover() {
    if (!loaded) return;
    raycaster.setFromCamera(rayPointer, camera);
    const hits = raycaster.intersectObjects(hitMeshes, false);
    hoveredAgent = hits.length ? hits[0].object.userData.agentId : null;
    renderer.domElement.classList.toggle('agent-hover', !!hoveredAgent);
  }

  function pulse(id, mode = 'activate') {
    const r = runtimes.get(id);
    if (!r) return;
    const now = performance.now();
    r.pulseUntil = now + 900;
    r.toggleUntil = now + 900;
    r.toggleMode = mode;
    markActivity(1200);
  }

  function startMeeting(ids) {
    meetingMode = true;
    if (smartTableScreenMat) smartTableScreenMat.opacity = .98;
    smartTableEdgeMats.forEach((m, i) => m.opacity = i === 4 ? .78 : .68);
    setWorkstations(ids, 'meeting');
    const selected = new Set(ids);
    let order = 0;
    const now = performance.now();
    runtimes.forEach((r, id) => {
      r.meeting = selected.has(id) && meetingSpots.has(id);
      r.meetingStart = r.meeting ? now + order++ * 110 : 0;
      r.working = false;
    });
    markActivity(3600);
  }

  function endMeeting() {
    meetingMode = false;
    if (smartTableScreenMat) smartTableScreenMat.opacity = .62;
    smartTableEdgeMats.forEach((m, i) => m.opacity = i === 4 ? .26 : .28);
    runtimes.forEach(r => r.meeting = false);
    markActivity(1600);
  }

  function focusMeeting(hold = 2600) {
    focusedAgent = 'meeting';
    focusHold = performance.now() + hold;
    cameraDesired.set(meetingCenter.x - 3.9, 5.2, meetingCenter.z + 5.9);
    lookDesired.set(meetingCenter.x, .95, meetingCenter.z);
    markActivity(hold + 500);
  }

  function setWorking(id) {
    workingAgent = id;
    runtimes.forEach((r, rid) => r.working = rid === id);
    if (id) setWorkstations([...state.selected], 'queued', id);
    markActivity(id ? 1800 : 800);
  }

  function beginInteraction(id, previousId = null) {
    const now = performance.now();
    runtimes.forEach((r, rid) => {
      const shouldActivate = rid === id;
      const wasActive = r.active;
      r.interacting = shouldActivate;
      r.active = shouldActivate;

      if (shouldActivate) {
        r.targetRingOpacity = .82;
        r.targetGlowIntensity = 1.25;
        if (!wasActive) {
          r.pulseUntil = now + 900;
          r.toggleUntil = now + 900;
          r.toggleMode = 'activate';
        }
      } else {
        r.targetRingOpacity = 0;
        r.targetGlowIntensity = 0;
        if (wasActive || rid === previousId) {
          r.pulseUntil = now + 760;
          r.toggleUntil = now + 760;
          r.toggleMode = 'deactivate';
        }
      }
    });
    markActivity(5200);
    if (renderer) renderer.shadowMap.needsUpdate = true;
  }

  function endInteraction(id) {
    const r = runtimes.get(id);
    if (r) {
      const now = performance.now();
      r.interacting = false;
      r.active = false;
      r.targetRingOpacity = 0;
      r.targetGlowIntensity = 0;
      r.pulseUntil = now + 760;
      r.toggleUntil = now + 760;
      r.toggleMode = 'deactivate';
    }
    markActivity(1500);
    if (renderer) renderer.shadowMap.needsUpdate = true;
  }

  function focusInteraction(id) {
    if (!runtimes.has(id)) return;
    camera.clearViewOffset();
    focusedAgent = id;
    focusHold = 0; // Stay with the Buddy until the user explicitly goes back.
    const p = runtimes.get(id).basePos;
    const leftSide = p.x < -.8;
    const rightSide = p.x > .8;
    const lateral = leftSide ? 1.08 : rightSide ? -1.08 : .82;
    cameraDesired.set(p.x + lateral, 2.72, p.z + 3.45);
    lookDesired.set(p.x, 1.35, p.z + .02);
    if (camera.aspect < 1) {
      const direction = cameraDesired.clone().sub(lookDesired);
      // Keep the close-up's character while giving the body enough width on phones.
      cameraDesired.copy(lookDesired).addScaledVector(direction, Math.max(1, .75 / camera.aspect));
    }
    markActivity(5000);
  }

  function focus(id, hold = 1600) {
    if (!runtimes.has(id)) return;
    focusedAgent = id;
    focusHold = performance.now() + hold;
    const p = runtimes.get(id).basePos;
    const idx = Object.keys(agents).indexOf(id);
    const side = idx % 2 === 0 ? 1 : -1;
    // Over-the-shoulder workstation composition: the Buddy and its monitor stay
    // in the same shot while the robot turns toward the desk to work.
    cameraDesired.set(p.x + side * 2.0, 3.75 + (idx % 3) * .12, p.z + 4.25);
    lookDesired.set(p.x + .08, 1.25, p.z - .78);
    markActivity(hold + 500);
  }

  function focusComplete(hold = 1000) {
    focusedAgent = 'complete';
    focusHold = performance.now() + hold;
    cameraDesired.set(defaultCameraPos.x + .65, defaultCameraPos.y + .55, defaultCameraPos.z + .6);
    lookDesired.set(.55, 1.0, -.55);
    markActivity(hold + 500);
  }

  function resetCamera() {
    focusedAgent = null;
    focusHold = 0;
    fitHomeCamera();
    cameraDesired.copy(homeCameraPos);
    lookDesired.copy(homeLook);
    markActivity(1200);
  }

  function sync(forceComplete = false) {
    runtimes.forEach((r, id) => {
      const shouldBeActive = state.selected.has(id);
      r.active = shouldBeActive;
      r.interacting = state.interactingAgent === id;
      r.working = false;
      r.targetRingOpacity = r.interacting ? .82 : shouldBeActive ? .48 : 0;
      r.targetGlowIntensity = r.interacting ? 1.25 : shouldBeActive ? .62 : 0;
      r.label.classList.toggle('active', shouldBeActive);
      r.label.classList.remove('working');
      const small = r.label.querySelector('small');
      if (small) small.textContent = shouldBeActive ? 'Active' : 'Idle';
    });
  }

  function animate() {
    try { renderFrame(); } catch (error) { failScene(error); }
  }

  function renderFrame() {
    animationFrame = 0;
    const now = performance.now();
    if (failed || !sceneVisible || !sceneActive) {
      lastFrameMs = now;
      return;
    }
    animationFrame = requestAnimationFrame(animate);

    let highMotion = state.busy || meetingMode || !!focusedAgent || now < activityUntil;
    if (!highMotion) {
      runtimes.forEach(r => {
        if (r.working || r.toggleUntil > now || r.pulseUntil > now) highMotion = true;
      });
    }

    const fps = reducedMotion ? 8 : highMotion ? performanceProfile.activeFps : performanceProfile.idleFps;
    const frameInterval = 1000 / fps;
    if (lastFrameMs && now - lastFrameMs < frameInterval * .82) return;
    const dt = Math.min(.05, lastFrameMs ? (now - lastFrameMs) / 1000 : 1 / 60);
    lastFrameMs = now;
    const t = reducedMotion ? 0 : clock.getElapsedTime();

    // If a machine cannot hold smooth motion for a sustained period, trim only
    // internal render resolution in small steps. Layout/model quality stays the
    // same, and fast machines never pay this downgrade.
    if (loaded && highMotion) {
      slowFrameScore = dt > .024 ? Math.min(120, slowFrameScore + 1) : Math.max(0, slowFrameScore - .35);
      const minRatio = constrainedDevice ? 1.0 : 1.15;
      if (slowFrameScore > 48 && currentPixelRatio > minRatio + .01) {
        currentPixelRatio = Math.max(minRatio, currentPixelRatio - .1);
        renderer.setPixelRatio(currentPixelRatio);
        renderer.setSize(lastW, lastH, false);
        pointerRect = renderer.domElement.getBoundingClientRect();
        renderer.shadowMap.needsUpdate = true;
        slowFrameScore = 0;
      }
    }

    if (pointerDirty) {
      updateHover();
      pointerDirty = false;
    }

    if (focusHold && now > focusHold && !state.busy) resetCamera();
    if (!focusedAgent && !state.busy) {
      // Default office view is intentionally locked. Pointer movement still drives
      // agent hover/raycasting, but it never nudges or sways the camera.
      cameraDesired.copy(homeCameraPos);
      lookDesired.copy(homeLook);
    } else if (focusedAgent === 'meeting' && meetingMode) {
      // Subtle director drift gives the meeting shot life without an expensive camera rig.
      cameraDesired.set(
        meetingCenter.x - 3.9 + Math.sin(t * .34) * .24,
        5.2 + Math.sin(t * .22) * .06,
        meetingCenter.z + 5.9 + Math.cos(t * .34) * .16
      );
      lookDesired.set(meetingCenter.x, .98, meetingCenter.z);
    } else if (workingAgent && focusedAgent === workingAgent && runtimes.has(workingAgent)) {
      const p = runtimes.get(workingAgent).basePos;
      const idx = Object.keys(agents).indexOf(workingAgent);
      const side = idx % 2 === 0 ? 1 : -1;
      cameraDesired.set(
        p.x + side * (2.0 + Math.sin(t * .42 + idx) * .07),
        3.75 + (idx % 3) * .12 + Math.sin(t * .27) * .035,
        p.z + 4.25
      );
      lookDesired.set(p.x + .08, 1.25, p.z - .78);
    }

    camera.position.lerp(cameraDesired, damp(2.15, dt));
    lookCurrent.lerp(lookDesired, damp(3.4, dt));
    camera.lookAt(lookCurrent);

    runtimes.forEach(r => {
      const toggling = !reducedMotion && r.toggleUntil > now;
      const togglePhase = Math.max(0, Math.min(1, 1 - ((r.toggleUntil - now) / 900)));
      const burst = toggling ? Math.sin(togglePhase * Math.PI) : 0;

      // Power state drives the complete activation/deactivation choreography.
      // Face wakes first, then the hover ring follows. On shutdown the ring goes
      // dark and the Buddy settles physically onto the floor.
      r.power = THREE.MathUtils.lerp(r.power, r.active ? 1 : 0, damp(r.active ? 7.5 : 6.2, dt));
      const faceLevel = THREE.MathUtils.clamp(r.power, 0, 1);
      const hoverLevel = THREE.MathUtils.smoothstep(faceLevel, .16, .92);
      if (r.face?.material?.color) {
        const screenLevel = .035 + faceLevel * .965;
        r.face.material.color.setRGB(screenLevel, screenLevel, screenLevel);
      }
      r.glowMeshes.forEach(mesh => {
        if (!mesh.material || !('emissiveIntensity' in mesh.material)) return;
        const full = mesh.userData.fullEmissiveIntensity || 1.75;
        mesh.material.emissiveIntensity = full * (.012 + faceLevel * .988);
      });

      const workLift = r.working ? .09 : 0;
      const bobSpeed = r.working ? 3.1 : (r.meeting ? 1.85 : 1.18);
      const bobAmount = (r.working ? .046 : (r.meeting ? .026 : .024)) * faceLevel;
      const bob = Math.sin(t * bobSpeed + r.phase) * bobAmount;
      const workForward = r.working ? -.34 : 0;
      const meetingReady = r.meeting && now >= r.meetingStart && r.active;
      const meetingSpot = meetingReady ? meetingSpots.get(r.id) : null;
      const activationLift = toggling ? (r.toggleMode === 'activate' ? burst * .105 : -burst * .025) : 0;
      const activationScale = toggling ? (r.toggleMode === 'activate' ? burst * .085 : -burst * .045) : 0;
      const activationTurn = toggling ? (r.toggleMode === 'activate' ? burst * .07 : -burst * .035) : 0;
      const ringBurst = toggling ? (r.toggleMode === 'activate' ? 1 + burst * .34 : 1 + burst * .12) : 1;

      const targetX = meetingSpot ? meetingSpot.position.x : r.basePos.x;
      const targetZ = meetingSpot ? meetingSpot.position.z : r.basePos.z + workForward * faceLevel;
      const floorY = .005;
      const awakeY = r.basePos.y + .08 + workLift;
      // Meetings keep every Buddy upright at its normal hover/standing height.
      // Meetings keep every Buddy at its normal upright hover height.
      const targetY = meetingSpot
        ? THREE.MathUtils.lerp(floorY, r.basePos.y + .08, faceLevel)
        : THREE.MathUtils.lerp(floorY, awakeY, faceLevel) + activationLift;
      const moveLambda = r.meeting ? 4.7 : 7.7;

      r.root.position.x = THREE.MathUtils.lerp(r.root.position.x, targetX, damp(moveLambda, dt));
      r.root.position.z = THREE.MathUtils.lerp(r.root.position.z, targetZ, damp(moveLambda, dt));
      r.root.position.y = THREE.MathUtils.lerp(r.root.position.y, targetY + bob, damp(r.meeting ? 7.0 : 12.5, dt));

      let scale = r.baseScale * THREE.MathUtils.lerp(.985, 1, faceLevel);
      if (!reducedMotion && r.pulseUntil > now) scale *= 1 + Math.sin((r.pulseUntil - now) / 900 * Math.PI) * .035;
      scale *= 1 + activationScale;
      r.root.scale.setScalar(THREE.MathUtils.lerp(r.root.scale.x, scale, damp(9.8, dt)));

      const idleYaw = Math.sin(t * .65 + r.phase) * .025 * faceLevel;
      const meetingYaw = meetingSpot ? meetingSpot.rotationY + Math.sin(t * 1.25 + r.phase) * .035 : 0;
      const workYaw = Math.PI + Math.sin(t * 1.7 + r.phase) * .025;
      const faceCameraYaw = Math.atan2(camera.position.x - r.root.position.x, camera.position.z - r.root.position.z);
      const targetYaw = r.interacting ? faceCameraYaw : ((meetingSpot ? meetingYaw : r.working ? workYaw : idleYaw) + activationTurn);
      r.root.rotation.y = THREE.MathUtils.lerp(r.root.rotation.y, targetYaw, damp(r.meeting ? 5.3 : 5.7, dt));

      const meetingNod = r.meeting ? Math.sin(t * 2.0 + r.phase) * .034 : 0;
      const meetingLook = r.meeting ? Math.sin(t * 1.25 + r.phase) * .055 : 0;
      const activateNod = toggling ? (r.toggleMode === 'activate' ? burst * .07 : -burst * .025) : 0;
      const headX = (r.interacting ? Math.sin(t * 1.15 + r.phase) * .014 - .018 : r.working ? Math.sin(t * 3.4 + r.phase) * .045 : (meetingNod || Math.sin(t * .9 + r.phase) * .012) + activateNod) * faceLevel;
      const headY = (r.interacting ? Math.sin(t * .65 + r.phase) * .018 : r.working ? Math.sin(t * 2.1 + r.phase) * .08 : (meetingLook || Math.sin(t * .45 + r.phase) * .035)) * faceLevel;
      r.headRig.rotation.x = THREE.MathUtils.lerp(r.headRig.rotation.x, headX, damp(6.4, dt));
      r.headRig.rotation.y = THREE.MathUtils.lerp(r.headRig.rotation.y, headY, damp(5.0, dt));

      if (!reducedMotion) r.ring.rotation.z += (r.working ? 1.08 : (r.meeting ? .54 : .24)) * dt;
      const ringTarget = r.targetRingOpacity * hoverLevel + (toggling && r.toggleMode === 'activate' ? burst * .26 * hoverLevel : 0);
      r.ring.material.opacity = THREE.MathUtils.lerp(r.ring.material.opacity, Math.min(1, ringTarget), damp(10.8, dt));
      const glowTarget = (r.targetGlowIntensity + (toggling && r.toggleMode === 'activate' ? burst * .85 : 0)) * hoverLevel;
      const glowOpacity = Math.min(.48, glowTarget * .24);
      r.glow.material.opacity = THREE.MathUtils.lerp(r.glow.material.opacity, glowOpacity, damp(9.5, dt));
      r.ring.scale.setScalar(THREE.MathUtils.lerp(r.ring.scale.x, ringBurst, damp(12, dt)));
    });

    workstations.forEach((station, id) => {
      if (station.status === 'working' || station.status === 'review') {
        station.accent.material.opacity = .78 + Math.sin(t * 4.2 + id.length) * .18;
      }
    });

    const shadowInterval = 1000 / performanceProfile.shadowFps;
    if (now - lastShadowMs >= shadowInterval) {
      renderer.shadowMap.needsUpdate = true;
      lastShadowMs = now;
    }

    updateLabels();
    renderer.render(scene, camera);
  }

  function updateLabels() {
    // Labels are intentionally hidden in the minimal UI. Avoid five DOM writes
    // every animation frame while preserving the label system for future modes.
    if (!sceneLabels || sceneLabels.hidden || sceneLabels.dataset.disabled === 'true') return;
    if (!camera || !renderer) return;
    const rect = renderer.domElement.getBoundingClientRect();
    runtimes.forEach(r => {
      tmpVec.set(r.root.position.x, r.root.position.y + 2.15, r.root.position.z).project(camera);
      const x = (tmpVec.x * .5 + .5) * rect.width;
      const y = (-tmpVec.y * .5 + .5) * rect.height;
      r.label.style.left = `${x}px`;
      r.label.style.top = `${y}px`;
      r.label.style.display = tmpVec.z > 1 ? 'none' : '';
    });
  }

  let lastW = 0, lastH = 0;
  function fitHomeCamera() {
    if (!camera || !loaded || !lastW || !lastH) return;
    // Fit the actual six supplied models, rather than widening FOV and cropping
    // the front/back Buddies on tall phones. Decorative scenery can extend out.
    const bounds = new THREE.Box3();
    runtimes.forEach(runtime => bounds.union(new THREE.Box3().setFromObject(runtime.root)));
    bounds.expandByScalar(.26);
    if (bounds.isEmpty()) return;
    const portrait = camera.aspect < 1;
    homeLook.copy(portrait ? bounds.getCenter(new THREE.Vector3()) : defaultLook);
    // A front-facing phone view keeps both rows readable without looking through
    // the solid left wall. Keep the supplied diagonal composition on desktop.
    const direction = portrait ? new THREE.Vector3(0, .64, 1).normalize() : defaultCameraPos.clone().sub(defaultLook).normalize();
    const probe = camera.clone();
    probe.clearViewOffset();
    const topReserve = Math.min(62, lastH * .12);
    const bottomReserve = Math.min(lastW <= 700 ? 104 : 94, lastH * .28);
    probe.setViewOffset(lastW, lastH, 0, (bottomReserve - topReserve) * .5, lastW, lastH);
    let distance = defaultCameraPos.distanceTo(defaultLook);
    const corners = [];
    for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) corners.push(new THREE.Vector3(x, y, z));
    const top = 1 - (topReserve / lastH) * 2;
    const bottom = -1 + (bottomReserve / lastH) * 2;
    for (let attempt = 0; attempt < 60; attempt++) {
      probe.position.copy(homeLook).addScaledVector(direction, distance);
      probe.lookAt(homeLook);
      probe.updateMatrixWorld();
      if (corners.every(corner => {
        const projected = corner.clone().project(probe);
        return Math.abs(projected.x) <= .94 && projected.y <= top && projected.y >= bottom && projected.z < 1;
      })) break;
      distance *= 1.04;
    }
    homeCameraPos.copy(probe.position);
    camera.setViewOffset(lastW, lastH, 0, (bottomReserve - topReserve) * .5, lastW, lastH);
    if (!focusedAgent) {
      cameraDesired.copy(homeCameraPos);
      lookDesired.copy(homeLook);
    }
  }

  function updateConfiguration() {
    if (!scene) return;
    workstations.forEach((station, id) => {
      station.status = null;
      setWorkstationVisual(id);
    });
    scene.traverse(object => {
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        const kind = material?.map?.userData?.hqKind;
        if (!kind) continue;
        const previous = material.map;
        material.map = kind === 'wall' ? makeWallDisplayTexture() : kind === 'team' ? makeTeamPanelTexture() : makeSmartTableTexture();
        material.needsUpdate = true;
        previous.dispose();
      }
    });
    markActivity(600);
    if (renderer) renderer.shadowMap.needsUpdate = true;
  }

  function resize() {
    if (!renderer || !camera) return;
    const w = Math.max(1, container.clientWidth);
    const h = Math.max(1, container.clientHeight);
    if (w === lastW && h === lastH) return;
    lastW = w; lastH = h;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    fitHomeCamera();
    if (state.interactingAgent) focusInteraction(state.interactingAgent);
    pointerRect = renderer.domElement.getBoundingClientRect();
    renderer.shadowMap.needsUpdate = true;
    markActivity(500);
  }

  window.addEventListener('pagehide', event => {
    if (event.persisted) return;
    sceneActive = false;
    failed = true;
    cancelAnimationFrame(animationFrame);
    resizeObserver?.disconnect();
    const geometries = new Set();
    const materials = new Set();
    const textures = new Set();
    scene?.traverse(object => {
      if (object.geometry) geometries.add(object.geometry);
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        if (!material) continue;
        materials.add(material);
        for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
      }
    });
    geometries.forEach(geometry => geometry.dispose());
    textures.forEach(texture => texture.dispose());
    materials.forEach(material => material.dispose());
    renderer?.dispose();
  });

  return { init, resize, focus, focusInteraction, beginInteraction, endInteraction, resetCamera, sync, setSceneActive, updateConfiguration };
})()



dialogClose?.addEventListener('click', closeAgentInteraction);
dialogBackdrop?.addEventListener('click', closeAgentInteraction);
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && state.interactingAgent) {
    e.preventDefault();
    closeAgentInteraction();
  }
  if (e.key === 'Tab' && state.interactingAgent) {
    const buttons = [...agentDialog.querySelectorAll('button:not([disabled])')];
    const first = buttons[0];
    const last = buttons.at(-1);
    if (e.shiftKey && (document.activeElement === first || !agentDialog.contains(document.activeElement))) {
      e.preventDefault(); last?.focus();
    } else if (!e.shiftKey && (document.activeElement === last || !agentDialog.contains(document.activeElement))) {
      e.preventDefault(); first?.focus();
    }
  }
});

window.addEventListener('message', event => {
  if (event.source !== window.parent || event.origin !== location.origin || !event.data || typeof event.data !== 'object') return;
  if (event.data.type === 'bookbuy:hq-config') applyConfiguration(event.data);
  if (event.data.type === 'bookbuy:hq-open' && typeof event.data.id === 'string') openAgentInteraction(event.data.id);
  if (event.data.type === 'bookbuy:hq-close') closeAgentInteraction();
});

document.documentElement.classList.toggle('reduced-motion', reducedMotion);
postToParent({ type: 'bookbuy:hq-ready' });

sceneApi.init();
sceneApi.sync();
