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
  return { grass, sedge };
}
