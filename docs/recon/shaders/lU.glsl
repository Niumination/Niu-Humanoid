
  uniform sampler2D uTexA, uTexB, uTexS;
  uniform float uStrongA, uStrongB, uPulseA, uPulseB, uPatchUV, uDotSharp;
  varying vec2 vUv;
  varying vec3 vTint;
  varying float vAlpha, vMixK, vFlat, vPatch;
  void main() {
    // ⚠ NO colorspace include here — the Bloom composer performs the one sRGB encode (see header).
    float r = length(gl_PointCoord - vec2(0.5));
    if (r > 0.5) discard;
    float aDot = smoothstep(0.5, uDotSharp, r);
    vec3 c;
    if (vFlat > 0.5) {
      c = vTint;                              // boilers + interior dust: flat brand colours
    } else {
      // THE TILE: sample the artwork at this fragment's own rest location. All overlapping dots
      // agree on the answer, so the rest view reconstructs the plate pixel-for-pixel.
      vec2 tile = vUv + (gl_PointCoord - vec2(0.5)) * (uPatchUV * vPatch);   // NB 'patch' is a GLSL reserved word
      vec3 cA = mix(texture2D(uTexA, tile).rgb, texture2D(uTexS, tile).rgb, uStrongA) * uPulseA;
      vec3 cB = mix(texture2D(uTexB, tile).rgb, texture2D(uTexS, tile).rgb, uStrongB) * uPulseB;
      c = mix(cA, cB, vMixK) * vTint;
      // near-black tiles vanish: the listening rings stay visible through dark body gaps
      if (max(c.r, max(c.g, c.b)) < 0.0025) discard;
    }
    float a = aDot * vAlpha;
    if (a < 0.004) discard;
    gl_FragColor = vec4(c, a);
  }
