import {
  ACESFilmicToneMapping, GLSL3, HalfFloatType, LinearFilter, LinearSRGBColorSpace,
  NoBlending, PMREMGenerator, RawShaderMaterial, ShaderChunk, Vector2, Vector3, WebGLRenderTarget,
} from 'three';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { lightingProfiles } from './profiles.js';
import { createSkyRadiance } from './sky.js';

export function hasLightingProfile(id) {
  return Object.hasOwn(lightingProfiles, id);
}

export function createLightingPipeline(renderer, { legacy = false, coarse = false } = {}) {
  const originalToneMapping = renderer.toneMapping;
  const originalExposure = renderer.toneMappingExposure;
  const configured = new Map();
  // WebGL 2 guarantees half-float texture sampling. Rendering into one needs this extension.
  const hdrTargetSupported = !legacy && renderer.extensions.has('EXT_color_buffer_float');
  let pmrem, target, output, quad;
  const viewport = renderer.getSize(new Vector2());

  function mode(scene) {
    return configured.has(scene) ? (hdrTargetSupported ? 'hdr-post' : 'aces-direct') : 'legacy';
  }

  function apply(scene, id, physicalSurfaces = false, naturalLighting = false) {
    if (legacy || !hasLightingProfile(id) || configured.has(scene)) return mode(scene);
    const originalProfile = lightingProfiles[id];
    const profile = naturalLighting ? {
      ...originalProfile, exposure: 1.04, environment: .29, hemisphere: .74, direct: 1,
      sunRadiance: 22, glow: .036, contrast: .112,
    } : originalProfile;
    const { environment, environmentIntensity } = scene;
    const lights = [];
    const water = new Set();
    let sun;
    scene.traverse((node) => {
      if (node.isDirectionalLight && (!sun || sun.intensity < node.intensity)) sun = node;
      if (node.isHemisphereLight) lights.push([node, node.intensity]);
      if (physicalSurfaces && node.material?.userData.waterEnvironment) water.add(node.material);
    });
    if (sun) {
      for (const material of water) {
        if (material.uniforms.waterSunIntensity) {
          material.uniforms.waterSunIntensity.value = sun.intensity * profile.direct;
          material.uniforms.waterSunColor.value.copy(sun.color);
        }
      }
    }
    let radiance;
    if (sun && hdrTargetSupported) {
      const direction = sun.getWorldPosition(new Vector3()).sub(sun.target.getWorldPosition(new Vector3())).normalize();
      const sky = createSkyRadiance(profile, direction, sun.color, physicalSurfaces && !coarse ? 512 : 256, naturalLighting);
      pmrem ??= new PMREMGenerator(renderer);
      try {
        radiance = pmrem.fromEquirectangular(sky);
      } finally {
        sky.dispose();
      }
      scene.environment = radiance.texture;
      scene.environmentIntensity = profile.environment;
      for (const material of water) {
        material.defines.USE_WATER_ENVIRONMENT = 1;
        material.uniforms.waterEnvironment = { value: radiance.texture };
        material.uniforms.waterEnvironmentMaxLod = { value: radiance.texture.mipmaps.length - 1 };
        material.uniforms.waterEnvironmentIntensity = { value: scene.environmentIntensity };
        material.needsUpdate = true;
      }
    }
    if (radiance || naturalLighting) {
      for (const [light, intensity] of lights) light.intensity = intensity * profile.hemisphere;
    }
    if (sun) {
      lights.push([sun, sun.intensity]);
      sun.intensity *= profile.direct;
    }
    configured.set(scene, { profile, environment, environmentIntensity, lights, radiance, water });
    return mode(scene);
  }

  function resize(width, height) {
    viewport.set(width, height);
    if (!target) return;
    const ratio = Math.min(renderer.getPixelRatio(), coarse ? 1 : 1.45);
    target.setSize(Math.max(1, Math.floor(width * ratio)), Math.max(1, Math.floor(height * ratio)));
    output.uniforms.texel.value.set(1 / target.width, 1 / target.height);
  }

  function render(scene, camera) {
    const profile = configured.get(scene)?.profile;
    renderer.toneMapping = profile ? ACESFilmicToneMapping : originalToneMapping;
    renderer.toneMappingExposure = profile?.exposure ?? originalExposure;
    if (!profile || !hdrTargetSupported) {
      renderer.render(scene, camera);
      return;
    }

    if (!target) {
      target = new WebGLRenderTarget(1, 1, {
        type: HalfFloatType,
        minFilter: LinearFilter,
        magFilter: LinearFilter,
        colorSpace: LinearSRGBColorSpace,
      });
      output = new RawShaderMaterial({
        name: 'Valley HDR output',
        glslVersion: GLSL3,
        depthTest: false,
        depthWrite: false,
        blending: NoBlending,
        uniforms: {
          hdr: { value: target.texture },
          texel: { value: new Vector2() },
          toneMappingExposure: { value: 1 },
          glowStrength: { value: 0 },
          contrastStrength: { value: 0 },
          whiteBalance: { value: new Vector3(1, 1, 1) },
          premultipliedAlpha: { value: renderer.getContextAttributes().premultipliedAlpha },
        },
        vertexShader: `
          in vec3 position;
          in vec2 uv;
          out vec2 screenUv;
          void main() {
            screenUv = uv;
            gl_Position = vec4(position, 1.0);
          }`,
        fragmentShader: `
          precision highp float;
          uniform sampler2D hdr;
          uniform vec2 texel;
          uniform float glowStrength;
          uniform float contrastStrength;
          uniform vec3 whiteBalance;
          uniform bool premultipliedAlpha;
          in vec2 screenUv;
          out vec4 pixel;
          ${ShaderChunk.tonemapping_pars_fragment}
          ${ShaderChunk.colorspace_pars_fragment}

          float luma(vec3 color) {
            return dot(color, vec3(.2126, .7152, .0722));
          }

          void main() {
            vec4 center = texture(hdr, screenUv);
            vec3 north = texture(hdr, screenUv + vec2(0., texel.y)).rgb;
            vec3 south = texture(hdr, screenUv - vec2(0., texel.y)).rgb;
            vec3 east = texture(hdr, screenUv + vec2(texel.x, 0.)).rgb;
            vec3 west = texture(hdr, screenUv - vec2(texel.x, 0.)).rgb;
            vec3 alongX = (east + west) * .5;
            vec3 alongY = (north + south) * .5;
            vec3 average = (alongX + alongY) * .5;
            float spanX = abs(luma(east) - luma(west));
            float spanY = abs(luma(north) - luma(south));
            float edge = max(spanX, spanY);
            float edgeAA = smoothstep(.10, .45, edge / max(.25, luma(center.rgb))) * .20;
            vec3 across = mix(alongX, alongY, smoothstep(-.05, .05, spanY - spanX));
            vec3 color = mix(center.rgb, across, edgeAA);
            color += clamp(center.rgb - average, -.14, .14) *
              contrastStrength * (1. - smoothstep(.10, .36, edge));
            color += max(average - vec3(.84), 0.) * glowStrength;
            // The scene's blending stores premultiplied linear RGB. Tone-map and encode
            // straight RGB, then match the canvas' alpha convention.
            vec3 straightColor = max(color, 0.) / max(center.a, .0001);
            pixel = sRGBTransferOETF(vec4(ACESFilmicToneMapping(straightColor * whiteBalance), center.a));
            if (premultipliedAlpha) pixel.rgb *= center.a;
          }`,
      });
      quad = new FullScreenQuad(output);
      resize(viewport.x, viewport.y);
    }

    output.uniforms.toneMappingExposure.value = profile.exposure;
    output.uniforms.glowStrength.value = profile.glow;
    output.uniforms.contrastStrength.value = profile.contrast;
    const whiteBalance = output.uniforms.whiteBalance.value;
    whiteBalance.set(1, 1, 1);
    if (profile.whiteBalance) whiteBalance.fromArray(profile.whiteBalance);
    const previousTarget = renderer.getRenderTarget();
    try {
      // Three.js disables material tone mapping when drawing to this linear render target.
      renderer.setRenderTarget(target);
      renderer.render(scene, camera);
      renderer.setRenderTarget(previousTarget);
      quad.render(renderer);
    } finally {
      renderer.setRenderTarget(previousTarget);
    }
  }

  function release(scene) {
    const state = configured.get(scene);
    if (!state) return;
    scene.environment = state.environment;
    scene.environmentIntensity = state.environmentIntensity;
    for (const [light, intensity] of state.lights) light.intensity = intensity;
    if (state.radiance) {
      for (const material of state.water) {
        delete material.defines.USE_WATER_ENVIRONMENT;
        delete material.uniforms.waterEnvironment;
        delete material.uniforms.waterEnvironmentMaxLod;
        delete material.uniforms.waterEnvironmentIntensity;
        material.needsUpdate = true;
      }
    }
    state.radiance?.dispose();
    configured.delete(scene);
  }

  function dispose() {
    for (const scene of configured.keys()) release(scene);
    pmrem?.dispose();
    target?.dispose();
    output?.dispose();
    quad?.dispose();
    renderer.toneMapping = originalToneMapping;
    renderer.toneMappingExposure = originalExposure;
  }

  return { apply, mode, render, resize, release, dispose };
}
