// ==== recon shader mira #70 — variabel bundle: ik ====
// sumber: mira.js offset 1094439 | 388 byte hasil rekonstruksi
// jenis: vert | operand: 1 | ada bagian DINAMIS: False
// DISALIN VERBATIM (escape JS sudah di-decode) — jangan dirapikan (aturan main #3)


  uniform float uTime, uSway;
  vec2 sway(float s, float seed) {
    float g = pow(min(1.0, s / 350.0), 1.5) * uSway * 24.0;
    return vec2(
      g * (sin(uTime * (0.55 + 0.4 * fract(seed * 7.0)) + seed * 6.283 + s * 0.006) * 0.7
         + sin(uTime * (0.23 + 0.2 * fract(seed * 3.0)) + seed * 3.1 + s * 0.011) * 0.3),
      g * 0.18 * sin(uTime * 0.4 + seed * 5.0 + s * 0.004));
  }
