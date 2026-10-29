/**
 * Backdrop — port komponen `xU` bundle APEX (lapisan latar).
 *
 *   1. <img backdrop-v1.webp> — cover, objectPosition "center 42%", opacity (visible||born)?1:0 (TERUKUR), 900ms
 *   2. kanvas WebGL point-cloud (`_U`) — hanya bila BUKAN prefers-reduced-motion.
 *      `d = visible || lahir` dengan `lahir` = true pada (birthRef − 792 ms) ≈ 6,608 s setelah mount
 *      (puncak "horn"). Kanvas: opacity d?1:0, transition 900ms, mixBlendMode screen,
 *      frameloop only saat d, dpr dijepit [1, 1.5], alpha true, antialias false.
 *
 * Semua angka uniform disalin dari `yU` dan `_U`.
 */
import { useEffect, useRef, useState } from 'react'
import {
  BACKDROP_SRC,
  FRAG,
  VERT,
  buildBackdropGeometry,
  hornPeakDelayMs,
  type BackdropGeometry,
} from '../lib/backdrop'
import { numHook } from '../lib/hooks'

const RS_TOTAL = 7.4
const RS_HORN_PEAK = 6.2 + 3.2 * 0.19

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const sh = gl.createShader(type)!
  gl.shaderSource(sh, src)
  gl.compileShader(sh)
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh)
    gl.deleteShader(sh)
    throw new Error(`shader: ${log}`)
  }
  return sh
}

