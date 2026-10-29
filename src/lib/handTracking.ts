/**
 * lib/handTracking — port VERBATIM logika gerak tangan APEX (fungsi `ie()` di bundle MU).
 *
 * Konstanta CDN (verbatim):
 *   VISION = https://esm.sh/@mediapipe/tasks-vision@0.10.14
 *   WASM   = https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm
 *   MODEL  = https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task
 * Kanvas frame worker: 256×192. Kirim frame tiap ≥80 ms (interval 40 ms). Fallback deteksi: 125 ms.
 *
 * Ambang gerak (verbatim):
 *   pinch  : dist(4,8) < dist(0,9) · 0.32 → picu; lepas saat > 0.5 · skala
 *   palm   : keempat jari (8-6, 12-10, 16-14, 20-18) memanjang > 1.12× jarak ujung–pergelangan,
 *            telapak hampir diam (Δ < 0.025), 4 frame berturut, jeda 1500 ms
 *   snap   : puncak audio > 0.22 DAN > rata-rata bergerak ×5, ≥1000 ms sejak snap terakhir,
 *            dan dalam 1500 ms setelah landmark terakhir
 */
export const HAND_CONST = {
  VISION: 'https://esm.sh/@mediapipe/tasks-vision@0.10.14',
  WASM: 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm',
  MODEL:
    'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
  FRAME_W: 256,
  FRAME_H: 192,
  FRAME_MIN_MS: 80,
  FRAME_POLL_MS: 40,
  DETECT_MS: 125,
  WORKER_TIMEOUT_MS: 20000,
  PINCH_ON: 0.32,
  PINCH_OFF: 0.5,
  FINGER_EXTEND: 1.12,
  PALM_STILL: 0.025,
  PALM_FRAMES: 4,
  PALM_COOLDOWN_MS: 1500,
  SNAP_PEAK: 0.22,
  SNAP_MULT: 5,
  SNAP_COOLDOWN_MS: 1000,
  SNAP_WINDOW_MS: 1500,
  ERROR_TEXT: 'camera unavailable',
} as const

export interface Point {
  x: number
  y: number
}

const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)

export interface GestureCallbacks {
  onPinch?: (x: number, y: number) => void
  onPalm?: () => void
  onSnap?: () => void
  /** bundle: window.__HUM_ATTN menonaktifkan umpan balik attentionRef */
  setAttention?: (x: number, y: number, hold: number) => void
}

/** Kelas dengan state — padanan variabel closure di `ie()` */
export class HandSignals {
  private lastSeen = 0
  private pinchArmed = true
  private palmFrames = 0
  private palmFired = false
  private palmLast = 0
  private prevPalm: Point | null = null
  private cb: GestureCallbacks

  constructor(cb: GestureCallbacks) {
    this.cb = cb
  }

  /** ie(landmarks, nowMs) */
  update(points: Point[] | null, now: number) {
    if (!points) {
      this.palmFrames = 0
      return
    }
    this.lastSeen = now
    const wrist = points[0]
    const thumb = points[4]
    const index = points[8]
    const palm = dist(wrist, points[9]) || 0.001

    // attention: ujung telunjuk dipetakan −1..1 (x dicerminkan, ×1.6)
    if (this.cb.setAttention) {
      const ax = Math.max(-1, Math.min(1, ((1 - index.x) * 2 - 1) * 1.6))
      const ay = Math.max(-1, Math.min(1, (index.y * 2 - 1) * 1.6))
      this.cb.setAttention(ax, ay, now)
    }

    // pinch
    const thumbIndex = dist(thumb, index)
    if (this.pinchArmed && thumbIndex < palm * HAND_CONST.PINCH_ON) {
      this.pinchArmed = false
      const px = Math.max(-1, Math.min(1, ((1 - (thumb.x + index.x) / 2) * 2 - 1) * 1.6))
      const py = Math.max(-1, Math.min(1, (((thumb.y + index.y) / 2) * 2 - 1) * 1.6))
      this.cb.onPinch?.(px, py)
    } else if (!this.pinchArmed && thumbIndex > palm * HAND_CONST.PINCH_OFF) {
      this.pinchArmed = true
    }

    // palm (telapak terbuka & diam)
    const fingersExtended = (
      [
        [8, 6],
        [12, 10],
        [16, 14],
        [20, 18],
      ] as const
    ).every(([tip, pip]) => dist(points[tip], wrist) > dist(points[pip], wrist) * HAND_CONST.FINGER_EXTEND)
    const still = this.prevPalm ? dist(wrist, this.prevPalm) < HAND_CONST.PALM_STILL : false
    this.prevPalm = { x: wrist.x, y: wrist.y }
    if (fingersExtended && still && thumbIndex > palm * HAND_CONST.PINCH_OFF) {
      this.palmFrames++
      if (
        this.palmFrames >= HAND_CONST.PALM_FRAMES &&
        !this.palmFired &&
        now - this.palmLast > HAND_CONST.PALM_COOLDOWN_MS
      ) {
        this.palmFired = true
        this.palmLast = now
        this.cb.onPalm?.()
      }
    } else {
      this.palmFrames = 0
      if (!fingersExtended) this.palmFired = false
    }
  }

  /** loop audio snap — padanan blok `z()`; `peak` = puncak |sample| jendela 1024 */
  audio(peak: number, now: number, env: { avg: number }): { avg: number; fired: boolean } {
    const fired =
      peak > HAND_CONST.SNAP_PEAK &&
      peak > env.avg * HAND_CONST.SNAP_MULT &&
      now - this.snapLast > HAND_CONST.SNAP_COOLDOWN_MS &&
      now - this.lastSeen < HAND_CONST.SNAP_WINDOW_MS
    const avg = env.avg + (peak - env.avg) * (peak > env.avg ? 0.06 : 0.02)
    if (fired) {
      this.snapLast = now
      this.cb.onSnap?.()
    }
    return { avg, fired }
  }

  private snapLast = 0
}

/** Sumber worker, verbatim dari bundle (SU). */
export const WORKER_SOURCE = `
const VISION = '${HAND_CONST.VISION}'
const WASM = '${HAND_CONST.WASM}'
const MODEL = '${HAND_CONST.MODEL}'
let landmarker = null
self.onmessage = async (e) => {
  const d = e.data
  if (d.type === 'init') {
    try {
      const vision = await import(VISION)
      const resolver = await vision.FilesetResolver.forVisionTasks(WASM)
      landmarker = await vision.HandLandmarker.createFromOptions(resolver, {
        baseOptions: { modelAssetPath: MODEL, delegate: 'CPU' }, runningMode: 'VIDEO', numHands: 1,
      })
      self.postMessage({ type: 'ready' })
    } catch { self.postMessage({ type: 'fail' }) }
  } else if (d.type === 'frame') {
    let lm = null
    try {
      const img = new ImageData(new Uint8ClampedArray(d.buf), d.w, d.h)
      const res = landmarker.detectForVideo(img, d.t)
      lm = (res && res.landmarks && res.landmarks[0]) || null
    } catch {}
    self.postMessage({ type: 'lm', lm })
  }
}
`
