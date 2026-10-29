// ==== recon shader mira #03 — variabel bundle: Jk ====
// sumber: mira.js offset 1145102 | 5061 byte hasil rekonstruksi
// jenis: vert | operand: 7 | ada bagian DINAMIS: True
// DISALIN VERBATIM (escape JS sudah di-decode) — jangan dirapikan (aturan main #3)


  attribute vec3 aCol; attribute float aTArr; attribute float aFly; attribute float aTurns; attribute float aSeed; attribute float aStay; attribute float aTRev;
  uniform float uTime, uPx, uSettle, uLiveT, uBright, uMatter, uCoreA, uLag, uTrail, uDense;
  varying vec3 vCol; varying float vA; varying float vMove;

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

  uniform vec4 uShock;     // where it started (x, y px), the wave's radius (px), its strength
  uniform float uShockW;   // the width of its band of light (px): her ignition's front is thin, a touch's is broad
  // the light of the wave's front where it crosses p
  float shockAt(vec2 p) { float d = length(p - uShock.xy) - uShock.z; float w = uShockW + 0.02 * uShock.z; return uShock.w * exp(-d * d / (w * w)); }

  vec4 headClip(vec3 p) { vec4 c = projectionMatrix * modelViewMatrix * vec4(p.xy, 0.0, 1.0); c.z -= p.z * /* ⟨DINAMIS: interpolasi JS⟩ */ * c.w; return c; }

  void main() {
    // (a TRAIL copy draws the same matter a moment earlier - uLag - fainter, only in flight: light streaks behind it)
    float tm = uTime - uLag;
    float t0 = aTArr - aFly, u = clamp((tm - t0) / aFly, 0.0, 1.0);
    bool waiting = tm < t0;
    bool landed = tm >= aTArr;
    vec2 seat = position.xy;
    vec2 xy = waiting ? orbitAt(seat, aSeed, aTurns, t0, tm) : (landed ? seat : flightAt(seat, aSeed, aTurns, t0, u));
    float on = landed ? 1.0 : 0.0;
    xy += faceMove(xy) * on;                        // (once it sits on her face, it moves with it)
    // a wave of current (her ignition's, or a touch's - lib/miraBuild touchWave) makes the specks it crosses jump and
    // flare
    float sh = on * shockAt(xy);
    xy += normalize(xy - uShock.xy + vec2(1e-3, 0.0)) * sh * 6.0;
    vec2 local = xy;                                // (where it sits on her, before her head turns it)
    vec3 hp = mix(vec3(xy, 0.0), headPlace(xy, 2.0), on);   // her head turns (lib/figureHead3d)
    gl_Position = headClip(hp);
    float tw = 0.65 + 0.35 * sin(uLiveT * (1.0 + aSeed * 1.6) + aSeed * 20.0);   // (her pace clock)
    float flight = (waiting || landed) ? 0.0 : 1.0;
    float land = landed ? exp(-(tm - aTArr) * 14.0) : 0.0;             // a small flash where it lands
    // (a seat holds her shape until her ignition's wave reaches it, then melts into her picture - lib/miraBuild revealAt)
    float melt = aStay > 0.5 ? 1.0 : 1.0 - smoothstep(aTRev, aTRev + 0.35, tm);
    vMove = flight * sin(3.14159265 * u) + land;
    // (in the core each particle is small and dim, so thousands of them read as boiling plasma, not a blob - and the
    // more of them there are, the less light each one carries: uDense)
    float settled = mix(1.0, uSettle * tw, smoothstep(aTArr, aTArr + 0.6, tm));
    float held = mix(1.0, 0.8 * tw, smoothstep(aTArr, aTArr + 0.6, tm)) * melt;   // (twinkling softly while it holds her shape)
    vA = waiting ? uCoreA * uDense * coreK(tm) : (landed ? (aStay > 0.5 ? settled : held) : 0.9 * sqrt(uDense));
    if (uLag > 0.0 && flight < 0.5) vA = 0.0;
    vA *= uTrail;
    gl_PointSize = uPx * (waiting ? 1.1 : (1.2 + 1.0 * vMove)) * (0.7 + aSeed * 0.6) * (uLag > 0.0 ? 0.8 : 1.0);
    // hot violet-white the instant it leaves the core, its own colour on the way, brighter in flight
    vec3 hot = vec3(0.92, 0.82, 1.0);
    vCol = waiting ? mix(hot, aCol, 0.4) : mix(hot, aCol, smoothstep(0.0, 0.2, u)) * (1.1 + 0.9 * flight * uMatter) + vec3(1.0, 0.95, 1.0) * land * 1.5;
    // the dust on her face catches the glow in its front while she speaks (lib/miraFace)
    vCol += faceColor(local) * faceGlow(local) * 1.4 * on;
    vCol += vec3(0.9, 0.75, 1.0) * sh * 1.6;
    vCol *= mix(1.0, uBright, on);                  // brighter while she talks or listens (lib/miraPace)
  }
