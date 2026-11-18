import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import {
  canWalk, crossings, groundAt, houseFloors, houses, laneDistance, mix, paddies, paddyShape,
  riverCenter, riverWidth, shrine, stairHeight, steps, surfaceAt as surfaceY, torii
} from './layout.js';
import { addMountains, addSky, addTerrain, addWater, randomSequence, sunDirection } from './landscape.js';
import { createGroundDetail } from './ground-material.js';
import { plantUnderstory } from './understory.js';

const assetNames = [
  'house', 'bridge', 'torii', 'shrine', 'sakura', 'cedar', 'cedar-lod',
  'stone-lantern', 'rock', 'bamboo', 'rice', 'fence', 'stair-tread', 'stair-tread-b', 'stair-tread-c',
  'grass', 'river-sedge'
];

async function loadAssets(onProgress) {
  const loader = new GLTFLoader();
  let loaded = 0;
  const assets = await Promise.all(assetNames.map(async name => {
    const { scene } = await loader.loadAsync(`${import.meta.env.BASE_URL}models/${name}.glb`);
    scene.updateMatrixWorld(true);
    const parts = [];
    scene.traverse(part => {
      if (part.isMesh) parts.push(part);
    });
    if (!parts.length) throw new Error(`No mesh found in ${name}.glb`);
    onProgress(.07 + .57 * (++loaded / assetNames.length), '載入 Blender 資產');
    return [name, parts];
  }));
  return Object.fromEntries(assets);
}

function batchAsset(scene, parts, placements, { castShadow = true, receiveShadow = true } = {}) {
  if (!placements.length) return;
  const matrix = new THREE.Matrix4();
  const transform = new THREE.Object3D();
  for (const part of parts) {
    const instances = new THREE.InstancedMesh(part.geometry, part.material, placements.length);
    instances.name = part.name;
    instances.castShadow = castShadow;
    instances.receiveShadow = receiveShadow;
    for (const [i, [x, y, z, rotation, sx, sy = sx, sz = sx, color]] of placements.entries()) {
      transform.position.set(x, y, z);
      transform.rotation.set(0, rotation, 0);
      transform.scale.set(sx, sy, sz);
      transform.updateMatrix();
      instances.setMatrixAt(i, matrix.multiplyMatrices(transform.matrix, part.matrixWorld));
      if (color) instances.setColorAt(i, color);
    }
    instances.computeBoundingSphere();
    scene.add(instances);
  }
}

