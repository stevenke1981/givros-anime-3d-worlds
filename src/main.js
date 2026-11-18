import {
  MathUtils, NeutralToneMapping, PCFShadowMap, PerspectiveCamera, WebGLRenderer,
} from 'three';
import { createBlossomDetail } from './detail/blossom-splats.js';
import { createSakuraWorld } from './world/sakura.js';
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
const viewButtons = [...views.querySelectorAll('[data-view]')];
const walkingKeys = new Set([
  'KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
]);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const options = new URLSearchParams(location.search);
const traceWalk = options.has('trace-walk');
const camera = new PerspectiveCamera(46, 1, 0.14, 700);
camera.rotation.order = 'YXZ';

const pressedKeys = new Set();
const touchKeys = new Map();
let drag;
let renderer;
let world;
let failed = false;
let updateBlossomDetail;
let mode = 'scenic';
let previousTime;
let elapsed = 0;
let needsDraw = true;

function clearInput() {
  pressedKeys.clear();
  touchKeys.clear();
  drag = undefined;
}

function resize() {
  const width = canvas.clientWidth;
  const height = Math.max(canvas.clientHeight, 1);
  camera.aspect = width / height;

  const baseFov = mode === 'walk' ? 59 : 46;
  const fit = Math.max(1, 1.12 / Math.max(camera.aspect, 0.1));
  camera.fov = Math.min(83, MathUtils.radToDeg(2
    * Math.atan(Math.tan(MathUtils.degToRad(baseFov / 2)) * fit)));
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
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
}

function showView(id, restoreFocus = false) {
  if (!world || failed || !world.views[id]) return;
  pointCamera(world.views[id]);
  setMode('scenic');
  for (const button of viewButtons) {
    button.setAttribute('aria-pressed', String(button.dataset.view === id));
  }
  place.textContent = id === 'overview'
    ? '山村全景'
    : viewButtons.find((button) => button.dataset.view === id).textContent;
  if (restoreFocus) start.focus();
}

function startWalk() {
  if (!world || failed) return;
  pointCamera(world.spawn);
  setMode('walk');
  place.textContent = '山村散步';
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
  if (mode === 'walk' && !help.open && moveCamera(delta)) needsDraw = true;
  if (!reducedMotion.matches) {
    elapsed += delta;
    needsDraw = true;
  }
  if (!needsDraw) return;
  world.update(elapsed, delta, reducedMotion.matches);
  updateBlossomDetail?.(camera);
  renderer.render(world.scene, camera);
  needsDraw = false;
}

function showFailure(message) {
  if (failed) return;
  failed = true;
  clearInput();
  renderer?.setAnimationLoop(null);
  explorer.dataset.state = 'error';
  notice.hidden = false;
  notice.textContent = message;
  retry.hidden = false;
}

start.addEventListener('click', startWalk);
document.querySelector('#reset').addEventListener('click', startWalk);
document.querySelector('#stop').addEventListener('click', () => showView('overview', true));
document.querySelector('#help').addEventListener('click', () => {
  clearInput();
  help.showModal();
});
retry.addEventListener('click', () => location.reload());

for (const button of viewButtons) {
  button.addEventListener('click', () => showView(button.dataset.view));
}

window.addEventListener('keydown', (event) => {
  if (mode !== 'walk' || help.open || failed || event.altKey || event.ctrlKey || event.metaKey) return;
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

async function load() {
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
  canvas.addEventListener('webglcontextlost', () => {
    showFailure('3D 繪圖已中斷，請重新載入山村。');
  });

  try {
    world = await createSakuraWorld({ renderer });
    if (failed) return;
    if (options.get('splats') !== 'off') {
      updateBlossomDetail = createBlossomDetail(world.scene);
    }
    for (const button of viewButtons) {
      const available = Boolean(world.views[button.dataset.view]);
      button.hidden = !available;
      button.disabled = !available;
    }
    showView('overview');
    world.update(0, 0, reducedMotion.matches);
    updateBlossomDetail?.(camera);
    renderer.shadowMap.needsUpdate = true;
    renderer.render(world.scene, camera);
    start.disabled = false;
    explorer.dataset.state = 'ready';
    notice.hidden = true;
    new ResizeObserver(resize).observe(canvas);
    renderer.setAnimationLoop(drawFrame);
  } catch (error) {
    console.error(error);
    showFailure('山村載入失敗。請重新載入，或確認伺服器能提供模型檔案。');
  }
}

load();
