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

export function applyAssetSurfaces(scene, detail, terrace = false) {
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
      const mossPiece = daylight && asset === 'canal-moss';
      const bankStone = daylight && (asset === 'canal-stone' || mossPiece);
      const facade = daylight && (asset === 'house' || asset === 'shrine');
      const farmhouse = daylight && terrace && asset === 'house';
      const foundation = farmhouse && /foundations/i.test(mesh.name);
      const weatheredWood = facade && finish === 'wood';
      const heightDetail = leafLight || wallWeathering || bankStone;
      const finishRoughness = !daylight ? undefined :
        finish === 'clay' ? .50 : wallWeathering ? .90 :
        asset === 'sluice' && finish !== 'hardware' && finish !== 'stone' ? .83 :
        asset === 'bridge' && /vermilion/i.test(mesh.name) ? .46 : undefined;
      const variant = (heightDetail ? finish + mesh.geometry.uuid : finish + finishRoughness) + (facade || bankStone ? asset : '');
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
${weatheredWood ? 'grainPosition *= vec3(3.8, .38, 3.8);' : ''}
vec4 surfaceGrain = ${finish === 'foliage'
    ? 'texture2D(assetDetail, grainPosition.xy + grainPosition.z * vec2(.31, .53))'
    : 'surfaceTriplanar(assetDetail, grainPosition, vMaterialNormal)'};
float surfaceFade = 1.0 - smoothstep(.045, .24,
  max(length(dFdx(vMaterialPosition)), length(dFdy(vMaterialPosition))));
float surfaceMark = (surfaceGrain.r - .4) * surfaceFade;
diffuseColor.rgb *= 1.0 + surfaceMark * assetDetailScale.y * 5.0;
${bankStone ? `
float stoneHeight = smoothstep(assetHeightRange.x, assetHeightRange.y, vMaterialPosition.y);
float mossMottle = texture2D(assetDetail, vMaterialPosition.xz * .73 + vMaterialPosition.y * vec2(.53, .26)).g;
float mossCover = smoothstep(.33, .68, mossMottle * .71 + surfaceGrain.g * .33) *
  smoothstep(.18, .69, stoneHeight);
vec3 bankStoneColor = vec3(.23, .193, .151) * (.67 + surfaceGrain.g * .73);
diffuseColor.rgb = mix(diffuseColor.rgb * vec3(1.14, 1.06, .92), bankStoneColor, .53);
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.136, .185, .066),
  ${mossPiece ? '.39 + mossCover * .56' : 'mossCover * .84'});
` : ''}
${foundation ? `
float foundationFoot = 1. - smoothstep(.025, .225 + .075 * surfaceGrain.b, vMaterialPosition.y);
float wetJoint = smoothstep(.27, .60, surfaceGrain.g);
diffuseColor.rgb *= mix(vec3(1.075, 1.055, .998), vec3(.66, .71, .47), foundationFoot * wetJoint * .55);
` : ''}
${weatheredWood ? `
float silvering = smoothstep(.28, .68, surfaceGrain.g);
diffuseColor.rgb = diffuseColor.rgb * vec3(1.13, 1.045, .975) +
  vec3(.035, .020, .009) * (.45 + silvering * .55);
` : ''}
${leafLight ? `
float leafHeight = smoothstep(assetHeightRange.x, assetHeightRange.y, vMaterialPosition.y);
diffuseColor.rgb *= mix(vec3(.61, .68, .60), vec3(1.11, 1.08, .96), leafHeight);
` : ''}
${wallWeathering ? `
vec2 wallUV = vec2(dot(vMaterialPosition.xz, vec2(1.,1.)), vMaterialPosition.y);
float runoff = texture2D(assetDetail, wallUV * vec2(.34,.11)).b;
float splash = 1. - smoothstep(.035, ${farmhouse ? '.18 + .17 * runoff' : '.20 + .32 * runoff'},
  vMaterialPosition.y - assetHeightRange.x);
float fleck = smoothstep(.24, .65, surfaceGrain.b);
diffuseColor.rgb *= mix(vec3(1.), mix(vec3(.51,.48,.35), vec3(.49,.55,.37), fleck),
  splash * (.31 + .62 * fleck));
float eaveHeight = assetHeightRange.y;
${facade ? `
// The side gable rises above the eave. Use the actual authored plate height
// along each facade instead of the maximum height of the combined plaster mesh.
float halfWidth = ${asset === 'shrine' ? '3.' : '4.'};
float halfDepth = ${asset === 'shrine' ? '2.5' : '3.'};
float sideWall = step(halfWidth-.21, abs(vMaterialPosition.x));
eaveHeight = 3.42 + sideWall * 1.77 * (1. - smoothstep(0., halfDepth, abs(vMaterialPosition.z)));
// Locate only the paper inserts behind the modelled muntins; surrounding
// plaster and the recessed wood frame keep their own roughness.
vec2 panel = abs(vMaterialPosition.xz);
float bay = halfWidth * (vMaterialPosition.z > 0. ? .75 : .25);
float frontDepth = vMaterialPosition.z > 0. ? halfDepth - ${asset === 'shrine' ? '.83' : '0.'} : halfDepth;
float paperLevel = ${asset === 'shrine' ? '2.46' : '2.04'};
float facePaper = step(frontDepth+.175, panel.y) * (1. - step(halfWidth*.25-.29, abs(panel.x-bay)))
  * (1. - step(.308, abs(vMaterialPosition.y-paperLevel)));
float sidePaper = step(halfWidth*1.043, panel.x) * (1. - step(.415, abs(vMaterialPosition.z + ${asset === 'shrine' ? '.415' : '0.'})))
  * (1. - step(.272, abs(vMaterialPosition.y-paperLevel-.02)));
float shoji = max(sidePaper, facePaper);
` : ''}
float underEave = eaveHeight - vMaterialPosition.y;
float eaveCrease = 1. - smoothstep(.04, .52 + runoff * .22, max(0., underEave));
${farmhouse ? `
eaveCrease *= smoothstep(-.23, .06, underEave) * (1. - shoji);
diffuseColor.rgb *= mix(vec3(1.), vec3(.61, .68, .74), eaveCrease);
diffuseColor.rgb *= mix(vec3(1.), vec3(.78,.84,.87), shoji * .84);
` : 'diffuseColor.rgb *= 1. - eaveCrease * (.21 + .10 * runoff);'}
` : ''}`)
          .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
roughnessFactor = clamp(roughnessFactor + (surfaceGrain.g - .43) * assetDetailScale.z * surfaceFade * 2.0, .18, 1.0);
${finishRoughness === undefined ? '' :
  'roughnessFactor = clamp(assetFinishRoughness + (roughnessFactor - .60) * .25, .25, .98);'}
${facade && wallWeathering
  ? `roughnessFactor = mix(roughnessFactor, ${farmhouse ? '.23 + surfaceGrain.g * .12' : '.39 + surfaceGrain.g * .14'}, shoji);`
  : ''}`)
          .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>