function populate(scene, assets) {
  const rand = randomSequence(24118);
  const hitCircles = [];
  const blocked = (x, z) => hitCircles.some(([cx, cz, radius]) =>
    (x - cx) ** 2 + (z - cz) ** 2 < radius ** 2
  );
  batchAsset(scene, assets.house, houses.map(([x, z, r, s], i) => [
    x, houseFloors[i], z, r, s, s * (.95 + rand() * .10), s,
    new THREE.Color(['#ffffff','#f5efe2','#eee7df','#f0f2f3','#ebeae2'][i % 5])
  ]));
  batchAsset(scene, assets.bridge, crossings.map(({ x, y, z }) => [x, y, z, 0, 1]));
  batchAsset(scene, assets.shrine, [[shrine.x, shrine.y, shrine.z, 0, 1]]);
  batchAsset(scene, assets.torii, [[torii.x, groundAt(torii.x, torii.z), torii.z, 0, 1]]);

  const stairDepth = (steps.start - steps.end) / steps.count;
  const treadAssets = ['stair-tread', 'stair-tread-b', 'stair-tread-c'];
  const stairPlacements = treadAssets.map(() => []);
  for (let i = 0; i < steps.count; i++) {
    const z = steps.start - (i + .5) * stairDepth;
    stairPlacements[(i + Math.floor(i / 5)) % treadAssets.length].push([
      steps.x, stairHeight(z), z, 0, 1, 1, stairDepth / .38 + .025,
      new THREE.Color().setScalar(.86 + rand() * .14)
    ]);
  }
  for (const [i, name] of treadAssets.entries()) {
    batchAsset(scene, assets[name], stairPlacements[i], { castShadow: false });
  }

  const blossomSites = [
    [-8.8, 4.6, 1.32], [-13.8, 12.9, .85], [-24.9, 14, .75],
    [11.8, 5.9, .90], [-12.0, -33.5, .97], [-23.8, -44.8, .82],
    [-15.5, -50.5, 1.03], [-41.1, -11.5, .76]
  ];
  const blossomTints = ['#fff4fc', '#ffe0ed', '#fff5ee', '#fff8fd', '#ffd9ec', '#fff0f5', '#fff2f6', '#fff3f3'];
  batchAsset(scene, assets.sakura, blossomSites.map(([x, z, size], i) => {
    hitCircles.push([x, z, Math.min(.7, size * .47)]);
    return [x, groundAt(x, z) - .065, z, i * 1.41, size, size, size, new THREE.Color(blossomTints[i])];
  }));

  const cedarNear = [], cedarFar = [], bamboo = [], rock = [], rice = [], fences = [], lanterns = [];
  const treeTints = ['#eff2e4','#d6e5de','#dce9bc','#e9edcd','#f4f3d8','#c5d8cc'];
  for (let i = 0; i < 982; i++) {
    const x = mix(-58, 57, rand()), z = mix(-67, 38, rand());
    const woodland = z < -32 || x < -39 || x > 44 || (z > 18 && x < 7) || (z > 31 && x > 28);
    const patch = Math.sin(x * .27 - z * .16) + Math.cos(x * .13 + z * .40);
    const bambooSlope = x < -22 && z < -34 && z > -53 && x > -43;
    const clearing = Math.hypot(x + 33, z + 46) < 4.25 || Math.hypot(x + 41, z + 50) < 3.4;
    if (!woodland || clearing || Math.abs(x - riverCenter(z)) < 9 ||
        laneDistance(x,z) < 2.05 || blocked(x,z) || patch < -.78 ||
        houses.some(([hx, hz]) => Math.hypot(hx - x, hz - z) < 5.80) ||
        blossomSites.some(([tx, tz]) => Math.hypot(tx - x,tz - z) < 4.0) ||
        Math.hypot(x - shrine.x, z - shrine.z) < 9) continue;
    const type = bambooSlope && rand() > .24 ? bamboo : (z < -50 || Math.abs(x) > 42 ? cedarFar : cedarNear);
    const size = type === bamboo ? .57 + rand() * .57 : .58 + rand() * .68;
    const hitRadius = size * (type === bamboo ? .77 : .36);
    hitCircles.push([x, z, hitRadius + .22]);
    type.push([x, groundAt(x,z) - .09, z, rand() * Math.PI * 2, size, size * (.92 + rand() * .21), size,
      new THREE.Color(treeTints[Math.floor(rand() * treeTints.length)])]);
  }
  // Stagger canopies across the foot of the ridge, leaving out any trees that would appear to float.
  for (let i = 0; i < 102; i++) {
    const x = mix(-61, 60, rand()), z = mix(-74, -58, rand());
    if (Math.abs(x - riverCenter(z)) < 8.9 || hitCircles.some(([a,b]) => Math.hypot(x-a, z-b) < 1.45)) continue;
    const s = .68 + rand() * .52;
    cedarFar.push([x, groundAt(x,z) - .14, z, rand() * 6.28, s, s, s, new THREE.Color('#c4d6d0')]);
  }

  for (let i = 0; i < 192; i++) {
    const z = mix(-61, 44, rand());
    const side = rand() > .5 ? 1 : -1;
    const x = riverCenter(z) + side * (riverWidth(z) + mix(-1.7, 2.1, rand()));
    if (laneDistance(x,z) < 1.75 || crossings.some(item => Math.abs(item.z - z) < 3.3)) continue;
    const s = .19 + Math.pow(rand(), 2.04) * .73;
    rock.push([x, groundAt(x,z) - .085, z, rand() * 6.28, s, s * (.66 + rand() * .55), s,
      new THREE.Color().setScalar(.77 + rand() * .23)]);
    if (s > .49) hitCircles.push([x, z, s * .77]);
  }
  for (const [x, z, s] of [[-7.8, 10.4,1.23],[7.8, 12.2,1.12],[-8.4, 13.6,.9],
    [-8.5,-11.9,1.04],[7.4,-17.9,.86],[-25.4,-42.4,.8],[-40.4,-47.9,.9],[34.2,30.2,1.09]]) {
    if (laneDistance(x,z) < 1.75 || blocked(x,z)) continue;
    rock.push([x, groundAt(x,z) - .12, z, rand() * 6.28, s]);
    hitCircles.push([x, z, s * .84]);
  }

  for (const [px, pz, rx, rz, water] of paddies) {
    const spacing = .71;
    for (let dz = -rz; dz <= rz; dz += spacing) {
      for (let dx = -rx; dx <= rx; dx += spacing) {
        const x = px + dx + (rand() - .5) * .18, z = pz + dz + (rand() - .5) * .18;
        if (paddyShape(x - px, z - pz, rx, rz) > .83) continue;
        const s = .83 + rand() * .30;
        rice.push([x, water - .135, z, rand() * 6.28, s, s, s,
          new THREE.Color().setScalar(.80 + rand() * .20)]);
      }
    }
  }
  for (const [x, z] of [[-20.35,-33.7],[-15.6,-34.8],[-20.3,-42.3],[-15.69,-42.3],
    [-21.56,-44.37],[-14.42,-44.37],[-11.1,.97],[-11.9,-23.9]]) {
    lanterns.push([x, groundAt(x,z), z, rand() * .64, .88 + rand() * .16]);
    hitCircles.push([x, z, .49]);
  }
  for (const [x, z, a, segments] of [[-25.5,10.6,.10,3],[-36,8.2,-.20,2],[-24.7,-24.8,.05,2],
    [25.0,9.4,-.20,2],[35.6,31.3,-.51,2]]) {
    for (let k = 0; k < segments; k++) {
      const t = (k - (segments - 1) / 2) * 2.30;
      const fx = x + t * Math.cos(a), fz = z - t * Math.sin(a);
      if (laneDistance(fx,fz) < 1.65 || blocked(fx,fz)) continue;
      fences.push([fx, groundAt(fx,fz) - .03, fz, a, 1]);
      for (const offset of [-.86, -.43, 0, .43, .86]) {
        hitCircles.push([fx + offset * Math.cos(a), fz - offset * Math.sin(a), .32]);
      }
    }
  }

  for (const [placements, shadow] of [[cedarNear, true], [cedarFar, false]]) {
    const groves = new Map();
    for (const tree of placements) {
      const cell = `${Math.floor(tree[0] / 29)},${Math.floor(tree[2] / 29)}`;
      if (!groves.has(cell)) groves.set(cell, []);
      groves.get(cell).push(tree);
    }
    for (const trees of groves.values()) {
      if (!shadow) {
        batchAsset(scene, assets['cedar-lod'], trees, { castShadow: false, receiveShadow: false });
        continue;
      }
      const centerX = trees.reduce((sum, tree) => sum + tree[0], 0) / trees.length;
      const centerZ = trees.reduce((sum, tree) => sum + tree[2], 0) / trees.length;
      const grove = new THREE.LOD();
      grove.name = 'Cedar grove LOD';
      grove.position.set(centerX, groundAt(centerX, centerZ), centerZ);
      for (const [model, distance] of [['cedar', 0], ['cedar-lod', 33]]) {
        const level = new THREE.Group();
        level.position.copy(grove.position).negate();
        batchAsset(level, assets[model], trees);
        grove.addLevel(level, distance, .12);
      }
      scene.add(grove);
    }
  }
  batchAsset(scene, assets.bamboo, bamboo);
  batchAsset(scene, assets.rock, rock);
  batchAsset(scene, assets.rice, rice, { castShadow: false });
  batchAsset(scene, assets.fence, fences);
  batchAsset(scene, assets['stone-lantern'], lanterns);

  const { grass, sedge } = plantUnderstory();
  for (const [species, plants] of [['grass', grass], ['river-sedge', sedge]]) {
    const clusters = new Map();
    for (const plant of plants) {
      const cell = `${Math.floor(plant[0] / 24)},${Math.floor(plant[2] / 24)}`;
      if (!clusters.has(cell)) clusters.set(cell, []);
      clusters.get(cell).push(plant);
    }
    for (const patch of clusters.values()) batchAsset(scene, assets[species], patch, { castShadow: false });
  }

  // Complete the distant bank with small trees below the exposed ridgeline.
  const farBank = [], ridgeRand = randomSequence(27835);
  for (let i = 0; i < 148; i++) {
    const z = mix(-103, -73, ridgeRand()), x = mix(-68, 74, ridgeRand());
    if (Math.abs(x - riverCenter(z)) < 7.7 || Math.sin(x * .19 - z * .23) + Math.cos(x * .11 + z * .48) < .05) continue;
    const s = mix(.43, .88, ridgeRand());
    farBank.push([x, groundAt(x,z) - .27, z, ridgeRand() * Math.PI * 2, s, s, s, new THREE.Color('#c2d6c7')]);
  }
  batchAsset(scene, assets['cedar-lod'], farBank, { castShadow: false, receiveShadow: false });

  return { blossomSites, blocked };
}

