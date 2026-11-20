import * as THREE from 'three';
import { surfaceDetailGLSL } from './surface-material.js';
import { applyHeightFog } from '../lighting/height-fog.js';

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

export function createGroundDetail(physicalSurfaces = false, contactOcclusion) {
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
  texture.userData.contactOcclusion = contactOcclusion;
  return texture;
}

export function groundMaterial(detail, options = {}, {
  wetSoil = false, receiveContacts = false, trackColor, bankBounce = false
} = {}) {
  const physical = wetSoil || detail.userData.physicalSurfaces === true;
  const heightFog = Boolean(detail.userData.contactOcclusion);
  const contact = receiveContacts && detail.userData.contactOcclusion;
  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: .93,
    ...options
  });
  // Custom shader uniforms are outside MeshStandardMaterial's texture fields.
  material.userData.ownedTextures = contact ? [detail, contact.texture] : [detail];
  material.onBeforeCompile = shader => {
    shader.uniforms.landDetail = { value: detail };
    if (trackColor) shader.uniforms.trackColor = { value: trackColor };
    if (contact) {
      shader.uniforms.contactOcclusionMap = { value: contact.texture };
      shader.uniforms.contactOcclusionArea = { value: contact.area };
    }
    const wetVarying = wetSoil ? 'varying float vLandWetness;' : '';
    const trackVarying = trackColor ? 'varying vec3 vLandTrack;' : '';
    const bankVarying = bankBounce ? 'varying float vLandBank;' : '';
    shader.vertexShader = `
      attribute vec3 landCover;
      ${wetSoil ? 'attribute float landWetness;' : ''}
      ${trackColor ? 'attribute vec3 landTrack;' : ''}
      ${bankBounce ? 'attribute float landBank;' : ''}
      ${wetVarying}
      ${trackVarying}
      ${bankVarying}
      varying vec3 vLandPosition;
      varying vec3 vLandCover;
      varying vec3 vLandNormal;
      ${shader.vertexShader}
    `.replace('#include <begin_vertex>', `
      #include <begin_vertex>
      vLandPosition = position;
      vLandCover = landCover;
      vLandNormal = normal;
      ${wetSoil ? 'vLandWetness = landWetness;' : ''}
      ${trackColor ? 'vLandTrack = landTrack;' : ''}
      ${bankBounce ? 'vLandBank = landBank;' : ''}
    `);
    shader.fragmentShader = `
      uniform sampler2D landDetail;
      ${contact ? 'uniform sampler2D contactOcclusionMap; uniform vec4 contactOcclusionArea;' : ''}
      ${trackColor ? 'uniform vec3 trackColor;' : ''}
      ${wetVarying}
      ${trackVarying}
      ${bankVarying}
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
      ${trackColor ? `
      float compacted = 0.;
      if (vLandTrack.z > .001) {
        float across = abs(vLandTrack.x + (mottle.g - .47) * .14);
        float vergeDistance = across - vLandTrack.y;
        float road = 1. - smoothstep(-.25, .44, vergeDistance);
        float verge = smoothstep(-.33, .14, vergeDistance) * (1. - smoothstep(.30, .78, vergeDistance));
        vec4 gravelDetail = texture2D(landDetail, coords * .91 + vec2(1.9, .26));
        float scattered = verge * (.18 + .68 * smoothstep(.29,.67,gravelDetail.r * .75 + spots.r * .32));
        // The tallest covered layer wins locally, allowing turf and exposed fragments
        // to interrupt the road edge at the scale of each material's relief.
        vec3 coverage = vec3(1. - road, road, scattered);
        vec3 heights = vec3(grit.g * .56 + .13, spots.g * .37, gravelDetail.a * .65 + .24);
        vec3 coveredHeight = heights + coverage * .72;
        float highest = max(coveredHeight.r, max(coveredHeight.g, coveredHeight.b));
        vec3 layers = coverage * max(vec3(0.), coveredHeight - highest + .34);
        layers /= max(dot(layers, vec3(1.)), .001);
        float groove = abs(across - clamp(vLandTrack.y * .45, .40, .64));
        float rut = (1. - smoothstep(.037, .16, groove)) * mix(.38, 1., smoothstep(.27, .69, mottle.r))
          * road;
        vec3 earthColor = trackColor * (.75 + .28 * mottle.g + .17 * grit.r) * (1. - rut * .22);
        earthColor += vec3(.030,.024,.015) * flecks * (1. - rut);
        vec3 fragments = mix(trackColor * .77, vec3(.39,.36,.28), smoothstep(.34,.64,gravelDetail.r));
        vec3 edgeColor = diffuseColor.rgb * layers.r + earthColor * layers.g + fragments * layers.b;
        diffuseColor.rgb = mix(diffuseColor.rgb, edgeColor, vLandTrack.z);
        landDisplacement += ((gravelDetail.a - .45) * layers.b * .031 - rut * .022) * vLandTrack.z;
        compacted = layers.g * (.16 + rut * .17) * vLandTrack.z;
      }
      ` : ''}
      ${wetSoil ? `
      float moisture = vLandWetness * (.89 + .24 * spots.g);
      float dampRim = smoothstep(.10, .70, moisture);
      diffuseColor.rgb *= mix(vec3(1.), vec3(.96, .88, .76), dampRim);
      float mossHeight = smoothstep(.17, .37, moisture) * (1. - smoothstep(.43, .69, moisture));
      float mossIslands = smoothstep(.37, .66, .53 * spots.g + .31 * mottle.b + .16 * grit.g);
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.14,.17,.057), mossHeight * mossIslands * .58);
      landDisplacement *= mix(1., .48, dampRim);
      landDisplacement += (grit.a - .42) * .009 * groundFade * dampRim;
      ` : ''}
    `).replace('#include <roughnessmap_fragment>', `
      #include <roughnessmap_fragment>
      ${physical ? 'roughnessFactor = clamp(roughnessFactor + (pore - .47) * .26 * groundFade - wetStone * .34, .49, 1.0);' : ''}
      ${trackColor ? 'roughnessFactor -= compacted;' : ''}
      ${wetSoil ? 'roughnessFactor = mix(roughnessFactor, mix(.15, .25, pore), dampRim);' : ''}
    `).replace('#include <aomap_fragment>', `
      #include <aomap_fragment>
      ${physical ? 'reflectedLight.indirectDiffuse *= 1.0 - (1.0 - smoothstep(.25, .44, grit.a)) * .11 * groundFade;' : ''}
      ${contact ? `
        vec2 contactUV = (vLandPosition.xz - contactOcclusionArea.xy) / contactOcclusionArea.zw;
        vec2 contactInside = step(vec2(0.), contactUV) * step(contactUV, vec2(1.));
        float contactFactor = mix(1., texture2D(contactOcclusionMap, contactUV).r, contactInside.x * contactInside.y);
        ${wetSoil ? 'contactFactor = mix(contactFactor, 1., dampRim * .40);' : ''}
        reflectedLight.indirectDiffuse *= contactFactor;
        reflectedLight.indirectSpecular *= mix(.35, 1., contactFactor);
        reflectedLight.directDiffuse *= mix(.82, 1., contactFactor);
      ` : ''}
      ${bankBounce ? `
        // Light scattered by shallow water and adjacent earth reaches the bank
        // faces where the directional light cannot.
        vec3 minimumBounce = diffuseColor.rgb * vec3(.78, .69, .54);
        vec3 diffuseLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
        reflectedLight.indirectDiffuse += max(minimumBounce - diffuseLight, vec3(0.)) * clamp(vLandBank, 0., 1.);
      ` : ''}
    `).replace('#include <normal_fragment_maps>', `
      #include <normal_fragment_maps>
      vec3 landDx = dFdx(-vViewPosition), landDy = dFdy(-vViewPosition);
      vec3 landRx = cross(landDy, normal), landRy = cross(normal, landDx);
      float landDet = dot(landDx, landRx);
      vec3 landGradient = sign(landDet) * (dFdx(landDisplacement) * landRx + dFdy(landDisplacement) * landRy);
      normal = normalize(max(abs(landDet), 1e-7) * normal - landGradient * (1. - strata * .64));
    `);
    if (heightFog) applyHeightFog(shader);
  };
  material.customProgramCacheKey = () => `valley-terrain-${physical}-${wetSoil}-${Boolean(trackColor)}-${bankBounce}-${Boolean(contact)}-${heightFog}`;
  return material;
}
