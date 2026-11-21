/**
 * lib/render — komposisi frame APEX untuk kondisi diam (bukan birth).
 *
 * Port verbatim:
 *   Pm()  → normalizeState()  "speak"→speaking, "listen"→listening, "think|process"→thinking, selain itu idle
 *   RU()  → buildVeins()      hanya "urat" emas di bawah 56 % tinggi (r>78 & r>b·1.55)
 *   $e()  → drawListeningRings()  ring berdenyut, kanvas ½ ukuran, alpha .24+input·.3
 *   Xe()  → drawClipped()     ellipse clip + composite "lighter"
 *   ye()  → coreScale()       speaking 2.2+E·2 · listening 1.6 · thinking 1.3 · idle 1
 *   ht()  → drawState()       urutan: hitam → idle(dt) → overlay state → F() → veins
 *
 * Catatan: `strong` BUKAN state (normalizeState tidak pernah mengembalikannya);
 * ia adalah `strongMix = smoothstep((energy−.34)/.4)` yang dipakai saat state speaking.
 */
import { drawCore, buildMotes } from './core'
import { getSignal } from './cues'

export type State = 'idle' | 'listening' | 'thinking' | 'speaking'
export type StateInput = string

const MOTES = buildMotes()

export function normalizeState(input: StateInput): State {
  const e = String(input || '').toLowerCase()
  if (e.includes('speak')) return 'speaking'
  if (e.includes('listen')) return 'listening'
  if (e.includes('think') || e.includes('process')) return 'thinking'
  return 'idle'
}

export interface PlateImages {
  idle: CanvasImageSource & { width: number; height: number }
  thinking: CanvasImageSource & { width: number; height: number }
  speaking: CanvasImageSource & { width: number; height: number }
  strong: CanvasImageSource & { width: number; height: number }
}

