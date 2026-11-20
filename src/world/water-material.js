import { Color, DoubleSide, Float32BufferAttribute, ShaderMaterial, UniformsLib, UniformsUtils, Vector2 } from 'three';
import { waterEnvironmentGLSL } from '../lighting/water-environment.js';

const waterProfiles = {
  river: { current: [0, .44], wave: 1, roughness: .14, absorption: 1.6, bank: .68, soil: '#85816a' },
  sea: { current: [.07, -.20], wave: 1.22, roughness: .16, absorption: 1.24, bank: .10, soil: '#a79777' },
  lake: { current: [.06, .045], wave: .48, roughness: .105, absorption: 1.1, bank: .32, soil: '#848373' },
  paddy: { current: [.015, .025], wave: .32, roughness: .095, absorption: .78, bank: .78, soil: '#847452' },
  pool: { current: [.025, -.02], wave: .37, roughness: .105, absorption: 1.23, bank: .82, soil: '#a19b78' },
  canal: { current: [-.32, .036], wave: .68, roughness: .13, absorption: 1.23, bank: .93, soil: '#8c7957' },
};

export function createWaterMaterial({ clock, sun, kind, deep, soil, sky }) {
  const profile = waterProfiles[kind];
  return new ShaderMaterial({
    side: DoubleSide,
    defines: { REALISTIC_WATER: 1, ...(kind === 'sea' && { WATER_SURF: 1 }) },
    lights: true,
    userData: { waterEnvironment: true },
    uniforms: {
      ...UniformsUtils.clone(UniformsLib.lights),
      clock, sun: { value: sun },
      waterSunColor: { value: new Color('#fff1d9') },
      waterSunIntensity: { value: 2 },
      deepColor: { value: new Color(deep) },
      soilColor: { value: new Color(soil ?? profile.soil) },
      skyColor: { value: new Color(sky) },
      current: { value: new Vector2(...profile.current) },
      wave: { value: profile.wave },
      roughness: { value: profile.roughness },
      absorption: { value: profile.absorption },
      bankReflection: { value: profile.bank },
    },
    vertexShader: `
      attribute float waterDepth;
      varying vec3 waterPosition;
      varying float waterThickness;
      #include <common>
      #include <shadowmap_pars_vertex>
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vec4 mvPosition = viewMatrix * worldPosition;
        vec3 transformedNormal = normalize(normalMatrix * vec3(0., 1., 0.));
        waterPosition = worldPosition.xyz;
        waterThickness = waterDepth;
        gl_Position = projectionMatrix * mvPosition;
        #include <shadowmap_vertex>
      }`,
    fragmentShader: `
      uniform float clock, wave, roughness, absorption, bankReflection, waterSunIntensity;
      uniform vec2 current;
      uniform vec3 sun, waterSunColor, deepColor, soilColor, skyColor;
      varying vec3 waterPosition;
      varying float waterThickness;
      #include <common>
      #include <packing>
      #include <lights_pars_begin>
      #include <shadowmap_pars_fragment>
      #include <shadowmask_pars_fragment>
      ${waterEnvironmentGLSL}

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
        vec2 broadSlope = vec2(.42, .90) * sin(dot(flow, vec2(2.05, 4.42)) + broad * 4. - clock * .41);
        broadSlope += vec2(.88, -.47) * sin(dot(flow, vec2(4.08, -2.18)) + clock * .81) * .52;
        vec2 fineSlope = vec2(-.81, .59) * sin(dot(flow, vec2(-13.4, 9.8)) + broad * 7. - clock * 1.74);
        fineSlope += vec2(.64, .77) * sin(dot(flow, vec2(15.5, 18.7)) + clock * 1.19) * .52;
        vec2 ripples = wave * (
          .118 * broadSlope * (1. - smoothstep(.13, .62, footprint)) +
          .095 * fineSlope * (1. - smoothstep(.034, .21, footprint))
        );
        vec3 normal = normalize(vec3(ripples.x, 1., ripples.y));
        vec3 eye = normalize(cameraPosition - waterPosition);
        float cosView = saturate(dot(eye, normal));
        float fresnel = fresnelWater(cosView);
        float sunVisibility = getShadowMask();

        vec3 refracted = refract(-eye, normal, .7502);
        float vertical = max(.45, -dot(refracted, normal));
        vec2 bedPoint = surface + refracted.xz * waterThickness / vertical;
        float sediment = waterNoise(bedPoint * 1.9) * .67 + waterNoise(bedPoint * 5.4) * .33;
        vec3 bed = soilColor * (.66 + sediment * .64);
        bed *= mix(.68, 1.08, sunVisibility);
        vec3 transmission = exp(-vec3(2.45, 1.44, 1.28) * (waterThickness * absorption / vertical));
        vec3 scatter = deepColor * (.54 + broad * .19) * mix(.76, 1., sunVisibility);
        vec3 body = mix(scatter, bed, transmission);

        vec3 reflectionRay = reflect(-eye, normal);
        float reflectedRoughness = roughness + wave * .040 * broad + min(footprint * .19, .09);
        #ifdef USE_WATER_ENVIRONMENT
          vec3 reflectedSky = sampleWaterEnvironment(reflectionRay, reflectedRoughness);
          reflectedSky *= .96 + .60 * waterEnvironmentIntensity;
          vec3 ambientSky = min(reflectedSky, vec3(1.25));
          reflectedSky = ambientSky + (reflectedSky - ambientSky) * sunVisibility;
        #else
          float horizon = smoothstep(-.035, .24, reflectionRay.y);
          vec3 overhead = mix(skyColor * .83, skyColor * .56, max(reflectionRay.y, 0.));
          float cloud = smoothstep(.47, .72, waterNoise(reflectionRay.xz * 6. + reflectionRay.y * 4.));
          overhead = mix(overhead, skyColor * 1.24, cloud * horizon * .62);
          vec3 reflectedSky = mix(skyColor * .42, overhead, smoothstep(-.23, .075, reflectionRay.y));
        #endif
        // The sky PMREM is open sky. Banks and rice screen low reflected rays.
        float blockedSky = bankReflection * (1. - smoothstep(-.085, .37, reflectionRay.y));
        vec3 bank = mix(soilColor * .65, vec3(.090, .142, .082), .56);
        vec3 reflection = mix(reflectedSky, bank, blockedSky * .77);
        body = mix(body, reflection, fresnel * (.94 - blockedSky * .22) + .035);

        float lightFacing = saturate(dot(normal, sun));
        vec3 halfVector = normalize(eye + sun);
        float sunAlignment = saturate(dot(normal, halfVector));
        float sharpness = mix(163., 67., min(1., reflectedRoughness / .28));
        float glint = 4.6 * pow(sunAlignment, sharpness) + .22 * pow(sunAlignment, 20.);
        body += waterSunColor * (waterSunIntensity * sunVisibility * lightFacing * glint);

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
