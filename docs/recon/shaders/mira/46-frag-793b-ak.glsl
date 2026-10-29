// ==== recon shader mira #46 — variabel bundle: ak ====
// sumber: mira.js offset 1095653 | 793 byte hasil rekonstruksi
// jenis: frag | operand: 3 | ada bagian DINAMIS: True
// DISALIN VERBATIM (escape JS sudah di-decode) — jangan dirapikan (aturan main #3)


  uniform sampler2D uLifted; uniform vec2 uSize; uniform float uGain, uOn, uTime, uPulse, uPulseSpeed;
  varying vec2 vRest; varying float vS; varying float vSeed; varying float vLen;

  void main() {
    vec3 c = texture2D(uLifted, vRest / uSize).rgb;      // its own pixels, from where it rests
    // now and then a light runs down the strand (only some strands carry one)
    float head = mod(uTime * (90.0 + 120.0 * fract(vSeed * 17.0)) * uPulseSpeed + vSeed * 4000.0, vLen + 900.0);
    float d = head - vS;
    float pulse = (d > 0.0 && d < 110.0) ? 1.0 - d / 110.0 : 0.0;
    pulse *= pulse * step(0.55, fract(vSeed * 23.0)) * uPulse * colouredAt(vRest);
    c = built(c, vRest);
    c += (c + vec3(0.25, 0.12, 0.35)) * pulse * 2.2;
    gl_FragColor = vec4(c * uGain * uOn, 1.0);
  }
