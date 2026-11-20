import * as THREE from 'three';
import { surfaceDetailGLSL } from './surface-material.js';

function repeatValue(x, z, period, seed) {
  const ix = Math.floor(x), iz = Math.floor(z);
  const fx = x - ix, fz = z - iz;
  const sx = fx * fx * (3 - 2 * fx), sz = fz * fz * (3 - 2 * fz);
  const key = (a, b) => {
    let hash = Math.imul((a % period) + 1, 374761393) ^ Math.imul((b % period) + 1, 668265263) ^ seed;
    hash = Math.imul(hash ^ (hash >>> 13), 1274126177);
    return ((hash ^ (hash >>> 16)) >>> 0) / 4294967295;
  };
  const low = key(ix, iz) * (1 - sx) + key(ix + 1, iz) * sx;
  const high = key(ix, iz + 1) * (1 - sx) + key(ix + 1, iz + 1) * sx;
  return low * (1 - sz) + high * sz;
}

export function createGroundDetail(physicalSurfaces = false) {
  // Pack individual material signals and relief into a periodic data map. Use nonmatching
  // physical scales in the shader so the same tile never reads as a repeated patch.
  const size = 256;
  const pixels = new Uint8Array(size * size * 4);
  for (let iz = 0; iz < size; iz++) {
    for (let ix = 0; ix < size; ix++) {
      const u = ix / size, v = iz / size;
      const low = repeatValue(u * 6, v * 6, 6, 4179);
      const medium = repeatValue(u * 26, v * 26, 26, 317);
      const grit = repeatValue(u * 68, v * 68, 68, 6287);
      const dust = repeatValue(u * 123, v * 123, 123, 5921);
      const n = (iz * size + ix) * 4;
      const stone = Math.max(0, (grit - .63) * 2.65);
      pixels[n] = 255 * (.25 + medium * .23 + dust * .15 + stone * .35);
      pixels[n + 1] = 255 * (.10 + low * .24 + medium * .37 + grit * .21 + dust * .08);
      pixels[n + 2] = 255 * (.17 + low * .51 + medium * .26 + grit * .06);
      pixels[n + 3] = 255 * (.21 + medium * .20 + grit * .17 + stone * .31 + dust * .07);
    }
  }
  const texture = new THREE.DataTexture(pixels, size, size, THREE.RGBAFormat);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  texture.name = 'Turf, gravel, loam and microrelief';
  texture.userData.physicalSurfaces = physicalSurfaces;
  return texture;
}

export function groundMaterial(detail, options = {}) {
  const physical = detail.userData.physicalSurfaces === true;
  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: .93,
    ...options
  });
  // Custom shader uniforms are outside MeshStandardMaterial's texture fields.
  material.userData.ownedTextures = [detail];
  material.onBeforeCompile = shader => {
    shader.uniforms.landDetail = { value: detail };
    shader.vertexShader = `
      attribute vec3 landCover;
      varying vec3 vLandPosition;
      varying vec3 vLandCover;
      varying vec3 vLandNormal;
      ${shader.vertexShader}
    `.replace('#include <begin_vertex>', `
      #include <begin_vertex>
      vLandPosition = position;
      vLandCover = landCover;
      vLandNormal = normal;
    `);
    shader.fragmentShader = `
      uniform sampler2D landDetail;
      varying vec3 vLandPosition;
      varying vec3 vLandCover;
      varying vec3 vLandNormal;
      ${physical ? surfaceDetailGLSL : ''}
      ${shader.fragmentShader}
    `.replace('#include <color_fragment>', `
      #include <color_fragment>
      float loam = vLandCover.x;
      float gravel = vLandCover.y;
      float strata = vLandCover.z;
      vec2 coords = vLandPosition.xz + vec2(.39, .59) * vLandPosition.y * strata;
      vec4 grit = ${physical
        ? 'surfaceTriplanar(landDetail, vLandPosition * .53, vLandNormal)'
        : 'texture2D(landDetail, coords * .26)'};
      vec4 mottle = texture2D(landDetail, mat2(.8, -.6, .6, .8) * coords * .069);
      vec4 spots = texture2D(landDetail, (coords + vec2(31.4, 12.1)) * vec2(.14, .42));
      float flecks = smoothstep(.43, .67, grit.r + (mottle.b - .5) * .13);
      float turf = (.64 + grit.g * .60 + spots.g * .19) * (.79 + mottle.b * .37);
      float track = (.72 + grit.r * .48) * (.75 + mottle.b * .49) + flecks * .17;
      float materialTone = mix(turf, track, loam);
      float herb = smoothstep(.39, .72, mottle.g + (spots.g - .4) * .18);
      vec3 tint = mix(vec3(.97,.93,.78), vec3(.99,1.03,.93), herb);
      tint = mix(tint, vec3(1.14,1.025,.86), loam * .55);
      tint = mix(tint, vec3(.94,.99,1.035), gravel * .70);
      float damp = smoothstep(.32,.64,mottle.r) * gravel * .16;
      diffuseColor.rgb *= tint * (materialTone - damp);
      diffuseColor.rgb += vec3(.075,.061,.044) * flecks * loam * (1. - gravel);
      float landDisplacement = (grit.a - .4) * mix(.030, .020, loam) +
        (spots.g - .5) * mix(.035, .010, loam);
      ${physical ? `
      float groundFade = 1.0 - smoothstep(.10, .48,
        max(length(dFdx(vLandPosition)), length(dFdy(vLandPosition))));
      float wetStone = smoothstep(.46, .86, mottle.r + gravel * .28) * gravel;
      float pore = texture2D(landDetail, coords * 2.34).r;
      diffuseColor.rgb *= (1.0 - wetStone * .135) * (1.0 + (pore - .42) * .22 * groundFade);
      landDisplacement = landDisplacement * .72 + (pore - .42) * .0044 * groundFade;
      ` : ''}
    `).replace('#include <roughnessmap_fragment>', `
      #include <roughnessmap_fragment>
      ${physical ? 'roughnessFactor = clamp(roughnessFactor + (pore - .47) * .26 * groundFade - wetStone * .34, .49, 1.0);' : ''}
    `).replace('#include <aomap_fragment>', `
      #include <aomap_fragment>
      ${physical ? 'reflectedLight.indirectDiffuse *= 1.0 - (1.0 - smoothstep(.25, .44, grit.a)) * .11 * groundFade;' : ''}
    `).replace('#include <normal_fragment_maps>', `
      #include <normal_fragment_maps>
      vec3 landDx = dFdx(-vViewPosition), landDy = dFdy(-vViewPosition);
      vec3 landRx = cross(landDy, normal), landRy = cross(normal, landDx);
      float landDet = dot(landDx, landRx);
      vec3 landGradient = sign(landDet) * (dFdx(landDisplacement) * landRx + dFdy(landDisplacement) * landRy);
      normal = normalize(max(abs(landDet), 1e-7) * normal - landGradient * (1. - strata * .64));
    `);
  };
  material.customProgramCacheKey = () => physical ? 'valley-terrain-physical' : 'valley-terrain-original';
  return material;
}
