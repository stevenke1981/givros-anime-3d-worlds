import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ACESFilmicToneMapping, Color, DataUtils, DirectionalLight, HalfFloatType,
  LinearSRGBColorSpace, NeutralToneMapping, Scene, Vector3,
} from 'three';
import { createLightingPipeline } from '../src/lighting/pipeline.js';
import { lightingProfiles } from '../src/lighting/profiles.js';
import { createSkyRadiance } from '../src/lighting/sky.js';
import { scenes } from '../src/world/catalog.js';

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
