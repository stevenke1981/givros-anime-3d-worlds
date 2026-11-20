export const waterEnvironmentGLSL = `
// Schlick Fresnel with the normal-incidence reflectance of water (IOR 1.333).
float fresnelWater(float cosView) {
  return .02037 + .97963 * pow(1.0 - clamp(cosView, 0.0, 1.0), 5.0);
}

#ifdef USE_WATER_ENVIRONMENT
uniform samplerCube waterEnvironment;
uniform float waterEnvironmentMaxLod, waterEnvironmentIntensity;

vec3 sampleWaterEnvironment(vec3 ray, float roughness) {
  // Convert perceptual roughness to the mip scale used by Three.js PMREM.
  float level = waterEnvironmentMaxLod * roughness * (2.0 - roughness);
  return textureLod(waterEnvironment, ray, level).rgb;
}

vec3 reflectWater(vec3 body, vec3 normal, vec3 eye, float roughness) {
  vec3 radiance = sampleWaterEnvironment(reflect(-eye, normal), roughness);
  return mix(body, radiance * waterEnvironmentIntensity, fresnelWater(dot(normal, eye)));
}
#endif
`;
