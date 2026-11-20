import { Vector3 } from 'three';

const sunAngles = {
  '01': [33, 149],
  '04': [31, 134],
};

export function supportsNaturalLighting(id) {
  return Object.hasOwn(sunAngles, id);
}

export function daylightDirection(id) {
  const [elevation, azimuth] = sunAngles[id].map(angle => angle * Math.PI / 180);
  return new Vector3(
    Math.cos(elevation) * Math.sin(azimuth),
    Math.sin(elevation),
    -Math.cos(elevation) * Math.cos(azimuth),
  );
}

export function shapeDaylightShadows(light, coarse) {
  light.shadow.mapSize.setScalar(coarse ? 2048 : 3072);
  light.shadow.normalBias = .026;
  light.shadow.bias = -.00014;
  light.shadow.radius = 2.7;
  const camera = light.shadow.camera;
  Object.assign(camera, { left: -53, right: 53, top: 53, bottom: -53, near: 7, far: 194 });
  camera.updateProjectionMatrix();
}
