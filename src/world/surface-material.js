import { Vector4 } from 'three';

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
  scene.traverse(mesh => {
    const asset = mesh.userData.surfaceAsset;
    if (!asset) return;
    const enhance = source => {
      if (!source.isMeshStandardMaterial || (source.emissiveIntensity > 0 && source.emissive.getHex() !== 0)) return source;
      const finish = surfaceProfile(asset, mesh.name, source.name);
      let perFinish = variants.get(source);
      if (!perFinish) variants.set(source, perFinish = new Map());
      if (perFinish.has(finish)) return perFinish.get(finish);
      const material = perFinish.size ? source.clone() : source;
      perFinish.set(finish, material);
      const [frequency, albedo, roughness, relief] = profiles[finish];
      const controls = new Vector4(frequency, albedo * (material.map ? .6 : 1), roughness,
        relief * (material.normalMap ? .42 : 1));
      material.onBeforeCompile = shader => {
        // The landscape already owns this shared texture, including the windy instances.
        shader.uniforms.assetDetail = { value: detail };
        shader.uniforms.assetDetailScale = { value: controls };
        shader.vertexShader = shader.vertexShader
          .replace('#include <common>', '#include <common>\nvarying vec3 vMaterialPosition, vMaterialNormal;')
          .replace('#include <begin_vertex>', '#include <begin_vertex>\nvMaterialPosition = position; vMaterialNormal = normal;');
        shader.fragmentShader = shader.fragmentShader
          .replace('#include <common>', `#include <common>
uniform sampler2D assetDetail;
uniform vec4 assetDetailScale;
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
diffuseColor.rgb *= 1.0 + surfaceMark * assetDetailScale.y * 5.0;`)
          .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
roughnessFactor = clamp(roughnessFactor + (surfaceGrain.g - .43) * assetDetailScale.z * surfaceFade * 2.0, .18, 1.0);`)
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
      };
      material.customProgramCacheKey = () => `valley-surface-${finish}`;
      return material;
    };
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(enhance) : enhance(mesh.material);
  });
}
