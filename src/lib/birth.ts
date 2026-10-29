/**
 * lib/birth — port VERBATIM dari tiga potongan bundle APEX:
 *   CU(i)    → generator partikel assembly (seed 977231, 372 px, ambang 95)
 *   Rs       → { total: 7.4, ignition: 6.2, hornPeak: 6.2 + 3.2*.19 }
 *   blok render `if (Ke < Rs.total) { … }` di dalam loop rAF
 *
 * Konstanta yang dipakai di sini semuanya angka asli dari bundle; tidak ada yang dibulatkan:
 *   Ht = .06 + (t - 1.75) * .88 / 4.6            → garis wipe horizontal
 *   alpha partikel = .45 + .5 * An               → fase terbang (bezier kubik)
 *   alpha partikel = An * .9                     → fase diam, An = 1 - smoothstep((t-d-.35)/.8)
 *   S = max(S, mn / n * .99)                     → progres untuk teks ASSEMBLING
 *   Ui = smoothstep((t/total - .84) / .16)       → denyut akhir
 *   Di = sin(PI * min(.5, Ui))                   → kilau radial 'lighter', alpha Di*.8
 *   warna bucket = ["#19ddff","#bfeeff","#ffb54d","#ffd98a"]
 */
export const TIMELINE = { total: 7.4, ignition: 6.2, hornPeak: 6.2 + 3.2 * 0.19 } as const
export const BUCKET_COLORS = ['#19ddff', '#bfeeff', '#ffb54d', '#ffd98a'] as const

import { buildMotes, drawCore } from './core'
import { drawEdgeParticles, type EdgeParticle } from './edge'

const MOTES = buildMotes()

/** We() — drawImage dengan skala di sekitar pusat */
function drawPlateScaled(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  w: number,
  h: number,
  alpha: number,
  scale: number
) {
  if (!img || alpha <= 0.002) return
  ctx.save()
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha))
  ctx.translate(w / 2, h / 2)
  ctx.scale(scale, scale)
  ctx.translate(-w / 2, -h / 2)
  ctx.drawImage(img, 0, 0, w, h)
  ctx.restore()
}

export const clamp01 = (i: number) => Math.max(0, Math.min(1, i))
export const smoothstep01 = (i: number) => {
  const e = clamp01(i)
  return e * e * (3 - 2 * e)
}

export interface Assembly {
  n: number
  x: Float32Array; y: Float32Array
  sx: Float32Array; sy: Float32Array
  c1x: Float32Array; c1y: Float32Array
  c2x: Float32Array; c2y: Float32Array
  delay: Float32Array; dur: Float32Array; size: Float32Array
  buckets: { color: string; idx: Uint32Array }[]
}

/** CU(i) — i = canvas hasil bU(idle) (atau gambar apa pun yang bisa digambar) */
export function buildAssembly(img: CanvasImageSource & { width: number; height: number }): Assembly {
  const t = Math.round((372 * (img.height || 372)) / (img.width || 372))
  const n = document.createElement('canvas')
  n.width = 372
  n.height = t
  const r = n.getContext('2d', { willReadFrequently: true })!
  r.drawImage(img, 0, 0, 372, t)
  const o = r.getImageData(0, 0, 372, t).data
  const l: [number, number, number, number, number][] = []
  for (let x = 2; x < t - 2; x++) {
    for (let S = 2; S < 370; S++) {
      const A = (x * 372 + S) * 4
      const E = o[A] + o[A + 1] + o[A + 2]
      if (E > 95) l.push([S / 372, x / t, o[A], o[A + 2], E])
    }
  }
  const f = Math.min(9500, l.length)
  let d = 977231
  const p = () => ((d = (d * 16807) % 2147483647), (d - 1) / 2147483646)
  const m = l.length / f
  const g: Assembly = {
    n: 0,
    x: new Float32Array(f), y: new Float32Array(f),
    sx: new Float32Array(f), sy: new Float32Array(f),
    c1x: new Float32Array(f), c1y: new Float32Array(f),
    c2x: new Float32Array(f), c2y: new Float32Array(f),
    delay: new Float32Array(f), dur: new Float32Array(f), size: new Float32Array(f),
    buckets: [],
  }
  const v: number[][] = [[], [], [], []]
  for (let x = 0; x < f; x++) {
    const [S, A, E, M, C] = l[Math.min(l.length - 1, Math.floor(x * m + p() * m))]
    const b = g.n++
    g.x[b] = S; g.y[b] = A
    g.sx[b] = 0.5 + (p() * 2 - 1) * 0.028
    g.sy[b] = 0.94 + (p() * 2 - 1) * 0.016
    g.c1x[b] = 0.88 + p() * 0.28
    g.c1y[b] = 0.72 + p() * 0.16
    g.c2x[b] = 0.78 + p() * 0.3
    g.c2y[b] = 0.12 + p() * 0.22
    g.delay[b] = ((S - 0.06) / 0.88) * 4.6 + p() * 0.45
    g.dur[b] = 1 + p() * 0.4
    g.size[b] = 1.2 + (C / 765) * 1.5
    v[E > M * 1.4 ? (E > 175 ? 3 : 2) : C > 430 ? 1 : 0].push(b)
  }
  g.buckets = v.map((arr, S) => ({ color: BUCKET_COLORS[S], idx: Uint32Array.from(arr) }))
  return g
}

/**
 * renderBirthFrame — satu frame timeline assembly.
 * `plate` = kanvas idle 900×t (hasil buildPlate(bag,'idle')).
 * Mengembalikan progres S (untuk teks ASSEMBLING).
 */
