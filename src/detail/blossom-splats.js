import {
  DynamicDrawUsage, Float32BufferAttribute, InstancedBufferAttribute, InstancedBufferGeometry,
  Matrix3, Matrix4, Mesh, ShaderMaterial, Vector3,
} from 'three';

export function createBlossomDetail(scene) {
  const flowers = [];
  const matrix = new Matrix4();
  const normals = new Matrix3();
  scene.traverse((node) => {
    if (!node.isInstancedMesh || !/blossom/i.test(node.name) || !/blossom/i.test(node.material.name)) return;
    const { index, attributes } = node.geometry;
    const triangles = (index?.count ?? attributes.position.count) / 3;
    for (let instance = 0; instance < node.count; instance += 1) {
      node.getMatrixAt(instance, matrix);
      matrix.premultiply(node.matrixWorld);
      normals.getNormalMatrix(matrix);
      const scale = new Vector3().setFromMatrixScale(matrix).x;
      let seed = 831 + instance * 1669;
      const random = () => {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        return seed / 4294967296;
      };

      // Sample the authored petals so the detail follows each copy of the tree.
      for (let sample = 0; sample < 105; sample += 1) {
        const triangle = Math.floor(random() * triangles) * 3;
        const a = index ? index.getX(triangle) : triangle;
        const b = index ? index.getX(triangle + 1) : triangle + 1;
        const c = index ? index.getX(triangle + 2) : triangle + 2;
        const pa = new Vector3().fromBufferAttribute(attributes.position, a).applyMatrix4(matrix);
        const pb = new Vector3().fromBufferAttribute(attributes.position, b).applyMatrix4(matrix);
        const pc = new Vector3().fromBufferAttribute(attributes.position, c).applyMatrix4(matrix);
        const normal = new Vector3().fromBufferAttribute(attributes.normal, a).applyNormalMatrix(normals);
        const radius = (0.025 + random() * 0.045) * scale;
        const edge = pb.clone().sub(pa);
        const tangent = edge.addScaledVector(normal, -edge.dot(normal)).normalize();
        if (!tangent.lengthSq()) continue;
        const bitangent = new Vector3().crossVectors(normal, tangent);
        flowers.push({
          center: pa.add(pb).add(pc).multiplyScalar(1 / 3).addScaledVector(normal, radius * 0.44),
          tint: new Vector3().fromBufferAttribute(attributes.color, a).lerp(new Vector3(0.96, 0.68, 0.72), 0.28),
          axisT: tangent.multiplyScalar(radius),
          axisB: bitangent.multiplyScalar(radius * (0.43 + random() * 0.32)),
          axisN: normal.multiplyScalar(radius * 0.19),
          opacity: 0.26 + random() * 0.25,
          depth: 0,
        });
      }
    }
  });
  if (!flowers.length) return;

  const geometry = new InstancedBufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute([
    -3, -3, 0, 3, -3, 0, 3, 3, 0, -3, 3, 0,
  ], 3));
  geometry.setIndex([0, 1, 2, 0, 2, 3]);
  const vectorNames = ['center', 'axisT', 'axisB', 'axisN', 'tint'];
  for (const name of vectorNames) {
    geometry.setAttribute(name, new InstancedBufferAttribute(new Float32Array(flowers.length * 3), 3)
      .setUsage(DynamicDrawUsage));
  }
  const alpha = new InstancedBufferAttribute(new Float32Array(flowers.length), 1)
    .setUsage(DynamicDrawUsage);
  geometry.setAttribute('opacity', alpha);
  geometry.instanceCount = 0;

  const material = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    vertexShader: /* glsl */`
      attribute vec3 center, axisT, axisB, axisN, tint;
      attribute float opacity;
      varying vec2 kernelPosition;
      varying vec4 flowerColor;
      vec2 projectAxis(vec3 axis, vec4 clipCenter) {
        vec4 projected = projectionMatrix * modelViewMatrix * vec4(axis, 0.0);
        return (projected.xy - projected.w * clipCenter.xy / clipCenter.w) / clipCenter.w;
      }
      void main() {
        vec4 clipCenter = projectionMatrix * modelViewMatrix * vec4(center, 1.0);
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
        flowerColor = vec4(tint, opacity * (1.0 - smoothstep(13.0, 20.0, clipCenter.w)));
      }
    `,
    fragmentShader: /* glsl */`
      varying vec2 kernelPosition;
      varying vec4 flowerColor;
      void main() {
        float alpha = flowerColor.a * exp(-0.5 * dot(kernelPosition, kernelPosition));
        if (alpha < 0.008) discard;
        gl_FragColor = vec4(flowerColor.rgb, alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  const mesh = new Mesh(geometry, material);
  mesh.name = 'Procedural Gaussian blossom detail';
  mesh.frustumCulled = false;
  scene.add(mesh);

  const previousPosition = new Vector3(Infinity, Infinity, Infinity);
  const previousDirection = new Vector3();
  const direction = new Vector3();
  const offset = new Vector3();
  return (camera) => {
    camera.getWorldDirection(direction);
    if (previousPosition.distanceToSquared(camera.position) < 0.00001
      && previousDirection.dot(direction) > 0.99999) return;
    previousPosition.copy(camera.position);
    previousDirection.copy(direction);
    const visible = flowers.filter((flower) => {
      offset.subVectors(flower.center, camera.position);
      flower.depth = offset.dot(direction);
      return flower.depth > 0.24 && offset.lengthSq() < 400;
    }).sort((a, b) => b.depth - a.depth);
    geometry.instanceCount = visible.length;
    for (const name of vectorNames) {
      const attribute = geometry.getAttribute(name);
      for (const [i, flower] of visible.entries()) {
        const vector = flower[name];
        attribute.setXYZ(i, vector.x, vector.y, vector.z);
      }
      attribute.needsUpdate = true;
    }
    visible.forEach((flower, i) => alpha.setX(i, flower.opacity));
    alpha.needsUpdate = true;
  };
}
