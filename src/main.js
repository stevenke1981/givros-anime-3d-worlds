import {
  MathUtils, NeutralToneMapping, PCFShadowMap, PerspectiveCamera, WebGLRenderer,
} from 'three';
import { createGaussianDetail } from './detail/gaussian-detail.js';
import { createLightingPipeline, hasLightingProfile } from './lighting/pipeline.js';
import { scenes } from './world/catalog.js';
import { disposeScene } from './world/dispose-scene.js';
import { advanceWalker, EYE_HEIGHT } from './walk.js';
import './style.css';

const explorer = document.querySelector('#explorer');
const canvas = document.querySelector('#world');
const place = document.querySelector('#place');
const notice = document.querySelector('#notice');
const retry = document.querySelector('#retry');
const start = document.querySelector('#start');
const views = document.querySelector('.views');
const welcome = document.querySelector('.welcome');
const walking = document.querySelector('.walking');
const help = document.querySelector('#help-dialog');
const sceneDialog = document.querySelector('#scene-dialog');
const sceneMenu = document.querySelector('#scene-menu');
const defaultViewLabels = {
  overview: '全景', bridge: '朱橋', village: '村落', fields: '水田',
  shrine: '神社', forest: '竹徑', overlook: '山腰', landmark: '主景', waterfront: '水岸',
};
const walkingKeys = new Set([
  'KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
]);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const options = new URLSearchParams(location.search);
const traceWalk = options.has('trace-walk');
const traceSplats = options.has('trace-splats');
const traceLighting = options.has('trace-lighting');
const legacyLighting = options.get('lighting') === 'legacy';
const coarse = matchMedia('(any-pointer: coarse)').matches;
const camera = new PerspectiveCamera(46, 1, 0.14, 700);
camera.rotation.order = 'YXZ';

const pressedKeys = new Set();
const touchKeys = new Map();
let drag;
let renderer;
let lighting;
let world;
let failed = false;
let loading = false;
let activeScene;
let requestedScene;
let lastSelected = scenes.find(({ id }) => id === options.get('scene')) ?? scenes[0];
let updateDetail;
let mode = 'scenic';
let previousTime;
let elapsed = 0;
let needsDraw = true;
let canvasWidth = 0;
let canvasHeight = 0;

function clearInput() {
  pressedKeys.clear();
  touchKeys.clear();
  drag = undefined;
}

function resize() {
  if (failed) return;
  const width = Math.max(canvas.clientWidth, 1);
  const height = Math.max(canvas.clientHeight, 1);
  camera.aspect = width / height;

  const baseFov = mode === 'walk' ? 59 : 46;
  const fit = Math.max(1, 1.12 / Math.max(camera.aspect, 0.1));
  camera.fov = Math.min(83, MathUtils.radToDeg(2
    * Math.atan(Math.tan(MathUtils.degToRad(baseFov / 2)) * fit)));
  camera.updateProjectionMatrix();
  if (width !== canvasWidth || height !== canvasHeight) {
    canvasWidth = width;
    canvasHeight = height;
    renderer.setSize(width, height, false);
    lighting.resize(width, height);
  }
  needsDraw = true;
}

function setMode(nextMode) {
  clearInput();
  mode = nextMode;
  explorer.dataset.mode = mode;
  welcome.hidden = mode === 'walk';
  views.hidden = mode === 'walk';
  walking.hidden = mode !== 'walk';
  resize();
}

function pointCamera(pose) {
  camera.position.fromArray(pose.position);
  camera.lookAt(...pose.target);
  if (traceLighting) canvas.dataset.cameraPose = JSON.stringify(pose);
}

function showView(id, restoreFocus = false) {
  if (!world || failed || !world.views[id]) return;
  pointCamera(world.views[id]);
  setMode('scenic');
  for (const button of views.querySelectorAll('button')) {
    button.setAttribute('aria-pressed', String(button.dataset.view === id));
  }
  place.textContent = world.viewLabels?.[id] ?? defaultViewLabels[id];
  if (restoreFocus) start.focus();
}

function startWalk() {
  if (!world || failed || explorer.dataset.state !== 'ready') return;
  pointCamera(world.spawn);
  setMode('walk');
  place.textContent = '散步中';
  recordWalkPosition();
  canvas.focus({ preventScroll: true });
}

function recordWalkPosition() {
  if (!traceWalk) return;
  canvas.dataset.walkPosition = camera.position.toArray().map((value) => value.toFixed(4)).join(',');
}

