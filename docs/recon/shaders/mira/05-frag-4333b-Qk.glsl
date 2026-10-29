// ==== recon shader mira #05 — variabel bundle: Qk ====
// sumber: mira.js offset 1140637 | 4333 byte hasil rekonstruksi
// jenis: frag | operand: 5 | ada bagian DINAMIS: True
// DISALIN VERBATIM (escape JS sudah di-decode) — jangan dirapikan (aturan main #3)


  precision highp float;
  uniform float uTime, uHalfPx, uCorePx, uSoftLine, uSoftSketch, uGlowLine, uGlowSketch;
  uniform float uRest, uSettle, uHot, uGain, uIdle, uPulse, uPulseSpeed, uSketchBright, uFade, uTaper, uLiveT;
  varying vec2 vUv; varying float vT; varying vec3 vCol; varying float vS; varying float vLen; varying float vId; varying float vSketch; varying float vEnd; varying vec2 vPos; varying float vF;

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

  uniform vec4 uShock;     // where it started (x, y px), the wave's radius (px), its strength
  uniform float uShockW;   // the width of its band of light (px): her ignition's front is thin, a touch's is broad
  // the light of the wave's front where it crosses p
  float shockAt(vec2 p) { float d = length(p - uShock.xy) - uShock.z; float w = uShockW + 0.02 * uShock.z; return uShock.w * exp(-d * d / (w * w)); }

  float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  void main() {
    if (uTime < vT) discard;
    // NO BLUNT CUTS (round 6): a line thins and fades into its ends, and the drawing front fades in
    float taper = smoothstep(0.0, uTaper, vEnd);
    float front = clamp((uTime - vT) / 0.09, 0.0, 1.0);
    float px = abs(vUv.y) * uHalfPx;
    float wire = exp(-pow(px / (uCorePx * (0.35 + 0.65 * taper)), 2.0));
    float soft = mix(uSoftLine, uSoftSketch, vSketch), glowAmt = mix(uGlowLine, uGlowSketch, vSketch);
    float halo = exp(-pow(px / max(0.5, soft), 2.0)) * 0.30 * glowAmt * taper;
    float age = uTime - vT;
    float heat = exp(-age * 4.0) * (1.0 - vSketch);                      // hot the instant her ignition's wave reaches it
    float press = 0.45 + 0.55 * noise(vec2(vS * 0.02 + vId * 37.0, vId * 11.0));   // pencil pressure
    float tip = vSketch * exp(-age * 5.0) * 0.7;                          // where the pencil just passed
    // HOT, then its own colour (vF): the flare carries the line's own colour - never a white sketch (Ruben: "the build
    // of white lines look bad")
    float coloured = smoothstep(vF, vF + 0.4, uTime);
    vec3 own = mix(mix(vCol, vec3(1.0), 0.45), vCol, coloured);
    vec3 c = mix(own * uGain, mix(vCol, vec3(1.0, 0.96, 1.0), 0.55) * uHot, heat);
    // the ignition's wave lights the line as it crosses it
    float sh = shockAt(vPos);
    c += vec3(0.95, 0.8, 1.0) * sh * 1.6;
    c *= mix(1.0, mix(uSketchBright * press, 1.0, uSettle), vSketch);
    c += vec3(1.0, 0.95, 1.0) * tip * uSketchBright;
    // at rest: light travelling along the line, each line on its own speed and phase
    float head = mod(uLiveT * (120.0 + vId * 160.0) * uPulseSpeed + vId * 3000.0, vLen + 900.0);   // (her pace clock)
    float d = head - vS;
    float pulse = (d > 0.0 && d < 150.0) ? 1.0 - d / 150.0 : 0.0;
    pulse *= pulse * uIdle * uPulse;
    c += vec3(1.0, 0.94, 1.0) * pulse * 2.0;
    // (under her hair her line gives way - lib/miraHairPic HAIR_ZONE_GLSL)
    // (the line settles to its resting brightness once its colour has come)
    float rest = 1.0 - (1.0 - uRest) * smoothstep(vF, vF + 0.6, uTime);
    // the lines in the front of her face catch the glow while she speaks
    c += faceColor(vPos) * faceGlow(vPos) * 1.2;
    gl_FragColor = vec4(c * (wire + halo) * uFade * front * (0.3 + 0.7 * taper) * (1.0 - underHair(vPos)), clamp((rest + heat + pulse * 0.8 + sh) * taper, 0.0, 1.0));
  }