/** We() — drawImage diskalakan di sekitar pusat */
export function drawScaled(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource | null | undefined,
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

/** RU() — hanya urat emas bagian bawah */
export function buildVeins(
  img: CanvasImageSource & { width: number; height: number }
): HTMLCanvasElement {
  const e = Math.min(1024, img.width || 1024)
  const t = Math.round((e * (img.height || e)) / (img.width || e))
  const n = document.createElement('canvas')
  n.width = e
  n.height = t
  const r = n.getContext('2d', { willReadFrequently: true })!
  r.drawImage(img, 0, 0, e, t)
  const o = r.getImageData(0, 0, e, t)
  const l = o.data
  const f = Math.round(t * 0.56)
  for (let d = 0; d < t; d++)
    for (let p = 0; p < e; p++) {
      const m = (d * e + p) * 4
      if (!((d >= f && l[m] > 78 && l[m] > l[m + 2] * 1.55))) l[m + 3] = 0
    }
  r.putImageData(o, 0, 0)
  return n
}

/** listeningRings — webp listening dengan alpha dari luminansi (×1.5, cap 255) */
export function buildListeningRings(
  img: CanvasImageSource & { width: number; height: number }
): HTMLCanvasElement {
  const ke = Math.min(1024, img.width || 1024)
  const he = Math.round((ke * (img.height || ke)) / (img.width || ke))
  const cv = document.createElement('canvas')
  cv.width = ke
  cv.height = he
  const g = cv.getContext('2d', { willReadFrequently: true })!
  g.drawImage(img, 0, 0, ke, he)
  const data = g.getImageData(0, 0, ke, he)
  const px = data.data
  for (let i = 0; i < px.length; i += 4)
    px[i + 3] = Math.min(255, Math.max(px[i], px[i + 1], px[i + 2]) * 1.5)
  g.putImageData(data, 0, 0)
  return cv
}

/** Xe() — ellipse clip + lighter */
export function drawClipped(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  w: number,
  h: number,
  alpha: number,
  clip: { x: number; y: number; rx: number; ry: number },
  scale = 1
) {
  if (!img || alpha <= 0.002) return
  ctx.save()
  ctx.beginPath()
  ctx.ellipse(w * clip.x, h * clip.y, w * clip.rx, h * clip.ry, 0, 0, Math.PI * 2)
  ctx.clip()
  ctx.globalCompositeOperation = 'lighter'
  drawScaled(ctx, img, w, h, alpha, scale)
  ctx.restore()
}

const ringsBuf: { c: HTMLCanvasElement | null; g: CanvasRenderingContext2D | null } = {
  c: null,
  g: null,
}

/** $e() — ring listening */
export function drawListeningRings(
  ctx: CanvasRenderingContext2D,
  rings: CanvasImageSource,
  w: number,
  h: number,
  t: number,
  scale: number,
  reduced = false
) {
  const input = getSignal('input')
  if (reduced) {
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    drawScaled(ctx, rings, w, h, 0.4 + input * 0.3, 1)
    ctx.restore()
    return
  }
  const dt = Math.max(2, Math.round(w / 2))
  const ge = Math.max(2, Math.round(h / 2))
  if (!ringsBuf.c || ringsBuf.c.width !== dt || ringsBuf.c.height !== ge) {
    ringsBuf.c = document.createElement('canvas')
    ringsBuf.c.width = dt
    ringsBuf.c.height = ge
    ringsBuf.g = ringsBuf.c.getContext('2d')
  }
  const p = ringsBuf.g!
  p.setTransform(1, 0, 0, 1, 0, 0)
  p.clearRect(0, 0, dt, ge)
  p.globalCompositeOperation = 'lighter'
  drawScaled(p, rings, dt, ge, 0.24 + input * 0.3, scale)
  for (const offset of [0, 0.5]) {
    const ph = (t * 0.22 + offset) % 1
    const a = Math.sin(Math.PI * ph) * (0.26 + input * 0.22)
    drawScaled(p, rings, dt, ge, a, 1 + ph * 0.05)
  }
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.drawImage(ringsBuf.c, 0, 0, dt, ge, 0, 0, w, h)
  ctx.restore()
}

/** ye() */
export const coreScale = (state: State, energy: number) =>
  state === 'speaking' ? 2.2 + energy * 2 : state === 'listening' ? 1.6 : state === 'thinking' ? 1.3 : 1

export interface FrameState {
  state: State
  energy: number
  strongMix: number
  t: number // detik (waktu nyata)
  reduced?: boolean
  images: PlateImages
  veins?: CanvasImageSource | null
  rings?: CanvasImageSource | null
  /** F-164b: sumber mask siluet (art mentah), bukan kanvas urat yang lebih redup */
  maskSrc?: CanvasImageSource & { width: number; height: number }
}

/**
 * Mask siluet plate (F-155). Live TIDAK menampilkan plate dengan latar hitam opak: kanvas plate
 * 900×900 di live punya alfa 0 pada 48,9 % piksel dan 255 pada 45,1 % (rerata 76) — jadi hanya
 * siluet figurnya yang opak, sisanya transparan. Bundle membangun mask ini di kanvas bantu
 * (`putImageData` → turun/naik skala → `destination-in`). Kita bangun dari luminansi plate idle
 * dengan cara yang sama: ambang lunak + blur lewat down/up-sample.
 */
const maskBuf: { c: HTMLCanvasElement | null; key: string } = { c: null, key: '' }
function siluetMask(img: CanvasImageSource & { width: number; height: number }, w: number, h: number) {
  const key = `${w}x${h}`
  if (maskBuf.c && maskBuf.key === key) return maskBuf.c
  // F-163b: mask dibangun di resolusi 1/2 (bukan 1/8). Pada 1/8, goresan tipis rata-rata
  // turun di bawah ambang → siluet berlubang (alfa 255 hanya 7,6 %, live 20,8 %).
  const sw = Math.max(2, Math.round(w / 2))
  const sh = Math.max(2, Math.round(h / 2))
  const small = document.createElement('canvas')
  small.width = sw
  small.height = sh
  const sg = small.getContext('2d', { willReadFrequently: true })!
  sg.drawImage(img, 0, 0, sw, sh)
  const data = sg.getImageData(0, 0, sw, sh)
  const d = data.data
  for (let i = 0; i < d.length; i += 4) {
    const l = Math.max(d[i], d[i + 1], d[i + 2]) / 255
    // F-163 (P11) — TERUKUR: siluet plate live jauh lebih pekat daripada milik kita.
    // Tangkapan alfa (omitBackground, kanvas plate saja, 390x844):
    //   live: alfa 0 pada 71,9 % · alfa 255 pada 20,8 % · rerata 57,6
    //   kita (ramp 0,06–0,22): alfa 0 79,6 % · 255 3,6 % · rerata 24,4  ⇒ terlalu tipis
    // Ramp dipertajam supaya bagian dalam tubuh benar-benar opak seperti live.
    const a = Math.max(0, Math.min(1, (l - 0.06) / 0.04))
    d[i] = 255
    d[i + 1] = 255
    d[i + 2] = 255
    d[i + 3] = Math.round(a * 255)
  }
  sg.putImageData(data, 0, 0)
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const g = c.getContext('2d')!
  g.imageSmoothingEnabled = true
  g.drawImage(small, 0, 0, w, h)
  maskBuf.c = c
  maskBuf.key = key
  return c
}

/** ht() */
/**
 * F-162 (P11) — TERUKUR: plate live praktis HITAM di semua state.
 * Lapisan plate live 390x390 diukur sendirian (canvas[1] saja, 5 bingkai median):
 *   idle 1,78 · thinking 1,98 · speaking 1,97  (piksel >100: 925 / 978 / 978)
 * sedangkan plate kita menggambar ulang figur: idle 7,71 · thinking 9,04 · speaking 9,44
 * (piksel >100: 7 021 / 10 163 / 11 300). Artinya di live plate hanya **mask oklusi**
 * (siluet gelap yang menahan butiran latar), bukan gambar; figur & seluruh efek state
 * datang dari kanvas GPU. Jadi bawaan kini siluet saja; `?pl=0` mengembalikan perilaku lama.
 */
export const siluetSaja =
  typeof window === 'undefined' || new URLSearchParams(window.location.search).get('pl') !== '0'

export function drawState(ctx: CanvasRenderingContext2D, w: number, h: number, f: FrameState) {
  const { state, energy, strongMix, t, reduced, images, veins, rings } = f
  // F-155 (P11, TERUKUR probe-alpha3 @ live): kanvas plate live 900x900 punya alfa 0 pada
  // 48,9 % piksel dan 255 pada 45,1 % (rerata alfa 76). Artinya plate TIDAK pernah mengisi
  // latar hitam opak; ia digambar di atas latar transparan. `fillRect('#000')` kita membuat
  // seluruh kotak 900x900 opak (alfa 255 = 100 %, rerata 159,5) sehingga kanvas figur
  // menutupi kanvas backdrop. Diganti clearRect: alpha tetap transparan di luar siluet.
  ctx.clearRect(0, 0, w, h)
  const breath = reduced ? 1 : 1 + Math.sin(t * 0.95) * 0.0035
  drawScaled(ctx, images.idle, w, h, 1, breath)

  if (state === 'listening' && rings) {
    drawListeningRings(ctx, rings, w, h, t, breath, reduced)
  } else if (state === 'thinking') {
    const v = reduced ? 1 : 0.88 + Math.sin(t * 2.1) * 0.12
    drawClipped(ctx, images.thinking, w, h, 0.54 + v * 0.1, { x: 0.5, y: 0.4, rx: 0.19, ry: 0.2 }, 0.994 + v * 0.006)
  } else if (state === 'speaking') {
    drawClipped(ctx, images.speaking, w, h, 0.42 + (1 - strongMix) * 0.13, { x: 0.5, y: 0.43, rx: 0.2, ry: 0.19 })
    drawClipped(ctx, images.strong, w, h, strongMix * 0.68, { x: 0.5, y: 0.43, rx: 0.21, ry: 0.2 })
  }

  if (!reduced) drawCore(ctx, w, h, t, 0.55, coreScale(state, energy), 0, MOTES)

  if (veins) {
    const a = reduced
      ? 0.18
      : state === 'speaking'
        ? 0.08 + energy * 0.6
        : state === 'listening'
          ? 0.16 + Math.sin(t * 4.6) * 0.14
          : 0.1 + Math.sin(t * 2) * 0.1
    if (a > 0.015) {
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      ctx.globalAlpha = Math.max(0, Math.min(1, a))
      ctx.drawImage(veins, 0, 0, w, h)
      ctx.restore()
    }
  }
  // F-155: potong latar — hanya siluet yang opak, sama seperti plate live.
  ctx.globalAlpha = 1
  ctx.globalCompositeOperation = 'destination-in'
  ctx.drawImage(siluetMask((f.maskSrc || images.idle) as any, w, h), 0, 0, w, h)
  ctx.globalCompositeOperation = 'source-over'

  // F-157 (?pl=1): di live kanvas plate 900x900 praktis HITAM — alfa 45 % opak tetapi luminansi
  // rata-rata hanya 1,71 (bandingkan figur 22,8). Artinya plate dipakai sebagai MASK OKLUSI
  // (siluet gelap yang menahan butiran backdrop menembus tubuh), bukan sebagai gambar tampak.
  if (siluetSaja) {
    ctx.globalCompositeOperation = 'source-in'
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, w, h)
    ctx.globalCompositeOperation = 'source-over'
  }
}

