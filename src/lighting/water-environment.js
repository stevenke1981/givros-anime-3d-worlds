export const waterEnvironmentGLSL = `
#ifdef USE_WATER_ENVIRONMENT
uniform samplerCube waterEnvironment;
uniform float waterEnvironmentMaxLod, waterEnvironmentIntensity;

vec3 reflectWater(vec3 body, vec3 normal, vec3 eye, float roughness) {
  float grazing = 1.0 - clamp(dot(normal, eye), 0.0, 1.0);
  // Schlick Fresnel with the normal-incidence reflectance of water (IOR 1.333).
  float fresnel = .02037 + .97963 * pow(grazing, 5.0);
  // Convert perceptual roughness to the mip scale used by Three.js PMREM.
  float level = waterEnvironmentMaxLod * roughness * (2.0 - roughness);
  vec3 radiance = textureLod(waterEnvironment, reflect(-eye, normal), level).rgb;
  return mix(body, radiance * waterEnvironmentIntensity, fresnel);
}
#endif
`;
