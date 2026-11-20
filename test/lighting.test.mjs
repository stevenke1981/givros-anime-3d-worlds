import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ACESFilmicToneMapping, Color, CubeTexture, DataUtils, DirectionalLight, HalfFloatType,
  LinearSRGBColorSpace, NeutralToneMapping, PMREMGenerator, Scene, Vector3, WebGLCubeRenderTarget,
} from 'three';
import { createLightingPipeline } from '../src/lighting/pipeline.js';
import { lightingProfiles } from '../src/lighting/profiles.js';
import { createSkyRadiance } from '../src/lighting/sky.js';
import { scenes } from '../src/world/catalog.js';
import { createRegionalLayout } from '../src/world/regions/layout.js';
import { addHydrology } from '../src/world/regions/terrain.js';

test('each landscape has finite HDR radiance and the festival has a darker zenith than snow country', () => {
  assert.deepEqual(Object.keys(lightingProfiles).sort(), scenes.map(scene => scene.id).sort());
  const zeniths = {};
  for (const scene of scenes) {
    const sun = new Vector3(-0.4, 0.88, 0.2).normalize();
    const texture = createSkyRadiance(lightingProfiles[scene.id], sun, new Color('#fff2df'));
    assert.equal(texture.type, HalfFloatType);
    assert.equal(texture.colorSpace, LinearSRGBColorSpace);
    const { data, width, height } = texture.image;
    let peak = 0;
    for (const sample of data) {
      const value = DataUtils.fromHalfFloat(sample);
      assert.ok(Number.isFinite(value) && value >= 0, scene.name);
      peak = Math.max(value, peak);
    }
    assert.ok(peak > 1, scene.name);
    zeniths[scene.id] = DataUtils.fromHalfFloat(data[4 * (height - 1) * width + 2]);
    texture.dispose();
  }
  assert.ok(zeniths['10'] < zeniths['07']);
});

test('without an HDR render target, ACES direct rendering restores legacy exposure and scene ownership', () => {
  const renderer = {
    toneMapping: NeutralToneMapping,
    toneMappingExposure: 1,
    extensions: { has: () => false },
    getSize: target => target.set(390, 844),
    render(scene) { this.rendered = scene; },
  };
  const pipeline = createLightingPipeline(renderer, { coarse: true });
  const terrace = new Scene();
  const sunlight = new DirectionalLight('#fff0d0', 2.5);
  terrace.add(sunlight);

  assert.equal(pipeline.apply(terrace, '04'), 'aces-direct');
  assert.equal(terrace.environment, null);
  pipeline.render(terrace);
  assert.equal(renderer.toneMapping, ACESFilmicToneMapping);
  assert.equal(renderer.rendered, terrace);
  assert.ok(sunlight.intensity < 2.5);

  pipeline.release(terrace);
  assert.equal(sunlight.intensity, 2.5);
  pipeline.render(terrace);
  assert.equal(renderer.toneMapping, NeutralToneMapping);
  assert.equal(renderer.toneMappingExposure, 1);
  pipeline.dispose();
});

test('physical water uses the HDR sky cubemap only while the lighting pipeline owns it', (t) => {
  const renderer = {
    toneMapping: NeutralToneMapping,
    toneMappingExposure: 1,
    extensions: { has: () => true },
    getSize: target => target.set(390, 844),
  };
  const pipeline = createLightingPipeline(renderer, { coarse: true });
  t.after(pipeline.dispose);
  const radiance = new WebGLCubeRenderTarget(16);
  radiance.texture.mipmaps = [16, 8, 4].map(size => ({ width: size, height: size }));
  t.mock.method(PMREMGenerator.prototype, 'fromEquirectangular', () => radiance);
  let disposals = 0;
  radiance.addEventListener('dispose', () => disposals++);

  const terrace = new Scene();
  const originalEnvironment = new CubeTexture();
  terrace.environment = originalEnvironment;
  terrace.environmentIntensity = .42;
  const sunlight = new DirectionalLight();
  addHydrology(terrace, createRegionalLayout('04'), sunlight.position.clone().normalize(), true);
  const waterMaterials = terrace.children.map(mesh => ({
    material: mesh.material,
    defines: { ...mesh.material.defines },
    uniformNames: Object.keys(mesh.material.uniforms),
  }));
  assert.ok(waterMaterials.some(({ defines }) => defines.FLOODED_SOIL));
  terrace.add(sunlight);

  assert.equal(pipeline.apply(terrace, '04', true), 'hdr-post');
  assert.equal(terrace.environment, radiance.texture);
  for (const { material, defines } of waterMaterials) {
    assert.deepEqual(material.defines, { ...defines, USE_WATER_ENVIRONMENT: 1 });
    assert.equal(material.uniforms.waterEnvironment.value, radiance.texture);
    assert.equal(material.uniforms.waterEnvironmentMaxLod.value, 2);
    assert.equal(material.uniforms.waterEnvironmentIntensity.value, terrace.environmentIntensity);
  }

  pipeline.release(terrace);
  assert.equal(terrace.environment, originalEnvironment);
  assert.equal(terrace.environmentIntensity, .42);
  assert.equal(disposals, 1);
  for (const { material, defines, uniformNames } of waterMaterials) {
    assert.deepEqual(material.defines, defines);
    assert.deepEqual(Object.keys(material.uniforms), uniformNames);
  }
});
