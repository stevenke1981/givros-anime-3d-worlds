import * as THREE from 'three';
import {
  groundAt, laneDistance, mix, paddies, paddyShape, riverCenter, riverLevel,
  riverWidth, smooth
} from './layout.js';
import { groundMaterial } from './ground-material.js';
import { waterEnvironmentGLSL } from '../lighting/water-environment.js';

export function randomSequence(initialSeed) {
  let seed = initialSeed >>> 0;
  return () => {
    seed = (1664525 * seed + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function landscapeMesh(w, h, pointAt, material) {
  const positions = [], colors = [], landCover = [], indices = [];
  for (let j = 0; j <= h; j++) {
    for (let i = 0; i <= w; i++) {
      const [x, y, z, color, cover] = pointAt(i / w, j / h);
      positions.push(x, y, z);
      if (color) colors.push(color.r, color.g, color.b);
      if (cover) landCover.push(...cover);
      if (i === w || j === h) continue;
      const a = j * (w + 1) + i, b = a + w + 1;
      indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  if (colors.length) geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  if (landCover.length) geometry.setAttribute('landCover', new THREE.Float32BufferAttribute(landCover, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return new THREE.Mesh(geometry, material);
}

const extend = (value, lower, upper) => {
  const fringe = .13;
  if (value < fringe) return lower - 77 * ((fringe - value) / fringe) ** 1.7;
  if (value > 1 - fringe) return upper + 77 * ((value - 1 + fringe) / fringe) ** 1.7;
  return mix(lower, upper, (value - fringe) / (1 - 2 * fringe));
};

export function addTerrain(scene, detail) {
  const palette = {
    grass: new THREE.Color('#77854e'),
    straw: new THREE.Color('#a1a175'),
    fern: new THREE.Color('#435b42'),
    path: new THREE.Color('#b19a7a'),
    pathShade: new THREE.Color('#8f7b62'),
    sand: new THREE.Color('#a19784'),
    gravel: new THREE.Color('#6e756b'),
    mud: new THREE.Color('#6c644e'),
    courtyard: new THREE.Color('#aaa296')
  };
  const rng = randomSequence(8109);
  const turf = landscapeMesh(372, 372, (u, v) => {
    const x = extend(u, -62, 62), z = extend(v, -76, 49);
    const y = groundAt(x, z);
    const broad = .48 + .17 * Math.sin(x * .095 + z * .142) + .12 * Math.sin(z * .23 - x * .175) +
      .10 * Math.sin(x * .49 + z * .71 + Math.cos(z * .61 - x * .42)) +
      .07 * Math.cos(x * .94 + z * 1.23);
    const grain = (rng() - .46) * .085 + .031 * Math.sin(x * 11 + z * 7);
    const color = palette.fern.clone().lerp(palette.grass, smooth(.01, .68, broad))
      .lerp(palette.straw, smooth(.51, 1, broad) * .64);
    const path = laneDistance(x, z);
    const bank = Math.abs(x - riverCenter(z)) - riverWidth(z);
    const shore = smooth(2.65, .53, bank + Math.sin(z * 2.5 + x * .6) * .18);
    const bankColor = palette.gravel.clone().lerp(palette.sand, smooth(-2, 1.5, bank));
    color.lerp(bankColor, shore);
    const width = x < -13 && z > -5 && z < 5 ? 1.59 : 1.06;
    const treadDistance = path + grain * 2.3 + .12 * Math.sin(z * 2.3 - x * 1.8);
    const wear = smooth(width + .27, width - .33, treadDistance) * smooth(.01, .12, y - riverLevel(z));
    color.lerp(palette.pathShade.clone().lerp(palette.path, .61 + broad * .36), wear);
    let earth = Math.max(shore * .90, wear);
    let rocky = shore * smooth(.8, -.40, bank);
    for (const [px, pz, rx, rz] of paddies) {
      if (Math.abs(x - px) > rx + 1 || Math.abs(z - pz) > rz + 1) continue;
      const r = paddyShape(x - px, z - pz, rx, rz);
      const basin = smooth(1.12, .77, r);
      color.lerp(palette.mud, basin);
      earth = Math.max(earth, basin);
      color.lerp(palette.grass, smooth(.9, 1.02, r) * smooth(1.18, 1.06, r) * .5);
    }
    const courtyard = Math.hypot((x + 18) * .86, (z + 46.5) * 1.10);
    const court = smooth(5.5, 4.2, courtyard);
    color.lerp(palette.courtyard, court);
    earth = Math.max(earth, court);
    rocky = Math.max(rocky, court * .65);
    color.multiplyScalar(1 + grain);
    return [x, y, z, color, [earth, rocky, rocky * .23]];
  }, groundMaterial(detail, { roughness: .96 }));
  turf.receiveShadow = true;
  turf.name = 'Sculpted river valley and earth terraces';
  turf.userData.gaussianKind = 'turf';
  scene.add(turf);
}

export function addMountains(scene, detail) {
  const ridges = [
    { z: -257, depth: 148, width: 340, offset: -13, height: 89, shift: 2.8, green: '#87a8bf', rock: '#adc2d3', shade: '#7399b5' },
    { z: -191, depth: 112, width: 270, offset: -20, height: 65, shift: 1.2, green: '#6e9397', rock: '#9baeb7', shade: '#557d8b' },
    { z: -139, depth: 117, width: 213, offset: -46, height: 59, shift: .2, green: '#547b69', rock: '#91a0a1', shade: '#46636b' },
  ];
  ridges.forEach(({ z: centerZ, depth, width, offset, height, shift, green, rock, shade }, layer) => {
    const needles = new THREE.Color(green);
    const cliff = new THREE.Color(rock);
    const shadow = new THREE.Color(shade);
    const mesh = landscapeMesh(160, 104, (u, v) => {
      const x = offset + (u - .5) * width;
      const z = centerZ + (v - .5) * depth;
      const spineCenter = .37 + .065 * Math.sin(u * 12 + shift) + .021 * Math.sin(u * 47);
      const slopes = smooth(.60, .015, Math.abs(v - spineCenter));
      const spine = Math.sin(u * Math.PI) ** .67;
      const crest = .77 + .080 * Math.sin(u * 17 + shift) + .049 * Math.sin(u * 30 + shift) +
        .040 * Math.sin(u * 52 + shift) + .012 * Math.sin(u * 113);
      const strata = Math.sin((x + z * .52) * .56) * .5 + Math.sin((x - z * .16) * 1.10) * .5;
      const buttress = Math.sin(x * .18 + z * .072) * .55 + Math.cos(z * .23 - x * .37) * .36;
      const base = groundAt(x, z);
      const y = -11 + height * Math.pow(slopes, 1.19) * spine *
        (crest + buttress * .128 + strata * .05);
      const join = layer === 2 ? smooth(-.6, 8, y - base) : 1;
      const exposure = smooth(15, 42, y) * smooth(-.55, .64, buttress + strata * .46) +
        .33 * smooth(.35, 1.1, buttress + strata) * smooth(7, 23, y);
      const light = .42 + .26 * Math.sin(x * .075 + z * .1) + .14 * Math.sin(y * .45 + x * .29);
      const foothill = new THREE.Color('#657951').lerp(needles, .59 + strata * .16);
      const massif = shadow.clone().lerp(needles, light + .24).lerp(cliff, Math.min(.89, exposure));
      const color = foothill.lerp(massif, join);
      color.multiplyScalar(1 + .078 * strata);
      return [x, y, z, color, [exposure * .8, exposure, .68 + exposure * .25]];
    }, groundMaterial(detail, { roughness: 1, emissive: shade, emissiveIntensity: layer === 0 ? .13 : .07 }));
    mesh.name = ['Far blue ridgeline', 'Middle forest ridgeline', 'Mountainside with exposed rock ribs'][layer];
    mesh.userData.gaussianKind = 'mountain';
    scene.add(mesh);
  });
}

const noiseGLSL = `
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 q = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.,0.)),q.x),
      mix(hash(i + vec2(0.,1.)),hash(i + vec2(1.,1.)),q.x),q.y);
}`;

export const sunDirection = new THREE.Vector3(-.54, .70, .46).normalize();

export function addSky(scene) {
  const sky = new THREE.Mesh(new THREE.SphereGeometry(480, 40, 20), new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      horizon: { value: new THREE.Color('#d8edf6') },
      zenith: { value: new THREE.Color('#4e9ad8') },
      sun: { value: sunDirection }
    },
    vertexShader: `
      varying vec3 vRay;
      void main() {
        vRay = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
      }`,
    fragmentShader: `
      uniform vec3 horizon, zenith, sun;
      varying vec3 vRay;
      ${noiseGLSL}
      float cloudNoise(vec2 point) {
        return noise(point) * .57 + noise(point * 2.12) * .25 +
          noise(point * 4.28) * .12 + noise(point * 8.49) * .06;
      }
      void main() {
        vec3 ray = normalize(vRay);
        float altitude = max(0., ray.y);
        vec3 color = mix(horizon, zenith, smoothstep(-.035, .47, altitude));
        float towardSun = max(0., dot(ray,sun));
        color += vec3(.25,.17,.09) * pow(towardSun,20.) + vec3(.75,.58,.37) * pow(towardSun,460.);
        vec2 chart = vec2(atan(ray.x, -ray.z), ray.y);
        vec2 cloudCoord = chart * vec2(9., 24.);
        float cover = max(
          1. - length((chart - vec2(-1.36,.20)) / vec2(.53,.104)),
          1. - length((chart - vec2(-.23,.125)) / vec2(.53,.079))
        );
        cover = max(cover, .80 - length((chart - vec2(.70,.22)) / vec2(.58,.095)));
        float density = cover + (cloudNoise(cloudCoord) - .46) * .85;
        float cloud = smoothstep(.02,.22,density) * smoothstep(.015,.068,altitude);
        float crown = smoothstep(-.055,.065,chart.y - .145 +
          (cloudNoise(cloudCoord + vec2(-.1,.18)) - .5) * .17);
        vec3 lit = mix(vec3(.63,.75,.89), vec3(1.,.99,.96), crown);
        color = mix(color, lit, cloud * .94);
        gl_FragColor = vec4(color, 1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  }));
  sky.name = 'Spring sky and pale cloud banks';
  sky.frustumCulled = false;
  sky.renderOrder = -100;
  scene.add(sky);
}

export function addWater(scene) {
  const clock = { value: 0 };
  const waterMaterial = new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    userData: { waterEnvironment: true },
    uniforms: {
      clock, sun: { value: sunDirection },
      deep: { value: new THREE.Color('#117488') },
      shallow: { value: new THREE.Color('#64c9bb') },
      reflection: { value: new THREE.Color('#abd9e9') },
      isPaddy: { value: 0 },
      basinBounds: { value: new THREE.Vector4(0, 0, 0, 0) }
    },
    vertexShader: `
      varying vec3 wPos;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.);
        wPos = world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }`,
    fragmentShader: `
      uniform float clock, isPaddy;
      uniform vec3 sun, deep, shallow, reflection;
      uniform vec4 basinBounds;
      varying vec3 wPos;
      ${noiseGLSL}
      ${waterEnvironmentGLSL}
      void main() {
        float z = wPos.z, x = wPos.x, t = clock;
        float center = 2.7*sin((z-1.)*.092) + .65*sin((z-1.)*.24)
          + 24. * (1. - smoothstep(-110.,-65.,z));
        float width = 5.65 + .42*sin((z-1.)*.14) + .22*sin((z-1.)*.32);
        float edge = abs(x-center) / width;
        vec2 uv = vec2(x, z - t * .42);
        float wide = noise(uv * vec2(.42,.57));
        float swirl = noise(uv * vec2(.73,1.62));
        float wind = 2. * swirl - 1. +
          .33 * sin(z * 4.2 + x * 1.37 - t * 1.9 + wide * 8.);
        float vein = noise(vec2(x * 1.8 - z * .10 + wide * 1.4, (z - t * .58) * 4.1));
        float littoral = smoothstep(.47,1.07,edge) * (1. - isPaddy);
        vec3 body = mix(deep, shallow, .045 + littoral * .65 + wide * .16);
        float shoal = 1. - smoothstep(.03,.27,1. - edge);
        float sediments = noise(vec2(x*1.9, z*1.3)) * .64 + noise(vec2(x*.5,z*.71)) * .36;
        vec3 bed = mix(vec3(.115,.118,.073), vec3(.339,.345,.213), sediments);
        body = mix(body, bed, shoal * .56 * (1. - isPaddy));
        vec3 view = normalize(cameraPosition - wPos);
        vec3 norm = normalize(vec3(.026 * wind, 1., .041 * wind + .05 * (vein-.5)));
        #ifdef USE_WATER_ENVIRONMENT
          body = reflectWater(body, norm, view, .08 + wide * .075);
        #else
          float fresnel = pow(1. - max(dot(view, norm),0.),3.);
          float reflectedClouds = noise(vec2(x*.16, z*.22) + norm.xz * 22.) * .24;
          float reflectedBanks = smoothstep(.35,.97,edge) * noise(vec2(z*.37,x*.46) + norm.xz*16.);
          vec3 reflected = mix(reflection, vec3(.16,.27,.22), reflectedBanks * .82 * (1. - isPaddy));
          body = mix(body, reflected, min(.73, .08 + fresnel*.57 + reflectedClouds * fresnel));
        #endif
        float streak = smoothstep(.82,.97,vein + .045 * wind) * smoothstep(.35,.86,wide);
        float foam = smoothstep(.92,1.03,edge) * smoothstep(.60,.80,vein) * (1. - isPaddy);
        float glint = pow(max(0.,dot(reflect(-sun,norm),view)),110.) * (.26 + wide * .58);
        body += vec3(.18,.24,.23) * (streak * .40 + foam * .43) + vec3(.40,.37,.27)*glint;
        if (basinBounds.z > 0.) {
          vec2 local = abs((wPos.xz - basinBounds.xy) / basinBounds.zw);
          float radius = pow(pow(local.x, 3.5) + pow(local.y, 3.5), 1. / 3.5);
          float shelf = smoothstep(.70,.97,radius + .05 * (sediments - .5));
          vec3 muddyBed = mix(deep, shallow, clamp(.33 * sediments + .59 * shelf, 0., 1.));
          #ifdef USE_WATER_ENVIRONMENT
            body = reflectWater(muddyBed, norm, view, .055 + shelf * .13);
          #else
            vec3 reflectedRay = reflect(-view, norm);
            float skyBand = smoothstep(.02,.32,reflectedRay.y);
            float reflectedHaze = smoothstep(.30,.78,noise(reflectedRay.xz * 2.2 + wPos.xz * .18));
            vec3 stillSky = mix(vec3(.10,.16,.115), reflection, skyBand);
            stillSky = mix(stillSky, vec3(.67,.76,.81), reflectedHaze * skyBand * .33);
            body = mix(muddyBed, stillSky, (.25 + fresnel * .63) * (1. - shelf * .52));
          #endif
          body += vec3(.12,.15,.14) * (streak * .23 + glint);
        }
        gl_FragColor = vec4(body,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  });
  const river = landscapeMesh(26, 292, (u, v) => {
    const z = extend(v, -76, 49);
    return [riverCenter(z) + (u * 2 - 1) * (riverWidth(z) + .82), riverLevel(z), z];
  }, waterMaterial);
  river.name = 'Turquoise river with downstream surface flow';
  scene.add(river);

  const paddyMaterial = waterMaterial.clone();
  paddyMaterial.uniforms.clock = clock;
  paddyMaterial.uniforms.isPaddy.value = 1;
  paddyMaterial.uniforms.deep.value = new THREE.Color('#8e9e68');
  paddyMaterial.uniforms.shallow.value = new THREE.Color('#b8ba76');
  for (const [px, pz, rx, rz, level] of paddies) {
    const basinMaterial = paddyMaterial.clone();
    basinMaterial.uniforms.clock = clock;
    basinMaterial.uniforms.basinBounds.value.set(px, pz, rx, rz);
    basinMaterial.uniforms.deep.value.set('#71694b');
    basinMaterial.uniforms.shallow.value.set('#8f835b');
    const basin = landscapeMesh(20, 20, (u, v) => {
      const x = (u * 2 - 1), z = (v * 2 - 1);
      const scale = Math.max(Math.abs(x), Math.abs(z)) / Math.max(paddyShape(x, z, 1, 1), .0001);
      return [px + x * scale * rx * .96, level, pz + z * scale * rz * .96];
    }, basinMaterial);
    basin.name = 'Flooded rice terrace';
    scene.add(basin);
  }

  const irrigation = landscapeMesh(8, 51, (u, v) => {
    const x = mix(7.3, 16.1, v);
    const z = -25.2 + 5.7 * v + (u - .5) * .37;
    return [x, groundAt(x, z) + .025, z];
  }, paddyMaterial);
  irrigation.name = 'Uphill paddy feeder channel';
  scene.add(irrigation);
  return clock;
}