function moveCamera(delta) {
  const keys = new Set([...pressedKeys, ...touchKeys.values()]);
  const side = Number(keys.has('KeyD')) - Number(keys.has('KeyA'));
  const forward = Number(keys.has('KeyW') || keys.has('ArrowUp'))
    - Number(keys.has('KeyS') || keys.has('ArrowDown'));
  const turn = Number(keys.has('ArrowLeft')) - Number(keys.has('ArrowRight'));
  camera.rotation.y += turn * delta * 1.65;

  if (side || forward) {
    const yaw = camera.rotation.y;
    const speed = 4.6 * delta / Math.hypot(side, forward);
    const next = advanceWalker(world, camera.position, {
      x: (side * Math.cos(yaw) - forward * Math.sin(yaw)) * speed,
      z: (-side * Math.sin(yaw) - forward * Math.cos(yaw)) * speed,
    });
    camera.position.x = next.x;
    camera.position.z = next.z;
  }

  const eye = world.surfaceAt(camera.position.x, camera.position.z) + EYE_HEIGHT;
  const previousY = camera.position.y;
  camera.position.y = Math.abs(previousY - eye) < 0.001
    ? eye
    : MathUtils.damp(previousY, eye, 18, delta);
  const changed = Boolean(turn || side || forward || camera.position.y !== previousY);
  if (changed) recordWalkPosition();
  return changed;
}

function drawFrame(time) {
  const delta = Math.min((time - (previousTime ?? time)) / 1000, 0.05);
  previousTime = time;
  if (!world || explorer.dataset.state !== 'ready') return;
  if (mode === 'walk' && !help.open && !sceneDialog.open && moveCamera(delta)) needsDraw = true;
  if (!reducedMotion.matches) {
    elapsed += delta;
    needsDraw = true;
  }
  if (!needsDraw) return;
  world.update(elapsed, delta, reducedMotion.matches);
  updateDetail?.(camera);
  lighting.render(world.scene, camera);
  needsDraw = false;
}

function showFailure(message) {
  if (failed) return;
  failed = true;
  clearInput();
  renderer?.setAnimationLoop(null);
  sceneMenu.disabled = true;
  explorer.dataset.state = 'error';
  notice.hidden = false;
  notice.textContent = message;
  retry.hidden = false;
}

function disposeWorld(candidate) {
  lighting.release(candidate.scene);
  disposeScene(candidate.scene);
}

start.addEventListener('click', startWalk);
document.querySelector('#reset').addEventListener('click', startWalk);
document.querySelector('#stop').addEventListener('click', () => showView('overview', true));
document.querySelector('#help').addEventListener('click', () => {
  clearInput();
  help.showModal();
});
sceneMenu.addEventListener('click', () => {
  clearInput();
  sceneDialog.showModal();
});
retry.addEventListener('click', () => {
  if (failed) location.reload();
  else selectScene(lastSelected);
});

const sceneButtons = new Map(scenes.map((descriptor) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.dataset.sceneChoice = descriptor.id;
  const name = document.createElement('strong');
  const description = document.createElement('span');
  name.textContent = descriptor.name;
  description.textContent = descriptor.description;
  button.append(name, description);
  button.addEventListener('click', () => {
    sceneDialog.close();
    selectScene(descriptor);
  });
  return [descriptor, button];
}));
document.querySelector('#scene-options').append(...sceneButtons.values());

function selectScene(descriptor) {
  if (failed || (descriptor === activeScene && explorer.dataset.state === 'ready')) return;
  lastSelected = descriptor;
  requestedScene = descriptor;
  setMode('scenic');
  explorer.dataset.state = 'loading';
  start.disabled = true;
  retry.hidden = true;
  notice.hidden = false;
  notice.textContent = '正在載入「' + descriptor.name + '」…';
  if (!loading) loadRequestedScenes();
}

