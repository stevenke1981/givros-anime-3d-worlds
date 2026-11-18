import assert from 'node:assert/strict';
import test from 'node:test';
import { DataTexture, Mesh, MeshStandardMaterial, PerspectiveCamera, PlaneGeometry, Scene } from 'three';
import { createGaussianDetail } from '../src/detail/gaussian-detail.js';
import { disposeScene } from '../src/world/dispose-scene.js';

test('replacing a scene disposes each shared resource exactly once', () => {
  const texture = new DataTexture(new Uint8Array(4), 1, 1);
  const material = new MeshStandardMaterial({ map: texture, roughnessMap: texture });
  const geometry = new PlaneGeometry();
  const scene = new Scene();
  scene.add(new Mesh(geometry, material), new Mesh(geometry, material));
  const calls = [];
  for (const [name, resource] of Object.entries({ geometry, material, texture })) {
    resource.addEventListener('dispose', () => calls.push(name));
  }

  disposeScene(scene);

  assert.deepEqual(calls.toSorted(), ['geometry', 'material', 'texture']);
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
