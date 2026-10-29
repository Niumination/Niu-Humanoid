// ==== recon shader mira #24 — variabel bundle: fF ====
// sumber: mira.js offset 1153975 | 1258 byte hasil rekonstruksi
// jenis: vert | operand: 5 | ada bagian DINAMIS: True
// DISALIN VERBATIM (escape JS sudah di-decode) — jangan dirapikan (aturan main #3)


  attribute vec2 aRest; attribute float aKind; attribute float aZ;
  uniform float uStep, uPxPerPic, uBackK, uRim, uOn, uZRef;
  varying vec2 vRest; varying float vPatch; varying vec3 vTint; varying float vKind; varying float vShow;

  vec4 headClip(vec3 p) { vec4 c = projectionMatrix * modelViewMatrix * vec4(p.xy, 0.0, 1.0); c.z -= p.z * /* ⟨DINAMIS: interpolasi JS⟩ */ * c.w; return c; }

  void main() {
    vRest = aRest; vKind = aKind; vTint = vec3(1.0); vShow = uOn;
    vec4 hi = headInfo(aRest);
    bool back = aKind > 0.5 && aKind < 1.5;
    bool dust = aKind > 4.5;
    float z = back ? -hi.x * 0.85 : (dust ? aZ * hi.x : hi.x);
    vec3 p = headTurn(vec3(aRest + faceMove(aRest), z), hi.y);
    float cover = headCover(headTurnK(uHeadPose.x, uHeadPose.y) * hi.y);          // (shared with Apex - lib/figureHead3d)
    float effK = headShadeK(uHeadPose.x, uHeadPose.y) * hi.y * hi.w;
    if (effK > 0.001 && !dust) vTint = headShade(vTint, hi.z, back ? 1.0 : 0.0, uHeadPose.x, effK, uRim, p.z / max(1.0, uZRef) * 1.6);
    if (back) { vShow *= step(0.01, uBackK); vTint *= 0.5; }
    if (dust) vShow *= step(0.01, uBackK);
    gl_Position = headClip(p);
    gl_PointSize = uStep * 2.0 * cover * uPxPerPic;
    vPatch = uStep * 2.0 * cover;
  }
