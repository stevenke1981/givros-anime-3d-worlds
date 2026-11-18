import * as THREE from 'three';
import {
  groundAt, laneDistance, mix, paddies, paddyShape, riverCenter, riverLevel,
  riverWidth, smooth
} from './layout.js';

export function randomSequence(initialSeed) {
  let seed = initialSeed >>> 0;
  return () => {
    seed = (1664525 * seed + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function landscapeMesh(w, h, pointAt, material) {
  const positions = [], colors = [], indices = [];
  for (let j = 0; j <= h; j++) {
    for (let i = 0; i <= w; i++) {
      const [x, y, z, color] = pointAt(i / w, j / h);
      positions.push(x, y, z);
      if (color) colors.push(color.r, color.g, color.b);
      if (i === w || j === h) continue;
      const a = j * (w + 1) + i, b = a + w + 1;
      indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  if (colors.length) geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
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

export function addTerrain(scene) {
  const palette = {
    grass: new THREE.Color('#82a952'),
    straw: new THREE.Color('#b7be72'),
    fern: new THREE.Color('#476548'),
    path: new THREE.Color('#c3ad81'),
    pathShade: new THREE.Color('#9e8e6a'),
    sand: new THREE.Color('#b5a383'),
    gravel: new THREE.Color('#777f70'),
    mud: new THREE.Color('#716947'),
    courtyard: new THREE.Color('#b8ada0')
  };
  const rng = randomSequence(8109);
  const turf = landscapeMesh(372, 372, (u, v) => {
    const x = extend(u, -62, 62), z = extend(v, -76, 49);
    const y = groundAt(x, z);
    const broad = .49 + .23 * Math.sin(x * .11 + z * .14) + .19 * Math.sin(z * .16 - x * .27) +
      .08 * Math.sin(x * .74 + z * .38);
    const grain = (rng() - .46) * .11 + .036 * Math.sin(x * 11 + z * 7);
    const color = palette.fern.clone().lerp(palette.grass, smooth(.01, .68, broad))
      .lerp(palette.straw, smooth(.51, 1, broad) * .64);
    const path = laneDistance(x, z);
    const bank = Math.abs(x - riverCenter(z)) - riverWidth(z);
    const bankColor = palette.gravel.clone().lerp(palette.sand, smooth(-2, 1.6, bank));
    color.lerp(bankColor, smooth(2.7, .63, bank));
    if (path < 1.9 && y > riverLevel(z) + .01) {
      const width = x < -13 && z > -5 && z < 5 ? 1.65 : 1.12;
      color.lerp(palette.pathShade.clone().lerp(palette.path, .68 + grain),
        smooth(width + .33, width - .42, path + grain * 3));
    }
    for (const [px, pz, rx, rz] of paddies) {
      if (Math.abs(x - px) > rx + 1 || Math.abs(z - pz) > rz + 1) continue;
      const r = paddyShape(x - px, z - pz, rx, rz);
      color.lerp(palette.mud, smooth(1.10, .76, r));
      color.lerp(palette.grass, smooth(.9, 1.02, r) * smooth(1.18, 1.06, r) * .5);
    }
    const courtyard = Math.hypot((x + 18) * .86, (z + 46.5) * 1.10);
    color.lerp(palette.courtyard, smooth(5.2, 4.5, courtyard));
    color.multiplyScalar(1 + grain);
    return [x, y, z, color];
  }, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .96 }));
  turf.receiveShadow = true;
  turf.name = 'Sculpted river valley and earth terraces';
  scene.add(turf);
}

export function addMountains(scene) {
  const ridges = [
    { z: -226, depth: 128, width: 276, offset: 18, height: 83, shift: 2.8, green: '#8dabc0', rock: '#aabfd0', shade: '#779bb6' },
    { z: -171, depth: 107, width: 234, offset: -23, height: 72, shift: 1.2, green: '#6c9696', rock: '#96adb1', shade: '#527c8a' },
    { z: -114, depth: 111, width: 188, offset: -8, height: 61, shift: .2, green: '#547c62', rock: '#969b98', shade: '#435f66' },
  ];
  ridges.forEach(({ z: centerZ, depth, width, offset, height, shift, green, rock, shade }, layer) => {
    const needles = new THREE.Color(green);
    const cliff = new THREE.Color(rock);
    const shadow = new THREE.Color(shade);
    const mesh = landscapeMesh(160, 104, (u, v) => {
      const x = offset + (u - .5) * width;
      const z = centerZ + (v - .5) * depth;
      const slopes = Math.max(0, 1 - Math.abs(v - .40 - .08 * Math.sin(u * 12 + shift)) / .62);
      const spine = Math.max(0, 1 - Math.abs(u - .47 + .022 * Math.sin(u * 88)) / .53);
      const crest = .66 + .12 * Math.sin(u * 17 + shift) + .10 * Math.sin(u * 30 + shift) +
        .07 * Math.sin(u * 55 + shift) + .025 * Math.sin(u * 109);
      const strata = Math.sin((x + z * .52) * .56) * .5 + Math.sin((x - z * .16) * 1.10) * .5;
      const buttress = Math.sin(x * .18 + z * .072) * .55 + Math.cos(z * .23 - x * .37) * .36;
      const y = -3.7 + height * Math.pow(slopes, 1.32) * Math.pow(spine, .64) *
        (crest + buttress * .105 + strata * .022);
      const exposure = smooth(15, 42, y) * smooth(-.55, .64, buttress + strata * .46) +
        .33 * smooth(.35, 1.1, buttress + strata) * smooth(7, 23, y);
      const light = .42 + .26 * Math.sin(x * .075 + z * .1) + .14 * Math.sin(y * .45 + x * .29);
      const color = shadow.clone().lerp(needles, light + .24).lerp(cliff, Math.min(.89, exposure));
      color.multiplyScalar(1 + .071 * strata);
      return [x, y, z, color];
    }, new THREE.MeshStandardMaterial({
      vertexColors: true, roughness: 1, emissive: shade, emissiveIntensity: layer === 0 ? .16 : .10
    }));
    mesh.name = ['Far blue ridgeline', 'Middle forest ridgeline', 'Mountainside with exposed rock ribs'][layer];
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
      horizon: { value: new THREE.Color('#d5e9f4') },
      zenith: { value: new THREE.Color('#4e9ddd') },
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
        vec3 color = mix(horizon, zenith, smoothstep(-.015, .66, altitude));
        float towardSun = max(0., dot(ray,sun));
        color += vec3(.25,.17,.09) * pow(towardSun,20.) + vec3(.75,.58,.37) * pow(towardSun,460.);
        vec2 patch = ray.xz * (2.5 / (.24 + altitude)) + vec2(4., -12.);
        patch.x *= 1.22;
        float density = cloudNoise(patch + vec2(0., noise(patch * .56) * .75));
        float densityOffset = cloudNoise(patch + vec2(-.15,.11));
        float cloud = smoothstep(.56,.69,density) * smoothstep(.015,.135,altitude);
        vec3 lit = mix(vec3(.66,.77,.91), vec3(1.,.99,.94), smoothstep(-.04,.055,density - densityOffset));
        color = mix(color, lit, cloud * .96);
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
    uniforms: {
      clock, sun: { value: sunDirection },
      deep: { value: new THREE.Color('#066f91') },
      shallow: { value: new THREE.Color('#54bfb0') },
      reflection: { value: new THREE.Color('#b7deef') },
      isPaddy: { value: 0 }
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
      varying vec3 wPos;
      ${noiseGLSL}
      void main() {
        float z = wPos.z, x = wPos.x, t = clock;
        float center = 2.7*sin((z-1.)*.092) + .65*sin((z-1.)*.24);
        float width = 5.65 + .42*sin((z-1.)*.14) + .22*sin((z-1.)*.32);
        float edge = abs(x-center) / width;
        float wide = noise(vec2(x*1.1, (z-t*.35)*1.45));
        float wind = sin(z*7.0 + x*2.15 - t*3.0) + .65*sin(z*4.1 - x*3.3 - t*1.4);
        float vein = noise(vec2(x * 2.1 - z * .09,(z - t * .58) * 5.4));
        float littoral = smoothstep(.47,1.07,edge) * (1. - isPaddy);
        vec3 body = mix(deep, shallow, .09 + littoral * .72 + wide * .13);
        vec3 view = normalize(cameraPosition - wPos);
        vec3 norm = normalize(vec3(.03 * wind, 1., .075 * wind + .08 * (vein-.5)));
        float fresnel = pow(1. - max(dot(view, norm),0.),3.);
        float reflectedClouds = noise(vec2(x*.18, z*.27)) * .25;
        body = mix(body, reflection, min(.69, .09 + fresnel*.54 + reflectedClouds * fresnel));
        float streak = smoothstep(.75,.94,vein + .07 * wind) * smoothstep(.26,.81,wide);
        float foam = smoothstep(.92,1.03,edge) * smoothstep(.60,.80,vein) * (1. - isPaddy);
        float glint = pow(max(0.,dot(reflect(-sun,norm),view)),105.) * (.55 + wide * .45);
        body += vec3(.20,.26,.24) * (streak * .49 + foam * .72) + vec3(.64,.53,.33)*glint;
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
    const basin = landscapeMesh(20, 20, (u, v) => {
      const x = (u * 2 - 1), z = (v * 2 - 1);
      const scale = Math.max(Math.abs(x), Math.abs(z)) / Math.max(paddyShape(x, z, 1, 1), .0001);
      return [px + x * scale * rx * .96, level, pz + z * scale * rz * .96];
    }, paddyMaterial);
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