export function renderBirthFrame(
  ge: CanvasRenderingContext2D,
  W: number,
  H: number,
  t: number,
  assembly: Assembly,
  plate: HTMLCanvasElement,
  scratch: HTMLCanvasElement,
  dt = 1 / 60,
  edges: EdgeParticle[] = [],
  /**
   * phase — detik WAKTU NYATA (bundle: Pe = timestamp/1e3), terpisah dari `t`
   * (waktu timeline yang bisa dibekukan lewat __HUM_ASM_EL). Dipakai untuk
   * napas plate dan goyangan mote inti; keduanya di bundle tidak dibekukan.
   */
  phase = t
): number {
  const Ot = TIMELINE.total
  // denyut napas plate (xt di bundle: 1 + sin(Pe*.95)*.0035)
  const breath = 1 + Math.sin(phase * 0.95) * 0.0035
  // --- wipe: potongan plate yang "sudah terbangun" ---
  const Ht = 0.06 + ((t - 1.75) * 0.88) / 4.6
  if (Ht > 0.01) {
    const b = scratch.getContext('2d')!
    b.setTransform(1, 0, 0, 1, 0, 0)
    b.globalCompositeOperation = 'source-over'
    b.fillStyle = '#000'
    b.fillRect(0, 0, W, H)
    drawPlateScaled(b, plate, W, H, 1, breath)
    // mask kanvas terpisah
    const mctx = document.createElement('canvas')
    mctx.width = W; mctx.height = H
    const mc = mctx.getContext('2d')!
    const grad = mc.createLinearGradient((Ht - 0.12) * W, 0, (Ht + 0.05) * W, 0)
    grad.addColorStop(0, 'rgba(255,255,255,1)')
    grad.addColorStop(1, 'rgba(255,255,255,0)')
    mc.fillStyle = grad
    mc.fillRect(0, 0, W, H)
    b.globalCompositeOperation = 'destination-in'
    b.drawImage(mctx, 0, 0)
    b.globalCompositeOperation = 'source-over'
    ge.drawImage(scratch, 0, 0, W, H)
  }

  // --- partikel assembly ---
  let mn = 0
  ge.save()
  ge.globalCompositeOperation = 'lighter'
  const Nn = Math.min(W, H) / 1000
  for (const bucket of assembly.buckets) {
    ge.fillStyle = bucket.color
    const idx = bucket.idx
    for (let k = 0; k < idx.length; k++) {
      const wn = idx[k]
      const Ir = (t - assembly.delay[wn]) / assembly.dur[wn]
      if (Ir <= 0) continue
      let gs: number, co: number
      if (Ir < 1) {
        const An = Ir * Ir * (3 - 2 * Ir)
        const yi = 1 - An
        gs = (yi * yi * yi * assembly.sx[wn] + 3 * yi * yi * An * assembly.c1x[wn] + 3 * yi * An * An * assembly.c2x[wn] + An * An * An * assembly.x[wn]) * W
        co = (yi * yi * yi * assembly.sy[wn] + 3 * yi * yi * An * assembly.c1y[wn] + 3 * yi * An * An * assembly.c2y[wn] + An * An * An * assembly.y[wn]) * H
        ge.globalAlpha = 0.45 + 0.5 * An
      } else {
        mn++
        const An = 1 - smoothstep01((t - assembly.delay[wn] - assembly.dur[wn] - 0.35) / 0.8)
        if (An <= 0.015) continue
        gs = assembly.x[wn] * W
        co = assembly.y[wn] * H
        ge.globalAlpha = An * 0.9
      }
      const Cs = assembly.size[wn] * Nn
      ge.fillRect(gs - Cs * 0.5, co - Cs * 0.5, Cs, Cs)
    }
  }
  ge.restore()
  let S = Math.min(0.999, t / Ot)
  S = Math.max(S, (mn / assembly.n) * 0.99)

  const Ui = smoothstep01((t / Ot - 0.84) / 0.16)

  // --- flare inti dada: F(ctx, W, H, detik, Gn, 2+3*Ui) ---
  const Gn = Math.max(0.55, 1 - smoothstep01((t / Ot - 0.82) / 0.15)) * smoothstep01(t / 0.5)
  drawCore(ge, W, H, phase, Gn, 2 + 3 * Ui, 1, MOTES)

  // --- kilau radial penutup ---
  const Di = Math.sin(Math.PI * Math.min(0.5, Ui) * 1)
  if (Di > 0.01) {
    const g = document.createElement('canvas')
    g.width = W; g.height = H
    const gc = g.getContext('2d')!
    gc.fillStyle = '#000'
    gc.fillRect(0, 0, W, H)
    drawPlateScaled(gc, plate, W, H, 1, breath)
    const rad = gc.createRadialGradient(W * 0.5, H * 0.43, 0, W * 0.5, H * 0.43, W * 0.37)
    rad.addColorStop(0, 'rgba(255,255,255,1)')
    rad.addColorStop(1, 'rgba(255,255,255,0)')
    gc.globalCompositeOperation = 'destination-in'
    gc.fillStyle = rad
    gc.fillRect(0, 0, W, H)
    ge.save()
    ge.globalCompositeOperation = 'lighter'
    ge.globalAlpha = Di * 0.8
    ge.drawImage(g, 0, 0, W, H)
    ge.restore()
  }
  // --- edge particles: at(W,H,t,"idle",0, smoothstep((t/total-.6)/.4)*(.8+1.4*Ui)) ---
  drawEdgeParticles(
    ge, W, H, dt, 'idle', 0,
    smoothstep01((t / Ot - 0.6) / 0.4) * (0.8 + 1.4 * Ui),
    edges
  )

  ge.globalAlpha = 1
  return S
}
