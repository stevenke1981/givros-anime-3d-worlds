import {
  Color, DynamicDrawUsage, Float32BufferAttribute, InstancedBufferAttribute, InstancedBufferGeometry,
  Matrix3, Matrix4, Mesh, ShaderMaterial, UniformsLib, UniformsUtils, Vector3,
} from 'three';

const profiles = {
  blossom: { samples: 105, sourceLimit: 1400, budget: 240, range: 20, radius: 0.025, spread: 0.045, alpha: 0.39, offset: 0.44 },
  turf: { samples: 6400, sourceLimit: 8800, budget: 570, range: 22, radius: 0.055, spread: 0.11, alpha: 0.17, offset: 0.22 },
  shrub: { samples: 46, sourceLimit: 2800, budget: 210, range: 38, radius: 0.035, spread: 0.10, alpha: 0.25, offset: 0.35 },
  tree: { samples: 23, sourceLimit: 7300, budget: 430, range: 92, radius: 0.075, spread: 0.22, alpha: 0.23, offset: 0.25 },
  mountain: { samples: 1950, sourceLimit: 6900, budget: 650, range: 530, radius: 0.6, spread: 1.95, alpha: 0.12, offset: 0.10 },
};

function sampleSurfaces(scene) {
  const samples = Object.fromEntries(Object.keys(profiles).map((kind) => [kind, []]));
  const matrix = new Matrix4();
  const normals = new Matrix3();
  const instanceColor = new Color();
  const positionA = new Vector3();
  const positionB = new Vector3();
  const positionC = new Vector3();
  const edge = new Vector3();
  const crossEdge = new Vector3();
  let seed = 517194;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  scene.updateMatrixWorld(true);
  scene.traverse((node) => {
    const kind = node.userData.gaussianKind ?? (node.userData.assetId === 'sakura'
      && node.material?.name === 'Paint | leaves and blossoms' ? 'blossom' : undefined);
    const profile = profiles[kind];
    if (!profile || !node.isMesh) return;
    const lod = node.parent?.parent;
    if (lod?.isLOD && lod.levels[0].object !== node.parent) return;
    const collection = samples[kind];
    const { index, attributes } = node.geometry;
    const triangles = (index?.count ?? attributes.position.count) / 3;
    const instances = node.isInstancedMesh ? node.count : 1;

    for (let instance = 0; instance < instances && collection.length < profile.sourceLimit; instance += 1) {
      matrix.copy(node.matrixWorld);
      if (node.isInstancedMesh) {
        node.getMatrixAt(instance, matrix);
        matrix.premultiply(node.matrixWorld);
      }
      instanceColor.setRGB(1, 1, 1);
      if (node.instanceColor) node.getColorAt(instance, instanceColor);
      normals.getNormalMatrix(matrix);
      const scale = new Vector3().setFromMatrixScale(matrix).x;

      // Sampling the surface anchors the ellipsoids to shared model parts and heightfields.
      for (let sample = 0; sample < profile.samples && collection.length < profile.sourceLimit; sample += 1) {
        const triangle = Math.floor(random() * triangles) * 3;
        const a = index ? index.getX(triangle) : triangle;
        const b = index ? index.getX(triangle + 1) : triangle + 1;
        const c = index ? index.getX(triangle + 2) : triangle + 2;
        positionA.fromBufferAttribute(attributes.position, a).applyMatrix4(matrix);
        positionB.fromBufferAttribute(attributes.position, b).applyMatrix4(matrix);
        positionC.fromBufferAttribute(attributes.position, c).applyMatrix4(matrix);
        edge.subVectors(positionB, positionA);
        crossEdge.subVectors(positionC, positionA);
        const normal = attributes.normal
          ? new Vector3().fromBufferAttribute(attributes.normal, a).applyNormalMatrix(normals)
          : new Vector3().crossVectors(edge, crossEdge).normalize();
        const tint = attributes.color
          ? new Vector3().fromBufferAttribute(attributes.color, a)
          : new Vector3().setFromColor(node.material.color);
        if (kind === 'turf' && (normal.y < 0.52 || tint.y <= tint.x * 0.93 || tint.z >= tint.y * 0.91)) continue;
        if (kind === 'mountain' && (normal.y < 0.16 || normal.y > 0.90)) continue;
        const radius = (profile.radius + random() * profile.spread) * scale;
        let u = random();
        let v = random();
        if (u + v > 1) { u = 1 - u; v = 1 - v; }
        const center = positionA.clone().addScaledVector(edge, u).addScaledVector(crossEdge, v)
          .addScaledVector(normal, radius * profile.offset);
        const tangent = edge.clone().addScaledVector(normal, -edge.dot(normal)).normalize();
        if (!tangent.lengthSq()) continue;
        if (!node.isInstancedMesh) tangent.applyAxisAngle(normal, random() * Math.PI);
        const bitangent = new Vector3().crossVectors(normal, tangent);
        tint.set(tint.x * instanceColor.r, tint.y * instanceColor.g, tint.z * instanceColor.b);
        tint.multiplyScalar(kind === 'mountain' ? 0.72 + random() * 0.37 : 0.76 + random() * 0.47);
        collection.push({
          center, tint, radius,
          axisT: tangent.multiplyScalar(radius),
          axisB: bitangent.multiplyScalar(radius * (0.32 + random() * 0.36)),
          axisN: normal.multiplyScalar(radius * 0.13),
          opacity: profile.alpha * (0.74 + random() * 0.51),
          depth: 0,
        });
      }
    }
  });
  return samples;
}

