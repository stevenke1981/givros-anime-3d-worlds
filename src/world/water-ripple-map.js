import { DataTexture, LinearFilter, LinearMipmapLinearFilter, RepeatWrapping, RGBAFormat } from 'three';

export function createWaterRippleMap() {
  const size = 128;
  const data = new Uint8Array(size * size * 4);
  const waves = [[2, 5, .34, .7], [7, -3, .24, 1.6], [11, 4, .17, 3.9], [-6, 13, .12, 4.7], [15, -8, .10, 2.3]]
    .map(([x, y, amplitude, phase]) => [x, y, phase, amplitude * x / Math.hypot(x, y), amplitude * y / Math.hypot(x, y)]);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let slopeX = 0, slopeY = 0;
      for (const [u, v, phase, a, b] of waves) {
        const wave = Math.cos((x * u + y * v) / size * Math.PI * 2 + phase);
        slopeX += a * wave;
        slopeY += b * wave;
      }
      const index = (y * size + x) * 4;
      data[index] = Math.round((slopeX * .5 + .5) * 255);
      data[index + 1] = Math.round((slopeY * .5 + .5) * 255);
      data[index + 2] = Math.round((1 + Math.sqrt(1 - slopeX * slopeX - slopeY * slopeY)) * 127.5);
      data[index + 3] = 255;
    }
  }
  const ripples = new DataTexture(data, size, size, RGBAFormat);
  ripples.name = 'Terrace rolling ripple normals';
  ripples.wrapS = ripples.wrapT = RepeatWrapping;
  ripples.magFilter = LinearFilter;
  ripples.minFilter = LinearMipmapLinearFilter;
  ripples.generateMipmaps = true;
  ripples.needsUpdate = true;
  return ripples;
}
