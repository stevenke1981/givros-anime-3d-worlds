import { mix, paddyShape } from '../layout.js';
import { randomSequence } from '../landscape.js';

const grass = 'meadow-grass';
const flower = 'seasonal-forbs';
const fern = 'woodland-fern';
const azalea = 'wild-azalea';
const broadleaf = 'valley-broadleaf';
const reed = 'shore-reeds';
const pine = 'coastal-pine';
const cedar = 'cedar';
const maple = 'maple';

// Ground radius at one meter scale, and whether the trunk blocks walking.
const plants = {
  [grass]: [.28, 0], [flower]: [.38, 0], [fern]: [.52, 0], [azalea]: [.80, 0],
  [broadleaf]: [3.1, .46], [reed]: [.54, 0], [pine]: [3.68, .48],
  [cedar]: [2.75, .45], [maple]: [3.8, .53],
};

// [species, count, centerX, centerZ, spreadX, spreadZ, minScale, maxScale].
// Each patch follows the planting opportunities near the entry, landmark, or route.
const gardens = {
  '02': {
    palette: ['#d1eaa6', '#e1efb2', '#f3efcb'],
    patches: [
      [broadleaf, 3, 20, 25, 8, 9, .68, .98],
      [azalea, 11, 10, 10, 5, 6, .94, 1.39],
      [flower, 24, 8.2, 18, 4, 9, .77, 1.24],
      [grass, 88, 12.5, 28, 5, 10, .91, 1.48],
      [reed, 26, 3, 8, 13, 15, .76, 1.13],
    ],
  },
  '03': {
    palette: ['#a8c195', '#b6d5a6', '#c7dab2'],
    patches: [
      [fern, 44, -10, 21, 6, 7, 1.12, 1.66],
      [fern, 39, -8, 4.5, 6, 11, 1.06, 1.62],
      [fern, 22, 8.5, -19, 6.5, 7, .94, 1.45],
      [fern, 12, 3, -34, 5, 6, .98, 1.43],
      [grass, 15, -8, 25, 4, 7, .78, 1.22],
    ],
  },
  '04': {
    palette: ['#e6e4aa', '#e1ecc1', '#f0deaa'],
    patches: [
      [flower, 19, -27, 23, 5, 8, .76, 1.19],
      [grass, 23, -25, 17, 5, 9, .90, 1.43],
      [grass, 79, 11, 6, 18, 4, .73, 1.32],
      [flower, 29, 12, -9, 18, 4, .64, .93],
      [grass, 63, 25, -10.8, 12, 4.7, .70, 1.13],
      [broadleaf, 1, -7.9, -3, 1.9, 2.0, .63, .74],
      [broadleaf, 1, -8.5, -10, 1.9, 2.0, .63, .74],
      [broadleaf, 1, -8.8, -17, 1.9, 2.0, .63, .74],
    ],
  },
  '05': {
    palette: ['#e9a95f', '#f6c685', '#ffdeaa'],
    patches: [
      [maple, 2, -18, 28, 6, 6, .85, 1.02],
      [maple, 2, 4, 4, 9, 8, .66, .86],
      [maple, 1, 15, -7, 5, 3, .81, 1.06],
      [grass, 32, -23, 26, 7, 8, .94, 1.55],
      [grass, 40, 9.5, 12.5, 8, 5, .87, 1.34],
      [fern, 20, 13.5, 4, 7, 7, .75, 1.15],
    ],
  },
  '06': {
    palette: ['#adc29e', '#cad4b4', '#bfcca9'],
    patches: [
      [cedar, 3, -5, 20.5, 5, 9, .78, 1.12],
      [cedar, 2, 5.5, -36, 4.5, 6, .91, 1.07],
      [cedar, 1, 25, -41, 4, 5, .80, .97],
      [fern, 32, -8, 22, 7, 9, .84, 1.29],
      [fern, 34, 11, 7, 5, 6, .85, 1.24],
      [fern, 30, 17, -28, 5, 10, .78, 1.14],
      [fern, 11, 9, -32.5, 4, 4, .74, 1.06],
    ],
  },
  '07': {
    palette: ['#a9c8d2', '#c9dce2', '#bed9d7'],
    patches: [
      [cedar, 3, 19, 28, 7, 10, .76, 1.12],
      [cedar, 2, -21.8, -16, 7, 6, .52, .78],
      [cedar, 2, -29, -13, 6, 10, .73, .95],
      [reed, 6, 7, 26, 6, 6, .44, .77],
      [reed, 13, -6, -2, 9, 12, .41, .69],
    ],
  },
  '08': {
    palette: ['#c4d5aa', '#d8dda6', '#eff0cd'],
    patches: [
      [pine, 3, -35, 9, 7, 6, .71, 1.08],
      [pine, 3, -17, 10.5, 12, 8, .69, .94],
      [pine, 2, 4, 10, 10, 7, .74, 1],
      [grass, 33, -36, 15, 8, 5, .90, 1.43],
      [reed, 26, -21, 17.5, 11, 5, .65, 1.04],
      [grass, 75, -13, 15.5, 12, 5, .79, 1.26],
    ],
  },
  '09': {
    palette: ['#dbeaba', '#b5cfaa', '#f1e7b9'],
    patches: [
      [broadleaf, 2, -24, 30, 8, 7, .73, 1],
      [broadleaf, 2, -7, -6, 9, 11, .72, .99],
      [grass, 26, -29, 24, 8, 7, .84, 1.23],
      [flower, 39, -10, 5, 4, 8, .72, 1.13],
      [reed, 82, -2.6, -5, 5, 19, 1.1, 1.63],
      [reed, 19, 11, 11, 7, 5, 1.04, 1.31],
    ],
  },
  '10': {
    palette: ['#c9d3ad', '#dbcfa6', '#ffe2bf'],
    patches: [
      [grass, 28, -34.5, 11, 6, 10, .79, 1.19],
      [flower, 32, -29, 2.5, 7.5, 5.5, .76, 1.22],
      [flower, 18, -16.5, 2.6, 7, 3, .66, .99],
      [azalea, 9, -25, 1, 11, 5, .77, 1.04],
      [reed, 15, -5, 1.5, 6, 14, .67, 1.02],
    ],
  },
};

