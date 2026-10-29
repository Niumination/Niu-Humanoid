/**
 * Figure — port `pU` + `hU` + `fU` + `dU` dari bundle APEX (figur point-cloud GPU).
 *
 * Bundle (terukur, F-45):
 *   <Canvas orthographic camera={[-1,1,1,-1], z=3} dpr=[1,1.75] gl={alpha,antialias:false}>
 *     hU → figur ±279 rb titik, shader aU/lU, blending NORMAL, 8 atribut
 *     fU → 240 mote inti, shader uU/cU, blending ADITIF
 *     tU → EffectComposer(multisampling 0) > dU = BloomEffect(mipmapBlur, levels 6)
 *   </Canvas>  style: absolute inset 0, opacity 140ms, pointerEvents none, TANPA mix-blend-mode
 *
 * Dua adaptasi port (didokumentasikan, bukan perubahan perilaku):
 *   1. `gl_Position = projectionMatrix*modelViewMatrix*vec4(p,1)` → `vec4(p.xy,0,1)`
 *      (kamera ortografis [-1,1] + modelView identitas ⇒ NDC = p.xy). Lihat aU.glsl / uU.glsl.
 *   2. Bloom postprocessing (UnrealBloom-style mipmapBlur) → `lib/bloomGL.ts` (WebGL2 murni,
 *      bright→down→up→komposit, 6 level, intensitas/threshold/smoothing sama).
 */
import { useEffect, useRef, useState } from 'react'
import rawA from '../lib/shaders/aU.glsl?raw'
import rawL from '../lib/shaders/lU.glsl?raw'
import rawU from '../lib/shaders/uU.glsl?raw'
import rawC from '../lib/shaders/cU.glsl?raw'
import { BloomGL } from '../lib/bloomGL'
import { buildFig, type Fig } from '../lib/fig'
import { loadAssets } from '../lib/assets'
import { buildVeinCanvas } from '../lib/veins'
import { numHook } from '../lib/hooks'
import { smoothstep01 } from '../lib/birth'

/** s1() — state → indeks blend (0 idle · 1 thinking · 2 speaking) */
const stateIndex = (s: string) => {
  const e = String(s || '')
  return e.includes('speak') ? 2 : e.includes('think') || e.includes('process') ? 1 : 0
}
/** o1() — durasi transisi state */
const stateDur = (i: number) => (i === 2 ? 0.7 : i === 0 ? 1.2 : 0.95)
/** bm() — kurva bounce/attention */
const bm = (x: number) => Math.sign(x) * Math.pow(Math.abs(x), 1.6)

/** u_() — surge (detik sejak birthRef, bisa dikunci lewat `__HUM_SURGE`) */
function surgePhase(birthRef: number): number {
  let e = birthRef ? (performance.now() - birthRef) / 1000 : 99
  const hook = numHook('__HUM_SURGE')
  if (hook != null) e = Number(hook)
  return e
}
const surgeOf = (p: number) => (p >= 0 && p < 6.5 ? Math.exp(-p / 1.9) : 0)

const PRECISION = '#version 300 es\nprecision highp float;\nprecision highp int;\n'

function compile(gl: WebGL2RenderingContext, type: number, body: string, prefix = '') {
  const s = gl.createShader(type)!
  gl.shaderSource(
    s,
    PRECISION +
      prefix +
      body.replace(/\battribute\b/g, 'in').replace(/\bvarying\b/g, 'out')
  )
  gl.compileShader(s)
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(s)
    gl.deleteShader(s)
    throw new Error('figure shader: ' + log)
  }
  return s
}

function compileFrag(gl: WebGL2RenderingContext, body: string) {
  const src =
    PRECISION +
    'out vec4 fragColor;\n' +
    body
      .replace(/\battribute\b/g, 'in')
      .replace(/\bvarying\b/g, 'in')
      .replace(/\btexture2D\b/g, 'texture')
      .replace(/\bgl_FragColor\b/g, 'fragColor')
  const s = gl.createShader(gl.FRAGMENT_SHADER)!
  gl.shaderSource(s, src)
  gl.compileShader(s)
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(s)
    gl.deleteShader(s)
    throw new Error('figure frag: ' + log)
  }
  return s
}

