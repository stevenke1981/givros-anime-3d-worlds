import { Vector2, Vector4 } from 'three';
import { applyHeightFog } from '../lighting/height-fog.js';

export const surfaceDetailGLSL = `
vec4 surfaceTriplanar(sampler2D detailMap, vec3 coordinates, vec3 localNormal) {
  vec3 w = abs(localNormal) + 0.0001;
  w *= w;
  w /= dot(w, vec3(1.0));
  return texture2D(detailMap, coordinates.zy + vec2(.17, .31)) * w.x +
    texture2D(detailMap, coordinates.xz) * w.y +
    texture2D(detailMap, coordinates.xy + vec2(.41, .13)) * w.z;
}

vec3 applySurfaceRelief(vec3 viewPosition, vec3 normal, float relief, float faceDirection) {
  vec3 vx = dFdx(viewPosition), vy = dFdy(viewPosition);
  vec3 rx = cross(vy, normal), ry = cross(normal, vx);
  float det = dot(vx, rx) * faceDirection;
  vec3 gradient = sign(det) * (dFdx(relief) * rx + dFdy(relief) * ry);
  return normalize(max(abs(det), 1e-8) * normal - gradient);
}
`;

const profiles = {
  stone: [1.25, .034, .125, .014],
  wood: [.90, .018, .085, .007],
  clay: [1.36, .018, .11, .005],
  plaster: [1.90, .019, .09, .007],
  foliage: [2.14, .014, .095, .002],
  hardware: [1.57, .026, .19, .003],
  coated: [1.62, .014, .09, .004],
};

export function surfaceProfile(asset, part, material) {
  const name = part.replaceAll('_', ' ');
  // Only the asset assemblies containing exposed metal get a conductor mask.
  if ((asset === 'dock' && /^forged dock rings/i.test(name)) ||
      (asset === 'sluice' && /^gate guide rails/i.test(name)) ||
      (asset === 'bridge' && /^post finials and metal fittings/i.test(name))) return 'hardware';
  if (/granite|basalt|limestone|stone|masonry/i.test(material)) return 'stone';
  if (/grain|cedar|bark|timber(?!,)/i.test(material)) return 'wood';
  if (/kawara|roof tile|fired clay/i.test(material)) return 'clay';
  if (/foliage|\bleaf|leaves|blossom|petals|seedlings/i.test(material + ' ' + name)) return 'foliage';
  if (/plaster|infill/i.test(name)) return 'plaster';
  if (/fence|boat|plank|deck|bamboo|rafter|trunk|bark|branch|sill|beam/i.test(asset + ' ' + name)) return 'wood';
  return 'coated';
}

