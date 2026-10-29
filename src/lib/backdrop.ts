/**
 * lib/backdrop — port VERBATIM komponen `xU` / `_U` / `vU` / `yU` dari bundle APEX.
 *
 * Struktur aslinya:
 *   xU({visible})  = <img backdrop-v1.webp, cover, objectPosition "center 42%", opacity visible?1:0,
 *                    transition 900ms>  +  (_U hanya bila BUKAN prefers-reduced-motion)
 *   _U({visible})  = kanvas WebGL (point cloud). `d = visible || l`, di mana `l` menjadi true pada
 *                    (birthRef − (Rs.total − Rs.hornPeak)) ≈ 6,608 s setelah mount — yaitu saat
 *                    puncak "horn". Kanvas: opacity d?1:0, transition 900ms, mixBlendMode screen.
 *                    frameloop = d ? "always" : "never"; dpr dijepit [1, 1.5]; alpha:true, antialias:false.
 *   vU(img)        = geometri: lebar tetap 780 px, union-find klaster piksel "emas/terang"
 *                    (r+g+b)/255 > .28 dan r > b·1.25 dan r > 100, LCG seed 48271.
 *   yU()           = uniform + update per frame (uT, uSizeK, uMap, uWave) dan
 *                    <points> dengan ShaderMaterial mU/gU, transparent, depthTest/Write false,
 *                    blending ADITIF (three.js `rd` = AdditiveBlending).
 *
 * Rebuild memakai WebGL langsung (tanpa three.js) supaya deterministik dan tanpa dependensi baru;
 * matematika, urutan, dan seluruh konstanta diambil apa adanya dari bundle.
 */

/** $i — lebar kerja geometri (verbatim) */
export const BACKDROP_W = 780
export const BACKDROP_SRC = '/humanoid/backdrop-v1.webp'

/** Rs.total / Rs.hornPeak (verbatim) */
const RS_TOTAL = 7.4
const RS_HORN_PEAK = 6.2 + 3.2 * 0.19

export const hornPeakDelayMs = () => (RS_TOTAL - RS_HORN_PEAK) * 1000 // 792 ms

export interface BackdropGeometry {
  count: number
  position: Float32Array // vec3 (selalu 0)
  aUv: Float32Array // vec2
  aCol: Float32Array // vec3
  aPh: Float32Array
  aRate: Float32Array
  aBase: Float32Array
  aTw: Float32Array
  aSz: Float32Array
  aspect: number
}

/** vU(img) — verbatim */
export function buildBackdropGeometry(
  img: HTMLImageElement | CanvasImageSource & { width?: number; height?: number; naturalWidth?: number }
): BackdropGeometry {
  const anyImg = img as any
  const e = anyImg.naturalWidth || anyImg.width
  const t = anyImg.naturalHeight || anyImg.height
  const n = Math.round((BACKDROP_W * t) / e)
  const r = document.createElement('canvas')
  r.width = BACKDROP_W
  r.height = n
  const o = r.getContext('2d', { willReadFrequently: true })!
  o.drawImage(img as CanvasImageSource, 0, 0, BACKDROP_W, n)
  const l = o.getImageData(0, 0, BACKDROP_W, n).data

  const f = (i: number) => Math.max(l[i * 4], l[i * 4 + 1], l[i * 4 + 2]) / 255
  const d = (i: number) => l[i * 4] > l[i * 4 + 2] * 1.25 && l[i * 4] > 100

  let p = 48271
  const m = () => ((p = (p * 16807) % 2147483647), (p - 1) / 2147483646)

  const g = new Int32Array(BACKDROP_W * n).fill(-1)
  const v: number[] = []
  for (let i = 0; i < BACKDROP_W * n; i++) if (f(i) > 0.28 && d(i)) ((g[i] = v.length), v.push(i))

  const x = v.map((_, i) => i)
  const S = (i: number): number => {
    while (x[i] !== i) {
      x[i] = x[x[i]]
      i = x[i]
    }
    return i
  }
  const A = (a: number, b: number) => {
    const ue = S(a)
    const z = S(b)
    if (ue !== z) x[ue] = z
  }
  for (let i = 0; i < v.length; i++) {
    const ie = v[i]
    const ue = ie % BACKDROP_W
    const z = (ie / BACKDROP_W) | 0
    for (const [ae, J] of [
      [1, 0],
      [0, 1],
      [1, 1],
      [-1, 1],
    ]) {
      const H = ue + ae
      const le = z + J
      if (H < 0 || H >= BACKDROP_W || le >= n) continue
      const Le = g[le * BACKDROP_W + H]
      if (Le >= 0) A(i, Le)
    }
  }

  const E = new Map<number, number>()
  const M = new Map<number, { ph: number; rate: number }>()
  for (let i = 0; i < v.length; i++) {
    const ie = S(i)
    E.set(ie, (E.get(ie) || 0) + 1)
  }
  const C = (i: number) => {
    let ie = M.get(i)
    if (!ie) {
      ie = { ph: m(), rate: 0.42 + m() * 0.45 }
      M.set(i, ie)
    }
    return ie
  }

  interface Pt {
    u: number; v: number; r: number; g: number; b: number
    ph: number; rate: number; base: number; tw: number; sz: number
  }
  const b: Pt[] = []
  const I = (idx: number, extra: Omit<Pt, 'u' | 'v' | 'r' | 'g' | 'b'>) => {
    const ue = idx % BACKDROP_W
    const z = (idx / BACKDROP_W) | 0
    b.push({
      u: (ue + 0.5) / BACKDROP_W,
      v: (z + 0.5) / n,
      r: l[idx * 4] / 255,
      g: l[idx * 4 + 1] / 255,
      b: l[idx * 4 + 2] / 255,
      ...extra,
    })
  }

  for (let i = 0; i < v.length; i++) {
    const ie = S(i)
    const ue = E.get(ie)!
    const z = v[i]
    const ae = f(z)
    if (ue >= 5) {
      if (m() < Math.min(1, 0.18 + ae * 0.4)) {
        const J = C(ie)
        I(z, { ph: J.ph, rate: J.rate, base: 0.24 + ae * 0.5, tw: 0.5, sz: 1.3 + ae * 1.5 })
      }
    } else if (ae > 0.55 && m() < 0.3) {
      I(z, { ph: m(), rate: 0.3 + m() * 0.5, base: 0.22 + ae * 0.4, tw: m() < 0.5 ? 1 : 0, sz: 1.1 + ae * 1.2 })
    }
  }

  for (let y = 1; y < n - 1; y++) {
    for (let xc = 1; xc < BACKDROP_W - 1; xc++) {
      const ue = y * BACKDROP_W + xc
      if (g[ue] >= 0) continue
      const z = f(ue)
      if (z < 0.3) continue
      const ae =
        z > 0.5 && z >= f(ue - 1) && z >= f(ue + 1) && z >= f(ue - BACKDROP_W) && z >= f(ue + BACKDROP_W)
      if (ae && m() < 0.5) {
        const J = m()
        const H = 0.5 + m() * 0.65
        I(ue, { ph: J, rate: H, base: 0.3 + z * 0.5, tw: 1, sz: 1.5 + z * 1.6 })
        I(ue, { ph: J, rate: H, base: 0.05, tw: 1, sz: 6.5 + z * 3.5 })
      } else if (!ae && m() < (z - 0.28) * 0.2) {
        I(ue, { ph: m(), rate: 0.35 + m() * 0.6, base: 0.12 + z * 0.28, tw: m() < 0.1 ? 1 : 0, sz: 1 + z * 1.1 })
      }
    }
  }

  const k = b.length
  const N = new Float32Array(k * 2)
  const Bc = new Float32Array(k * 3)
  const X = new Float32Array(k)
  const ee = new Float32Array(k)
  const L = new Float32Array(k)
  const D = new Float32Array(k)
  const re = new Float32Array(k)
  const te = new Float32Array(k * 3)
  b.forEach(($, i) => {
    N[i * 2] = $.u
    N[i * 2 + 1] = $.v
    Bc[i * 3] = $.r
    Bc[i * 3 + 1] = $.g
    Bc[i * 3 + 2] = $.b
    X[i] = $.ph
    ee[i] = $.rate
    L[i] = $.base
    D[i] = $.tw
    re[i] = $.sz
  })

  return {
    count: k,
    position: te,
    aUv: N,
    aCol: Bc,
    aPh: X,
    aRate: ee,
    aBase: L,
    aTw: D,
    aSz: re,
    aspect: e / t,
  }
}