export function Backdrop({
  visible,
  birthRef,
}: {
  /** bundle: `B` = energy > .58 */
  visible: boolean
  /** bundle: birthRef.current = mountTime + Rs.total*1000 */
  birthRef: React.MutableRefObject<number>
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [geometry, setGeometry] = useState<BackdropGeometry | null>(null)
  const [born, setBorn] = useState(false) // `l` di bundle
  const [restartKey, setRestartKey] = useState(0) // `r` — dipakai saat context hilang
  const reduced =
    typeof window !== 'undefined' &&
    !!window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // `l`: menyala pada puncak horn
  useEffect(() => {
    const delay = hornPeakDelayMs()
    const m = birthRef.current ? birthRef.current - delay - performance.now() : -1
    if (m <= 0) return
    const id = setTimeout(() => setBorn(true), m)
    return () => clearTimeout(id)
  }, [birthRef, restartKey])

  // muat gambar → geometri
  useEffect(() => {
    let dead = false
    const img = new Image()
    img.onload = () => {
      if (dead) return
      try {
        const geo = buildBackdropGeometry(img)
        ;(window as any).__HUM_BG_COUNT = geo.count
        ;(window as any).__HUM_BG_GEO = geo
        setGeometry(geo)
      } catch {
        /* bundle: catch {} */
      }
    }
    img.src = BACKDROP_SRC
    return () => {
      dead = true
    }
  }, [])

  const active = visible || born

  useEffect(() => {
    if (reduced || !geometry || !canvasRef.current) return
    const canvas = canvasRef.current
    const gl = (canvas.getContext('webgl', { alpha: true, antialias: false, premultipliedAlpha: false }) ||
      canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null
    if (!gl) return

    const prog = gl.createProgram()!
    // three.js menambahkan presisi di depan shader; WebGL1 mewajibkannya
    const prefix = 'precision highp float;\nprecision highp int;\n'
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, prefix + VERT))
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, prefix + FRAG))
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return
    gl.useProgram(prog)

    const buf = (data: Float32Array, size: number, name: string) => {
      const b = gl.createBuffer()
      gl.bindBuffer(gl.ARRAY_BUFFER, b)
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW)
      const loc = gl.getAttribLocation(prog, name)
      if (loc >= 0) {
        gl.enableVertexAttribArray(loc)
        gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0)
      }
    }
    buf(geometry.position, 3, 'position')
    buf(geometry.aUv, 2, 'aUv')
    buf(geometry.aCol, 3, 'aCol')
    buf(geometry.aPh, 1, 'aPh')
    buf(geometry.aRate, 1, 'aRate')
    buf(geometry.aBase, 1, 'aBase')
    buf(geometry.aTw, 1, 'aTw')
    buf(geometry.aSz, 1, 'aSz')

    const U = (n: string) => gl.getUniformLocation(prog, n)
    const uT = U('uT')
    const uPixelRatio = U('uPixelRatio')
    const uSizeK = U('uSizeK')
    const uRest = U('uRest')
    const uPulse = U('uPulse')
    const uMap = U('uMap')
    const uWave = U('uWave')
    const uWaveK = U('uWaveK')

    // uniform awal — verbatim `yU`
    const dpr = Math.min(typeof window !== 'undefined' && window.devicePixelRatio ? window.devicePixelRatio : 1, 1.5)
    const rest = numHook('__HUM_BG_REST') ?? 0.22
    const pulse = numHook('__HUM_BG_PULSE') ?? 2.6
    gl.uniform1f(uPixelRatio, dpr)
    gl.uniform1f(uRest, Number(rest))
    gl.uniform1f(uPulse, Number(pulse))
    gl.uniform4f(uMap, 2, -2, -1, 1)
    gl.uniform4f(uWave, 0, 0, 0, 0)
    gl.uniform2f(uWaveK, 1.78, 0.4)

    gl.disable(gl.DEPTH_TEST)
    gl.depthMask(false)
    gl.enable(gl.BLEND)
    // three.js AdditiveBlending: src = SrcAlpha, dst = One
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE)
    gl.clearColor(0, 0, 0, 0)

    let t = 0
    let raf = 0
    let last = performance.now()
    let lost = false

    const onLost = (e: Event) => {
      e.preventDefault()
      lost = true
      cancelAnimationFrame(raf)
      setTimeout(() => setRestartKey((k) => k + 1), 4000)
    }
    const onRestored = () => {
      lost = false
    }
    canvas.addEventListener('webglcontextlost', onLost, false)
    canvas.addEventListener('webglcontextrestored', onRestored, false)

    const resize = () => {
      const w = canvas.clientWidth || 1
      const h = canvas.clientHeight || 1
      const pw = Math.max(1, Math.round(w * dpr))
      const ph = Math.max(1, Math.round(h * dpr))
      if (canvas.width !== pw || canvas.height !== ph) {
        canvas.width = pw
        canvas.height = ph
      }
      return { w, h }
    }

    const draw = () => {
      if (lost) return
      raf = requestAnimationFrame(draw)
      const now = performance.now()
      const dt = (now - last) / 1000
      last = now
      const { w, h } = resize()

      // --- update uniform (verbatim `yU`) ---
      const bgT = numHook('__HUM_BG_T')
      if (bgT != null) t = Number(bgT)
      else t += Math.min(0.05, dt || 0.016)
      gl.uniform1f(uT, t)
      // `uSizeK = max(.6, r.height/1020)` di bundle — TERUKUR ULANG lewat probe per-draw
      // (tools/probe-bg-uniforms3.js, filter 5197 titik): backdrop memakai faktor **1.0**,
      // h = tinggi CSS kanvas → 1440×900 = 0,88235; 900×1000 = 0,98039.
      // (Angka 1,6·min(vw,vh)/1020 adalah uSizeK milik shader FIGUR — F-43 direvisi.)
      gl.uniform1f(uSizeK, Math.max(0.6, h / 1020))

      const aspect = geometry.aspect
      const lw = w || 1
      const lh = h || 1
      const d = Math.max(lw / aspect, lh)
      const pw = d * aspect
      const ph = d
      const ox = (lw - pw) * 0.5
      const oy = (lh - ph) * 0.42
      gl.uniform4f(uMap, (pw / lw) * 2, -(ph / lh) * 2, (ox / lw) * 2 - 1, 1 - (oy / lh) * 2)

      const surge = numHook('__HUM_SURGE')
      let x = birthRef.current ? (performance.now() - birthRef.current) / 1000 : 99
      if (surge != null) x = Number(surge)
      x += RS_TOTAL - RS_HORN_PEAK
      const S = Math.min(lw, lh) / lh
      if (x >= 0 && x < 4.5) {
        gl.uniform4f(uWave, 0, 0.14 * S, x * 1.5 * S, Math.exp(-x / 1.8))
        gl.uniform2f(uWaveK, lw / lh, 0.45 * S)
      } else {
        gl.uniform4f(uWave, 0, 0.14 * S, x * 1.5 * S, 0)
      }

      gl.viewport(0, 0, canvas.width, canvas.height)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.drawArrays(gl.POINTS, 0, geometry.count)
    }

    if (active) draw()
    else raf = requestAnimationFrame(draw) // frameloop "never": gambar sekali lalu diam

    return () => {
      cancelAnimationFrame(raf)
      canvas.removeEventListener('webglcontextlost', onLost)
      canvas.removeEventListener('webglcontextrestored', onRestored)
      try {
        gl.deleteProgram(prog)
      } catch {
        /* noop */
      }
    }
  }, [reduced, geometry, active, birthRef, restartKey])

  return (
    <div
      aria-hidden="true"
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', userSelect: 'none' }}
    >
      <img
        src={BACKDROP_SRC}
        alt=""
        aria-hidden="true"
        draggable={false}
        data-testid="backdrop-still"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center 42%',
          // TERUKUR (tools/probe-live-imgtime.js): img menyala bersama kanvas `d = visible || born`
          // — pada 8–9 s (puncak horn) opacity 0 → 1 walau energy 0. Bukan `visible` saja.
          opacity: active ? 1 : 0,
          transition: 'opacity 900ms',
        }}
      />
      {!reduced && geometry && (
        <canvas
          ref={canvasRef}
          data-testid="backdrop-canvas"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            opacity: active ? 1 : 0,
            transition: 'opacity 900ms',
            pointerEvents: 'none',
            mixBlendMode: 'screen',
          }}
        />
      )}
    </div>
  )
}
