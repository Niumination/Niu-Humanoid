/**
 * lib/veins — port VERBATIM bU() dari bundle APEX.
 *
 * bU(i): kanvas e×t (e = min(1100, lebar)) yang meredupkan "haze" di luar siluet.
 *   - tepi kiri/kanan tiap baris dari piksel dengan (r+g+b)>80 dan b>=r
 *   - untuk piksel di luar [left-g, right+g] (g = round(e*.015)) dengan
 *     kecerahan > 30 dan rerata kotak 13×13 < 42 → RGB *= .24
 *
 * Penting: CU() (assembly partikel) menerima KANVAS INI, bukan webp mentah.
 * Kalau diberi webp mentah, jumlah piksel >95 berubah → m = l.length/f berubah
 * → seluruh deret LCG bergeser (partikel tetap di wilayah benar, tapi tiap titik
 * berbeda; terbukti empiris: langkah 3 residual 4,5–5 %).
 */
export function buildVeinCanvas(
  img: CanvasImageSource & { width: number; height: number }
): HTMLCanvasElement {
  const e = Math.min(1100, img.width || 1100)
  const t = Math.round((e * (img.height || e)) / (img.width || e))
  const n = document.createElement('canvas')
  n.width = e
  n.height = t
  const r = n.getContext('2d', { willReadFrequently: true })!
  r.drawImage(img, 0, 0, e, t)
  const o = r.getImageData(0, 0, e, t)
  const l = o.data
  const f = new Float32Array(e * t)
  for (let v = 0, x = 0; x < e * t; v += 4, x++) f[x] = l[v] + l[v + 1] + l[v + 2]

  // integral image
  const d = new Float64Array((e + 1) * (t + 1))
  for (let v = 0; v < t; v++) {
    let x = 0
    for (let S = 0; S < e; S++) {
      x += f[v * e + S]
      d[(v + 1) * (e + 1) + (S + 1)] = d[v * (e + 1) + (S + 1)] + x
    }
  }
  // rerata kotak (2S+1)²
  const p = (v: number, x: number, S: number) => {
    const A = Math.max(0, v - S)
    const E = Math.max(0, x - S)
    const M = Math.min(e, v + S + 1)
    const C = Math.min(t, x + S + 1)
    return (
      (d[C * (e + 1) + M] - d[E * (e + 1) + M] - d[C * (e + 1) + A] + d[E * (e + 1) + A]) /
      ((M - A) * (C - E))
    )
  }
  const m = (v: number, x: number) => {
    const S = (x * e + v) * 4
    return f[x * e + v] > 80 && l[S + 2] >= l[S]
  }
  const g = Math.round(e * 0.015)
  for (let v = 0; v < t; v++) {
    let x = -1
    let S = -1
    for (let A = 2; A < e - 2; A++)
      if (m(A, v)) {
        x = A
        break
      }
    for (let A = e - 3; A >= 2; A--)
      if (m(A, v)) {
        S = A
        break
      }
    for (let A = 0; A < e; A++)
      if ((x === -1 || A < x - g || A > S + g) && f[v * e + A] > 30 && p(A, v, 6) < 42) {
        const M = (v * e + A) * 4
        l[M] *= 0.24
        l[M + 1] *= 0.24
        l[M + 2] *= 0.24
      }
  }
  r.putImageData(o, 0, 0)
  return n
}
