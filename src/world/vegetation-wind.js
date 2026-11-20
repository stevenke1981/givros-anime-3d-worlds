// These names identify movable plant parts; trunks and branches remain fixed.
const foliage = /foliage|leaves|leaf|needle|sprays|petals|flowers|plume|grass|seedlings|sedge|panicles|stems|fronds|crown|seed heads|seed disks/i;
const woodyPart = /trunk|root|branch scaffolds|culms/i;
const plantAsset = /^(?:sakura|cedar(?:-lod)?|ridge-cedar(?:-lod)?|bamboo|rice|grass|river-sedge|shrub|seasonal-forbs|shore-reeds|coastal-pine(?:-lod)?|meadow-grass|wild-azalea|valley-broadleaf|maple(?:-lod)?|[a-z-]*(?:grass|fern|flower|shrub|sedge|bamboo|maple|cedar|broadleaf|azalea)[a-z-]*)$/i;

/** Register plant meshes after their instance matrices are populated. */
export function createVegetationWind() {
  const time = { value: 0 };
  const strength = { value: 1 };
  const registered = new WeakSet();

  function register(mesh, assetId) {
    if (!mesh.isMesh || !plantAsset.test(assetId ?? '') || registered.has(mesh)) return false;
    const partName = `${mesh.name} ${Array.isArray(mesh.material) ? mesh.material.map(material => material.name).join(' ') : mesh.material.name}`;
    if (!foliage.test(partName) || woodyPart.test(partName)) return false;
    const geometry = mesh.geometry;
    if (!geometry.boundingBox) geometry.computeBoundingBox();
    const bounds = geometry.boundingBox;
    const height = bounds.max.y - bounds.min.y;
    if (!(height > 0)) return false;
    const amplitude = /sakura|cedar|maple|broadleaf|bamboo/i.test(assetId) ? .025 : .045;
    const wrap = original => {
      const material = original.clone();
      const previousCompile = original.onBeforeCompile;
      const previousKey = original.customProgramCacheKey.call(original);
      material.onBeforeCompile = function (shader, renderer) {
        previousCompile.call(this, shader, renderer);
        shader.uniforms.vegetationWindTime = time;
        shader.uniforms.vegetationWindStrength = strength;
        shader.uniforms.vegetationWindBase = { value: bounds.min.y };
        shader.uniforms.vegetationWindHeight = { value: height };
        shader.uniforms.vegetationWindAmplitude = { value: amplitude };
        shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>
uniform float vegetationWindTime;
uniform float vegetationWindStrength;
uniform float vegetationWindBase;
uniform float vegetationWindHeight;
uniform float vegetationWindAmplitude;`);
        shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
mat4 windWorldMatrix = modelMatrix;
#ifdef USE_INSTANCING
  windWorldMatrix = modelMatrix * instanceMatrix;
#endif
vec3 windOrigin = windWorldMatrix[3].xyz;
float windPhase = dot(windOrigin.xz, vec2(0.31, 0.23));
float windWave = sin(vegetationWindTime * 1.2 + windPhase) + 0.3 * sin(vegetationWindTime * 2.1 + windPhase * 1.7);
float windHeight = clamp((position.y - vegetationWindBase) / vegetationWindHeight, 0.0, 1.0);
vec3 windDirection = vec3(0.89, 0.0, 0.46);
mat3 windBasis = mat3(windWorldMatrix);
vec3 windLocal = vec3(
  dot(windDirection, windBasis[0]) / max(dot(windBasis[0], windBasis[0]), 0.0001),
  dot(windDirection, windBasis[1]) / max(dot(windBasis[1], windBasis[1]), 0.0001),
  dot(windDirection, windBasis[2]) / max(dot(windBasis[2], windBasis[2]), 0.0001)
);
transformed += windLocal * (vegetationWindAmplitude * windWave * windHeight * windHeight * vegetationWindStrength);`);
      };
      material.customProgramCacheKey = () => `${previousKey}|vegetation-wind-v1`;
      return material;
    };
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(wrap) : wrap(mesh.material);
    registered.add(mesh);
    return true;
  }

  function update(seconds, reducedMotion = false) {
    time.value = seconds;
    strength.value = reducedMotion ? 0 : 1;
  }

  return { register, update };
}
