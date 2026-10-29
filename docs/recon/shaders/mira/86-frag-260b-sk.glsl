// ==== recon shader mira #86 — variabel bundle: sk ====
// sumber: mira.js offset 1094965 | 260 byte hasil rekonstruksi
// jenis: frag | operand: 4 | ada bagian DINAMIS: True
// DISALIN VERBATIM (escape JS sudah di-decode) — jangan dirapikan (aturan main #3)


  uniform sampler2D uMap; uniform vec2 uSize; uniform float uGain, uOn;
  varying vec2 vPos;

  void main() {
    vec2 q = hairSource(vPos);
    vec3 c = texture2D(uMap, (q - mass(q)) / uSize).rgb;
    gl_FragColor = vec4(built(c, q) * uGain * uOn, 1.0);
  }