// ---------------------------------------------------------------------------
// Crossfade antar state (bundle: `ne = {to, p, dur}`, dur .7 / 1.2 / .95)
// ---------------------------------------------------------------------------

export const transitionDuration = (to: State) => (to === 'speaking' ? 0.7 : to === 'idle' ? 1.2 : 0.95)

export interface Fade {
  to: State
  p: number
  dur: number
}

export function createFade(state: State): Fade {
  return { to: state, p: 1, dur: 0.95 }
}

/** Menggambar frame transisi; mengembalikan Fade yang sudah dimajukan. */
export function drawTransition(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  fade: Fade,
  dt: number,
  frame: FrameState,
  previous: HTMLCanvasElement,
  next: HTMLCanvasElement,
  glow: HTMLCanvasElement,
  mask: HTMLCanvasElement
): Fade {
  const p = Math.min(1, fade.p + dt / fade.dur)
  const bctx = next.getContext('2d')!
  bctx.globalCompositeOperation = 'source-over'
  bctx.setTransform(1, 0, 0, 1, 0, 0)
  drawState(bctx, w, h, { ...frame, state: fade.to })

  const cx = w * 0.5
  const cy = h * 0.43
  const radius = Math.hypot(w * 0.55, h * 0.62)
  const r0 = smoothstep(p) * radius
  const band = Math.max(w, h) * 0.26

  const gctx = glow.getContext('2d')!
  gctx.setTransform(1, 0, 0, 1, 0, 0)
  gctx.globalCompositeOperation = 'source-over'
  gctx.clearRect(0, 0, w, h)
  gctx.drawImage(next, 0, 0)
  const grad = gctx.createRadialGradient(cx, cy, Math.max(0, r0 - band * 0.5), cx, cy, r0 + band * 0.5)
  grad.addColorStop(0, 'rgba(255,255,255,0)')
  grad.addColorStop(0.5, 'rgba(255,255,255,1)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  gctx.globalCompositeOperation = 'destination-in'
  gctx.fillStyle = grad
  gctx.fillRect(0, 0, w, h)

  const mctx = mask.getContext('2d')!
  mctx.setTransform(1, 0, 0, 1, 0, 0)
  mctx.clearRect(0, 0, w, h)
  const mg = mctx.createRadialGradient(cx, cy, Math.max(0, r0 - band), cx, cy, r0 + band * 0.4)
  mg.addColorStop(0, 'rgba(255,255,255,1)')
  mg.addColorStop(1, 'rgba(255,255,255,0)')
  mctx.fillStyle = mg
  mctx.fillRect(0, 0, w, h)
  bctx.globalCompositeOperation = 'destination-in'
  bctx.setTransform(1, 0, 0, 1, 0, 0)
  bctx.drawImage(mask, 0, 0)
  bctx.globalCompositeOperation = 'source-over'

  ctx.drawImage(previous, 0, 0, w, h)
  ctx.drawImage(next, 0, 0, w, h)
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.globalAlpha = 0.2
  ctx.drawImage(glow, 0, 0, w, h)
  ctx.restore()
  ctx.globalAlpha = 1
  return { ...fade, p }
}

const smoothstep = (i: number) => {
  const e = Math.max(0, Math.min(1, i))
  return e * e * (3 - 2 * e)
}
