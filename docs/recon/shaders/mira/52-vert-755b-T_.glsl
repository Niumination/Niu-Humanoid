// ==== recon shader mira #52 — variabel bundle: T_ ====
// sumber: mira.js offset 1072177 | 755 byte hasil rekonstruksi
// jenis: vert | operand: 1 | ada bagian DINAMIS: False
// DISALIN VERBATIM (escape JS sudah di-decode) — jangan dirapikan (aturan main #3)


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