export function createGaussianDetail(scene, { detailScale = 1, report } = {}) {
  const samples = sampleSurfaces(scene);
  if (!Object.values(samples).some((items) => items.length)) return;
  const budgets = Object.fromEntries(Object.entries(profiles).map(([kind, profile]) => [
    kind, Math.round(profile.budget * detailScale),
  ]));
  const capacity = Object.values(budgets).reduce((total, budget) => total + budget, 0);

  const geometry = new InstancedBufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute([
    -3, -3, 0, 3, -3, 0, 3, 3, 0, -3, 3, 0,
  ], 3));
  geometry.setIndex([0, 1, 2, 0, 2, 3]);
  const vectorNames = ['center', 'axisT', 'axisB', 'axisN', 'tint'];
  for (const name of vectorNames) {
    geometry.setAttribute(name, new InstancedBufferAttribute(new Float32Array(capacity * 3), 3)
      .setUsage(DynamicDrawUsage));
  }
  const alpha = new InstancedBufferAttribute(new Float32Array(capacity), 1)
    .setUsage(DynamicDrawUsage);
  geometry.setAttribute('opacity', alpha);
  geometry.instanceCount = 0;

  const material = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    fog: true,
    uniforms: UniformsUtils.clone(UniformsLib.fog),
    vertexShader: /* glsl */`
      attribute vec3 center, axisT, axisB, axisN, tint;
      attribute float opacity;
      varying vec2 kernelPosition;
      varying vec4 flowerColor;
      #include <fog_pars_vertex>
      vec2 projectAxis(vec3 axis, vec4 clipCenter) {
        vec4 projected = projectionMatrix * modelViewMatrix * vec4(axis, 0.0);
        return (projected.xy - projected.w * clipCenter.xy / clipCenter.w) / clipCenter.w;
      }
      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(center, 1.0);
        vec4 clipCenter = projectionMatrix * mvPosition;
        vec2 a = projectAxis(axisT, clipCenter);
        vec2 b = projectAxis(axisB, clipCenter);
        vec2 c = projectAxis(axisN, clipCenter);
        // Cholesky factor of the projected covariance maps the circular kernel to its ellipse.
        vec3 covariance = a.xxy * a.xyy + b.xxy * b.xyy + c.xxy * c.xyy;
        float sx = sqrt(max(covariance.x, 1e-10));
        float shear = covariance.y / sx;
        float sy = sqrt(max(covariance.z - shear * shear, 1e-10));
        vec2 offset = vec2(sx * position.x, shear * position.x + sy * position.y);
        gl_Position = clipCenter + vec4(offset * clipCenter.w, 0.0, 0.0);
        kernelPosition = position.xy;
        flowerColor = vec4(tint, opacity);
        #include <fog_vertex>
      }
    `,
    fragmentShader: /* glsl */`
      varying vec2 kernelPosition;
      varying vec4 flowerColor;
      #include <fog_pars_fragment>
      void main() {
        float alpha = flowerColor.a * exp(-0.5 * dot(kernelPosition, kernelPosition));
        if (alpha < 0.008) discard;
        gl_FragColor = vec4(flowerColor.rgb, alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }
    `,
  });
  const mesh = new Mesh(geometry, material);
  mesh.name = 'Procedural Gaussian surface and foliage detail';
  mesh.frustumCulled = false;
  scene.add(mesh);

  const previousPosition = new Vector3(Infinity, Infinity, Infinity);
  const previousDirection = new Vector3();
  const direction = new Vector3();
  const offset = new Vector3();
  const projected = new Vector3();
  const projection = new Matrix4();
  let previousFov = 0;
  let previousAspect = 0;
  return (camera) => {
    camera.getWorldDirection(direction);
    if (camera.aspect === previousAspect && camera.fov === previousFov
      && previousPosition.distanceToSquared(camera.position) < 0.0016
      && previousDirection.dot(direction) > 0.99999) return;
    previousPosition.copy(camera.position);
    previousDirection.copy(direction);
    previousAspect = camera.aspect;
    previousFov = camera.fov;
    projection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    const visible = [];
    const counts = {};
    for (const [kind, items] of Object.entries(samples)) {
      const { range } = profiles[kind];
      const matches = items.filter((flower) => {
        offset.subVectors(flower.center, camera.position);
        flower.depth = offset.dot(direction);
        if (flower.depth <= 0.24 || offset.lengthSq() >= range * range) return false;
        const radiusOnScreen = flower.radius * camera.projectionMatrix.elements[5] / flower.depth;
        if (radiusOnScreen < 0.00085) return false;
        projected.copy(flower.center).applyMatrix4(projection);
        return Math.abs(projected.x) < 1 + radiusOnScreen * 5
          && Math.abs(projected.y) < 1 + radiusOnScreen * 4;
      }).sort((a, b) => a.depth - b.depth).slice(0, budgets[kind]);
      for (const flower of matches) {
        flower.visibility = 1 - Math.max(0, (flower.depth / range - 0.78) / 0.22);
      }
      counts[kind] = matches.length;
      visible.push(...matches);
    }
    visible.sort((a, b) => b.depth - a.depth);
    geometry.instanceCount = visible.length;
    for (const name of vectorNames) {
      const attribute = geometry.getAttribute(name);
      for (const [i, flower] of visible.entries()) {
        const vector = flower[name];
        attribute.setXYZ(i, vector.x, vector.y, vector.z);
      }
      attribute.needsUpdate = true;
    }
    visible.forEach((flower, i) => alpha.setX(i, flower.opacity * flower.visibility));
    alpha.needsUpdate = true;
    report?.(counts);
  };
}
