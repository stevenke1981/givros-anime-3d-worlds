import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createVegetationWind } from '../src/world/vegetation-wind.js';

test('plant wind composes material shader and respects reduced motion', () => {
  const original = new THREE.MeshStandardMaterial();
  original.onBeforeCompile = shader => { shader.uniforms.surfaceMarker = { value: 7 }; };
  original.customProgramCacheKey = () => 'surface';
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 2, 1), original, 2);
  mesh.name = 'Grass leaves';
  const wind = createVegetationWind();
  assert.equal(wind.register(mesh, 'grass'), true);
  assert.notEqual(mesh.material, original);
  assert.equal(wind.register(mesh, 'grass'), false);
  const shader = { uniforms: {}, vertexShader: '#include <common>\n#include <begin_vertex>' };
  mesh.material.onBeforeCompile(shader, {});
  assert.equal(shader.uniforms.surfaceMarker.value, 7);
  assert.match(mesh.material.customProgramCacheKey(), /^surface\|vegetation-wind/);
  assert.match(shader.vertexShader, /modelMatrix \* instanceMatrix/);
  assert.match(shader.vertexShader, /windHeight \* windHeight/);
  assert.equal(shader.uniforms.vegetationWindBase.value, -1);
  assert.equal(shader.uniforms.vegetationWindHeight.value, 2);
  wind.update(4, true);
  assert.equal(shader.uniforms.vegetationWindTime.value, 4);
  assert.equal(shader.uniforms.vegetationWindStrength.value, 0);
  wind.update(5, false);
  assert.equal(shader.uniforms.vegetationWindStrength.value, 1);
});

test('unrelated meshes and woody parts stay fixed', () => {
  const wind = createVegetationWind();
  const trunk = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial());
  trunk.name = 'Cherry trunk and roots';
  assert.equal(wind.register(trunk, 'sakura'), false);
  trunk.name = 'Grass leaves';
  assert.equal(wind.register(trunk, 'house'), false);
});
