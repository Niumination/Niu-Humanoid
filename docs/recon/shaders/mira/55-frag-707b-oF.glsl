// ==== recon shader mira #55 — variabel bundle: oF ====
// sumber: mira.js offset 1151696 | 707 byte hasil rekonstruksi
// jenis: frag | operand: 3 | ada bagian DINAMIS: False
// DISALIN VERBATIM (escape JS sudah di-decode) — jangan dirapikan (aturan main #3)


  uniform sampler2D uMap; uniform float uFill; uniform vec2 uSize; uniform float uTime; varying vec2 vUv;

  uniform vec4 uReveal;    // her heart (x, y px), her ignition (s), the wave's speed (px/s)
  // when her ignition's wave reaches p: her picture, her lines and her hair appear there
  float revealAt(vec2 p) {
    float r = length(p - uReveal.xy), s = uReveal.w;
    return uReveal.z + (r <= 1.64 * s ? (1.0 - sqrt(max(0.0, 1.0 - 0.36 * r / s))) / 0.18 : r / (0.82 * s));
  }

  void main() {
    vec2 p = vec2(vUv.x * uSize.x, (1.0 - vUv.y) * uSize.y);
    float at = revealAt(p);
    gl_FragColor = vec4(0.0, 0.0, 0.0, texture2D(uMap, vUv).a * smoothstep(at - 0.04, at + 0.4, uTime) * uFill);
  }
