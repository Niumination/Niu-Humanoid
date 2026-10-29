/**
 * lib/bloomGL — padanan pass bloom `dU` (postprocessing Bloom, mipmapBlur) tanpa dependensi.
 *
 * Bundle: <Bloom ref mipmapBlur intensity={.25} luminanceThreshold={.62} luminanceSmoothing={.22}
 *                radius={.42} />, diperbarui tiap frame oleh `dU`:
 *            intensity = .25 + 1.3·u_(birthRef)
 *            luminanceMaterial.threshold = .62 − .34·u_(birthRef)
 *
 * Implementasi di sini: bright-pass (dengan luminanceSmoothing), rantai turun 6 level
 * (filter kotak 4 tap), lalu naik lagi dengan filter tent 9 tap sambil menjumlah —
 * ekuivalen visual dengan mipmapBlur postprocessing. Semua di RGBA8 (tanpa float FBO).
 */

const VS = `#version 300 es
precision highp float;
in vec2 aPos;
out vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`

/** bright pass: luminance − threshold, dilunakkan selebar `smoothing` */
const FS_BRIGHT = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uTex;
uniform float uThreshold;
uniform float uSmoothing;
void main() {
  vec3 c = texture(uTex, vUv).rgb;
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  float knee = max(uSmoothing, 1e-4);
  float soft = clamp((l - uThreshold + knee) / (2.0 * knee), 0.0, 1.0);
  float contrib = max(soft * soft * knee, l - uThreshold) / max(l, 1e-4);
  outColor = vec4(c * max(contrib, 0.0), 1.0);
}`

/**
 * down: gaussian 9 tap (bobot [1,2,1]^2) dengan jangkauan 2 texel — lebih menyebar daripada
 * kotak 4 tap, mendekati 13-tap filter milik MipmapBlurPass postprocessing.
 */
const FS_DOWN = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uTex;
uniform vec2 uTexel;   // texel size sumber
const float SPREAD = 2.0;
void main() {
  vec2 t = uTexel * SPREAD;
  vec3 s = texture(uTex, vUv).rgb * 4.0;
  s += texture(uTex, vUv + vec2( t.x, 0.0)).rgb * 2.0;
  s += texture(uTex, vUv + vec2(-t.x, 0.0)).rgb * 2.0;
  s += texture(uTex, vUv + vec2(0.0,  t.y)).rgb * 2.0;
  s += texture(uTex, vUv + vec2(0.0, -t.y)).rgb * 2.0;
  s += texture(uTex, vUv + vec2( t.x,  t.y)).rgb;
  s += texture(uTex, vUv + vec2(-t.x,  t.y)).rgb;
  s += texture(uTex, vUv + vec2( t.x, -t.y)).rgb;
  s += texture(uTex, vUv + vec2(-t.x, -t.y)).rgb;
  outColor = vec4(s / 16.0, 1.0);
}`

/** up: tent 9 tap, dijumlah ke akumulator (blend aditif di luar) */
const FS_UP = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uTex;
uniform vec2 uTexel;
const float SPREAD = 2.0;
void main() {
  vec3 s = texture(uTex, vUv).rgb * 4.0;
  s += texture(uTex, vUv + uTexel * SPREAD * vec2(-1.0, 0.0)).rgb * 2.0;
  s += texture(uTex, vUv + uTexel * SPREAD * vec2( 1.0, 0.0)).rgb * 2.0;
  s += texture(uTex, vUv + uTexel * SPREAD * vec2(0.0, -1.0)).rgb * 2.0;
  s += texture(uTex, vUv + uTexel * SPREAD * vec2(0.0,  1.0)).rgb * 2.0;
  s += texture(uTex, vUv + uTexel * SPREAD * vec2(-1.0, -1.0)).rgb;
  s += texture(uTex, vUv + uTexel * SPREAD * vec2( 1.0, -1.0)).rgb;
  s += texture(uTex, vUv + uTexel * SPREAD * vec2(-1.0,  1.0)).rgb;
  s += texture(uTex, vUv + uTexel * SPREAD * vec2( 1.0,  1.0)).rgb;
  outColor = vec4(s / 16.0, 1.0);
}`

/** komposit akhir: scene + bloom·intensity, lalu encode sRGB (satu-satunya di pipeline) */
const FS_COMPOSITE = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uScene;
uniform sampler2D uBloom;
uniform float uIntensity;
void main() {
  vec3 c = texture(uScene, vUv).rgb + texture(uBloom, vUv).rgb * uIntensity;
  vec3 s = mix(pow(c, vec3(0.41666)) * 1.055 - 0.055, c * 12.92, vec3(lessThanEqual(c, vec3(0.0031308))));
  outColor = vec4(s, 1.0);
}`