function addPetals(scene, blossomSites) {
  const random = randomSequence(8592);
  const geometry = new THREE.BufferGeometry();
  const count = 140;
  const position = new THREE.BufferAttribute(new Float32Array(count * 3), 3);
  position.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('position', position);
  const movement = Array.from({ length: count }, (_, index) => {
    const [x, z, s] = blossomSites[index % blossomSites.length];
    return [x + (random() - .5) * 5 * s, groundAt(x,z) + 1.4,
      z + (random() - .5) * 5 * s, 5.9 * s, random(), random()];
  });
  const petals = new THREE.Points(geometry, new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { time: { value: 0 } },
    vertexShader: `
      uniform float time;
      varying float spin;
      varying float opacity;
      void main() {
        vec4 view = modelViewMatrix * vec4(position, 1.);
        spin = sin(position.y * 5.1 + time * 1.25 + position.x *.2);
        opacity = (1. - smoothstep(9., 137., -view.z));
        gl_PointSize = clamp(117. / -view.z, 1.25, 8.);
        gl_Position = projectionMatrix * view;
      }`,
    fragmentShader: `
      varying float spin, opacity;
      void main() {
        vec2 p = (gl_PointCoord - .5) * 2.;
        float ca = cos(spin * 2.), sa = sin(spin * 2.);
        p = mat2(ca,sa,-sa,ca) * p;
        float d = length(p * vec2(1.25 + abs(spin) * 1.6, 1.04));
        float alpha = 1. - smoothstep(.62,1.0,d);
        gl_FragColor = vec4(1.,.63 + p.y*.18,.79 + p.y*.12,alpha * opacity * .91);
        #include <colorspace_fragment>
      }`
  }));
  petals.frustumCulled = false;
  petals.name = 'Drifting cherry petals';
  scene.add(petals);
  return (time, reducedMotion) => {
    petals.visible = !reducedMotion;
    if (reducedMotion) return;
    petals.material.uniforms.time.value = time;
    for (const [i, [x, y, z, h, phase, speed]] of movement.entries()) {
      const cycle = (phase + time * (.063 + speed * .048)) % 1;
      position.setXYZ(i, x + cycle * (2.3 + speed * 1.6) + .52 * Math.sin(time * .82 + phase * 32),
        y + h * (1 - cycle), z + cycle * 1.85 + .63 * Math.sin(time * .66 + speed * 44));
    }
    position.needsUpdate = true;
  };
}

