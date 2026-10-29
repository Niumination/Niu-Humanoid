// ==== recon shader mira #58 — variabel bundle: rF ====
// sumber: mira.js offset 1149864 | 633 byte hasil rekonstruksi
// jenis: frag | operand: 1 | ada bagian DINAMIS: False
// DISALIN VERBATIM (escape JS sudah di-decode) — jangan dirapikan (aturan main #3)


  precision highp float;
  uniform float uHead, uTail, uLen, uCorePx, uHalfPx, uSoft, uOn; uniform vec3 uCol;
  varying vec2 vUv; varying float vS;
  void main() {
    float d = uHead - vS;
    float pulse = (d > 0.0 && d < uTail) ? 1.0 - d / uTail : 0.0;
    pulse *= pulse;
    float ends = smoothstep(0.0, 20.0, vS) * smoothstep(0.0, 20.0, uLen - vS);
    float px = abs(vUv.y) * uHalfPx;
    float wire = exp(-pow(px / uCorePx, 2.0));
    float halo = exp(-pow(px / max(0.5, uSoft), 2.0)) * 0.30;
    vec3 c = mix(uCol, vec3(1.0, 0.94, 1.0), 0.5) * 2.0;
    gl_FragColor = vec4(c * (wire + halo) * pulse * ends * uOn, 1.0);
  }
