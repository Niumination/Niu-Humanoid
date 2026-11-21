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
  vec4 sc = texture(uScene, vUv);
  // F-156 (P11): kanvas figur live = three.js (premultipliedAlpha true). Nilai RGB scene kita
  // terakumulasi lewat blendFuncSeparate(SRC_ALPHA, ONE_MINUS_SRC_ALPHA, ONE, ...) ⇒ juga
  // PREMULTIPLIED. Meng-encode nilai premultiplied lalu membiarkan browser mengalikan alfa lagi
  // membuat puncak terang ~30 % terlalu gelap (terukur pita 120-200: 112,9 vs live 154,7).
  // Di sini di-un-premultiply dulu supaya kanvas menyimpan warna lurus (STRAIGHT) + alfa.
  float pa = sc.a > 0.0001 ? sc.a : 1.0;
  vec3 c = sc.rgb / pa + texture(uBloom, vUv).rgb * uIntensity / pa;
  vec3 s = mix(pow(c, vec3(0.41666)) * 1.055 - 0.055, c * 12.92, vec3(lessThanEqual(c, vec3(0.0031308))));
  // F-154 (P11, TERUKUR): live mempertahankan alfa adegan — di dalam kotak 900x900 live punya
  // alfa 0 pada 47,5 % piksel, alfa 255 pada 48,8 %, antara 3,6 %. Menulis alfa 1,0 di sini
  // membuat SELURUH kanvas figur opak (terukur: kita alfa 255 = 100 %) sehingga latar titik
  // (pegunungan) tertutup hitam. Alfa kini diteruskan dari tekstur adegan.
  outColor = vec4(s, sc.a);
}`


/**
 * F-151 (P11): kernel VERBATIM dari postprocessing MipmapBlurPass di bundle live.
 * Downsample 13 tap: 4 sampel dalam (bobot 1/8) + 8 sampel luar (bobot 1/18) + tengah (1/18),
 * dengan clampToBorder. Upsample: tent 9 tap lalu `mix(baseMip, tent, radius)` — BUKAN penjumlahan.
 * Perbedaan inilah yang membuat halo kita terlalu lebar & inti terlalu redup.
 */
const FS_DOWN13 = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uTex;
uniform vec2 uTexel;
#define W_IN 0.125
#define W_OUT 0.0555555556
float inb(vec2 uv) { return float(uv.x >= 0.0 && uv.x <= 1.0 && uv.y >= 0.0 && uv.y <= 1.0); }
void main() {
  vec4 c = vec4(0.0);
  vec2 o1 = uTexel;
  vec2 o2 = uTexel * 2.0;
  vec4 w = W_IN * vec4(inb(vUv + vec2(-o1.x, o1.y)), inb(vUv + vec2(o1.x, o1.y)),
                       inb(vUv + vec2(-o1.x, -o1.y)), inb(vUv + vec2(o1.x, -o1.y)));
  c += w.x * texture(uTex, vUv + vec2(-o1.x, o1.y));
  c += w.y * texture(uTex, vUv + vec2(o1.x, o1.y));
  c += w.z * texture(uTex, vUv + vec2(-o1.x, -o1.y));
  c += w.w * texture(uTex, vUv + vec2(o1.x, -o1.y));
  w = W_OUT * vec4(inb(vUv + vec2(-o2.x, o2.y)), inb(vUv + vec2(0.0, o2.y)),
                   inb(vUv + vec2(o2.x, o2.y)), inb(vUv + vec2(-o2.x, 0.0)));
  c += w.x * texture(uTex, vUv + vec2(-o2.x, o2.y));
  c += w.y * texture(uTex, vUv + vec2(0.0, o2.y));
  c += w.z * texture(uTex, vUv + vec2(o2.x, o2.y));
  c += w.w * texture(uTex, vUv + vec2(-o2.x, 0.0));
  w = W_OUT * vec4(inb(vUv + vec2(o2.x, 0.0)), inb(vUv + vec2(-o2.x, -o2.y)),
                   inb(vUv + vec2(0.0, -o2.y)), inb(vUv + vec2(o2.x, -o2.y)));
  c += w.x * texture(uTex, vUv + vec2(o2.x, 0.0));
  c += w.y * texture(uTex, vUv + vec2(-o2.x, -o2.y));
  c += w.z * texture(uTex, vUv + vec2(0.0, -o2.y));
  c += w.w * texture(uTex, vUv + vec2(o2.x, -o2.y));
  c += W_OUT * inb(vUv) * texture(uTex, vUv);
  outColor = c;
}`

