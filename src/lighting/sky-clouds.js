function hash(x, y) {
  const bits = Math.imul(x, 1597334677) ^ Math.imul(y, 3812015801);
  return ((bits ^ (bits >>> 16)) >>> 0) / 4294967295;
}

function ease(low, high, value) {
  const t = Math.min(1, Math.max(0, (value - low) / (high - low)));
  return t * t * (3 - 2 * t);
}

function noise(x, y) {
  const a = Math.floor(x), b = Math.floor(y);
  const u = ease(0, 1, x - a), v = ease(0, 1, y - b);
  const low = hash(a, b) * (1 - u) + hash(a + 1, b) * u;
  const high = hash(a, b + 1) * (1 - u) + hash(a + 1, b + 1) * u;
  return low * (1 - v) + high * v;
}

// Match the live sky dome projection so water reflects the same cloud banks.
export function cloudLayerCoverage(x, y, z) {
  if (y <= .018 || y >= .84) return 0;
  const scale = 5.2 / (y + .22);
  const u = x * scale + 4.6, v = z * scale - 3.2;
  const density = noise(u, v) * .60 + noise(u * 2.21, v * 2.21) * .25 +
    noise(u * 4.04, v * 4.04) * .15;
  return ease(.47, .69, density) * ease(.018, .101, y) * (1 - ease(.47, .84, y));
}

export const cloudLayerGLSL = `
float skyCloudHash(ivec2 point) {
  uvec2 p = uvec2(point);
  uint bits = p.x * 1597334677u ^ p.y * 3812015801u;
  return float(bits ^ (bits >> 16u)) / 4294967295.0;
}
float skyCloudNoise(vec2 point) {
  ivec2 p = ivec2(floor(point));
  vec2 f = smoothstep(0., 1., fract(point));
  return mix(mix(skyCloudHash(p), skyCloudHash(p + ivec2(1, 0)), f.x),
    mix(skyCloudHash(p + ivec2(0, 1)), skyCloudHash(p + ivec2(1, 1)), f.x), f.y);
}
float skyCloudCoverage(vec3 ray) {
  float altitude = max(0., ray.y);
  vec2 point = ray.xz * (5.2 / (altitude + .22)) + vec2(4.6, -3.2);
  float density = skyCloudNoise(point) * .60 + skyCloudNoise(point * 2.21) * .25 +
    skyCloudNoise(point * 4.04) * .15;
  return smoothstep(.47, .69, density) * smoothstep(.018, .101, altitude) *
    (1. - smoothstep(.47, .84, altitude));
}
`;
