/**
 * lib/edge — port VERBATIM lapisan "edge particles" APEX.
 *
 *   AU(img)  → titik tepi siluet dari kanvas 384×384 (kiri/kanan tiap baris,
 *              atas tiap 2 kolom) + normal, ambang r+g+b>80 dan b>=r
 *   PU(pts)  → 380 partikel berpendar (seed 51733), tiap partikel: t,rate,amp,wob,size,bright
 *   drawEdgeParticles(...) → setara at(fe,Ye,_e,Te,nt,Pe) di bundle:
 *              p.t += dt*rate*speed ; vt = sin(PI*(p.t%1))
 *              x = (e.x + e.nx*vt*amp + e.ny*Ot)   , Ot = sin(p.t*4.1)*wob
 *              alpha = Pe*(.18+.58*vt)*(bright?1.3:1) ; r = size*min(W,H)/1000
 */
export interface EdgePoint { x: number; y: number; nx: number; ny: number }
export interface EdgeParticle {
  e: EdgePoint; t: number; rate: number; amp: number; wob: number; size: number; bright: boolean
}

export function buildEdgePoints(
  img: CanvasImageSource & { width: number; height: number }
): EdgePoint[] {
  const n = document.createElement('canvas')
  n.width = 384
  n.height = 384
  const r = n.getContext('2d', { willReadFrequently: true })!
  r.drawImage(img, 0, 0, 384, 384)
  const o = r.getImageData(0, 0, 384, 384).data
  const lit = (d: number, p: number) => {
    const m = (p * 384 + d) * 4
    return o[m] + o[m + 1] + o[m + 2] > 80 && o[m + 2] >= o[m]
  }
  const f: EdgePoint[] = []
  for (let d = 6; d < 380; d += 1) {
    for (let p = 4; p < 380; p++)
      if (lit(p, d)) {
        f.push({ x: p / 384, y: d / 384, nx: -1, ny: 0 })
        break
      }
    for (let p = 379; p >= 4; p--)
      if (lit(p, d)) {
        f.push({ x: p / 384, y: d / 384, nx: 1, ny: 0 })
        break
      }
  }
  for (let d = 6; d < 378; d += 2)
    for (let p = 4; p < 380; p++)
      if (lit(d, p)) {
        f.push({ x: d / 384, y: p / 384, nx: 0, ny: -1 })
        break
      }
  return f
}

export function buildEdgeParticles(pts: EdgePoint[]): EdgeParticle[] {
  if (!pts || !pts.length) return []
  let e = 51733
  const t = () => ((e = (e * 16807) % 2147483647), (e - 1) / 2147483646)
  return Array.from({ length: 380 }, () => {
    const p: EdgeParticle = {
      e: pts[Math.floor(t() * pts.length)],
      t: t() * 8,
      rate: 0.22 + t() * 0.5,
      amp: 0.012 + t() * 0.026,
      wob: 0.003 + t() * 0.006,
      size: 0.6 + t() * 1.3,
      bright: t() < 0.15,
    }
    return p
  })
}

export function drawEdgeParticles(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  dt: number,
  state: string,
  energy: number,
  intensity: number,
  particles: EdgeParticle[],
  accent = '#19ddff'
) {
  if (!particles || !particles.length || intensity <= 0.01) return
  const speed =
    state === 'speaking' ? 2.6 + energy * 3 : state === 'listening' ? 2 : state === 'thinking' ? 1.5 : 1
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  for (const p of particles) {
    p.t += dt * p.rate * speed
    const pt = p.t % 1
    const vt = Math.sin(Math.PI * pt)
    const Ot = Math.sin(p.t * 4.1) * p.wob
    const x = (p.e.x + p.e.nx * vt * p.amp + p.e.ny * Ot) * W
    const y = (p.e.y + p.e.ny * vt * p.amp + p.e.nx * Ot) * H
    ctx.globalAlpha = Math.min(1, intensity * (0.18 + 0.58 * vt) * (p.bright ? 1.3 : 1))
    ctx.fillStyle = p.bright ? '#d8fbff' : accent
    ctx.beginPath()
    ctx.arc(x, y, p.size * Math.min(W, H) / 1000, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
  ctx.globalAlpha = 1
}