export const plantingLOD = { [pine]: 28, [maple]: 24, [cedar]: 31 };
export const plantingKinds = {
  [broadleaf]: 'tree', [pine]: 'tree', 'coastal-pine-lod': 'tree',
  [azalea]: 'shrub', [fern]: 'shrub', [flower]: 'shrub', [reed]: 'shrub', [grass]: 'turf',
};

export function regionalPlantModels(id) {
  return [...new Set(gardens[id].patches.flatMap(([model]) =>
    Object.hasOwn(plantingLOD, model) ? [model, model + '-lod'] : [model]))];
}

export function regionalPlantings(id, layout, seed) {
  const { spec, groundAt, canWalk, routeBlend, waterAt, riverEdge, seaEdge,
    stairs, crossings, paddies, dock, lanterns } = layout;
  const { palette, patches } = gardens[id];
  const rand = randomSequence(seed ^ 0x53a619d3);
  const placed = [];
  const cameras = [[spec.spawn, [spec.look[0], spec.look[2]]],
    [[spec.featured.position[0], spec.featured.position[2]], [spec.featured.target[0], spec.featured.target[2]]]];
  for (const [model, count, cx, cz, rx, rz, lo, hi] of patches) {
    const [footprint, trunk] = plants[model];
    let accepted = 0;
    for (let i = 0; i < count * 36 && accepted < count; i++) {
      const angle = rand() * 2 * Math.PI, u = Math.sqrt(rand());
      const x = cx + Math.cos(angle) * rx * u, z = cz + Math.sin(angle) * rz * u;
      const s = mix(lo, hi, rand()), radius = s * footprint;
      const edge = Math.min(riverEdge(x, z), seaEdge(x, z));
      if (edge < radius + .08 || (model === reed && edge > (spec.snow ? 7 : 4.25)) ||
          routeBlend(x, z)[0] < (trunk ? 1.37 : 1.24) + radius ||
          Math.hypot(x - spec.gate[0], z - spec.gate[1]) < 2.7 + radius ||
          (z < stairs.start + radius + 1 && z > stairs.end - radius - 1 && Math.abs(x - stairs.x) < 2.12 + radius) ||
          lanterns.some(([a, b]) => Math.hypot(x - a, z - b) < .65 + radius) ||
          paddies.some(([a, b, pw, pl]) => paddyShape(x - a, z - b, pw + radius + .4, pl + radius + .4) < 1.02) ||
          crossings.some(bridge => Math.abs(x - bridge.x) < bridge.half + radius + 1 &&
            Math.abs(z - bridge.z) < bridge.outside + radius + .45) ||
          (dock && Math.hypot(x - dock.x, z - dock.z) < 4.95 + radius) ||
          (spec.sluice && Math.hypot(x - spec.sluice[0], z - spec.sluice[1]) < 1.1 + radius) ||
          (spec.basin && Math.hypot(x - spec.basin[0], z - spec.basin[1]) < 1.05 + radius) ||
          (spec.pool && Math.hypot(x - spec.pool[0], z - spec.pool[1]) < 4.10 + radius)) continue;
      if (trunk && cameras.some(([[eyeX, eyeZ], [aimX, aimZ]]) => {
        const dx = aimX - eyeX, dz = aimZ - eyeZ;
        const t = Math.max(0, Math.min(1, ((x - eyeX) * dx + (z - eyeZ) * dz) / (dx * dx + dz * dz)));
        return Math.hypot(x - eyeX - dx * t, z - eyeZ - dz * t) < radius + 1;
      })) continue;
      if (placed.some(other => Math.hypot(x - other.x, z - other.z) <
          (trunk && other.trunk ? radius * .85 + other.radius * .85 :
            other.trunk ? .57 + radius * .45 : trunk ? .57 + other.radius * .45 :
              (radius + other.radius) * .56))) continue;
      const y = groundAt(x, z);
      if (y < waterAt(x, z) + .08 || !canWalk(x, z)) continue;
      let clear = true;
      for (let k = 0; k < 8; k++) {
        const a = k * Math.PI / 4;
        if (!canWalk(x + Math.cos(a) * radius, z + Math.sin(a) * radius)) {
          clear = false;
          break;
        }
      }
      if (!clear) continue;
      // The pine's authored +X lean follows the coastline, with local variation.
      const yaw = model === pine ? mix(-.40, .40, rand()) : rand() * 2 * Math.PI;
      placed.push({ model, x, y: y - .022, z, yaw, scale: s,
        stretch: mix(.86, 1.14, rand()), tint: palette[Math.floor(rand() * palette.length)],
        radius, trunk: trunk * s });
      accepted++;
    }
  }
  return placed;
}
