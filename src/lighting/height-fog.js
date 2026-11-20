export function applyHeightFog(shader) {
  shader.vertexShader = shader.vertexShader
    .replace('#include <fog_pars_vertex>', '#include <fog_pars_vertex>\nvarying float valleyWorldHeight;')
    .replace('#include <fog_vertex>', `#include <fog_vertex>
      vec4 fogPosition = vec4(transformed, 1.);
      #ifdef USE_INSTANCING
        fogPosition = instanceMatrix * fogPosition;
      #endif
      valleyWorldHeight = (modelMatrix * fogPosition).y;`);
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <fog_pars_fragment>', '#include <fog_pars_fragment>\nvarying float valleyWorldHeight;')
    .replace('#include <fog_fragment>', `
      #if defined(USE_FOG) && defined(FOG_EXP2)
        float eyeHeight = max(cameraPosition.y, 0.) * .067;
        float shadedHeight = max(valleyWorldHeight, 0.) * .067;
        float layerSpan = eyeHeight - shadedHeight;
        float surfaceDensity = exp(-shadedHeight);
        float averageDensity = abs(layerSpan) < .001
          ? surfaceDensity : (surfaceDensity - exp(-eyeHeight)) / layerSpan;
        float hazePath = max(0., vFogDepth - 9.);
        float aerialDepth = smoothstep(12., 52., vFogDepth) * hazePath *
          (fogDensity * .12 + .0026 * averageDensity);
        float distantHaze = hazePath * fogDensity * .65;
        gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, 1. - exp(-aerialDepth - distantHaze * distantHaze));
      #else
        #include <fog_fragment>
      #endif`);
}
