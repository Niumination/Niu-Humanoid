// ==== recon shader apex #11 — variabel bundle: mU ====
// sumber: apex.js offset 1051570 | 1727 byte hasil rekonstruksi
// jenis: vert | operand: 1 | ada bagian DINAMIS: False
// DISALIN VERBATIM (escape JS sudah di-decode) — jangan dirapikan (aturan main #3)


  attribute vec2 aUv;
  attribute vec3 aCol;
  attribute float aPh, aRate, aBase, aTw, aSz;
  uniform float uT, uPixelRatio, uSizeK, uRest, uPulse;
  uniform vec4 uMap;                 // image-uv -> NDC: xy = scale, zw = offset
  uniform vec4 uWave;                // THE SHOCKWAVE: xy = origin (NDC), z = radius, w = strength
  uniform vec2 uWaveK;               // x = aspect (vw/vh), y = ring half-thickness
  varying vec3 vC;
  void main() {
    float tw = 0.5 + 0.5 * sin(uT * aRate + aPh * 6.2831853);
    // aTw is a MODE: 1 = wandering star (briefly ON, mostly off) · 0.5 = vein breath
    // (gentle, continuous) · 0 = quiet glitter (rest light only)
    float wander = step(0.75, aTw) * smoothstep(0.66, 1.0, tw) * uPulse;
    float breath = step(0.25, aTw) * (1.0 - step(0.75, aTw)) * (0.1 + 0.9 * tw) * 1.1;
    float pulse = wander + breath;
    float glow = aBase * (uRest + pulse);
    // at pulse peak the color brightens IN ITS OWN HUE - never lifted toward white
    vC = min(aCol * (1.0 + 0.45 * smoothstep(0.5, 1.0, pulse)), vec3(1.0)) * glow;
    vec2 ndc = vec2(aUv.x * uMap.x + uMap.z, aUv.y * uMap.y + uMap.w);
    // THE SHOCKWAVE crossing the ranges: as the ring (born at the figure's face core, at the
    // horn's peak) passes over a point, it flares in its own color - the mountains answer the
    // horn in sequence, near slopes first, far peaks last.
    if (uWave.w > 0.001) {
      float wd = length(vec2((ndc.x - uWave.x) * uWaveK.x, ndc.y - uWave.y));
      float wf = 1.0 - smoothstep(0.0, uWaveK.y, abs(wd - uWave.z));
      vC *= 1.0 + wf * uWave.w * 3.2;
    }
    gl_Position = vec4(ndc, 0.0, 1.0);
    gl_PointSize = max(1.0, aSz * uSizeK * uPixelRatio * (1.0 + 0.35 * pulse));
  }