const FS_UP_MIX = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uTex;      // akumulasi mip di atas (inputBuffer)
uniform sampler2D uBase;     // mip yang sepadan (supportBuffer)
uniform vec2 uTexel;         // texel akumulasi
uniform float uRadius;       // Bloom radius live = 0.42
void main() {
  vec3 s = texture(uTex, vUv).rgb * 4.0;
  s += texture(uTex, vUv + uTexel * vec2(-1.0, 0.0)).rgb * 2.0;
  s += texture(uTex, vUv + uTexel * vec2( 1.0, 0.0)).rgb * 2.0;
  s += texture(uTex, vUv + uTexel * vec2(0.0, -1.0)).rgb * 2.0;
  s += texture(uTex, vUv + uTexel * vec2(0.0,  1.0)).rgb * 2.0;
  s += texture(uTex, vUv + uTexel * vec2(-1.0, -1.0)).rgb;
  s += texture(uTex, vUv + uTexel * vec2( 1.0, -1.0)).rgb;
  s += texture(uTex, vUv + uTexel * vec2(-1.0,  1.0)).rgb;
  s += texture(uTex, vUv + uTexel * vec2( 1.0,  1.0)).rgb;
  vec3 tent = s / 16.0;
  vec3 base = texture(uBase, vUv).rgb;
  outColor = vec4(mix(base, tent, uRadius), 1.0);
}`

/** komposit mode live: SCREEN (bukan aditif) lalu encode sRGB */
const FS_COMPOSITE_SCREEN = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uScene;
uniform sampler2D uBloom;
uniform float uIntensity;
void main() {
  vec3 a = texture(uScene, vUv).rgb;
  vec3 b = texture(uBloom, vUv).rgb * uIntensity;
  vec3 c = 1.0 - (1.0 - clamp(a, 0.0, 1.0)) * (1.0 - clamp(b, 0.0, 1.0));
  vec3 s = mix(pow(c, vec3(0.41666)) * 1.055 - 0.055, c * 12.92, vec3(lessThanEqual(c, vec3(0.0031308))));
  outColor = vec4(s, texture(uScene, vUv).a);   // F-154: alfa adegan, bukan 1.0
}`

