import { Color, DoubleSide, Float32BufferAttribute, ShaderMaterial, UniformsLib, UniformsUtils, Vector2 } from 'three';
import { waterEnvironmentGLSL } from '../lighting/water-environment.js';
import { waterSurroundingsGLSL } from './water-surroundings.js';
import { cloudLayerGLSL } from '../lighting/sky-clouds.js';

export { registerWaterPlants } from './water-surroundings.js';

const waterProfiles = {
  river: { current: [0, .44], wave: 1, roughness: .14, absorption: 1.6, bank: .68, soil: '#85816a' },
  sea: { current: [.07, -.20], wave: 1.22, roughness: .16, absorption: 1.24, bank: .10, soil: '#a79777' },
  lake: { current: [.06, .045], wave: .48, roughness: .105, absorption: 1.1, bank: .32, soil: '#848373' },
  paddy: { current: [.015, .025], wave: .45, roughness: .086, absorption: .58, bank: .80, soil: '#7e6e4e' },
  pool: { current: [.025, -.02], wave: .37, roughness: .105, absorption: 1.23, bank: .82, soil: '#a19b78' },
  canal: { current: [-.32, .036], wave: .68, roughness: .13, absorption: 1.23, bank: .93, soil: '#8c7957' },
};

export function createWaterMaterial({ clock, sun, kind, deep, soil, sky, surroundings, rippleMap, gateX }) {
  const profile = waterProfiles[kind];
  const terraceCanal = Boolean(rippleMap) && kind === 'canal';
  return new ShaderMaterial({
    side: DoubleSide,
    defines: {
      REALISTIC_WATER: 1,
      ...(kind === 'sea' && { WATER_SURF: 1 }),
      ...(surroundings && { WATER_SURROUNDINGS: 1 }),
      ...(rippleMap && { TERRACE_WATER: 1 }),
      ...(terraceCanal && { TERRACE_CANAL: 1 }),
    },
    lights: true,
    userData: { waterEnvironment: true },
    uniforms: {
      ...UniformsUtils.clone(UniformsLib.lights),
      ...(surroundings && {
        waterSurroundings: { value: surroundings.texture },
        waterSurroundingsBounds: { value: surroundings.bounds },
      }),
      ...(rippleMap && { rippleNormalMap: { value: rippleMap } }),
      ...(terraceCanal && { watergateX: { value: gateX } }),
      clock, sun: { value: sun },
      waterSunColor: { value: new Color('#fff1d9') },
      waterSunIntensity: { value: 2 },
      deepColor: { value: new Color(deep) },
      soilColor: { value: new Color(soil ?? profile.soil) },
      skyColor: { value: new Color(sky) },
      current: { value: new Vector2(...profile.current) },
      wave: { value: profile.wave },
      roughness: { value: rippleMap ? (terraceCanal ? .083 : .057) : profile.roughness },
      absorption: { value: profile.absorption },
      bankReflection: { value: profile.bank },
    },
    vertexShader: `
      attribute float waterDepth;
      varying vec3 waterPosition;
      varying float waterThickness;
      #ifdef TERRACE_CANAL
        attribute float acrossCanal;
        varying float canalOffset;
      #endif
      #include <common>
      #include <shadowmap_pars_vertex>
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vec4 mvPosition = viewMatrix * worldPosition;
        vec3 transformedNormal = normalize(normalMatrix * vec3(0., 1., 0.));
        waterPosition = worldPosition.xyz;
        waterThickness = waterDepth;
        #ifdef TERRACE_CANAL
          canalOffset = acrossCanal;
        #endif
        gl_Position = projectionMatrix * mvPosition;
        #include <shadowmap_vertex>
      }`,
    fragmentShader: `
      uniform float clock, wave, roughness, absorption, bankReflection, waterSunIntensity;
      uniform vec2 current;
      uniform vec3 sun, waterSunColor, deepColor, soilColor, skyColor;
      varying vec3 waterPosition;
      varying float waterThickness;
      #ifdef TERRACE_WATER
        uniform sampler2D rippleNormalMap;
      #endif
      #ifdef TERRACE_CANAL
        uniform float watergateX;
        varying float canalOffset;
      #endif
      #ifdef TERRACE_WATER_CONTACT
        uniform sampler2D shoreContactMap;
        uniform vec4 shoreContactArea;
      #endif
      #include <common>
      #include <packing>
      #include <lights_pars_begin>
      #include <shadowmap_pars_fragment>
      #include <shadowmask_pars_fragment>
      ${waterEnvironmentGLSL}
      ${waterSurroundingsGLSL}
      ${rippleMap ? cloudLayerGLSL : ''}

      float waterNoise(vec2 point) {
        vec2 cell = floor(point), f = fract(point);
        f = f * f * (3. - 2. * f);
        vec4 keys = dot(cell, vec2(127.1, 311.7)) + vec4(0., 127.1, 311.7, 438.8);
        vec4 values = fract(sin(keys) * 43758.5453);
        return mix(mix(values.x, values.y, f.x), mix(values.z, values.w, f.x), f.y);
      }

      void main() {
        vec2 surface = waterPosition.xz;
        vec2 flow = surface - clock * current;
        float broad = waterNoise(flow * vec2(.55, .39));
        float footprint = length(fwidth(surface));
        float crosswind = waterNoise(flow * vec2(1.6, .93) + vec2(12.7, 35.8));
        vec2 broadSlope = vec2(.38, .92) * sin(dot(flow, vec2(2.2, 6.1)) + broad * 5. - clock * .46);
        broadSlope += vec2(.84, -.53) * sin(dot(flow, vec2(6.8, -4.3)) + crosswind * 8. + clock * .81) * .54;
        vec2 fineSlope = vec2(-.78, .63) * sin(dot(flow, vec2(-21.4, 17.7)) + crosswind * 7. - clock * 1.74);
        fineSlope += vec2(.61, .79) * sin(dot(flow, vec2(20.9, 28.0)) + broad * 11. + clock * 1.19) * .58;
        float fineVisibility = 1. - smoothstep(.026, .17, footprint);
        vec2 ripples = wave * (
          .106 * broadSlope * (1. - smoothstep(.09, .46, footprint)) +
          .099 * fineSlope * fineVisibility
        );
        #ifdef TERRACE_WATER
          vec2 waterUV = surface;
          vec2 drift = vec2(.024, -.017);
          float swell = .098;
          #ifdef TERRACE_CANAL
            waterUV.y = canalOffset;
            drift = vec2(-.33, .006);
            float downstream = watergateX - surface.x;
            float wake = smoothstep(-.25, .07, downstream) *
              exp(-max(0., downstream) * .90 - abs(canalOffset) * 5.5);
            swell *= .75 + wake * 1.15;
          #endif
          vec2 windRipple = texture2D(rippleNormalMap, (waterUV - clock * drift) * .37).rg * 2. - 1.;
          vec2 capillary = texture2D(rippleNormalMap,
            mat2(.68, .73, -.73, .68) * (waterUV - clock * drift * 1.42) * .96 + vec2(.13, .59)).gr * 2. - 1.;
          ripples = windRipple * swell + capillary * .053 * fineVisibility;
          fineSlope = capillary;
        #endif
        vec3 normal = normalize(vec3(ripples.x, 1., ripples.y));
        vec3 eye = normalize(cameraPosition - waterPosition);
        float cosView = saturate(dot(eye, normal));
        float fresnel = fresnelWater(cosView);
        float sunVisibility = getShadowMask();

        vec3 refracted = refract(-eye, normal, .7502);
        float vertical = max(.45, -dot(refracted, normal));
        vec2 bedPoint = surface + refracted.xz * waterThickness / vertical;
        float sediment = waterNoise(bedPoint * vec2(1.45, 1.84));
        float silt = waterNoise((bedPoint + sediment * .21) * vec2(4.13, 6.73));
        float grain = waterNoise(bedPoint * 15.7);
        float stone = smoothstep(.70, .89, grain) * smoothstep(.28, .66, silt) * fineVisibility;
        vec3 wetOlive = soilColor * vec3(.73, .94, .62);
        vec3 brownSilt = soilColor * vec3(1.22, 1.06, .91);
        vec3 bed = mix(wetOlive, brownSilt, sediment) * (.72 + silt * .37 + grain * .14 * fineVisibility);
        bed = mix(bed, soilColor * vec3(1.34, 1.37, 1.40), stone * .71);
        #ifdef TERRACE_CANAL
          vec2 pebbleGrid = mat2(.87, -.50, .50, .87) * bedPoint * vec2(18., 22.);
          float pebbleSeed = waterNoise(floor(pebbleGrid));
          vec2 pebble = fract(pebbleGrid) - mix(vec2(.34, .64), vec2(.64, .32), pebbleSeed);
          float radius = (1. - smoothstep(.15, .41, length(pebble * vec2(1., 1.42)))) *
            smoothstep(.39, .68, silt + pebbleSeed * .32) * fineVisibility;
          vec3 pebbleColor = mix(vec3(.15, .127, .092), vec3(.30, .278, .217), pebbleSeed);
          bed = mix(bed, pebbleColor * (.80 + .42 * smoothstep(-.22, .24, pebble.x - pebble.y)), radius);
        #endif
        #ifdef TERRACE_WATER
          bed *= mix(.54, 1.05, sunVisibility);
        #else
          bed *= mix(.76, 1.04, sunVisibility);
        #endif
        #ifdef TERRACE_WATER_CONTACT
          vec2 shoreUV = (bedPoint - shoreContactArea.xy) / shoreContactArea.zw;
          bed *= mix(.51, 1., texture2D(shoreContactMap, shoreUV).r);
        #endif
        float plantContact = 0.;
        #ifdef WATER_SURROUNDINGS
          vec4 submerged = sampleWaterSurroundings(bedPoint);
          vec4 contact = sampleWaterSurroundings(surface);
          plantContact = smoothstep(.035, .67, contact.z) * contact.w;
          float rootSediment = smoothstep(.07, .71, submerged.z) * submerged.w;
          bed *= 1. - .47 * rootSediment;
        #endif
        #ifdef TERRACE_CANAL
          vec3 attenuation = vec3(2.65, 1.61, 1.17);
        #else
          vec3 attenuation = vec3(2.45, 1.44, 1.28);
        #endif
        vec3 transmission = exp(-attenuation * (waterThickness * absorption / vertical));
        vec3 scatter = deepColor * (.54 + broad * .19) * mix(.76, 1., sunVisibility);
        vec3 body = mix(scatter, bed, transmission);

        vec3 reflectionRay = reflect(-eye, normal);
        float reflectedRoughness = roughness + wave * .040 * broad + min(footprint * .19, .09);
        #ifdef USE_WATER_ENVIRONMENT
          vec3 reflectedSky = sampleWaterEnvironment(reflectionRay, reflectedRoughness);
          reflectedSky *= .79 + .24 * waterEnvironmentIntensity;
        #else
          float horizon = smoothstep(-.035, .24, reflectionRay.y);
          vec3 overhead = mix(skyColor * .83, skyColor * .56, max(reflectionRay.y, 0.));
          float fallbackCloud = smoothstep(.47, .72, waterNoise(reflectionRay.xz * 6. + reflectionRay.y * 4.));
          overhead = mix(overhead, skyColor * 1.24, fallbackCloud * horizon * .62);
          vec3 reflectedSky = mix(skyColor * .42, overhead, smoothstep(-.23, .075, reflectionRay.y));
        #endif
        float skyBrightness = dot(reflectedSky, vec3(.213, .715, .072));
        reflectedSky /= 1. + skyBrightness * .87;
        float blockedSky = bankReflection * (1. - smoothstep(-.09, .33, reflectionRay.y));
        #ifdef TERRACE_WATER
          // Reuse the sky dome's cloud field to preserve contrast in the mirror lobe.
          // The PMREM remains the broad radiance layer and is also used as fallback.
          // Average capillary normals over the sky lobe, keeping fine waves in
          // direct specular. Otherwise cloud edges splinter into white noise.
          vec3 skyNormal = normalize(vec3(.20 * ripples.x, 1., .20 * ripples.y));
          vec3 skyRay = reflect(-eye, skyNormal);
          float altitude = max(skyRay.y, .032);
          skyRay = normalize(vec3(skyRay.x, altitude + .027, skyRay.z));
          float cloud = smoothstep(.06, .93, skyCloudCoverage(skyRay));
          vec3 skyBlue = mix(vec3(.23, .47, .82), vec3(.067, .215, .61), smoothstep(.017, .40, altitude));
          vec3 clearSky = mix(skyBlue, reflectedSky, .08);
          #ifdef TERRACE_CANAL
            clearSky = mix(vec3(.31, .35, .33), clearSky, .38);
            reflectedSky = mix(clearSky, vec3(.71, .78, .75), cloud * .74);
          #else
            reflectedSky = mix(clearSky, vec3(1.13, 1.21, 1.29), cloud * .94);
          #endif
          blockedSky *= .59;
          skyBrightness = dot(reflectedSky, vec3(.213, .715, .072));
        #endif
        vec3 bank = mix(soilColor * .73, vec3(.093, .128, .059), .64);
        vec3 reflection = mix(reflectedSky, bank, blockedSky * .52);
        #ifdef WATER_SURROUNDINGS
          vec2 localReflection = reflectedWaterBanks(waterPosition, reflectionRay);
          vec3 foliage = mix(vec3(.073, .105, .043), vec3(.143, .172, .076), broad);
          reflection = mix(reflection, bank, localReflection.x * .49);
          reflection = mix(reflection, foliage, localReflection.y * .58);
        #endif
        float glaze = .11 * pow(1. - cosView, 2.7);
        float reflectionWeight = min(.94, .022 + glaze + fresnel * (.90 - blockedSky * .14));
        #ifdef TERRACE_WATER
          reflectionWeight = fresnelWater(dot(eye, skyNormal)) * (1. - .20 * blockedSky);
          #ifdef TERRACE_CANAL
            reflectionWeight *= .76;
          #endif
        #endif
        body = mix(body, reflection, reflectionWeight);
        body *= 1. - .28 * plantContact;

        float lightFacing = saturate(dot(normal, sun));
        vec3 halfVector = normalize(eye + sun);
        float sunAlignment = saturate(dot(normal, halfVector));
        float sharpness = mix(228., 98., min(1., reflectedRoughness / .28));
        float flash = waterNoise(flow * vec2(14.3, 18.7) + vec2(.71, -.39) * clock);
        float facet = smoothstep(.56, .87, flash * .67 + length(fineSlope) * .27) * fineVisibility;
        float glint = (.27 + facet * 2.85) * pow(sunAlignment, sharpness) + .074 * pow(sunAlignment, 24.);
        float skyGlint = facet * smoothstep(.10, .37, fresnel) * smoothstep(.24, .72, skyBrightness) *
          .17 * (1. - blockedSky * .43);
        #ifdef TERRACE_WATER
          skyGlint *= .26;
        #endif
        body += waterSunColor * (waterSunIntensity * sunVisibility * lightFacing * glint);
        body += reflectedSky * skyGlint * (1. - plantContact);

        #ifdef WATER_SURF
          float shore = (1. - smoothstep(.10, .62, waterThickness));
          float crest = smoothstep(.63, .78, broad + sin(flow.y * 7.8 + flow.x * .67) * .19);
          body += vec3(.38, .43, .42) * shore * crest * mix(.48, .86, sunVisibility);
        #endif
        gl_FragColor = vec4(body, 1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
}

export function setWaterDepth(mesh, groundAt) {
  const position = mesh.geometry.getAttribute('position');
  const samples = new Float32Array(position.count);
  for (let i = 0; i < position.count; i++) {
    samples[i] = Math.max(0, position.getY(i) - groundAt(position.getX(i), position.getZ(i)));
  }
  mesh.geometry.setAttribute('waterDepth', new Float32BufferAttribute(samples, 1));
  mesh.receiveShadow = true;
}
