// ==== recon shader apex #01 — variabel bundle: aU ====
// sumber: apex.js offset 1031767 | 8504 byte hasil rekonstruksi
// jenis: vert | operand: 1 | ada bagian DINAMIS: False
// DISALIN VERBATIM (escape JS sudah di-decode) — jangan dirapikan (aturan main #3)


  attribute float aWeight;
  attribute float aKind;        // 0 front · 1 back shell · 3 boiler mote · 5 interior head dust
  attribute float aSize;        // dot scale (2 = coarse halo particles); patch scales with it
  attribute vec4 aBoil;         // (nx*amp, ny*amp, phase, rate) — outward normal length = amplitude
  attribute vec4 aBright;       // raw brightness per state (guard + role thresholds only now)
  attribute vec4 aBucket;       // palette bucket per state — ROLE derivation (vein/fire), not colour
  attribute float aNx;          // revolve-normal x (head lighting; 0 = flat/unshaded)
  uniform float uYaw, uPitch, uBreathe, uBreathY, uBackK, uVein, uSize, uPixelRatio;
  uniform float uBoilT, uVeinT, uWaveT, uBoilAmp, uPivotY;
  uniform float uStateA, uStateB, uBloomR;   // blend: A everywhere, B inside the growing face halo
  uniform float uStrongMix, uEnergy, uRim;
  uniform vec2 uAttn;
  uniform vec4 uClick;          // x,y = click origin (rest space) · z = light strength · w = age s
  uniform vec3 uPalCyan, uPalPale;
  varying vec2 vUv;
  varying vec3 vTint;
  varying float vAlpha, vMixK, vFlat, vPatch;

  float rawOf(vec4 b, float s) {
    float base = s < 0.5 ? b.x : (s < 1.5 ? b.y : b.z);
    return s > 1.5 ? mix(b.z, b.w, uStrongMix) : base;
  }
  float bucketOf(vec4 u2, float s) {
    float base = s < 0.5 ? u2.x : (s < 1.5 ? u2.y : u2.z);
    return (s > 1.5 && uStrongMix > 0.5) ? u2.w : base;
  }

  void main() {
    vec3 p = position;
    float py = (1.0 - position.y) * 0.5;    // plate-space y (0 top .. 1 bottom)
    bool front = aKind < 0.5;
    bool back  = aKind > 0.5 && aKind < 1.5;
    bool boil  = aKind > 2.5 && aKind < 3.5;
    bool dust  = aKind > 4.5;

    // the tile address: this particle's REST location in the plate (stagger and all)
    vUv = vec2((position.x + 1.0) * 0.5, (1.0 - position.y) * 0.5);
    // THE TEAR COVER (round 4): rotation stretches the projected spacing between stroke rows -
    // at rest-size the tiles separate and the tilted crown showed black gaps between strokes.
    // Tiles on the turning head grow WITH the turn (size AND sampled footprint together, so
    // they fill the gaps with real neighbouring artwork, not a zoom).
    float turnK = smoothstep(0.05, 0.45, abs(uYaw) + abs(uPitch)) * aWeight;
    float cover = 1.0 + turnK * 0.9;
    vPatch = aSize * cover;
    vTint = vec3(1.0);
    vAlpha = 1.0;
    vFlat = 0.0;
    // THE FLAT SPRAY SHEET HIDES AT A TURN (round 22): the still dust around the head lives at
    // z=0 - a flat plane glued to the head - so at a hard turn the far side's dust swept ACROSS
    // the visible face. Ruben: better to remove them at such angles. They fade with the turn
    // and return as the head faces front. Head-rim motes ease down too, more gently.
    if (front && abs(position.z) < 0.012 && aWeight > 0.25) {
      vAlpha *= 1.0 - turnK * 0.9;
    }

    // ── STATE BLEND MASK — rest-space radial from the face core (the approved bloom's profile)
    float dFace = distance(position.xy, vec2(0.0, 0.14));
    vMixK = 1.0 - smoothstep(uBloomR - 0.52, uBloomR + 0.208, dFace);
    float bucketNow = vMixK < 0.5 ? bucketOf(aBucket, uStateA) : bucketOf(aBucket, uStateB);
    float rawNow = mix(rawOf(aBright, uStateA), rawOf(aBright, uStateB), vMixK);
    // the halo's edge brightens gently, exactly like the 2D bloom's ring pass
    if (uBloomR < 5.0) {
      float ringM = 1.0 - smoothstep(0.0, 0.30, abs(dFace - uBloomR));
      vTint *= 1.0 + 0.20 * ringM;
    }

    // ── EDGE BOIL — rest space, so the mote rides every later transform. Escape-and-return.
    if (boil) {
      float cyc = aBoil.z + uBoilT * aBoil.w;
      float exc = sin(3.14159265 * fract(cyc));
      vec2 nrm = aBoil.xy;
      vec2 tang = vec2(-nrm.y, nrm.x);
      float wob = sin(cyc * 25.7) * 0.18;
      p.xy += (nrm * exc + tang * (wob * exc)) * uBoilAmp;
      vAlpha = (0.14 + 0.52 * exc) * (1.0 - turnK * 0.55);
      vFlat = 1.0;
      vTint = (aBucket.x > 0.5 ? uPalPale : uPalCyan) * 0.78;
    }
    if (dust) {
      vFlat = 1.0;
      vTint = (aBucket.x > 0.5 ? uPalPale : uPalCyan) * 0.12;
    }

    // ── THE CLICK, residual matter lean — 20% of the old pinch; the real effect is LIGHT below
    vec2 toP = uClick.xy - position.xy;
    float dP = length(toP);
    if (uClick.z > 0.001) {
      p.xy += (toP / max(dP, 0.0001)) * uClick.z * exp(-dP * dP * 6.0) * 0.01;
    }

    // whole-body counter-lean
    float bodyYaw = uYaw * 0.09;
    float cb = cos(bodyYaw), sb = sin(bodyYaw);
    p = vec3(p.x * cb + p.z * sb, p.y, -p.x * sb + p.z * cb);

    // head turnover about the SILHOUETTE-DERIVED neck pivot, weighted so the neck flexes smoothly
    if (aWeight > 0.001) {
      vec3 h = p - vec3(0.0, uPivotY, 0.04);
      float cy = cos(uYaw), sy = sin(uYaw);
      float cp = cos(uPitch), sp = sin(uPitch);
      vec3 r = vec3(h.x * cy + h.z * sy, h.y, -h.x * sy + h.z * cy);
      r = vec3(r.x, r.y * cp - r.z * sp, r.y * sp + r.z * cp);
      p += (r - h) * aWeight;
    }

    // BREATHING — chest expansion anchored at the bottom crop; the head barely moves
    p.y += uBreathY * (1.0 - aWeight) * smoothstep(-1.0, -0.55, position.y);
    p *= uBreathe;

    // ── THE SPEAKING WAVE — the 110-strip face deform, ported exactly; rides the blend mask in
    float spkA = (uStateA > 1.5) ? 1.0 : 0.0;
    float spkB = (uStateB > 1.5) ? 1.0 : 0.0;
    float spkMix = mix(spkA, spkB, vMixK);
    if (spkMix > 0.001) {
      float band = exp(-pow((py - 0.43) / 0.155, 2.0));
      float wv = sin(uWaveT * 9.2 + py * 50.6) * sin(uWaveT * 3.7 + py * 20.9);
      p.x += wv * uEnergy * band * spkMix * 0.034;
    }

    // ── DERIVED ROLES — multipliers CENTRED ON 1.0: the artwork is the baseline, the living
    //    layer breathes around it (never below it — the 2D added its vein overlay on top too).
    if (front && bucketNow > 1.5) {
      if (py > 0.56 && rawNow > 0.33) {
        float yn = clamp((position.y + 1.0) * 0.62, 0.0, 1.0);
        float phv = yn + abs(position.x) * 0.35;
        float dW = abs(fract(phv - uVeinT + 0.5) - 0.5);
        float pulse = smoothstep(0.22, 0.0, dW);
        float near = 1.0 + 0.9 * (1.0 - smoothstep(0.0, 0.22, distance(p.xy, uAttn)));
        vTint *= uVein * (1.0 + 0.5 * pulse) * near;
      } else if (py <= 0.56) {
        vTint *= 0.95 + 0.09 * sin(6.2831853 * (uVeinT * 0.5 + position.y));
      }
    }

    // ── THE TURNED HEAD IS A LIT FORM — matter rotating away dims; grazing particles boost into
    //    the profile line. Gated by the TURN AMOUNT (pitch counts too - round 4: Ruben's
    //    tilts are pitch-heavy and got no shading before; the normal math stays yaw-based,
    //    pitch contributes the gate). The rest view is untouched by construction.
    float effK = smoothstep(0.06, 0.30, abs(uYaw) + abs(uPitch) * 1.2) * aWeight;
    if (effK > 0.001 && !boil && !dust) {
      float nnx = aNx;
      float nnz = sqrt(max(0.0, 1.0 - nnx * nnx));
      if (back) nnz = -nnz;
      float sy2 = sin(uYaw), cy2 = cos(uYaw);
      float nvz = -nnx * sy2 + nnz * cy2;
      float facing = 0.08 + 0.92 * smoothstep(-0.05, 0.45, nvz);   // r22: the far side is a SHADOW, not a smear
      vTint *= mix(1.0, facing, effK);
      float rim = 1.0 - smoothstep(0.04, 0.30, abs(nvz));
      vTint *= 1.0 + rim * effK * uRim;
      // DEPTH FOG (round 20): matter that rotates BEHIND the mid-plane recedes into shade -
      // the second depth cue (facing shades by surface angle, this one by actual distance),
      // which is what makes the turned head read as a VOLUME instead of a bent sheet.
      float zn = clamp(p.z * 1.6, -1.0, 1.0);
      vTint *= mix(1.0, 0.72 + 0.28 * smoothstep(-0.6, 0.6, zn), effK);
    }

    // ── THE LIGHT PULSE — a luminous wavefront expanding from the click through the whole body
    if (uClick.z > 0.001) {
      float wf = 1.0 - smoothstep(0.0, 0.34, abs(dP - 2.6 * uClick.w));
      float isVein = (front && bucketNow > 1.5 && py > 0.56) ? 1.0 : 0.0;
      vTint *= 1.0 + wf * uClick.z * mix(0.9, 2.4, isVein);
    }

    // occlusion gates: back shell + interior dust exist only while the head is turned.
    // The back shell samples its own (shared) tile, dimmed — the mirrored strokes.
    if (back) { vAlpha *= uBackK; vTint *= 0.5; }
    if (dust) vAlpha *= uBackK * (0.55 + 0.45 * clamp(position.z + 0.5, 0.0, 1.0));

    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = uSize * uPixelRatio * aSize * cover;
  }