/** mU — vertex shader, verbatim */
export const VERT = `
  attribute vec2 aUv;
  attribute vec3 aCol;
  attribute float aPh, aRate, aBase, aTw, aSz;
  uniform float uT, uPixelRatio, uSizeK, uRest, uPulse;
  uniform vec4 uMap;
  uniform vec4 uWave;
  uniform vec2 uWaveK;
  varying vec3 vC;
  void main() {
    float tw = 0.5 + 0.5 * sin(uT * aRate + aPh * 6.2831853);
    float wander = step(0.75, aTw) * smoothstep(0.66, 1.0, tw) * uPulse;
    float breath = step(0.25, aTw) * (1.0 - step(0.75, aTw)) * (0.1 + 0.9 * tw) * 1.1;
    float pulse = wander + breath;
    float glow = aBase * (uRest + pulse);
    vC = min(aCol * (1.0 + 0.45 * smoothstep(0.5, 1.0, pulse)), vec3(1.0)) * glow;
    vec2 ndc = vec2(aUv.x * uMap.x + uMap.z, aUv.y * uMap.y + uMap.w);
    if (uWave.w > 0.001) {
      float wd = length(vec2((ndc.x - uWave.x) * uWaveK.x, ndc.y - uWave.y));
      float wf = 1.0 - smoothstep(0.0, uWaveK.y, abs(wd - uWave.z));
      vC *= 1.0 + wf * uWave.w * 3.2;
    }
    gl_Position = vec4(ndc, 0.0, 1.0);
    gl_PointSize = max(1.0, aSz * uSizeK * uPixelRatio * (1.0 + 0.35 * pulse));
  }
`

/**
 * gU — fragment shader, verbatim.
 * Satu-satunya perubahan: `#include <colorspace_fragment>` (disisipkan three.js) ditulis
 * eksplisit sebagai konversi linear→sRGB yang sama, karena rebuild tidak memakai three.
 */
export const FRAG = `
  varying vec3 vC;
  void main() {
    float r = length(gl_PointCoord - vec2(0.5));
    if (r > 0.5) discard;
    float a = smoothstep(0.5, 0.1, r);
    vec3 c = vC * a;
    // <colorspace_fragment> (three.js, outputColorSpace = sRGB)
    vec3 s = mix(pow(c, vec3(0.41666)) * 1.055 - 0.055, c * 12.92, vec3(lessThanEqual(c, vec3(0.0031308))));
    gl_FragColor = vec4(s, 1.0);
  }
`
