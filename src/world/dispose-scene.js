export function disposeScene(scene) {
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();
  const images = new Set();
  scene.traverse((object) => {
    if (object.geometry) geometries.add(object.geometry);
    if (Array.isArray(object.material)) {
      for (const material of object.material) materials.add(material);
    } else if (object.material) {
      materials.add(object.material);
    }
    if (object.isInstancedMesh) object.dispose();
    object.shadow?.dispose();
  });
  for (const texture of [scene.background, scene.environment]) {
    if (texture?.isTexture) textures.add(texture);
  }
  for (const material of materials) {
    for (const texture of material.userData.ownedTextures ?? []) textures.add(texture);
    for (const value of Object.values(material)) {
      if (value?.isTexture) textures.add(value);
    }
    for (const { value } of Object.values(material.uniforms ?? {})) {
      if (value?.isTexture) textures.add(value);
    }
    material.dispose();
  }
  for (const texture of textures) {
    texture.dispose();
    if (texture.image?.close) images.add(texture.image);
  }
  for (const image of images) image.close();
  for (const geometry of geometries) geometry.dispose();
  scene.clear();
}
