// ==== recon shader mira #73 — variabel bundle: qw ====
// sumber: mira.js offset 1143817 | 344 byte hasil rekonstruksi
// jenis: vert | operand: 1 | ada bagian DINAMIS: False
// DISALIN VERBATIM (escape JS sudah di-decode) — jangan dirapikan (aturan main #3)


  attribute float aU; attribute float aW; attribute float aT; attribute vec3 aCol; attribute float aStr;
  varying float vU; varying float vW; varying float vT; varying vec3 vCol; varying float vStr;
  void main() { vU = aU; vW = aW; vT = aT; vCol = aCol; vStr = aStr; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
