import { Color } from 'three';
import { mix, paddyShape } from './layout.js';
import { randomSequence } from './landscape.js';
import { registerWaterPlants } from './water-material.js';

const riceTints = ['#cad995', '#e5ecb8', '#d5e5bc', '#c7ddaa', '#e9eac0'].map(c => new Color(c));
const duckweedTints = ['#e0e2a9', '#d8dfb1', '#dae4c8'].map(c => new Color(c));

export function riceTint(x, z, sample) {
  const vigor = Math.sin(x * .77 + z * .39) + Math.cos(z * .69 - x * .33);
  const index = Math.floor((vigor + 2) * .76 + sample * 1.9);
  return riceTints[index];
}

export function plantDuckweed(paddies, groundAt, seed) {
  const rand = randomSequence(seed);
  const patches = [];
  for (const [px, pz, rx, rz, water] of paddies) {
    // Surface fronds collect where rows thin out at the sheltered edge.
    const angle = mix(.55, 2.55, rand());
    const x = px + Math.cos(angle) * rx * .94;
    const z = pz + Math.sin(angle) * rz * .93;
    const count = 4 + Math.floor(rand() * 4);
    for (let i = 0; i < count; i++) {
      const dx = (rand() - .5) * 1.58, dz = (rand() - .5) * .78;
      const fx = x + dx, fz = z + dz;
      const edge = paddyShape(fx - px, fz - pz, rx, rz);
      if (edge < .82 || edge > .92 || groundAt(fx, fz) > water - .022) continue;
      const size = mix(.54, 1.2, rand());
      patches.push([fx, water + .002, fz, rand() * Math.PI * 2, size, size, size,
        duckweedTints[Math.floor(rand() * duckweedTints.length)]]);
    }
  }
  return patches;
}

export function registerRiceWaterPlants(scene, placements, asset) {
  const geometry = asset[0].geometry;
  if (!geometry.boundingBox) geometry.computeBoundingBox();
  const height = geometry.boundingBox.max.y;
  registerWaterPlants(scene, placements.map(([x, y, z, , , scaleY]) => [x, y, z, height * scaleY]), 'rice');
}
