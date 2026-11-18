import * as THREE from 'three';
import {
  bounds, crossings, groundAt, houses, laneDistance, mix, paddies, paddyShape,
  riverCenter, riverLevel, riverWidth, shrine, steps
} from './layout.js';
import { randomSequence } from './landscape.js';

export function plantUnderstory() {
  const random = randomSequence(84412);
  const grass = [], sedge = [];
  const grassColors = ['#e4dda9', '#ffffed', '#cbd4a2', '#bfc897', '#d2d1a4'].map(c => new THREE.Color(c));
  const sedgeColors = ['#fff4d7', '#d4d7ab', '#e8e2bb'].map(c => new THREE.Color(c));
  const canRoot = (x, z, y) => y > riverLevel(z) - .06 &&
    !crossings.some(bridge => Math.abs(z - bridge.z) < 2.05 && Math.abs(x - bridge.x) < 8) &&
    !paddies.some(([a, b, rx, rz]) => paddyShape(x - a, z - b, rx, rz) < 1.01) &&
    !houses.some(([a, b, angle, scale]) => {
      const dx = x - a, dz = z - b;
      return Math.abs(dx * Math.cos(angle) - dz * Math.sin(angle)) < 4.08 * scale &&
        Math.abs(dx * Math.sin(angle) + dz * Math.cos(angle)) < 3.13 * scale;
    }) &&
    !(Math.abs(x - steps.x) < 1.8 && z <= steps.start && z >= steps.end) &&
    Math.hypot(x - shrine.x, (z - shrine.z) * .96) > 4.45;
  const patches = [];
  // Select patches beside worn trails and in the shelter of the hillside. Walkable
  // turf can carry ankle-height leaves without adding a second collision surface.
  for (let i = 0; i < 2530 && patches.length < 385; i++) {
    const x = mix(bounds.west, bounds.east, random()), z = mix(bounds.north, bounds.south, random());
    const fromTrail = laneDistance(x, z);
    if (fromTrail < 1.27 || fromTrail > (i < 1660 ? 3.2 : 9)) continue;
    if (Math.sin(x * .41 + z * .31) + Math.sin(z * .7 - x * .22) < -.74) continue;
    if (!canRoot(x, z, groundAt(x, z))) continue;
    patches.push([x, z, mix(.42, 1.34, random()), 3 + Math.floor(random() * 5)]);
  }
  for (const [px, pz, spread, count] of patches) {
    for (let i = 0; i < count; i++) {
      const x = px + (random() - .5) * 2 * spread, z = pz + (random() - .5) * 2 * spread;
      const y = groundAt(x, z);
      if (!canRoot(x, z, y) || laneDistance(x, z) < 1.20) continue;
      const size = mix(.65, 1.50, random());
      const tint = grassColors[Math.floor(random() * grassColors.length)];
      grass.push([x, y - .04, z, random() * Math.PI * 2, size * 1.13, size * mix(.69, 1.21, random()), size, tint]);
    }
  }
  // Sedge occupies damp shelves in alternating dense patches, leaving exposed pebble beaches.
  for (let i = 0; i < 157; i++) {
    const z = mix(-75, 42, random()), bank = random() > .5 ? 1 : -1;
    if (Math.sin(z * .77 + bank * 1.95) + Math.sin(z * .21) < -.60) continue;
    const stems = 2 + Math.floor(random() * 5);
    for (let j = 0; j < stems; j++) {
      const zz = z + (random() - .5) * 2.4;
      const x = riverCenter(zz) + bank * (riverWidth(zz) + mix(-.35, 1.48, random()));
      const y = groundAt(x, zz);
      if (!canRoot(x, zz, y) || laneDistance(x, zz) < 1.55) continue;
      const s = mix(.63, 1.33, random());
      sedge.push([x, y - .06, zz, random() * Math.PI * 2, s, s * mix(.85, 1.33, random()), s,
        sedgeColors[Math.floor(random() * sedgeColors.length)]]);
    }
  }
  const meadow = [], azalea = [];
  const patchRandom = randomSequence(48173);
  const meadowTints = ['#f2ead3', '#fff2d8', '#e6eacb', '#dde2b8'].map(value => new THREE.Color(value));
  // Narrow drifts along the outer paddy berms and the dry shoulder above the river.
  for (const [cx, cz, width, depth] of [
    [14.2, 0.8, 3.6, 1.7], [18.1, 3.7, 5.4, 1.1], [23.7, 0.1, 4.8, 1.7],
    [17.2, 3.28, 2.4, .66], [20.0, 3.59, 2.5, .72], [17.5, .42, 2.3, .61],
    [34.0, -1.4, 7.8, 1.5], [12.4, 5.8, 2.4, 3.8], [13.0, 12.6, 3.4, 4.2],
    [18.7, 18.2, 4.9, 2.8], [28.0, 21.0, 5.8, 1.5], [34.0, 27.5, 4.8, 2.5],
    [16.6, -9.4, 6.3, 1.8], [26.5, -10.8, 6.4, 1.8], [36.6, -12.3, 4.5, 2.4],
    [6.9, -10.0, 2.0, 5.2], [8.6, -19.4, 2.7, 4.6], [-8.0, 11.1, 3.3, 4.0],
  ]) {
    for (let i = 0; i < 115; i++) {
      const angle = patchRandom() * Math.PI * 2;
      const radius = Math.sqrt(patchRandom());
      const x = cx + Math.cos(angle) * radius * width;
      const z = cz + Math.sin(angle) * radius * depth;
      const y = groundAt(x, z);
      if (laneDistance(x, z) < 1.16 || !canRoot(x, z, y) ||
          Math.sin(x * 1.6 + z * .79) + Math.cos(z * 2.1 - x * .48) < -.95) continue;
      const size = mix(.54, 1.38, patchRandom());
      meadow.push([x, y - .035, z, patchRandom() * Math.PI * 2, size, size * mix(.72, 1.22, patchRandom()),
        size, meadowTints[Math.floor(patchRandom() * meadowTints.length)]]);
    }
  }
  for (const [cx, cz] of [[16.9, 3.42], [17.65, 3.7], [19.3, 3.78], [18.7, .2], [13.1, -.6], [11.3, 6.5], [11.0, -3.3],
    [24.1, -.4], [28.4, 3.7], [33.4, -8.1], [8.5, -18.8], [-9.5, 4.8], [-23.0, -33.8]]) {
    for (let i = 0; i < 5; i++) {
      const angle = i * 2.39996 + patchRandom() * .55;
      const radius = i * .29;
      const x = cx + Math.cos(angle) * radius, z = cz + Math.sin(angle) * radius;
      const y = groundAt(x, z);
      if (laneDistance(x, z) < 1.5 || !canRoot(x, z, y)) continue;
      azalea.push([x, y - .045, z, angle, mix(.64, 1.37, patchRandom())]);
    }
  }
  return { grass, sedge, meadow, azalea };
}