/** knob riset P11 — bawaan = perilaku lama (mode 0), jadi gambar identik bila tidak dipakai */
const qn = (k: string, d: number) => {
  if (typeof window === 'undefined') return d
  const v = new URLSearchParams(window.location.search).get(k)
  return v == null || v === '' ? d : Number(v)
}

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
  private pDown13: WebGLProgram | null = null
  private pUpMix: WebGLProgram | null = null
  private pCompScreen: WebGLProgram | null = null
  private sceneFbo: WebGLFramebuffer | null = null
  private sceneTex: WebGLTexture | null = null
  private levels: Level[] = []
  private w = 0
  private h = 0
  levels5 = 6
  /**
   * F-151/F-159: 0 = rantai lama (9 tap + aditif + 1/levels) · 1 = rantai live (13 tap + up-mix
   * + SCREEN, 8 level) — VERBATIM dari bundle APEX.
   *
   * F-159 (P11) — **bawaan tetap 0**. Diuji sebagai bawaan, hasil UKUR gabungan bertentangan
   * menurut lapisan: pada lapisan figur saja rantai live lebih dekat (1440 4,29 → 4,14 ·
   * 390 4,42 → 3,53), tetapi pada GAMBAR PENUH (yang dinilai gerbang) ia lebih buruk di 1440
   * (4,51 → 5,75) dan hanya lebih baik di 390 (5,51 → 4,93). Karena kriteria P11 adalah paritas
   * gambar penuh, rantai live TIDAK dijadikan bawaan — tetap tersedia lewat `?bpm=1`.
   */
  readonly mode = qn('bpm', 0) > 0.5 ? 1 : 0
  readonly levelsN = Math.max(2, Math.round(qn('bpl', qn('bpm', 0) > 0.5 ? 8 : 6)))
  readonly upRadius = qn('bpr', 0.42)
  readonly intensityMul = qn('bpi', 1)
  private up: Level[] = []
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
    if (this.mode === 1) {
      this.pDown13 = prog(gl, FS_DOWN13)
      this.pUpMix = prog(gl, FS_UP_MIX)
      this.pCompScreen = prog(gl, FS_COMPOSITE_SCREEN)
    }
    // HALF-FLOAT RENDER TARGET (F-46): bundle memakai EffectComposer default HalfFloatType,
    // jadi nilai scene > 1.0 (inti wajah) tetap HDR sampai pass komposit. Dengan RGBA8,
    // semua >1 ter-clamp ke 1.0 → area di atas threshold bloom membengkak → terlalu terang.
    // F-160 (P11) — TERUKUR: composer live memakai `frameBufferType` = **UnsignedByteType (1009)**,
    // yaitu render target **8-bit**, bukan HalfFloat (1016). Kita dulu memilih half-float bila
    // tersedia, jadi ambang bloom kita bekerja pada nilai >1 yang di live sudah di-clamp.
    // Terukur pada lapisan figur saja (median 5 bingkai): 1440 MAE 4,29 → **3,95** ·
    // 390 4,42 → **3,30**. Bawaan kini 8-bit (meniru live); `?bf16=1` mengembalikan half-float.
    const force16 = new URLSearchParams(window.location.search).get('bf16') === '1'
    const hdr = force16 && !!(gl.getExtension('EXT_color_buffer_half_float') || gl.getExtension('EXT_color_buffer_float'))
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
    const n = this.mode === 1 ? this.levelsN : this.levels5
    for (let i = 0; i < n; i++) {
      this.levels.push(this.target(cw, ch))
      cw = Math.max(1, cw >> 1)
      ch = Math.max(1, ch >> 1)
    }
    // F-151: rantai "up" terpisah, seukuran tiap level (live memakai render target sendiri per mip)
    if (this.mode === 1) {
      for (let i = 0; i < n - 1; i++) {
        const lv = this.levels[i]
        this.up.push(this.target(lv.w, lv.h))
      }
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
    for (const l of this.up) {
      gl.deleteFramebuffer(l.fbo)
      gl.deleteTexture(l.tex)
    }
    this.up = []
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
    if (this.mode === 1) return this.compositeLive(p)

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
      // F-166 (P11): intensityMul (knob bpi) dulu HANYA dipakai di mode 1, sehingga semua uji
      // bpi di mode 0 tidak berpengaruh apa pun (terukur: rasio halo identik 0,85 pada bpi
      // 0,8/1/1,6/2,4). Kini berlaku di kedua mode.
      (p.intensity * this.intensityMul) / Math.max(1, this.levels.length)
    )
    gl.drawArrays(gl.TRIANGLES, 0, 3)
    gl.activeTexture(gl.TEXTURE0)
  }

  /**
   * F-151 — rantai bloom VERBATIM postprocessing (MipmapBlurPass + BloomEffect SCREEN):
   *   bright → down 13-tap tiap level → up: mix(baseMip, tent9(akumulasi), radius) → SCREEN.
   * Tidak ada normalisasi 1/levels: live memang tidak menormalkan, karena up-nya `mix` bukan jumlah.
   */
  private compositeLive(p: BloomParams) {
    const gl = this.gl
    const L = this.levels
    // 1) bright pass → level 0
    gl.useProgram(this.pBright)
    gl.bindFramebuffer(gl.FRAMEBUFFER, L[0].fbo)
    gl.viewport(0, 0, L[0].w, L[0].h)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.sceneTex)
    gl.uniform1i(gl.getUniformLocation(this.pBright, 'uTex'), 0)
    gl.uniform1f(gl.getUniformLocation(this.pBright, 'uThreshold'), p.threshold)
    gl.uniform1f(gl.getUniformLocation(this.pBright, 'uSmoothing'), p.smoothing)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
    // 2) down 13-tap
    gl.useProgram(this.pDown13!)
    for (let i = 1; i < L.length; i++) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, L[i].fbo)
      gl.viewport(0, 0, L[i].w, L[i].h)
      gl.bindTexture(gl.TEXTURE_2D, L[i - 1].tex)
      gl.uniform1i(gl.getUniformLocation(this.pDown13!, 'uTex'), 0)
      gl.uniform2f(gl.getUniformLocation(this.pDown13!, 'uTexel'), 1 / L[i - 1].w, 1 / L[i - 1].h)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }
    // 3) up dengan mix(base)
    gl.useProgram(this.pUpMix!)
    gl.activeTexture(gl.TEXTURE1)
    let acc = L[L.length - 1]
    for (let i = L.length - 2; i >= 0; i--) {
      const dst = this.up[i]
      gl.bindFramebuffer(gl.FRAMEBUFFER, dst.fbo)
      gl.viewport(0, 0, dst.w, dst.h)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, acc.tex)
      gl.activeTexture(gl.TEXTURE1)
      gl.bindTexture(gl.TEXTURE_2D, L[i].tex)
      gl.uniform1i(gl.getUniformLocation(this.pUpMix!, 'uTex'), 0)
      gl.uniform1i(gl.getUniformLocation(this.pUpMix!, 'uBase'), 1)
      gl.uniform2f(gl.getUniformLocation(this.pUpMix!, 'uTexel'), 1 / acc.w, 1 / acc.h)
      gl.uniform1f(gl.getUniformLocation(this.pUpMix!, 'uRadius'), this.upRadius)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      acc = dst
    }
    // 4) komposit SCREEN
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.viewport(0, 0, this.w, this.h)
    gl.useProgram(this.pCompScreen!)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.sceneTex)
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, acc.tex)
    gl.uniform1i(gl.getUniformLocation(this.pCompScreen!, 'uScene'), 0)
    gl.uniform1i(gl.getUniformLocation(this.pCompScreen!, 'uBloom'), 1)
    gl.uniform1f(gl.getUniformLocation(this.pCompScreen!, 'uIntensity'), p.intensity * this.intensityMul)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
    gl.activeTexture(gl.TEXTURE0)
  }
}