async function loadRequestedScenes() {
  loading = true;
  while (requestedScene && !failed) {
    const descriptor = requestedScene;
    requestedScene = undefined;
    let next;
    let reportProgress = true;
    try {
      if (descriptor === activeScene) {
        explorer.dataset.state = 'ready';
        notice.hidden = true;
        start.disabled = false;
        showView(world.initialView ?? 'overview');
        continue;
      }
      const module = descriptor.id === '01'
        ? await import('./world/sakura.js')
        : await import('./world/regions/index.js');
      if (requestedScene || failed) continue;
      const progress = (_fraction, message) => {
        if (reportProgress && !requestedScene && !failed && message) notice.textContent = descriptor.name + ' · ' + message;
      };
      const useBakedMaterials = !legacyLighting && hasLightingProfile(descriptor.id);
      const worldOptions = { renderer, onProgress: progress, useBakedMaterials };
      next = descriptor.id === '01'
        ? await module.createSakuraWorld(worldOptions)
        : await module.createRegionalWorld(descriptor.id, worldOptions);
      if (requestedScene || failed) {
        disposeWorld(next);
        continue;
      }

      if (options.get('ao') === 'off') {
        next.scene.traverse(({ material }) => {
          for (const part of Array.isArray(material) ? material : [material]) {
            if (part?.aoMap) part.aoMapIntensity = 0;
          }
        });
      }
      const lightingMode = lighting.apply(next.scene, descriptor.id);
      const detail = options.get('splats') === 'off' ? undefined : createGaussianDetail(next.scene, {
        detailScale: coarse ? 0.56 : 1,
        report: traceSplats ? (counts) => { canvas.dataset.gaussianCounts = JSON.stringify(counts); } : undefined,
      });
      const firstView = next.initialView ?? 'overview';
      pointCamera(next.views[firstView]);
      next.update(0, 0, reducedMotion.matches);
      detail?.(camera);
      renderer.shadowMap.needsUpdate = true;
      lighting.render(next.scene, camera);

      if (world) {
        disposeWorld(world);
        renderer.renderLists.dispose();
      }
      world = next;
      activeScene = descriptor;
      updateDetail = detail;
      elapsed = 0;
      explorer.dataset.scene = descriptor.id;
      explorer.dataset.lighting = lightingMode;
      explorer.dataset.state = 'ready';
      canvas.setAttribute('aria-label', descriptor.name + '即時 3D 場景');
      document.title = descriptor.name + '｜十景漫步';
      document.querySelector('#scene-name').textContent = descriptor.name;
      document.querySelector('#scene-description').textContent = descriptor.description;
      for (const [entry, button] of sceneButtons) {
        if (entry === activeScene) button.setAttribute('aria-current', 'true');
        else button.removeAttribute('aria-current');
      }
      views.replaceChildren(...Object.keys(world.views).map((id) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.view = id;
        button.textContent = world.viewLabels?.[id] ?? defaultViewLabels[id] ?? id;
        button.addEventListener('click', () => showView(id));
        return button;
      }));
      showView(firstView);
      notice.hidden = true;
      start.disabled = false;

      const url = new URL(location.href);
      url.searchParams.set('scene', descriptor.id);
      history.replaceState(null, '', url);
    } catch (error) {
      if (next && next !== world) disposeWorld(next);
      if (requestedScene || failed) continue;
      console.error(error);
      explorer.dataset.state = 'error';
      notice.textContent = '無法載入「' + descriptor.name + '」。請重試或選擇其他場景。';
      retry.hidden = false;
    } finally {
      reportProgress = false;
    }
  }
  loading = false;
}

window.addEventListener('keydown', (event) => {
  if (mode !== 'walk' || help.open || sceneDialog.open || failed || event.altKey || event.ctrlKey || event.metaKey) return;
  if (event.code === 'Escape') {
    event.preventDefault();
    showView('overview', true);
  } else if (walkingKeys.has(event.code)) {
    event.preventDefault();
    pressedKeys.add(event.code);
  }
});
window.addEventListener('keyup', (event) => pressedKeys.delete(event.code));
window.addEventListener('blur', clearInput);
reducedMotion.addEventListener('change', () => { needsDraw = true; });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) clearInput();
});

canvas.addEventListener('pointerdown', (event) => {
  if (mode !== 'walk' || event.button !== 0 || drag) return;
  canvas.setPointerCapture(event.pointerId);
  drag = { id: event.pointerId, x: event.clientX, y: event.clientY };
});
canvas.addEventListener('pointermove', (event) => {
  if (drag?.id !== event.pointerId) return;
  const sensitivity = event.pointerType === 'touch' ? 0.005 : 0.0035;
  camera.rotation.y -= (event.clientX - drag.x) * sensitivity;
  camera.rotation.x = MathUtils.clamp(
    camera.rotation.x - (event.clientY - drag.y) * sensitivity,
    -1.4, 1.4,
  );
  drag.x = event.clientX;
  drag.y = event.clientY;
  needsDraw = true;
});
canvas.addEventListener('lostpointercapture', (event) => {
  if (event.pointerId === drag?.id) drag = undefined;
});

for (const button of document.querySelectorAll('[data-hold]')) {
  button.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    touchKeys.set(event.pointerId, button.dataset.hold);
  });
  button.addEventListener('lostpointercapture', (event) => touchKeys.delete(event.pointerId));
}

function boot() {
  try {
    renderer = new WebGLRenderer({ canvas, antialias: true });
  } catch (error) {
    console.error(error);
    showFailure('此瀏覽器無法啟用 WebGL 2。請開啟硬體加速後重新載入。');
    return;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.65));
  renderer.toneMapping = NeutralToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;
  renderer.shadowMap.autoUpdate = false;
  lighting = createLightingPipeline(renderer, { legacy: legacyLighting, coarse });
  window.addEventListener('pagehide', (event) => {
    if (event.persisted) return;
    failed = true;
    renderer.setAnimationLoop(null);
    if (world) disposeWorld(world);
    lighting.dispose();
    renderer.dispose();
  });
  canvas.addEventListener('webglcontextlost', () => {
    showFailure('3D 繪圖已中斷，請重新載入頁面。');
  });
  new ResizeObserver(resize).observe(canvas);
  resize();
  renderer.setAnimationLoop(drawFrame);
  selectScene(lastSelected);
}

boot();
