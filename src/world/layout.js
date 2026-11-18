export const smooth = (low, high, value) => {
  const t = Math.max(0, Math.min(1, (value - low) / (high - low)));
  return t * t * (3 - 2 * t);
};
export const mix = (a, b, t) => a + (b - a) * t;
export const bounds = { west: -48, east: 47, north: -56, south: 39 };
export const riverCenter = z => 2.7 * Math.sin((z - 1) * .092) + .65 * Math.sin((z - 1) * .24) +
  24 * smooth(-65, -110, z);
export const riverWidth = z => 5.65 + .42 * Math.sin((z - 1) * .14) + .22 * Math.sin((z - 1) * .32);
export const riverLevel = z => -.36 - (z - 1) * .014;

export const crossings = [1, -26].map(z => ({ x: riverCenter(z), z, y: riverLevel(z) + .36 }));
export const houses = [
  [-16, 6, -.14, 1], [-26, 6, .19, 1.06], [-35, 4, .24, .93],
  [-17, -8, -.07, .98], [-27, -9, -.16, 1.02], [-36, -9, .13, .92],
  [-15, -17, .24, .88], [-26, -19, -.08, .93], [-36, -20, .28, .94],
  [-36, -30, .19, .88], [-28.7, -27.5, -.13, .87], [19, 13, -.34, .88],
  [29, 14, -.26, .90]
];
export const shrine = { x: -18, z: -47, y: 7.35 };
export const torii = { x: -18, z: -32 };
export const steps = { x: -18, start: -34.8, end: -43.1, low: 3.43, high: 7.35, count: 24 };
export const paddies = [
  [16, -4, 4.1, 4.6, .61], [18, -15, 4.3, 4.7, .84],
  [26, -5.5, 4.6, 4.4, 1.12], [28.5, -16, 4.6, 4.4, 1.37],
  [36.5, -7, 4.4, 4.6, 1.62], [37.5, -18, 4, 4.4, 1.86],
];
export const routes = [
  [[39, 30], [32, 25], [24, 24], [12, 18], [10, 10], [9, 4], [7, 1]],
  [[-7, 1], [-11, 0], [-22, -1], [-32, -2], [-43, -1], [-44, -14], [-44, -26], [-43.5, -35], [-39, -36], [-34, -41]],
  [[-10, 0], [-9, -8], [-10, -19], [-10, -26], [-14, -28], [-18, -31], [-18, -35], [-18, -43], [-18, -44.05]],
  [[-23, -1], [-22, -13], [-21, -22], [-18, -26], [-10, -26]],
  [[-10, -26], [4.5, -26], [9, -23], [15, -23], [24, -23], [32, -23], [43, -25]],
  [[7, 1], [10, 1], [20, 2], [30, 1], [42, 0], [43, -14], [43, -25]],
  [[10, 1], [10.5, -10], [12.5, -19], [15, -23]],
  [[10.5, -10], [18, -9.55], [22, -10.0], [28, -10.55], [33, -11.0], [36, -12.25], [41.5, -13], [43, -14]],
  [[-18, -43], [-23, -43.6], [-29, -48], [-35, -46], [-34, -41], [-29, -39], [-24, -38], [-22, -35], [-22, -33.1], [-18, -33.1]],
  [[-28, -48], [-34, -51], [-41, -50], [-45, -44], [-43, -40], [-39, -36]],
];

const segments = routes.flatMap(route => route.slice(1).map(([bx, bz], index) => {
  const [x, z] = route[index];
  const dx = bx - x, dz = bz - z;
  return [x, z, dx, dz, dx * dx + dz * dz];
}));

export function laneDistance(x, z) {
  let best = Infinity;
  for (const [ax, az, dx, dz, length2] of segments) {
    const u = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / length2));
    const deltaX = x - ax - u * dx, deltaZ = z - az - u * dz;
    best = Math.min(best, deltaX * deltaX + deltaZ * deltaZ);
  }
  return Math.sqrt(best);
}

export function paddyShape(dx, dz, rx, rz) {
  return Math.pow(Math.pow(Math.abs(dx / rx), 3.5) + Math.pow(Math.abs(dz / rz), 3.5), 1 / 3.5);
}

function foothill(x, z) {
  const inland = smooth(5, 17, Math.abs(x - riverCenter(z)));
  const hillside = 11.4 * smooth(-21, -55, z) * inland;
  const southRise = 6.4 * smooth(8, 39, z) * smooth(9, 40, x);
  const shoulders = (13 * smooth(54, 108, Math.abs(x)) + 11 * smooth(43, 122, z)) * inland;
  const outskirts = 2.7 * smooth(29, 49, Math.abs(x)) *
    (.6 + .4 * Math.sin(z * .11 - x * .08) ** 2);
  return .48 + riverLevel(z) + hillside + southRise + outskirts + shoulders +
    (.28 * Math.sin(.12 * z + .21 * x) + .15 * Math.cos(.21 * z - .29 * x)) * inland;
}

