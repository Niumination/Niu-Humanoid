
  varying float vA;
  varying vec3 vC;
  void main() {
    float r = length(gl_PointCoord - vec2(0.5));
    if (r > 0.5) discard;
    gl_FragColor = vec4(vC * vA, 1.0);   // additive: rgb adds, alpha slot unused
  }
