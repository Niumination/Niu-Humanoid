// ==== recon shader mira #22 — variabel bundle: NN ====
// sumber: mira.js offset 1079159 | 1338 byte hasil rekonstruksi
// jenis: vert | operand: 1 | ada bagian DINAMIS: True
// DISALIN VERBATIM (escape JS sudah di-decode) — jangan dirapikan (aturan main #3)


  uniform vec4 uCoreT;     // the spark (start, end), the weave (start, end) - s
  uniform vec3 uCore;      // her heart (x, y px), the core's radius (px)
  float coreK(float t) { return smoothstep(uCoreT.x + 0.05, uCoreT.y, t) * (1.0 - 0.6 * smoothstep(uCoreT.z, uCoreT.w, t)); }
  vec2 orbitAt(vec2 seat, float seed, float turns, float t0, float t) {
    vec2 d = seat - uCore.xy;
    float a = atan(d.y, d.x) - 6.2831853 * turns - /* ⟨DINAMIS: interpolasi JS⟩ */ * (t0 - t);
    float lift = smoothstep(t0 - 0.35, t0, t);
    float r = uCore.z * coreK(t) * ((0.2 + 0.7 * sqrt(fract(seed * 7.0))) * (1.0 - lift) + lift) * (1.0 + 0.12 * sin(t * (3.0 + 4.0 * fract(seed * 13.0)) + seed * 40.0));
    return uCore.xy + vec2(cos(a), sin(a)) * r;
  }
  vec2 flightAt(vec2 seat, float seed, float turns, float t0, float u) {
    vec2 s = orbitAt(seat, seed, turns, t0, t0) - uCore.xy, d = seat - uCore.xy;
    float r0 = length(s), r1 = length(d), a0 = atan(s.y, s.x), a1 = atan(d.y, d.x);
    float span = 6.2831853 * turns;
    float da = a1 - a0; da -= 6.2831853 * floor((da - span) / 6.2831853 + 0.5);
    float et = 1.0 - pow(1.0 - u, 2.2), er = u * u * (3.0 - 2.0 * u);
    float r = mix(r0, r1, er) * (1.0 + /* ⟨DINAMIS: interpolasi JS⟩ */ * sin(3.14159265 * u)), a = a0 + da * et;
    return uCore.xy + vec2(cos(a), sin(a)) * r;
  }
