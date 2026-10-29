// ==== recon shader mira #38 — variabel bundle: Yw ====
// sumber: mira.js offset 1144167 | 929 byte hasil rekonstruksi
// jenis: frag | operand: 1 | ada bagian DINAMIS: False
// DISALIN VERBATIM (escape JS sudah di-decode) — jangan dirapikan (aturan main #3)


  uniform float uTime, uBright;
  varying float vU; varying float vW; varying float vT; varying vec3 vCol; varying float vStr;
  // a real strike flashes, drops out, re-strikes, then fades (the same beats as lib/miraBuild flicker)
  float flicker(float dt) {
    if (dt < 0.0) return 0.0;
    if (dt < 0.05) return 1.0;
    if (dt < 0.09) return 0.1;
    if (dt < 0.16) return 0.95;
    if (dt < 0.20) return 0.25;
    if (dt < 0.32) return 0.5 * (1.0 - (dt - 0.2) / 0.12);
    return 0.0;
  }
  void main() {
    float dt = uTime - vT;
    float grow = dt < 0.0 ? clamp((dt + 0.06) / 0.06, 0.0, 1.0) : 1.0;     // a leader feels its way for 60 ms
    if (vU > grow) discard;
    float I = (dt < 0.0 ? (dt > -0.06 ? 0.35 : 0.0) : flicker(dt)) * vStr * uBright;
    if (I <= 0.0) discard;
    vec3 c = mix(vCol, vec3(1.0), 0.55 * vW) * (2.0 + 3.0 * vW) * I;
    gl_FragColor = vec4(c, clamp(I * (0.4 + 0.6 * vW), 0.0, 1.0));
  }