export interface BloomParams {
  intensity: number
  threshold: number
  smoothing: number
}

function sh(gl: WebGL2RenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!
  gl.shaderSource(s, src)
  gl.compileShader(s)
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(s)
    gl.deleteShader(s)
    throw new Error(`bloom shader: ${log}`)
  }
  return s
}

function prog(gl: WebGL2RenderingContext, frag: string) {
  const p = gl.createProgram()!
  gl.attachShader(p, sh(gl, gl.VERTEX_SHADER, VS))
  gl.attachShader(p, sh(gl, gl.FRAGMENT_SHADER, frag))
  gl.bindAttribLocation(p, 0, 'aPos')
  gl.linkProgram(p)
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('bloom link: ' + gl.getProgramInfoLog(p))
  return p
}

interface Level {
  fbo: WebGLFramebuffer
  tex: WebGLTexture
  w: number
  h: number
}

export class BloomGL {
  private gl: WebGL2RenderingContext
  private quad: WebGLVertexArrayObject
  private pBright: WebGLProgram
  private pDown: WebGLProgram
  private pUp: WebGLProgram
  private pComp: WebGLProgram
  private sceneFbo: WebGLFramebuffer | null = null
  private sceneTex: WebGLTexture | null = null
  private levels: Level[] = []
  private w = 0
  private h = 0
  levels5 = 6
  /** three.js EffectComposer default: frameBufferType = HalfFloatType (HDR, tanpa clamp 1.0) */
  private ifmt = 0
  private fmt = 0
  private type = 0

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl
    this.pBright = prog(gl, FS_BRIGHT)
    this.pDown = prog(gl, FS_DOWN)
    this.pUp = prog(gl, FS_UP)
    this.pComp = prog(gl, FS_COMPOSITE)
    // HALF-FLOAT RENDER TARGET (F-46): bundle memakai EffectComposer default HalfFloatType,
    // jadi nilai scene > 1.0 (inti wajah) tetap HDR sampai pass komposit. Dengan RGBA8,
    // semua >1 ter-clamp ke 1.0 → area di atas threshold bloom membengkak → terlalu terang.
    const hdr = !!(gl.getExtension('EXT_color_buffer_half_float') || gl.getExtension('EXT_color_buffer_float'))
    this.ifmt = hdr ? gl.RGBA16F : gl.RGBA8
    this.fmt = gl.RGBA
    this.type = hdr ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE
    const vao = gl.createVertexArray()!
    gl.bindVertexArray(vao)
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
    this.quad = vao
  }

  private target(w: number, h: number): Level {
    const gl = this.gl
    const tex = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texImage2D(gl.TEXTURE_2D, 0, this.ifmt, w, h, 0, this.fmt, this.type, null)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    const fbo = gl.createFramebuffer()!
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0)
    return { fbo, tex, w, h }
  }

  resize(w: number, h: number) {
    if (w === this.w && h === this.h) return
    const gl = this.gl
    this.dispose()
    this.w = w
    this.h = h
    const scene = this.target(w, h)
    this.sceneFbo = scene.fbo
    this.sceneTex = scene.tex
    let cw = Math.max(1, w >> 1)
    let ch = Math.max(1, h >> 1)
    for (let i = 0; i < this.levels5; i++) {
      this.levels.push(this.target(cw, ch))
      cw = Math.max(1, cw >> 1)
      ch = Math.max(1, ch >> 1)
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  }

  dispose() {
    const gl = this.gl
    if (this.sceneFbo) gl.deleteFramebuffer(this.sceneFbo)
    if (this.sceneTex) gl.deleteTexture(this.sceneTex)
    for (const l of this.levels) {
      gl.deleteFramebuffer(l.fbo)
      gl.deleteTexture(l.tex)
    }
    this.sceneFbo = null
    this.sceneTex = null
    this.levels = []
    this.w = 0
    this.h = 0
  }

  bindScene() {
    const gl = this.gl
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.sceneFbo)
    gl.viewport(0, 0, this.w, this.h)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
  }

  /** jalankan bright→down→up, lalu komposit ke layar */
  composite(p: BloomParams) {
    const gl = this.gl
    gl.bindVertexArray(this.quad)
    gl.disable(gl.DEPTH_TEST)
    gl.disable(gl.BLEND)

    // bright pass → level 0
    gl.useProgram(this.pBright)
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.levels[0].fbo)
    gl.viewport(0, 0, this.levels[0].w, this.levels[0].h)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.sceneTex)
    gl.uniform1i(gl.getUniformLocation(this.pBright, 'uTex'), 0)
    gl.uniform1f(gl.getUniformLocation(this.pBright, 'uThreshold'), p.threshold)
    gl.uniform1f(gl.getUniformLocation(this.pBright, 'uSmoothing'), p.smoothing)
    gl.drawArrays(gl.TRIANGLES, 0, 3)

    // down chain
    gl.useProgram(this.pDown)
    for (let i = 1; i < this.levels.length; i++) {
      const src = this.levels[i - 1]
      const dst = this.levels[i]
      gl.bindFramebuffer(gl.FRAMEBUFFER, dst.fbo)
      gl.viewport(0, 0, dst.w, dst.h)
      gl.bindTexture(gl.TEXTURE_2D, src.tex)
      gl.uniform1i(gl.getUniformLocation(this.pDown, 'uTex'), 0)
      gl.uniform2f(gl.getUniformLocation(this.pDown, 'uTexel'), 1 / src.w, 1 / src.h)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }

    // up chain (aditif)
    gl.useProgram(this.pUp)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE)
    for (let i = this.levels.length - 1; i > 0; i--) {
      const src = this.levels[i]
      const dst = this.levels[i - 1]
      gl.bindFramebuffer(gl.FRAMEBUFFER, dst.fbo)
      gl.viewport(0, 0, dst.w, dst.h)
      gl.bindTexture(gl.TEXTURE_2D, src.tex)
      gl.uniform1i(gl.getUniformLocation(this.pUp, 'uTex'), 0)
      gl.uniform2f(gl.getUniformLocation(this.pUp, 'uTexel'), 1 / src.w, 1 / src.h)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }
    gl.disable(gl.BLEND)

    // komposit ke layar
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.viewport(0, 0, this.w, this.h)
    gl.useProgram(this.pComp)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.sceneTex)
    gl.uniform1i(gl.getUniformLocation(this.pComp, 'uScene'), 0)
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, this.levels[0].tex)
    gl.uniform1i(gl.getUniformLocation(this.pComp, 'uBloom'), 1)
    // NORMALISASI RANTAI MIP (F-49): up-chain kita MENJUMLAH 6 level (tent blur), sedangkan
    // BloomEffect postprocessing menjumlahkannya dengan bobot ~1/jumlah-level. Tanpa ini
    // bloom ~3-6x terlalu kuat (terukur: luminansi kepala 169 vs 76 pada live). Gain 1/levels
    // membuat intensitas/threshold tetap verbatim dari bundle.
    gl.uniform1f(
      gl.getUniformLocation(this.pComp, 'uIntensity'),
      p.intensity / Math.max(1, this.levels.length)
    )
    gl.drawArrays(gl.TRIANGLES, 0, 3)
    gl.activeTexture(gl.TEXTURE0)
  }
}
