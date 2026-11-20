import { Matrix4 } from 'three';

export function extendRoofOverhangs(scene) {
  const width = new Matrix4().makeScale(1.035, 1, 1.055);
  const instance = new Matrix4();
  scene.traverse(roof => {
    if (!roof.isInstancedMesh || roof.userData.surfaceAsset !== 'house' ||
        !/^fired.roof.tiles/i.test(roof.name)) return;
    // The Blender export groups the tile courses and ridge apart from the wall frame.
    for (let i = 0; i < roof.count; i++) {
      roof.getMatrixAt(i, instance);
      roof.setMatrixAt(i, instance.multiply(width));
    }
    roof.instanceMatrix.needsUpdate = true;
    roof.computeBoundingSphere();
  });
}
