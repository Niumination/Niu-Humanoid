/**
 * lib/fig — port VERBATIM `IU()` dari bundle APEX: geometri point cloud figur (≈4.986 byte minified).
 *
 * Keluaran: pos/size/w/kind/boil/bright/bucket/nx + pivotY + palette + plates + shadow.
 *   kind 0 = front · 1 = back shell · 3 = boiler mote (edge boil) · 5 = interior head dust
 *
 * Semua angka (1e4 interior dust, `.16` back shell, `1300` edge, seed 3311) adalah nilai bundle.
 */
import { buildPlate } from './plate'
import type { AssetBag } from './assets'
import { smoothstep01 } from './birth'

/** Ww — palet bucket (hex) */
export const BUCKET_HEX = ['#19ddff', '#bfeeff', '#ffb54d', '#ffd98a'] as const

/** qv() — sRGB → linear */
const qv = (i: number) => (i <= 0.04045 ? i / 12.92 : Math.pow((i + 0.055) / 1.055, 2.4))

/** EU — palet linear (dipakai `uPalCyan` / `uPalPale` di shader) */
export const PALETTE_LINEAR: [number, number, number][] = BUCKET_HEX.map((h) => [
  qv(parseInt(h.slice(1, 3), 16) / 255),
  qv(parseInt(h.slice(3, 5), 16) / 255),
  qv(parseInt(h.slice(5, 7), 16) / 255),
])

/** TU() — bucket per piksel */
function bucketOf(r: number, g: number, b: number): number {
  const n = r + g + b
  return r > b * 1.4 ? (r > 175 ? 3 : 2) : n > 430 ? 1 : 0
}

export interface Fig {
  count: number
  pivotY: number
  palette: [number, number, number][]
  plates: { idle: HTMLCanvasElement; thinking: HTMLCanvasElement; speaking: HTMLCanvasElement; strong: HTMLCanvasElement }
  pos: Float32Array
  size: Float32Array
  w: Float32Array
  kind: Uint8Array
  boil: Float32Array
  bright: Uint8Array
  bucket: Uint8Array
  nx: Float32Array
  shadow: HTMLCanvasElement
}

/**
 * IU(i, …) — `idleOverride` = bU(idle) karena bundle mengganti `r.current.idle` sebelum IU dipanggil.
 */
