
  attribute vec2 aOff;
  attribute float aPh, aSp, aSz, aBr;
  uniform float uT, uStr, uSizeK, uPixelRatio;
  varying float vA;
  varying vec3 vC;
  void main() {
    // ESCAPE-AND-RETURN, the same species as the edge boil (round 8: an in-place wobble made
    // the pace change - and the click x2.5 - invisible; the edge's outward flights read it).
    // Each mote leaps from the cluster along its own radial and falls back; alpha follows the
    // flight so sparks brighten as they fly.
    float cyc = aPh * 0.159155 + uT * aSp * 0.22;
    float exc = sin(3.14159265 * fract(cyc));
    vec2 dir = aOff / max(length(aOff), 0.0005);
    vec2 tang = vec2(-dir.y, dir.x);
    float wob = sin(cyc * 25.7) * 0.18;
    float amp = 0.02 + 0.05 * fract(aPh * 7.0);
    vec2 pos2 = aOff + (dir * exc + tang * (wob * exc)) * amp;
    vec3 p = vec3(pos2, 0.0) + vec3(0.0, -0.88, 0.45);
    vA = uStr * (0.25 + 0.75 * exc) * (aBr > 0.5 ? 1.2 : 0.75);
    vC = aBr > 0.5 ? vec3(0.68, 0.96, 1.0) : vec3(0.0097, 0.724, 1.0);
    gl_Position = vec4(p.xy, 0.0, 1.0);  // ADAPTASI: ortho [-1,1] + modelView identitas ⇒ NDC = p.xy
    gl_PointSize = max(1.0, aSz * uSizeK * uPixelRatio);
  }
