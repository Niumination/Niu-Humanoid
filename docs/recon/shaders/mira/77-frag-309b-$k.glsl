// ==== recon shader mira #77 — variabel bundle: $k ====
// sumber: mira.js offset 1148274 | 309 byte hasil rekonstruksi
// jenis: frag | operand: 1 | ada bagian DINAMIS: False
// DISALIN VERBATIM (escape JS sudah di-decode) — jangan dirapikan (aturan main #3)


  varying vec3 vCol; varying float vA; varying float vMove;
  void main() {
    vec2 q = gl_PointCoord * 2.0 - 1.0; float r = dot(q, q);
    if (r > 1.0 || vA <= 0.0) discard;
    gl_FragColor = vec4(mix(vCol, vec3(1.0), 0.25 * (1.0 - vMove)) * (1.3 + vMove * 1.4) * exp(-r * 3.0), clamp(vA, 0.0, 1.0));
  }
