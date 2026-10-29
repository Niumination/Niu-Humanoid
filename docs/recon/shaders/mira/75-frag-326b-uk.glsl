// ==== recon shader mira #75 — variabel bundle: uk ====
// sumber: mira.js offset 1096939 | 326 byte hasil rekonstruksi
// jenis: frag | operand: 3 | ada bagian DINAMIS: True
// DISALIN VERBATIM (escape JS sudah di-decode) — jangan dirapikan (aturan main #3)


  uniform float uOn, uSpark;
  varying vec3 vCol; varying float vA; varying vec2 vP;

  void main() {
    vec2 q = gl_PointCoord * 2.0 - 1.0; float r = dot(q, q);
    if (r > 1.0) discard;
    gl_FragColor = vec4(vCol * exp(-r * 4.0) * 2.0 * vA * uSpark * uOn * colouredAt(vP), 1.0);   // (twinkles come with the colour)
  }
