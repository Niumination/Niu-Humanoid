// ==== recon shader mira #76 — variabel bundle: mN ====
// sumber: mira.js offset 1064444 | 313 byte hasil rekonstruksi
// jenis: frag | operand: 1 | ada bagian DINAMIS: False
// DISALIN VERBATIM (escape JS sudah di-decode) — jangan dirapikan (aturan main #3)


  precision highp float;
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vTw;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    if (d > 1.0) discard;
    float a = (1.0 - d); a *= a;
    gl_FragColor = vec4(uColor * (0.7 + 0.9 * vTw), a * (0.35 + 0.65 * vTw) * uOpacity);
  }