export function buildFig(bag: AssetBag, idleOverride?: CanvasImageSource): Fig {
  const idleImg = (idleOverride ?? bag.idle) as HTMLCanvasElement
  const idleH = (idleOverride as any)?.height ?? bag.idle.height
  const idleW = (idleOverride as any)?.width ?? bag.idle.width
  const t = Math.round((900 * (idleH || 900)) / (idleW || 900))

  // Im() untuk 4 state, dengan idle = bU(idle)
  const mk = (state: string) => buildPlate(bag, state, idleOverride)
  const n = mk('idle')
  const r = mk('thinking')
  const o = mk('speaking')
  const l = mk('strong')

  const f = (c: HTMLCanvasElement) => c.getContext('2d')!.getImageData(0, 0, 900, t).data
  const d = f(n)
  const p = f(r)
  const m = f(o)
  const g = f(l)
  const v = (W: Uint8ClampedArray, Z: number) => W[Z] + W[Z + 1] + W[Z + 2]

  const x = new Int16Array(t).fill(-1)
  const S = new Int16Array(t).fill(-1)
  const A = new Int16Array(900).fill(-1)
  const E = (W: number, Z: number) =>
    v(d, (Z * 900 + W) * 4) > 40 && v(d, (Z * 900 + W + 1) * 4) > 40 && v(d, (Z * 900 + W + 2) * 4) > 40
  const M = (W: number, Z: number) =>
    v(d, (Z * 900 + W) * 4) > 40 && v(d, ((Z + 1) * 900 + W) * 4) > 40 && v(d, ((Z + 2) * 900 + W) * 4) > 40

  for (let W = 0; W < t - 2; W++) {
    for (let Z = 2; Z < 896; Z++) if (E(Z, W)) { x[W] = Z; break }
    for (let Z = 895; Z >= 2; Z--) if (E(Z, W)) { S[W] = Z; break }
  }

  let C = 2
  for (let W = 2; W < t - 2; W++) {
    let Z = 0
    for (let Q = 2; Q < 898; Q++) if (v(d, (W * 900 + Q) * 4) > 120) Z++
    if (Z >= 900 * 0.14) { C = Math.max(2, W - 8); break }
  }
  for (let W = 2; W < 898; W++) for (let Z = C; Z < t - 4; Z++) if (M(W, Z)) { A[W] = Z; break }

  // baris leher (lebar minimum) → pivot
  let b = Math.round(t * 0.64)
  let I = 1e9
  for (let W = Math.round(t * 0.45); W < Math.round(t * 0.8); W++)
    if (x[W] >= 0 && S[W] > x[W] && S[W] - x[W] < I) { I = S[W] - x[W]; b = W }

  const k = b / t
  const N = (W: number) => smoothstep01((k - W) / 0.17)

  /** B(W,Z,Q) — kedalaman tubuh (deform z) */
  const B = (W: number, Z: number, Q: number) => {
    if (x[Z] < 0 || S[Z] <= x[Z]) return 0
    const xe = (x[Z] + S[Z]) / 900 - 1
    const ge = Math.min(0.6, (S[Z] - x[Z]) / 900)
    const Ue = Math.sqrt(Math.max(0, ge * ge - (W - xe) * (W - xe)))
    const ke = Z / t
    const He = ke < k - 0.04 ? 0.85 : Math.max(0.28, 0.85 - (ke - (k - 0.04)) * 3.2)
    return Ue * (He + 0.1 * Q) * (1 - 0.06 * Q)
  }

  const X: number[] = []
  const ee: number[] = []
  for (let W = 1; W < t - 1; W++)
    for (let Z = 1; Z < 899; Z++) {
      const Q = (W * 900 + Z) * 4
      const xe = Math.max(v(d, Q), v(p, Q), v(m, Q), v(g, Q))
      if (xe > 60) X.push(W * 900 + Z)
      else if (xe > 16 && (Z & 1) === 0 && (W & 1) === 0) ee.push(W * 900 + Z)
    }

  const L = X.length + ee.length
  const D = Math.round(L * 0.16)
  const re = 1e4
  const te: [number, number, number, number][] = []
  const oe = (W: Int16Array, Z: number, Q: number, xe: number) => W[Math.max(Q, Math.min(xe, Z))]
  const $ = Math.floor(t * 0.92)

  for (let W = 6; W < $; W++) {
    if (x[W] >= 2 && oe(x, W + 3, 0, t - 1) >= 0 && oe(x, W - 3, 0, t - 1) >= 0) {
      const Z = (oe(x, W + 3, 0, t - 1) - oe(x, W - 3, 0, t - 1)) / 6
      const Q = Math.hypot(1, Z) || 1
      te.push([x[W] / 900, W / t, -1 / Q, -Z / Q])
    }
    if (S[W] >= 2 && oe(S, W + 3, 0, t - 1) >= 0 && oe(S, W - 3, 0, t - 1) >= 0) {
      const Z = (oe(S, W + 3, 0, t - 1) - oe(S, W - 3, 0, t - 1)) / 6
      const Q = Math.hypot(1, Z) || 1
      te.push([S[W] / 900, W / t, 1 / Q, Z / Q])
    }
  }
  for (let W = 6; W < 894; W += 2)
    if (A[W] >= 2 && A[W] / t < 0.85 && oe(A, W + 3, 0, 899) >= 0 && oe(A, W - 3, 0, 899) >= 0) {
      const Z = (oe(A, W + 3, 0, 899) - oe(A, W - 3, 0, 899)) / 6
      const Q = Math.hypot(Z, 1) || 1
      te.push([W / 900, A[W] / t, Z / Q, 1 / Q])
    }

  const ie = Math.min(1300, te.length)
  const ue = D + re + L + ie

  const z: Fig = {
    count: ue,
    pivotY: 1 - 2 * k,
    palette: PALETTE_LINEAR,
    plates: { idle: n, thinking: r, speaking: o, strong: l },
    pos: new Float32Array(ue * 3),
    size: new Float32Array(ue).fill(1),
    w: new Float32Array(ue),
    kind: new Uint8Array(ue),
    boil: new Float32Array(ue * 4),
    bright: new Uint8Array(ue * 4),
    bucket: new Uint8Array(ue * 4),
    nx: new Float32Array(ue),
    shadow: document.createElement('canvas'),
  }

  let ae = 3311
  const J = () => ((ae = (ae * 16807) % 2147483647), (ae - 1) / 2147483646)
  const H = [d, p, m, g]
  const le = (W: number, Z: number) => {
    for (let Q = 0; Q < 4; Q++) {
      const xe = H[Q]
      z.bright[W * 4 + Q] = Math.min(255, Math.round((v(xe, Z) / 765) * 255))
      z.bucket[W * 4 + Q] = bucketOf(xe[Z], xe[Z + 1], xe[Z + 2])
    }
  }

  const Le: number[] = []
  for (let W = 0; W < L; W++) {
    const Z = W >= X.length
    const Q = Z ? ee[W - X.length] : X[W]
    const xe = Q % 900
    const ge = (Q / 900) | 0
    const Ue = Q * 4
    const ke = D + re + W
    const He = xe / 900
    const Ee = ge / t
    const G = ge & 1 ? 0.5 / 900 : 0
    const We = (He + G) * 2 - 1
    const Xe = 1 - Ee * 2
    const De = N(Ee)
    z.pos[ke * 3] = We
    z.pos[ke * 3 + 1] = Xe
    z.pos[ke * 3 + 2] = B(We, ge, De)
    z.w[ke] = De
    z.kind[ke] = 0
    if (x[ge] >= 0 && S[ge] > x[ge]) {
      const $e = (x[ge] + S[ge]) / 900 - 1
      const ht = Math.min(0.6, (S[ge] - x[ge]) / 900)
      z.nx[ke] = Math.max(-1, Math.min(1, (We - $e) / Math.max(ht, 1e-4)))
    }
    if (Z) z.size[ke] = 2
    le(ke, Ue)
    if (!Z && Ee < 0.72 && v(d, Ue) > 60) Le.push(ke)
  }

  // back shell
  for (let W = 0; W < D; W++) {
    const Z = Le.length ? Le[Math.floor(J() * Le.length)] : D + re
    z.pos[W * 3] = z.pos[Z * 3]
    z.pos[W * 3 + 1] = z.pos[Z * 3 + 1]
    z.pos[W * 3 + 2] = -z.pos[Z * 3 + 2] * 0.85
    z.w[W] = z.w[Z]
    z.kind[W] = 1
    z.nx[W] = z.nx[Z]
    for (let Q = 0; Q < 4; Q++) {
      z.bright[W * 4 + Q] = z.bright[Z * 4 + Q] >> 1
      z.bucket[W * 4 + Q] = z.bucket[Z * 4 + Q]
    }
  }

  // interior head dust
  {
    const W0 = Math.round(t * 0.06)
    const Z0 = Math.round((k - 0.02) * t)
    let Q = 0
    let guard = 0
    while (Q < re && guard++ < re * 40) {
      const ge = W0 + Math.floor(J() * Math.max(1, Z0 - W0))
      if (x[ge] < 2 || S[ge] <= x[ge] + 4) continue
      const ke = (x[ge] + 2 + Math.floor(J() * (S[ge] - x[ge] - 4))) / 900
      const He = ge / t
      const Ee = ke * 2 - 1
      const G = 1 - He * 2
      const We = B(Ee, ge, N(He))
      if (We < 0.02) continue
      const Xe = (J() * 2 - 1) * 0.9
      if (J() > 0.4 + 0.6 * (1 - Math.abs(Xe))) continue
      const De = D + Q++
      z.pos[De * 3] = Ee
      z.pos[De * 3 + 1] = G
      z.pos[De * 3 + 2] = Xe * We
      z.w[De] = N(He)
      z.kind[De] = 5
      const $e = J() < 0.15 ? 1 : 0
      for (let ht = 0; ht < 4; ht++) {
        z.bright[De * 4 + ht] = 46
        z.bucket[De * 4 + ht] = $e
      }
    }
  }

  // edge boil motes
  for (let W = 0; W < ie; W++) {
    const [Z, Q, xe, ge] = te[Math.floor(J() * te.length)]
    const Ue = D + re + L + W
    z.pos[Ue * 3] = Z * 2 - 1
    z.pos[Ue * 3 + 1] = 1 - Q * 2
    z.pos[Ue * 3 + 2] = 0
    z.w[Ue] = N(Q)
    z.kind[Ue] = 3
    const ke = J() < 0.15 ? 1 : 0
    for (let Ee = 0; Ee < 4; Ee++) {
      z.bright[Ue * 4 + Ee] = 215
      z.bucket[Ue * 4 + Ee] = ke
    }
    const He = 0.012 + J() * 0.042
    z.boil[Ue * 4] = xe * He
    z.boil[Ue * 4 + 1] = ge * He
    z.boil[Ue * 4 + 2] = J()
    z.boil[Ue * 4 + 3] = 0.22 + J() * 0.5
  }

  // shadow (kanvas siluet, dipakai jalur 2D)
  {
    const W = document.createElement('canvas')
    W.width = 900
    W.height = t
    const Z = W.getContext('2d')!
    const Q = Z.createImageData(900, t)
    let xe = Math.round(t * 0.82)
    for (let ke = 0; ke < t; ke++) if (x[ke] >= 0 && S[ke] - x[ke] >= 900 * 0.96) { xe = ke; break }
    for (let ke = 0; ke < t; ke++) {
      if (ke >= xe) {
        for (let He = 0; He < 900; He++) Q.data[(ke * 900 + He) * 4 + 3] = 255
      } else {
        if (x[ke] < 0 || S[ke] <= x[ke]) continue
        for (let He = x[ke]; He <= S[ke]; He++) Q.data[(ke * 900 + He) * 4 + 3] = 255
      }
    }
    Z.putImageData(Q, 0, 0)
    const ge = document.createElement('canvas')
    ge.width = Math.max(2, Math.round(900 / 8))
    ge.height = Math.max(2, Math.round(t / 8))
    ge.getContext('2d')!.drawImage(W, 0, 0, ge.width, ge.height)
    Z.clearRect(0, 0, 900, t)
    Z.drawImage(ge, 0, 0, 900, t)
    Z.fillStyle = '#000'
    Z.fillRect(0, Math.min(t - 1, xe + 6), 900, t)
    z.shadow = W
  }

  return z
}