export async function createSakuraWorld({ renderer, onProgress = () => {} } = {}) {
  onProgress(.07, '準備春櫻山村');
  const assets = await loadAssets(onProgress);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#a1cce8');
  scene.fog = new THREE.FogExp2('#c1d8e6', .0041);
  const skylight = new THREE.HemisphereLight('#e2ecff', '#8e8a70', 2.00);
  scene.add(skylight);
  const sunlight = new THREE.DirectionalLight('#fff0d4', 2.1);
  sunlight.position.copy(sunDirection).multiplyScalar(102).add(new THREE.Vector3(0, 0, -11));
  sunlight.target.position.set(0, 0, -11);
  sunlight.castShadow = true;
  sunlight.shadow.mapSize.set(2048, 2048);
  sunlight.shadow.normalBias = .062;
  sunlight.shadow.bias = -.00022;
  sunlight.shadow.radius = 3.2;
  Object.assign(sunlight.shadow.camera, { left: -49, right: 49, top: 53, bottom: -53, near: 5, far: 175 });
  sunlight.shadow.camera.updateProjectionMatrix();
  scene.add(sunlight, sunlight.target);
  if (renderer?.shadowMap) renderer.shadowMap.enabled = true;

  onProgress(.69, '雕塑河谷與梯田');
  const groundDetail = createGroundDetail();
  addSky(scene);
  addMountains(scene, groundDetail);
  addTerrain(scene, groundDetail);
  const water = addWater(scene);
  onProgress(.87, '排列村墅、竹林與春櫻');
  const { blossomSites, blocked } = populate(scene, assets);
  const petals = addPetals(scene, blossomSites);
  petals(0, false);

  const standing = (x, z, target) => ({ position: [x, surfaceY(x,z) + 1.65, z], target });
  const views = {
    overview: { position: [36,22,37], target: [-7,9.8,-16] },
    bridge: standing(10.55,5.6,[-7.2,3.2,-.40]),
    shrine: standing(-21.8,-36.10,[-17.85,9.42,-46.15]),
    fields: standing(35.2,-12.02,[15.0,.8,-6.0]),
    overlook: standing(-41,-50,[-14,6.5,-18]),
    village: standing(-14,0,[-27,2,-6]),
  };
  const spawn = standing(36.8,28.5,[0,3.2,-6]);
  const landmarks = [
    { id: 'bridge', position: [0, surfaceY(0,1), 1] },
    { id: 'shrine', position: [shrine.x, shrine.y, shrine.z] },
    { id: 'village', position: [-20, surfaceY(-20,-1), -1] },
    { id: 'fields', position: [20, surfaceY(20,-9.8), -9.8] },
    { id: 'torii', position: [torii.x, groundAt(torii.x,torii.z), torii.z] },
    { id: 'overlook', position: [-41, surfaceY(-41,-50), -50] },
  ];
  onProgress(1, '春櫻山村已就緒');
  return {
    scene, spawn, views, landmarks,
    surfaceAt: surfaceY,
    canWalk: (x,z) => canWalk(x,z) && !blocked(x,z),
    update(elapsedSeconds, _deltaSeconds, reducedMotion) {
      water.value = reducedMotion ? 0 : elapsedSeconds;
      petals(elapsedSeconds, reducedMotion);
    }
  };
}
