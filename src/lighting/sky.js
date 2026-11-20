import {
  Color, DataTexture, DataUtils, EquirectangularReflectionMapping,
  HalfFloatType, LinearFilter, LinearSRGBColorSpace, RGBAFormat,
} from 'three';

export function createSkyRadiance(profile, sunDirection, sunColor, width = 256) {
  const [zenith, horizon, ground] = profile.sky.map((hex) => new Color(hex));
  const height = width / 2;
  const data = new Uint16Array(width * height * 4);
  const toHalf = DataUtils.toHalfFloat;
  const tint = new Color();
  const sunDisk = Math.cos(.023);
  for (let row = 0; row < height; row++) {
    const latitude = Math.PI * ((row + .5) / height - .5);
    const y = Math.sin(latitude), radial = Math.cos(latitude);
    if (y >= 0) tint.copy(horizon).lerp(zenith, y ** .45).multiplyScalar(.72 + y * .48);
    else tint.copy(horizon).lerp(ground, Math.min(1, -y * 4)).multiplyScalar(.72 + y * .40);

    for (let column = 0; column < width; column++) {
      const longitude = Math.PI * 2 * ((column + .5) / width - .5);
      const cosAngle = radial * (Math.cos(longitude) * sunDirection.x +
        Math.sin(longitude) * sunDirection.z) + y * sunDirection.y;
      const halo = Math.exp((cosAngle - 1) * 18) * profile.sunRadiance * .024;
      const disk = Math.max(0, (cosAngle - sunDisk) / (1 - sunDisk)) * profile.sunRadiance;
      const sun = halo + disk;
      const index = (row * width + column) * 4;
      data[index] = toHalf(tint.r + sun * sunColor.r);
      data[index + 1] = toHalf(tint.g + sun * sunColor.g);
      data[index + 2] = toHalf(tint.b + sun * sunColor.b);
      data[index + 3] = toHalf(1);
    }
  }

  const sky = new DataTexture(data, width, height, RGBAFormat, HalfFloatType);
  sky.mapping = EquirectangularReflectionMapping;
  sky.colorSpace = LinearSRGBColorSpace;
  sky.minFilter = sky.magFilter = LinearFilter;
  sky.needsUpdate = true;
  return sky;
}
