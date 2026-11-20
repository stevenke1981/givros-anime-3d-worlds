import { DataTexture, LinearFilter, Matrix4, RedFormat, Vector3, Vector4 } from 'three';

const contactParts = {
  house: [/foundations/, 'box', .74],
  bridge: [/springers/, 'ends-x', .81],
  'plank-bridge': [/landing/, 'ends-x', .79],
  shrine: [/foundation|plinth/, 'box', .73],
  torii: [/stone shoes/, 'ends-x', .83],
  sluice: [/watergate frame/, 'ends-x', .84],
  'stone-lantern': [/plinth/, .38, .78],
  'retaining-wall': [/ashlar/, 'box', .62],
  rock: [/boulder/, 'oval', .67],
  sakura: [/trunk/, .55, .75],
  cedar: [/trunk/, .38, .68],
  'cedar-lod': [/trunk/, .38, .65],
  'valley-broadleaf': [/trunk/, .44, .72],
  bamboo: [/culms/, .68, .50],
  'river-sedge': [/sedge leaves/, .25, .40],
  'shore-reeds': [/reed|culm/, .25, .36],
  'meadow-grass': [/grass|blades/, .18, .27],
  grass: [/grass/, .14, .26],
};

export function createContactOcclusion(coarse, terrace = false) {
  const size = coarse ? 512 : 768;
  const area = terrace ? new Vector4(-55, -62, 112, 108) : new Vector4(-65, -75, 132, 130);
  const data = new Uint8Array(size * size).fill(255);
  const texture = new DataTexture(data, size, size, RedFormat);
  texture.minFilter = texture.magFilter = LinearFilter;
  texture.name = 'Terrain contact occlusion';
  texture.needsUpdate = true;

  function bake(scene) {
    const instance = new Matrix4();
    const world = new Matrix4();
    const origin = new Vector3();
    const slopeX = new Vector3(), slopeZ = new Vector3();
    scene.updateMatrixWorld(true);
    scene.traverse(mesh => {
      const config = contactParts[mesh.userData.surfaceAsset];
      if (!mesh.isInstancedMesh || !config) return;
      const [label, footprint, strength] = config;
      const partName = mesh.name.toLowerCase().replaceAll('_', ' ');
      const gateFeet = terrace && mesh.userData.surfaceAsset === 'sluice';
      if (gateFeet ? !/wing walls/.test(partName) : !label.test(partName)) return;
      const geometry = mesh.geometry;
      if (!geometry.boundingBox) geometry.computeBoundingBox();
      const { min, max } = geometry.boundingBox;
      for (let i = 0; i < mesh.count; i++) {
        mesh.getMatrixAt(i, instance);
        world.multiplyMatrices(mesh.matrixWorld, instance);
        slopeX.setFromMatrixColumn(world, 0);
        slopeZ.setFromMatrixColumn(world, 2);
        const sx = Math.hypot(slopeX.x, slopeX.z);
        const sz = Math.hypot(slopeZ.x, slopeZ.z);
        if (sx <= .001 || sz <= .001) continue;
        const cx = (min.x + max.x) / 2;
        const cz = (min.z + max.z) / 2;
        const width = (max.x - min.x) / 2;
        const length = (max.z - min.z) / 2;
        if (gateFeet) {
          for (const side of [-1, 1]) stamp(cx + width * .72 * side, cz + .01, .73, .81, true);
        } else if (footprint === 'ends-x') {
          const separation = mesh.userData.surfaceAsset === 'sluice' ? .84 : .78;
          stamp(cx - width * separation, cz, Math.max(.27, width * .22), Math.max(.30, length * .80), false);
          stamp(cx + width * separation, cz, Math.max(.27, width * .22), Math.max(.30, length * .80), false);
        } else if (typeof footprint === 'number') {
          const radius = terrace && /trunk/.test(partName) ? footprint * 1.26 : footprint;
          stamp(0, 0, radius, radius, false);
        } else {
          stamp(cx, cz, width + .13, length + .13, footprint === 'box');
        }

        function stamp(x, z, radiusX, radiusZ, box) {
          origin.set(x, min.y, z).applyMatrix4(world);
          const rx = Math.max(.18, radiusX * sx), rz = Math.max(.18, radiusZ * sz);
          const reach = Math.hypot(rx, rz) * 1.42;
          const u0 = Math.max(0, Math.floor((origin.x - reach - area.x) * size / area.z));
          const u1 = Math.min(size - 1, Math.ceil((origin.x + reach - area.x) * size / area.z));
          const v0 = Math.max(0, Math.floor((origin.z - reach - area.y) * size / area.w));
          const v1 = Math.min(size - 1, Math.ceil((origin.z + reach - area.y) * size / area.w));
          for (let v = v0; v <= v1; v++) for (let u = u0; u <= u1; u++) {
            const dx = area.x + (u + .5) * area.z / size - origin.x;
            const dz = area.y + (v + .5) * area.w / size - origin.z;
            const ax = Math.abs(dx * slopeX.x + dz * slopeX.z) / (sx * rx);
            const az = Math.abs(dx * slopeZ.x + dz * slopeZ.z) / (sz * rz);
            const distance = box ? Math.max(ax, az) : Math.hypot(ax, az);
            const falloff = Math.min(1, Math.max(0, (1.42 - distance) / (box ? .70 : 1.34)));
            const value = 255 * (1 - strength * falloff * falloff * (3 - 2 * falloff));
            const index = v * size + u;
            data[index] = Math.min(data[index], value);
          }
        }
      }
    });
    texture.needsUpdate = true;
  }

  return { texture, area, bake };
}
