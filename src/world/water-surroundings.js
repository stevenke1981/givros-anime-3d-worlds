import { DataTexture, LinearFilter, Vector4 } from 'three';

const fields = new WeakMap();
const plantRadius = { rice: .23, sedge: .31, shrub: .68 };
const lowestTerrain = -10;
const terrainRange = 48;
const maximumPlantHeight = 2.3;

export function createWaterSurroundings(scene, groundAt, west, north, east, south) {
  const spanX = east - west, spanZ = south - north;
  const width = Math.ceil(spanX / .17), height = Math.ceil(spanZ / .17);
  const data = new Uint8Array(width * height * 4);
  const stepX = spanX / width, stepZ = spanZ / height;
  for (let row = 0; row < height; row++) {
    const z = north + (row + .5) * stepZ;
    for (let column = 0; column < width; column++) {
      const x = west + (column + .5) * stepX;
      const fraction = Math.max(0, Math.min(1, (groundAt(x, z) - lowestTerrain) / terrainRange));
      const encoded = Math.round(fraction * 65535);
      const pixel = (row * width + column) * 4;
      data[pixel] = encoded >> 8;
      data[pixel + 1] = encoded & 255;
    }
  }
  const texture = new DataTexture(data, width, height);
  texture.name = 'Water local terrain, foliage and rice contact';
  texture.magFilter = texture.minFilter = LinearFilter;
  texture.needsUpdate = true;
  fields.set(scene, { texture, west, north, stepX, stepZ });
  return { texture, bounds: new Vector4(west, north, 1 / spanX, 1 / spanZ) };
}

export function registerWaterPlants(scene, placements, type) {
  const field = fields.get(scene);
  if (!field || !placements.length) return;
  const { texture, west, north, stepX, stepZ } = field;
  const { data, width, height } = texture.image;
  const rice = type === 'rice';
  const radius = plantRadius[type];
  for (const [x, y, z, plantHeight] of placements) {
    const firstColumn = Math.max(0, Math.floor((x - radius - west) / stepX));
    const lastColumn = Math.min(width - 1, Math.floor((x + radius - west) / stepX));
    const firstRow = Math.max(0, Math.floor((z - radius - north) / stepZ));
    const lastRow = Math.min(height - 1, Math.floor((z + radius - north) / stepZ));
    for (let row = firstRow; row <= lastRow; row++) {
      for (let column = firstColumn; column <= lastColumn; column++) {
        const dx = west + (column + .5) * stepX - x;
        const dz = north + (row + .5) * stepZ - z;
        const distance = Math.hypot(dx, dz) / radius;
        if (distance >= 1) continue;
        const pixel = (row * width + column) * 4;
        const terrain = lowestTerrain + terrainRange * ((data[pixel] * 256 + data[pixel + 1]) / 65535);
        const crown = Math.max(0, y + plantHeight - terrain) * (1 - distance * distance);
        const foliage = Math.min(255, Math.round(255 * crown / maximumPlantHeight));
        data[pixel + 2] = Math.max(data[pixel + 2], foliage);
        if (rice) {
          const contact = Math.round(255 * (1 - distance) * (1 - .42 * distance));
          data[pixel + 3] = Math.max(data[pixel + 3], contact);
        }
      }
    }
  }
  texture.needsUpdate = true;
}

export const waterSurroundingsGLSL = `
#ifdef WATER_SURROUNDINGS
  uniform sampler2D waterSurroundings;
  uniform vec4 waterSurroundingsBounds;

  vec4 sampleWaterSurroundings(vec2 point) {
    vec2 uv = (point - waterSurroundingsBounds.xy) * waterSurroundingsBounds.zw;
    vec2 margin = min(uv, 1. - uv);
    float interior = smoothstep(0., .028, min(margin.x, margin.y));
    vec4 site = texture2D(waterSurroundings, uv);
    float terrain = ${lowestTerrain.toFixed(1)} +
      ${terrainRange.toFixed(1)} * dot(site.rg, vec2(65280., 255.) / 65535.);
    return vec4(terrain, site.b * ${maximumPlantHeight}, site.a, interior);
  }

  vec2 reflectedWaterBanks(vec3 point, vec3 ray) {
    vec2 silhouette = vec2(0.);
    for (int i = 0; i < 3; i++) {
      float sampleIndex = float(i);
      float reach = .61 + .78 * sampleIndex + .46 * sampleIndex * sampleIndex;
      vec4 site = sampleWaterSurroundings(point.xz + ray.xz * reach);
      float rayHeight = point.y + .067 + max(0., ray.y) * reach;
      float bank = smoothstep(-.06, .18, site.x - rayHeight);
      float foliage = smoothstep(-.04, .16, site.x + site.y - rayHeight) *
        smoothstep(.06, .43, site.y) * (1. - bank * .56);
      silhouette = max(silhouette, vec2(bank, foliage) * site.w * (1. - .18 * sampleIndex));
    }
    return silhouette;
  }
#endif
`;
