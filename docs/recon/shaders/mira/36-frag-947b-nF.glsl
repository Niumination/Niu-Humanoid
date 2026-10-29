// ==== recon shader mira #36 — variabel bundle: nF ====
// sumber: mira.js offset 1148753 | 947 byte hasil rekonstruksi
// jenis: frag | operand: 3 | ada bagian DINAMIS: False
// DISALIN VERBATIM (escape JS sudah di-decode) — jangan dirapikan (aturan main #3)


  varying vec2 vP;

  uniform vec4 uShock;     // where it started (x, y px), the wave's radius (px), its strength
  uniform float uShockW;   // the width of its band of light (px): her ignition's front is thin, a touch's is broad
  // the light of the wave's front where it crosses p
  float shockAt(vec2 p) { float d = length(p - uShock.xy) - uShock.z; float w = uShockW + 0.02 * uShock.z; return uShock.w * exp(-d * d / (w * w)); }

  void main() {
    float d = length(vP - uShock.xy) - uShock.z, w = uShockW + 0.02 * uShock.z;
    float front = shockAt(vP);
    float glow = exp(-d * d / (w * w * 16.0)) * 0.22 * uShock.w;     // a soft violet glow round the thin front
    float wake = d < 0.0 ? exp(d / (w * 12.0)) * 0.07 * uShock.w : 0.0;
    vec3 c = mix(vec3(0.62, 0.36, 1.0), vec3(1.0, 0.92, 1.0), clamp(front / max(1e-4, uShock.w), 0.0, 1.0));
    gl_FragColor = vec4(c * front * 0.9 + vec3(0.55, 0.3, 1.0) * (glow + wake), 1.0);
  }