${finish === 'hardware' ? 'metalnessFactor = mix(.62, .9, smoothstep(.26, .64, surfaceGrain.r));' : ''}`)
          .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
normal = applySurfaceRelief(-vViewPosition, normal,
  (surfaceGrain.a - .36) * assetDetailScale.w * surfaceFade, faceDirection);`)
          .replace('#include <aomap_fragment>', `#include <aomap_fragment>
#ifndef USE_AOMAP
  float microCavity = 1.0 - smoothstep(.24, .40, surfaceGrain.a);
  reflectedLight.indirectDiffuse *= 1.0 - microCavity * surfaceFade * .095;
#endif
${farmhouse && wallWeathering ? `
// Subtle sky highlights on glazing behind the modelled timber lattice.
reflectedLight.indirectSpecular *= mix(1., 1.32, shoji);
` : ''}
${bankStone ? `
vec3 stoneBounce = diffuseColor.rgb * vec3(.70, .62, .51);
vec3 stoneDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
reflectedLight.indirectDiffuse += max(stoneBounce - stoneDiffuse, vec3(0.0));
` : ''}`);
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
      material.customProgramCacheKey = () =>
        `valley-surface-${finish}-${daylight}-${finishRoughness}-${facade || bankStone ? asset : ''}-${foundation || farmhouse && wallWeathering}`;
      return material;
    };
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(enhance) : enhance(mesh.material);
  });
}
