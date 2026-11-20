import * as THREE from 'three';

// Shallow, non-blocking mineral fragments: dimensions are in metres.
// canPlace owns exclusions for water, buildings, bridges and other surfaces.
export function addSurfaceDetailGeometry(scene, { groundAt, canPlace, center, seed }) {
  let state = seed >>> 0;
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const groups = new Map();
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const rotation = new THREE.Quaternion();
  const heading = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const palette = ['#77766c', '#8a8173', '#a09582', '#686d69', '#b0a28d'].map(color => new THREE.Color(color));
  let clusters = 0;
  for (let attempt = 0; attempt < 1600 && clusters < 130; attempt++) {
    const angle = random() * Math.PI * 2;
    const distance = Math.sqrt(random()) * 26;
    const cx = center[0] + Math.cos(angle) * distance;
    const cz = center[1] + Math.sin(angle) * distance;
    if (!canPlace(cx, cz)) continue;
    clusters++;
    const count = 5 + Math.floor(random() * 6);
    for (let i = 0; i < count; i++) {
      const a = random() * Math.PI * 2;
      const radius = Math.sqrt(random()) * .65;
      const x = cx + Math.cos(a) * radius;
      const z = cz + Math.sin(a) * radius;
      if (!canPlace(x, z)) continue;
      const y = groundAt(x, z);
      const dx = (groundAt(x + .12, z) - groundAt(x - .12, z)) / .24;
      const dz = (groundAt(x, z + .12) - groundAt(x, z - .12)) / .24;
      if (Math.hypot(dx, dz) > .7) continue;
      normal.set(-dx, 1, -dz).normalize();
      rotation.setFromUnitVectors(up, normal);
      heading.setFromAxisAngle(up, random() * Math.PI * 2);
      rotation.multiply(heading);
      const width = .025 + random() * .075;
      const height = .009 + random() * .018;
      scale.set(width, height, width * (.55 + random() * .8));
      position.set(x, y + height * .13, z);
      matrix.compose(position, rotation, scale);
      const shape = random() < .5 ? 0 : 1;
      const key = `${Math.floor((x - center[0]) / 13)},${Math.floor((z - center[1]) / 13)},${shape}`;
      if (!groups.has(key)) groups.set(key, { shape, instances: [] });
      groups.get(key).instances.push({ matrix: matrix.clone(), color: palette[Math.floor(random() * palette.length)] });
    }
  }

  const geometries = [new THREE.IcosahedronGeometry(1, 0), new THREE.OctahedronGeometry(1, 0)];
  const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .94, metalness: 0 });
  for (const { shape, instances } of groups.values()) {
    const mesh = new THREE.InstancedMesh(geometries[shape], material, instances.length);
    mesh.name = 'embedded-mineral-fragments';
    instances.forEach((instance, index) => {
      mesh.setMatrixAt(index, instance.matrix);
      mesh.setColorAt(index, instance.color);
    });
    mesh.computeBoundingSphere();
    scene.add(mesh);
  }
  // If no placements were accepted, no scene node owns these resources.
  if (!groups.size) {
    geometries.forEach(geometry => geometry.dispose());
    material.dispose();
  } else {
    for (let shape = 0; shape < geometries.length; shape++) {
      if (![...groups.values()].some(group => group.shape === shape)) geometries[shape].dispose();
    }
  }
}
