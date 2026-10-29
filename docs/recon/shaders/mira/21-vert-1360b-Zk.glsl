// ==== recon shader mira #21 — variabel bundle: Zk ====
// sumber: mira.js offset 1139418 | 1360 byte hasil rekonstruksi
// jenis: vert | operand: 5 | ada bagian DINAMIS: True
// DISALIN VERBATIM (escape JS sudah di-decode) — jangan dirapikan (aturan main #3)


  attribute vec3 aDir; attribute float aT; attribute vec3 aCol; attribute float aS; attribute float aLen; attribute float aId; attribute float aSketch; attribute float aEnd; attribute float aF;
  uniform vec2 uRes; uniform float uHalfPx; uniform float uTime;
  varying vec2 vUv; varying float vT; varying vec3 vCol; varying float vS; varying float vLen; varying float vId; varying float vSketch; varying float vEnd; varying vec2 vPos; varying float vF;

  vec4 headClip(vec3 p) { vec4 c = projectionMatrix * modelViewMatrix * vec4(p.xy, 0.0, 1.0); c.z -= p.z * /* ⟨DINAMIS: interpolasi JS⟩ */ * c.w; return c; }

  void main() {
    vUv = uv; vT = aT; vCol = aCol; vS = aS; vLen = aLen; vId = aId; vSketch = aSketch; vEnd = aEnd; vPos = position.xy; vF = aF;
    vec3 at = position;
    at.xy += faceMove(position.xy);                 // her face moves with her voice (lib/miraFace)
    // her head turns (lib/figureHead3d): the line rides her head's surface, a hair toward you; what turns behind her head
    // is hidden by it
    vec4 c0 = headClip(headPlace(at.xy, 3.0));
    vec4 c1 = headClip(headPlace(at.xy + aDir.xy, 3.0));
    vec2 dv = (c1.xy / c1.w - c0.xy / c0.w) * uRes;
    float l = length(dv);
    vec2 dir = l > 1e-5 ? dv / l : vec2(1.0, 0.0);
    c0.xy += vec2(-dir.y, dir.x) * uv.y * uHalfPx * 2.0 / uRes * c0.w;
    gl_Position = c0;
  }