export const houseFloors = houses.map(([x, z]) => foothill(x, z));

export function groundAt(x, z) {
  const water = riverLevel(z);
  const channel = Math.abs(x - riverCenter(z)) - riverWidth(z);
  let ground = mix(water - 1.25, foothill(x, z), smooth(-2.5, .95, channel));
  for (let i = 0; i < houses.length; i++) {
    const [hx, hz, rotation, size] = houses[i];
    if (Math.abs(x - hx) > 6 || Math.abs(z - hz) > 6) continue;
    const localX = (x - hx) * Math.cos(rotation) - (z - hz) * Math.sin(rotation);
    const localZ = (x - hx) * Math.sin(rotation) + (z - hz) * Math.cos(rotation);
    const pad = Math.max(Math.abs(localX) - 4.3 * size, Math.abs(localZ) - 3.3 * size);
    ground = mix(houseFloors[i], ground, smooth(0, 1.6, pad));
  }
  for (const [px, pz, rx, rz, level] of paddies) {
    if (Math.abs(x - px) > rx + 2 || Math.abs(z - pz) > rz + 2) continue;
    const radius = paddyShape(x - px, z - pz, rx, rz);
    const basin = mix(level - .17, level + .23, smooth(.87, 1.03, radius));
    ground = mix(basin, ground, smooth(1.02, 1.58, radius));
  }
  const courtyard = Math.hypot((x + 18) * .85, (z + 46.5) * 1.14);
  ground = mix(shrine.y, ground, smooth(5.1, 12.4, courtyard));
  const stairBand = smooth(1.34, 3.5, Math.abs(x - steps.x));
  const stairsExtent = smooth(2.2, 0, Math.max(z - steps.start, steps.end - z, 0));
  if (stairsExtent > 0 && stairBand < 1) {
    const slope = Math.max(0, Math.min(1, (steps.start - z) / (steps.start - steps.end)));
    const ramp = mix(steps.low, steps.high, slope);
    // Recess the terrain behind the modeled stair cut so the treads stay visible.
    const recess = .23 * smooth(-.32, .2, steps.start - z) * smooth(-.30, .21, z - steps.end);
    ground = mix(ground, ramp - recess, stairsExtent * (1 - stairBand));
  }
  for (const bridge of crossings) {
    if (Math.abs(z - bridge.z) > 3.2) continue;
    const fromCenter = Math.abs(x - bridge.x);
    const weight = smooth(3.2, 1.86, Math.abs(z - bridge.z)) *
      smooth(5.65, 6.75, fromCenter) * smooth(10, 7.1, fromCenter);
    ground = mix(ground, bridge.y + .15, weight);
  }
  return ground;
}

export function stairHeight(z) {
  const step = Math.floor(steps.count * (steps.start - z) / (steps.start - steps.end));
  return mix(steps.low, steps.high, Math.max(0, Math.min(steps.count - 1, step)) / (steps.count - 1));
}

export function surfaceAt(x, z) {
  for (const bridge of crossings) {
    const along = (x - bridge.x) / 7;
    if (Math.abs(along) <= 1 && Math.abs(z - bridge.z) < 1.52) {
      return bridge.y + .20 + 1.35 * (1 - along * along);
    }
  }
  if (Math.abs(x - steps.x) < 1.46 && z <= steps.start && z >= steps.end) return stairHeight(z);
  return groundAt(x, z);
}

export function canWalk(x, z) {
  if (x < bounds.west || x > bounds.east || z < bounds.north || z > bounds.south) return false;
  for (const bridge of crossings) {
    if (Math.abs(x - bridge.x) <= 7) {
      const across = Math.abs(z - bridge.z);
      if (across < 1.30) return true;
      if (across < 2.12) return false;
    }
  }
  if (groundAt(x, z) < riverLevel(z) + .045) return false;
  for (const [px, pz, rx, rz] of paddies) {
    if (paddyShape(x - px, z - pz, rx, rz) < .98) return false;
  }
  for (const [hx, hz, rotation, size] of houses) {
    const dx = x - hx, dz = z - hz;
    const lx = dx * Math.cos(rotation) - dz * Math.sin(rotation);
    const lz = dx * Math.sin(rotation) + dz * Math.cos(rotation);
    if (Math.abs(lx) < 4.18 * size && Math.abs(lz) < 3.16 * size) return false;
  }
  if (Math.abs(x - shrine.x) < 3.20 && Math.abs(z - shrine.z) < 2.70) return false;
  if (Math.abs(z - torii.z) < .61 && Math.abs(Math.abs(x - torii.x) - 1.58) < .54) return false;
  if (z < steps.start && z > steps.end) {
    const side = Math.abs(x - steps.x);
    if (side < 1.12) return true;
    if (side < 2.55) return false;
  }
  const gradeX = (groundAt(x + .25, z) - groundAt(x - .25, z)) * 2;
  const gradeZ = (groundAt(x, z + .25) - groundAt(x, z - .25)) * 2;
  return gradeX * gradeX + gradeZ * gradeZ <= .80;
}
