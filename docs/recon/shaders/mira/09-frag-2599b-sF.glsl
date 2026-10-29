// ==== recon shader mira #09 — variabel bundle: sF ====
// sumber: mira.js offset 1150624 | 2599 byte hasil rekonstruksi
// jenis: frag | operand: 6 | ada bagian DINAMIS: True
// DISALIN VERBATIM (escape JS sudah di-decode) — jangan dirapikan (aturan main #3)


  uniform sampler2D uMap; uniform float uFill; uniform float uGain; uniform vec2 uSize; uniform float uTime; varying vec2 vUv;
  uniform float uHeadOn, uHeadCut;

  uniform vec4 uHz;                  // her centre line x, her ear top y, feather (px), how much (0..1)
  uniform vec3 uHzSkull, uHzInner;   // half width, centre y, half height (px)
  float underHair(vec2 p) {
    if (uHz.w <= 0.0) return 0.0;
    vec2 qs = vec2((p.x - uHz.x) / uHzSkull.x, (p.y - uHzSkull.y) / uHzSkull.z);
    float skull = p.y < uHzSkull.y ? length(qs) : abs(qs.x);
    float inSkull = 1.0 - smoothstep(1.0, 1.0 + uHz.z / uHzSkull.x, skull);
    vec2 qi = vec2((p.x - uHz.x) / uHzInner.x, (p.y - uHzInner.y) / uHzInner.z);
    float outInner = smoothstep(1.0 - 2.0 * uHz.z / uHzInner.x, 1.0, length(qi));
    float above = 1.0 - smoothstep(uHz.y - 3.0 * uHz.z, uHz.y + uHz.z, p.y);
    return inSkull * outInner * above * uHz.w;
  }

  uniform vec4 uReveal;    // her heart (x, y px), her ignition (s), the wave's speed (px/s)
  // when her ignition's wave reaches p: her picture, her lines and her hair appear there
  float revealAt(vec2 p) {
    float r = length(p - uReveal.xy), s = uReveal.w;
    return uReveal.z + (r <= 1.64 * s ? (1.0 - sqrt(max(0.0, 1.0 - 0.36 * r / s))) / 0.18 : r / (0.82 * s));
  }

  uniform vec4 uShock;     // where it started (x, y px), the wave's radius (px), its strength
  uniform float uShockW;   // the width of its band of light (px): her ignition's front is thin, a touch's is broad
  // the light of the wave's front where it crosses p
  float shockAt(vec2 p) { float d = length(p - uShock.xy) - uShock.z; float w = uShockW + 0.02 * uShock.z; return uShock.w * exp(-d * d / (w * w)); }

  void main() {
    vec2 p = vec2(vUv.x * uSize.x, (1.0 - vUv.y) * uSize.y);
    if (uHeadOn > 0.5 && p.y < uHeadCut) discard;    // (her head is drawn by its own 3D points once she is whole)
    vec2 fm = faceMove(p);                          // her face moves with her voice: read the picture from there
    vec4 c = texture2D(uMap, vec2((p.x - fm.x) / uSize.x, 1.0 - (p.y - fm.y) / uSize.y));
    float bright = smoothstep(0.18, 0.55, max(c.r, max(c.g, c.b)));
    float give = underHair(p) * bright;
    float at = revealAt(p), filled = smoothstep(at - 0.04, at + 0.4, uTime);
    c.rgb *= 1.0 + faceLift(p);                     // her own glass lights up from inside while she speaks
    c.rgb *= 1.0 + 0.7 * exp(-max(0.0, uTime - at) * 3.0) + 0.6 * shockAt(p);   // the wave, and the flash behind it
    gl_FragColor = vec4(c.rgb * uGain * (1.0 - give), c.a * filled * uFill);
  }
