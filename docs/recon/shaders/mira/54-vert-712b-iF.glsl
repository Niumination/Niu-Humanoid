// ==== recon shader mira #54 — variabel bundle: iF ====
// sumber: mira.js offset 1149296 | 712 byte hasil rekonstruksi
// jenis: vert | operand: 4 | ada bagian DINAMIS: True
// DISALIN VERBATIM (escape JS sudah di-decode) — jangan dirapikan (aturan main #3)


  attribute vec3 aDir; attribute float aS;
  uniform vec2 uRes; uniform float uHalfPx;
  varying vec2 vUv; varying float vS;

  vec4 headClip(vec3 p) { vec4 c = projectionMatrix * modelViewMatrix * vec4(p.xy, 0.0, 1.0); c.z -= p.z * /* ⟨DINAMIS: interpolasi JS⟩ */ * c.w; return c; }

  void main() {
    vUv = uv; vS = aS;
    vec4 c0 = headClip(headPlace(position.xy, 3.0));   // (her face lights ride her turning head)
    vec4 c1 = headClip(headPlace(position.xy + aDir.xy, 3.0));
    vec2 dv = (c1.xy / c1.w - c0.xy / c0.w) * uRes;
    float l = length(dv);
    vec2 dir = l > 1e-5 ? dv / l : vec2(1.0, 0.0);
    c0.xy += vec2(-dir.y, dir.x) * uv.y * uHalfPx * 2.0 / uRes * c0.w;
    gl_Position = c0;
  }