function program(gl: WebGL2RenderingContext, vsBody: string, fsBody: string, prefix = '') {
  const p = gl.createProgram()!
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vsBody, prefix))
  gl.attachShader(p, compileFrag(gl, fsBody))
  gl.linkProgram(p)
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('figure link: ' + gl.getProgramInfoLog(p))
  return p
}

/** three.js menyuntik `attribute vec3 position` + uv; kita deklarasikan manual. */
const VERT_PREFIX = 'in vec3 position;\n'

interface AttrSpec {
  name: string
  size: number
  data: ArrayLike<number>
  type: number
  normalized: boolean
}

export function Figure({
  state,
  visible = true,
  birthRef,
  onError,
}: {
  state: string
  visible?: boolean
  birthRef: React.MutableRefObject<number>
  onError?: (msg: string) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [fig, setFig] = useState<Fig | null>(null)
  const stateRef = useRef(state)
  stateRef.current = state

  // --- fig: IU(bU(idle)) — dibangun sekali ---
  useEffect(() => {
    let dead = false
    loadAssets()
      .then((bag) => {
        if (dead) return
        try {
          setFig(buildFig(bag, buildVeinCanvas(bag.idle)))
        } catch (e) {
          onError?.(String(e).slice(0, 200))
        }
      })
      .catch(() => onError?.('assets'))
    return () => {
      dead = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!fig || !canvas) return
    const gl = canvas.getContext('webgl2', { alpha: true, antialias: false, premultipliedAlpha: false })
    if (!gl) {
      onError?.('webgl2 unavailable')
      return
    }

    const progFig = program(gl, rawA, rawL, VERT_PREFIX)
    const progCore = program(gl, rawU, rawC, VERT_PREFIX)

    const setup = (prog: WebGLProgram, list: AttrSpec[]) => {
      const vao = gl.createVertexArray()!
      gl.bindVertexArray(vao)
      for (const a of list) {
        const loc = gl.getAttribLocation(prog, a.name)
        if (loc < 0) continue
        const b = gl.createBuffer()!
        gl.bindBuffer(gl.ARRAY_BUFFER, b)
        gl.bufferData(gl.ARRAY_BUFFER, a.data as Float32Array, gl.STATIC_DRAW)
        gl.enableVertexAttribArray(loc)
        gl.vertexAttribPointer(loc, a.size, a.type, a.normalized, 0, 0)
      }
      return vao
    }

    const vaoFig = setup(progFig, [
      { name: 'position', size: 3, data: fig.pos, type: gl.FLOAT, normalized: false },
      { name: 'aWeight', size: 1, data: fig.w, type: gl.FLOAT, normalized: false },
      { name: 'aKind', size: 1, data: fig.kind, type: gl.UNSIGNED_BYTE, normalized: false },
      { name: 'aSize', size: 1, data: fig.size, type: gl.FLOAT, normalized: false },
      { name: 'aBoil', size: 4, data: fig.boil, type: gl.FLOAT, normalized: false },
      { name: 'aBright', size: 4, data: fig.bright, type: gl.UNSIGNED_BYTE, normalized: true },
      { name: 'aBucket', size: 4, data: fig.bucket, type: gl.UNSIGNED_BYTE, normalized: false },
      { name: 'aNx', size: 1, data: fig.nx, type: gl.FLOAT, normalized: false },
    ])

    // ---- mote inti (fU): 240 titik, seed 424171, aOff ±0.056/±0.048 ----
    let p0 = 424171
    const m0 = () => ((p0 = (p0 * 16807) % 2147483647), (p0 - 1) / 2147483646)
    const g0 = () => (m0() + m0() + m0() - 1.5) / 1.5
    const corePos = new Float32Array(720)
    const coreOff = new Float32Array(480)
    const corePh = new Float32Array(240)
    const coreSp = new Float32Array(240)
    const coreSz = new Float32Array(240)
    const coreBr = new Float32Array(240)
    for (let b = 0; b < 240; b++) {
      coreOff[b * 2] = g0() * 0.056
      coreOff[b * 2 + 1] = g0() * 0.048
      corePh[b] = m0() * Math.PI * 2
      coreSp[b] = 0.6 + m0() * 1.8
      coreSz[b] = 0.7 + m0() * 1.4
      coreBr[b] = m0() < 0.2 ? 1 : 0
    }
    const vaoCore = setup(progCore, [
      { name: 'position', size: 3, data: corePos, type: gl.FLOAT, normalized: false },
      { name: 'aOff', size: 2, data: coreOff, type: gl.FLOAT, normalized: false },
      { name: 'aPh', size: 1, data: corePh, type: gl.FLOAT, normalized: false },
      { name: 'aSp', size: 1, data: coreSp, type: gl.FLOAT, normalized: false },
      { name: 'aSz', size: 1, data: coreSz, type: gl.FLOAT, normalized: false },
      { name: 'aBr', size: 1, data: coreBr, type: gl.FLOAT, normalized: false },
    ])
    gl.bindVertexArray(null)

    // ---- tekstur plate (flipY = false, seperti BufferTextureBundle di bundle) ----
    const texOf = (src: HTMLCanvasElement) => {
      const tx = gl.createTexture()!
      gl.bindTexture(gl.TEXTURE_2D, tx)
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
      // SRGB8_ALPHA8 (F-48): three.js memakai CanvasTexture dengan colorSpace sRGB → sampler
      // meng-DECODE sRGB→linear, lalu pass komposit meng-ENCODE sekali. Tanpa decode, encode
      // tunggal membuat figur ~2× terlalu terang (gamma 1/2.2).
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.SRGB8_ALPHA8, gl.RGBA, gl.UNSIGNED_BYTE, src)
      // three.js CanvasTexture default: generateMipmaps = true + LinearMipmapLinearFilter (F-47).
      // Shader lU menggeser UV sebesar `uPatchUV*vPatch` DI DALAM sprite titik, jadi turunan UV
      // tidak nol → mip dipilih sesuai ukuran patch. Tanpa mip (LINEAR) sampel tetap tajam
      // (nilai pelat penuh) → figur ~2× terlalu terang. Ini yang menyamakan luminansi.
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      gl.generateMipmap(gl.TEXTURE_2D)
      return tx
    }
    const texPlate = [texOf(fig.plates.idle), texOf(fig.plates.thinking), texOf(fig.plates.speaking)]
    const texStrong = texOf(fig.plates.strong)

    const uf = (p: WebGLProgram, n: string) => gl.getUniformLocation(p, n)
    const bloom = new BloomGL(gl)
    const dpr = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 1.75)

    const resize = () => {
      const w = canvas.clientWidth || 1
      const h = canvas.clientHeight || 1
      const pw = Math.max(1, Math.round(w * dpr))
      const ph = Math.max(1, Math.round(h * dpr))
      if (canvas.width !== pw || canvas.height !== ph) {
        canvas.width = pw
        canvas.height = ph
      }
      bloom.resize(pw, ph)
      return { w, h }
    }

    // mesin blend state (verbatim hU): {a, b, t, dur}
    const first = stateIndex(stateRef.current)
    const blend = { a: first, b: first, t: 9, dur: stateDur(first) }
    const lean = { yaw: 0, pitch: 0 }
    let boilT = 0
    let veinT = 0
    let waveT = 0
    let coreT = 0
    let raf = 0
    let last = performance.now()
    let elapsed = 0

    const draw = () => {
      raf = requestAnimationFrame(draw)
      const now = performance.now()
      const dtRaw = (now - last) / 1000
      last = now
      const dt = Math.min(0.05, dtRaw || 0.016)
      elapsed += dt
      const t = elapsed

      const { h } = resize()

      const frozen = numHook('__HUM_FREEZE_T')
      const surgeP = frozen != null ? Number(frozen) : surgePhase(birthRef.current)
      const surge = surgeOf(surgeP)
      const energy = Number(numHook('__HUM_ENERGY') ?? 0) || 0

      // ---- blend state ----
      const cur = stateIndex(stateRef.current)
      let X = Math.min(1, blend.t / blend.dur)
      if (cur !== blend.b && X >= 1) {
        blend.a = blend.b
        blend.b = cur
        blend.t = 0
        blend.dur = stateDur(cur)
        X = 0
      }
      blend.t += dt
      const ee = Math.min(1, blend.t / blend.dur)

      const L = blend.b
      const isSpeak = L === 2
      const isThink = L === 1

      // ================= figur (aU/lU, blending normal) =================
      const p = progFig
      gl.useProgram(p)

      gl.uniform1f(uf(p, 'uStateA'), blend.a)
      gl.uniform1f(uf(p, 'uStateB'), blend.b)
      gl.uniform1f(uf(p, 'uBloomR'), ee >= 1 ? 9 : smoothstep01(ee) * 1.75)

      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, texPlate[blend.a])
      gl.activeTexture(gl.TEXTURE1)
      gl.bindTexture(gl.TEXTURE_2D, texPlate[blend.b])
      gl.activeTexture(gl.TEXTURE2)
      gl.bindTexture(gl.TEXTURE_2D, texStrong)
      gl.uniform1i(uf(p, 'uTexA'), 0)
      gl.uniform1i(uf(p, 'uTexB'), 1)
      gl.uniform1i(uf(p, 'uTexS'), 2)

      const eHook = numHook('__HUM_ENERGY')
      const strongMix = eHook != null ? smoothstep01((Number(eHook) - 0.34) / 0.4) : 0
      gl.uniform1f(uf(p, 'uEnergy'), energy)
      gl.uniform1f(uf(p, 'uStrongMix'), strongMix)
      gl.uniform1f(uf(p, 'uStrongA'), blend.a === 2 ? strongMix : 0)
      gl.uniform1f(uf(p, 'uStrongB'), blend.b === 2 ? strongMix : 0)

      const ue = 1 + 0.9 * surge
      const z = 1 + 0.02 * Math.sin(t * 2.1)
      gl.uniform1f(uf(p, 'uPulseA'), (blend.a === 1 ? z : 1) * ue)
      gl.uniform1f(uf(p, 'uPulseB'), (blend.b === 1 ? z : 1) * ue)

      const speakAmp = Number(numHook('__HUM_SPEAK_AMP') ?? 0.55)
      const J = isSpeak ? speakAmp : 1
      const K = 1 - Math.exp(-dt * 4.2)
      lean.yaw += (bm(0) * 0.44 * J - lean.yaw) * K
      lean.pitch += (bm(0) * 0.2 * J - lean.pitch) * K
      gl.uniform1f(uf(p, 'uYaw'), lean.yaw)
      gl.uniform1f(uf(p, 'uPitch'), lean.pitch)
      gl.uniform1f(uf(p, 'uBreathe'), 1 + Math.sin(t * 0.9) * 0.004)
      gl.uniform1f(uf(p, 'uBreathY'), 0.012 * Math.sin(t * 1.37))
      gl.uniform1f(
        uf(p, 'uBackK'),
        Math.min(1, Math.max(0, (Math.abs(lean.yaw) + Math.abs(lean.pitch) - 0.09) / 0.24))
      )

      // uClick: hook `__HUM_CLICK` = [x, y, strength, age]; default = horn onset saat birth
      const ch = numHook('__HUM_CLICK')
      let clickX = 0
      let clickY = 0
      let clickZ = 0
      let clickAge = 99
      if (ch != null) {
        const arr = (window as any).__HUM_CLICK as number[]
        clickX = Number(arr?.[0] ?? 0)
        clickY = Number(arr?.[1] ?? 0)
        clickZ = Number(arr?.[2] ?? 0)
        clickAge = Number(arr?.[3] ?? 99)
      } else if (surgeP >= 0 && surgeP < 4) {
        clickY = 0.14
        clickZ = 1.35 * Math.exp(-surgeP / 1.6)
        clickAge = surgeP
      }
      gl.uniform4f(uf(p, 'uClick'), clickX, clickY, clickZ, clickAge)

      gl.uniform1f(
        uf(p, 'uVein'),
        (isSpeak ? 0.85 + energy * 0.55 : isThink ? 1.05 : 1) * (1 + surge)
      )

      if (frozen != null) {
        boilT = Number(frozen)
        veinT = Number(frozen) * 0.25
        waveT = Number(frozen)
        gl.uniform1f(uf(p, 'uBreathe'), 1 + Math.sin(Number(frozen) * 0.9) * 0.004)
        gl.uniform1f(uf(p, 'uBreathY'), 0.012 * Math.sin(Number(frozen) * 1.37))
      } else {
        const cr = clickAge < 3 ? Math.exp(-clickAge / 0.6) : 0
        const amp = 1 + 1.5 * cr
        boilT += dt * (isSpeak ? 2.6 + energy * 3 : isThink ? 2 : 1.5) * amp * (1 + 3 * surge)
        veinT += dt * (isSpeak ? 0.55 : isThink ? 0.45 : 0.25)
        waveT += dt
      }
      gl.uniform1f(uf(p, 'uBoilT'), boilT)
      gl.uniform1f(uf(p, 'uBoilAmp'), Number(numHook('__HUM_BOIL_AMP') ?? 1 + 2.8 * surge))
      gl.uniform1f(uf(p, 'uVeinT'), veinT)
      gl.uniform1f(uf(p, 'uWaveT'), waveT)

      // `__HUM_SIZE_K` = faktor kalibrasi ukuran titik (bukan bagian bundle), untuk gerbang.
      const size = 2.9 * Math.max(0.6, h / 1020) * Number(numHook('__HUM_SIZE_K' as any) ?? 1)
      gl.uniform1f(uf(p, 'uSize'), size)
      gl.uniform1f(uf(p, 'uPatchUV'), size / Math.max(1, h))
      gl.uniform1f(uf(p, 'uPixelRatio'), dpr)
      gl.uniform1f(uf(p, 'uPivotY'), fig.pivotY)
      gl.uniform1f(uf(p, 'uRim'), Number(numHook('__HUM_RIM') ?? 0.9))
      gl.uniform1f(uf(p, 'uDotSharp'), Number(numHook('__HUM_DOT') ?? 0.32))
      gl.uniform2f(uf(p, 'uAttn'), 0, 0)
      gl.uniform3f(uf(p, 'uPalCyan'), fig.palette[0][0], fig.palette[0][1], fig.palette[0][2])
      gl.uniform3f(uf(p, 'uPalPale'), fig.palette[1][0], fig.palette[1][1], fig.palette[1][2])

      bloom.bindScene()
      gl.disable(gl.DEPTH_TEST)
      gl.enable(gl.BLEND)
      gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
      gl.bindVertexArray(vaoFig)
      gl.drawArrays(gl.POINTS, 0, fig.count)

      // ================= mote inti (uU/cU, aditif) =================
      gl.useProgram(progCore)
      const st = String(stateRef.current || '')
      const speed = st.includes('speak')
        ? 2.2 + energy * 2
        : st.includes('listen')
          ? 1.6
          : st.includes('think')
            ? 1.3
            : 1
      const cr = clickAge < 3 ? Math.exp(-clickAge / 0.6) : 0
      coreT += dt * speed * (1 + 1.5 * cr) * (1 + 3 * surge)
      gl.uniform1f(uf(progCore, 'uT'), frozen != null ? Number(frozen) : coreT)
      gl.uniform1f(uf(progCore, 'uStr'), 0.55 * (1 + 2 * surge))
      gl.uniform1f(uf(progCore, 'uSizeK'), 1.6 * Math.max(0.6, h / 1020))
      gl.uniform1f(uf(progCore, 'uPixelRatio'), dpr)
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE)
      gl.bindVertexArray(vaoCore)
      gl.drawArrays(gl.POINTS, 0, 240)
      gl.disable(gl.BLEND)

      // ================= bloom (dU) =================
      // `__HUM_BLOOM_K` = faktor kalibrasi (bukan bagian bundle) — dipakai gerbang untuk
      // mencocokkan bobot rantai mip (three: compositeMaterial bloomFactors) dengan rebuild.
      const bk = Number(numHook('__HUM_BLOOM_K' as any) ?? 1)
      bloom.composite({
        intensity: (0.25 + 1.3 * surge) * bk,
        threshold: 0.62 - 0.34 * surge,
        smoothing: 0.22,
      })
    }

    draw()
    return () => {
      cancelAnimationFrame(raf)
      bloom.dispose()
      gl.useProgram(null)
      gl.deleteProgram(progFig)
      gl.deleteProgram(progCore)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fig])

  if (!fig) return null
  return (
    <canvas
      ref={canvasRef}
      data-testid="figure-canvas"
      aria-label="Animated cyan and gold Apex humanoid"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        display: 'block',
        opacity: visible ? 1 : 0,
        transition: 'opacity 140ms',
        pointerEvents: 'none',
      }}
    />
  )
}
