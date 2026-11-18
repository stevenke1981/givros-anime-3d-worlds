import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DataTexture, Float32BufferAttribute, InstancedMesh, Matrix4, Mesh, MeshStandardMaterial, PerspectiveCamera, PlaneGeometry, Scene,
} from 'three';
import { createGaussianDetail } from '../src/detail/gaussian-detail.js';
import { disposeScene } from '../src/world/dispose-scene.js';
import { groundMaterial } from '../src/world/ground-material.js';

test('replacing a scene disposes each shared resource exactly once', () => {
  const texture = new DataTexture(new Uint8Array(4), 1, 1);
  const detail = new DataTexture(new Uint8Array(4), 1, 1);
  const material = groundMaterial(detail, { map: texture, roughnessMap: texture });
  const geometry = new PlaneGeometry();
  const scene = new Scene();
  scene.add(new Mesh(geometry, material), new Mesh(geometry, material));
  const calls = [];
  for (const [name, resource] of Object.entries({ detail, geometry, material, texture })) {
    resource.addEventListener('dispose', () => calls.push(name));
  }

  disposeScene(scene);

  assert.deepEqual(calls.toSorted(), ['detail', 'geometry', 'material', 'texture']);
  assert.equal(scene.children.length, 0);
});

test('Gaussian detail samples all tagged surfaces and clears the draw when they are behind the camera', () => {
  const scene = new Scene();
  for (const [kind, x, z, tilt] of [
    ['turf', 1, -3, -Math.PI / 2], ['shrub', -3, -10, 0],
    ['tree', 3, -11, 0], ['mountain', 0, -38, -Math.PI / 4],
  ]) {
    const mesh = new Mesh(new PlaneGeometry(5, 4, 4, 4), new MeshStandardMaterial({ color: '#459434' }));
    mesh.position.set(x, 0, z);
    mesh.rotation.x = tilt;
    mesh.userData.gaussianKind = kind;
    scene.add(mesh);
  }
  let counts;
  const update = createGaussianDetail(scene, { detailScale: 0.5, report: (value) => { counts = value; } });
  const camera = new PerspectiveCamera(59, 1.4, 0.1, 600);
  camera.position.set(0, 3, 7);
  camera.lookAt(0, 0, -9);
  update(camera);
  for (const kind of ['turf', 'shrub', 'tree', 'mountain']) assert.ok(counts[kind] > 0, kind);
  assert.ok(counts.turf <= 285);

  camera.lookAt(0, 3, 20);
  update(camera);
  assert.equal(Object.values(counts).reduce((total, value) => total + value, 0), 0);
  disposeScene(scene);
});

test('Gaussian detail reaches later plantings and respects snow and bare-ground coverage', () => {
  const scene = new Scene();
  const leaf = new PlaneGeometry(2, 2);
  const material = new MeshStandardMaterial({ color: '#537e4e' });
  const distant = new InstancedMesh(leaf, material, 90);
  const matrix = new Matrix4().makeTranslation(48, 0, -6);
  for (let i = 0; i < distant.count; i++) distant.setMatrixAt(i, matrix);
  distant.userData.gaussianKind = 'shrub';
  scene.add(distant);
  const local = new Mesh(leaf, material);
  local.userData.gaussianKind = 'shrub';
  local.position.set(0, 1, -6);
  scene.add(local);

  for (const [x, coverage] of [[-3, 1], [3, 0]]) {
    const surface = new PlaneGeometry(3, 3);
    surface.setAttribute('gaussianWeight', new Float32BufferAttribute(Array(4).fill(coverage), 1));
    const ground = new Mesh(surface, new MeshStandardMaterial({ color: '#b7bec9' }));
    ground.userData.gaussianKind = 'turf';
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(x, 0, -5);
    scene.add(ground);
  }
  const camera = new PerspectiveCamera(62, 1.3, 0.1, 100);
  camera.position.set(0, 2, 4);
  camera.lookAt(0, 0, -6);
  let counts;
  const update = createGaussianDetail(scene, { report: value => { counts = value; } });
  update(camera);
  assert.ok(counts.shrub > 0);
  assert.ok(counts.turf > 0);
  const centers = scene.children.at(-1).geometry.getAttribute('center');
  // Only the test's snow patch and local shrub are inside the camera frustum.
  for (let i = 0; i < counts.turf + counts.shrub; i++) assert.ok(centers.getX(i) <= 1.1);
  disposeScene(scene);
});