export function applyAssetSurfaces(scene, detail) {
  const variants = new Map();
  const daylight = Boolean(detail.userData.contactOcclusion);
  scene.traverse(mesh => {
    const asset = mesh.userData.surfaceAsset;
    if (!asset) return;
    const enhance = source => {
      if (!source.isMeshStandardMaterial || (source.emissiveIntensity > 0 && source.emissive.getHex() !== 0)) return source;
      const finish = surfaceProfile(asset, mesh.name, source.name);
      const leafLight = daylight && finish === 'foliage';
      const wallWeathering = daylight && finish === 'plaster';
      const heightDetail = leafLight || wallWeathering;
      const finishRoughness = !daylight ? undefined :
        finish === 'clay' ? .50 : wallWeathering ? .90 :
        asset === 'sluice' && finish !== 'hardware' && finish !== 'stone' ? .83 :
        asset === 'bridge' && /vermilion/i.test(mesh.name) ? .46 : undefined;
      const variant = heightDetail ? finish + mesh.geometry.uuid : finish + finishRoughness;
      let perFinish = variants.get(source);
      if (!perFinish) variants.set(source, perFinish = new Map());
      if (perFinish.has(variant)) return perFinish.get(variant);
      const material = perFinish.size ? source.clone() : source;
      perFinish.set(variant, material);
      const [frequency, albedo, roughness, relief] = profiles[finish];
      const controls = new Vector4(frequency, albedo * (material.map ? .6 : 1), roughness,
        relief * (material.normalMap ? .42 : 1));
      let heightRange;
      if (heightDetail) {
        if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
        const { min, max } = mesh.geometry.boundingBox;
        heightRange = new Vector2(min.y, max.y);
      }
      material.onBeforeCompile = shader => {
        // The landscape already owns this shared texture, including the windy instances.
        shader.uniforms.assetDetail = { value: detail };
        shader.uniforms.assetDetailScale = { value: controls };
        if (heightRange) shader.uniforms.assetHeightRange = { value: heightRange };
        if (finishRoughness !== undefined) shader.uniforms.assetFinishRoughness = { value: finishRoughness };
        shader.vertexShader = shader.vertexShader
          .replace('#include <common>', '#include <common>\nvarying vec3 vMaterialPosition, vMaterialNormal;')
          .replace('#include <begin_vertex>', '#include <begin_vertex>\nvMaterialPosition = position; vMaterialNormal = normal;');
        shader.fragmentShader = shader.fragmentShader
          .replace('#include <common>', `#include <common>
uniform sampler2D assetDetail;
uniform vec4 assetDetailScale;
${heightRange ? 'uniform vec2 assetHeightRange;' : ''}
${finishRoughness === undefined ? '' : 'uniform float assetFinishRoughness;'}
varying vec3 vMaterialPosition, vMaterialNormal;
${surfaceDetailGLSL}`)
          .replace('#include <color_fragment>', `#include <color_fragment>
vec3 grainPosition = vMaterialPosition * assetDetailScale.x;
vec4 surfaceGrain = ${finish === 'foliage'
    ? 'texture2D(assetDetail, grainPosition.xy + grainPosition.z * vec2(.31, .53))'
    : 'surfaceTriplanar(assetDetail, grainPosition, vMaterialNormal)'};
float surfaceFade = 1.0 - smoothstep(.045, .24,
  max(length(dFdx(vMaterialPosition)), length(dFdy(vMaterialPosition))));
float surfaceMark = (surfaceGrain.r - .4) * surfaceFade;
diffuseColor.rgb *= 1.0 + surfaceMark * assetDetailScale.y * 5.0;
${leafLight ? `
float leafHeight = smoothstep(assetHeightRange.x, assetHeightRange.y, vMaterialPosition.y);
diffuseColor.rgb *= mix(vec3(.61, .68, .60), vec3(1.11, 1.08, .96), leafHeight);
` : ''}
${wallWeathering ? `
float moisture = 1.0 - smoothstep(.03, .32 + surfaceGrain.g * .10, vMaterialPosition.y - assetHeightRange.x);
float eaveCrease = 1.0 - smoothstep(.0, .30, assetHeightRange.y - vMaterialPosition.y);
diffuseColor.rgb *= mix(vec3(1.0), vec3(.69, .72, .59), moisture * (.46 + surfaceGrain.g * .49));
diffuseColor.rgb *= 1. - eaveCrease * .14;
` : ''}`)
          .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
roughnessFactor = clamp(roughnessFactor + (surfaceGrain.g - .43) * assetDetailScale.z * surfaceFade * 2.0, .18, 1.0);
${finishRoughness === undefined ? '' :
  'roughnessFactor = clamp(assetFinishRoughness + (roughnessFactor - .60) * .25, .25, .98);'}`)
          .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>
${finish === 'hardware' ? 'metalnessFactor = mix(.62, .9, smoothstep(.26, .64, surfaceGrain.r));' : ''}`)
          .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
normal = applySurfaceRelief(-vViewPosition, normal,
  (surfaceGrain.a - .36) * assetDetailScale.w * surfaceFade, faceDirection);`)
          .replace('#include <aomap_fragment>', `#include <aomap_fragment>
#ifndef USE_AOMAP
  float microCavity = 1.0 - smoothstep(.24, .40, surfaceGrain.a);
  reflectedLight.indirectDiffuse *= 1.0 - microCavity * surfaceFade * .095;
#endif`);
        if (leafLight) {
          shader.fragmentShader = shader.fragmentShader
            .replace('#include <shadowmap_pars_fragment>',
              '#include <shadowmap_pars_fragment>\n#include <shadowmask_pars_fragment>')
            .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
#if NUM_DIR_LIGHTS > 0
  vec3 leafSun = directionalLights[0].direction;
  float leafBacklight = pow(max(dot(normalize(vViewPosition), -leafSun), 0.0), 3.0);
  float leafBackFace = smoothstep(-.14, .62, dot(-normal, leafSun));
  reflectedLight.directDiffuse += diffuseColor.rgb * vec3(1.08, .84, .43) *
    directionalLights[0].color * (.045 + .080 * leafHeight) * leafBacklight * leafBackFace *
    mix(.14, 1.0, getShadowMask());
#endif`);
        }
        if (daylight) applyHeightFog(shader);
      };
      material.customProgramCacheKey = () => `valley-surface-${finish}-${daylight}-${finishRoughness}`;
      return material;
    };
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(enhance) : enhance(mesh.material);
  });
}
