// ==== recon shader mira #14 — variabel bundle: hF ====
// sumber: mira.js offset 1155092 | 1919 byte hasil rekonstruksi
// jenis: frag | operand: 4 | ada bagian DINAMIS: True
// DISALIN VERBATIM (escape JS sudah di-decode) — jangan dirapikan (aturan main #3)


  uniform sampler2D uMap; uniform vec2 uSize; uniform float uGain;
  varying vec2 vRest; varying float vPatch; varying vec3 vTint; varying float vKind; varying float vShow;

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

  void main() {
    if (vShow < 0.5) discard;
    vec2 pc = gl_PointCoord - vec2(0.5);
    if (dot(pc, pc) > 0.25) discard;
    vec3 c;
    if (vKind > 4.5) {
      c = vec3(0.30, 0.16, 0.55) * 0.3;                         // the dim matter inside her head (seen only at a turn)
    } else {
      vec2 tile = vRest + pc * vPatch;                          // THE TILE: her picture at this fragment's own rest place
      vec4 t = texture2D(uMap, vec2(tile.x / uSize.x, 1.0 - tile.y / uSize.y));
      if (t.a < 0.5) discard;
      float bright = smoothstep(0.18, 0.55, max(t.r, max(t.g, t.b)));
      // (weighted by its see-through value, exactly as the flat picture was: her half-clear edge pixels never shine at
      // full strength)
      c = t.rgb * t.a * uGain * (1.0 - underHair(tile) * bright) * (1.0 + faceLift(tile)) * vTint;
      if (vKind < 0.5) c += faceColor(tile) * faceGlow(tile) * 0.8;   // the light in the front of her face
    }
    gl_FragColor = vec4(c, 1.0);
  }
