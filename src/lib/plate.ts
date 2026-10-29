import type { AssetBag } from './assets'
import type { HumState } from './humTuning'

/**
 * lib/plate — port VERBATIM dari Im(i, state, w, h) di bundle APEX:
 *
 *   function Im(i,e,t,n){
 *     canvas w=t h=n; ctx fill "#000"; fillRect; drawImage(i.idle,0,0,t,n);
 *     l = (img, alpha, cx, cy, rx, ry) => clip ellipse(t*cx, n*cy, t*rx, n*ry)
 *          composite "lighter", globalAlpha=alpha, drawImage(img,0,0,t,n)
 *     thinking -> l(i.thinking,.628,.5,.4,.19,.2)
 *     speaking -> l(i.speaking,.55,.5,.43,.2,.19)
 *     strong   -> l(i.speaking,.42,.5,.43,.2,.19); l(i.strong,.68,.5,.43,.21,.2)
 *   }
 *
 * Lebar internal tetap 900 px (sama seperti bundle: Im(...,900,t)).
 */
export const PLATE_W = 900

/** t = Math.round(900 * idle.height / idle.width) */
export function plateHeight(bag: AssetBag): number {
  return Math.round((PLATE_W * (bag.idle.height || 900)) / (bag.idle.width || 900))
}

type EllipseSpec = [alpha: number, cx: number, cy: number, rx: number, ry: number]

const STATE_ELLIPSES: Record<string, { img: 'thinking' | 'speaking' | 'strong'; spec: EllipseSpec }[]> = {
  thinking: [{ img: 'thinking', spec: [0.628, 0.5, 0.4, 0.19, 0.2] }],
  speaking: [{ img: 'speaking', spec: [0.55, 0.5, 0.43, 0.2, 0.19] }],
  strong: [
    { img: 'speaking', spec: [0.42, 0.5, 0.43, 0.2, 0.19] },
    { img: 'strong', spec: [0.68, 0.5, 0.43, 0.21, 0.2] },
  ],
}

/** buildPlate(bag, state) — hasilnya identik dengan Im() di bundle. */
export function buildPlate(
  bag: AssetBag,
  state: string,
  /**
   * idleOverride — bundle MENGGANTI `r.current.idle` dengan `bU(idle)` (kanvas yang
   * haze pinggirnya diredupkan) sebelum `Im()`/`IU()` dipakai. Tanpa ini, seluruh
   * plate (semua state) lebih terang ~1 % di area haze.
   */
  idleOverride?: CanvasImageSource
): HTMLCanvasElement {
  const w = PLATE_W
  const h = plateHeight(bag)
  const cv = document.createElement('canvas')
  cv.width = w
  cv.height = h
  const o = cv.getContext('2d', { willReadFrequently: true })!
  o.fillStyle = '#000'
  o.fillRect(0, 0, w, h)
  o.drawImage((idleOverride ?? bag.idle) as CanvasImageSource, 0, 0, w, h)

  const ellipse = (img: HTMLImageElement | null, alpha: number, cx: number, cy: number, rx: number, ry: number) => {
    if (!img) return
    o.save()
    o.beginPath()
    o.ellipse(w * cx, h * cy, w * rx, h * ry, 0, 0, Math.PI * 2)
    o.clip()
    o.globalCompositeOperation = 'lighter'
    o.globalAlpha = alpha
    o.drawImage(img, 0, 0, w, h)
    o.restore()
    o.globalAlpha = 1
  }

  for (const { img, spec } of STATE_ELLIPSES[state] ?? []) {
    ellipse(bag[img], spec[0], spec[1], spec[2], spec[3], spec[4])
  }
  return cv
}
