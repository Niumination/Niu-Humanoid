// ==== recon shader mira #65 — variabel bundle: pN ====
// sumber: mira.js offset 1063988 | 450 byte hasil rekonstruksi
// jenis: vert | operand: 1 | ada bagian DINAMIS: False
// DISALIN VERBATIM (escape JS sudah di-decode) — jangan dirapikan (aturan main #3)


  attribute float aPhase;
  attribute float aSize;
  uniform float uTime, uPx;
  varying float vTw;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    // each grain twinkles on its own clock: some steady, some blinking
    float tw = 0.55 + 0.45 * sin(uTime * (1.2 + aPhase * 0.9) + aPhase * 6.2831);
    vTw = tw;
    gl_PointSize = aSize * uPx * (0.7 + 0.5 * tw) * (4.8 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
