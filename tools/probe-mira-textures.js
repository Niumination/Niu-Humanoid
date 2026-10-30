/** probe-mira-textures.js — simpan isi semua tekstur kanvas/gambar yang diunggah live (PNG). */
const { chromium } = require('/home/user/tools/node_modules/playwright')
const fs = require('fs')
const OUT = '/home/user/Kerja-Arena/recon/ground-truth/mira/textures'
const INIT = () => {
  window.__TX = []
  const P = WebGL2RenderingContext.prototype
  const ts = P.texSubImage2D, ti = P.texImage2D
  const grab = (src) => {
    try {
      if (src instanceof HTMLCanvasElement) {
        const c = document.createElement('canvas')
        c.width = src.width; c.height = src.height
        c.getContext('2d').drawImage(src, 0, 0)
        return { kind: 'canvas', w: src.width, h: src.height, data: c.toDataURL('image/png') }
      }
      if (src instanceof HTMLImageElement) return { kind: 'image', w: src.width, h: src.height, src: src.currentSrc || src.src }
    } catch (e) { return { kind: 'err', msg: String(e).slice(0, 120) } }
    return null
  }
  P.texSubImage2D = function (...a) {
    const src = a[6] ?? a[8]
    const g = grab(src)
    if (g) window.__TX.push(g)
    return ts.apply(this, a)
  }
  P.texImage2D = function (...a) {
    const src = a[5] ?? a[8]
    const g = grab(src)
    if (g) window.__TX.push(g)
    return ti.apply(this, a)
  }
}
;(async () => {
  fs.mkdirSync(OUT, { recursive: true })
  const b = await chromium.launch({ args: ['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--mute-audio'] })
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
  await p.addInitScript(INIT)
  await p.goto('https://mira-humanoid.vercel.app/?auto=1&state=idle', { waitUntil: 'networkidle', timeout: 120000 })
  await p.waitForTimeout(9000)
  const tx = await p.evaluate(() => window.__TX)
  await b.close()
  const list = []
  tx.forEach((t, i) => {
    if (t.kind === 'canvas') {
      const f = `${OUT}/${String(i).padStart(2, '0')}-canvas-${t.w}x${t.h}.png`
      fs.writeFileSync(f, Buffer.from(t.data.split(',')[1], 'base64'))
      list.push({ i, kind: t.kind, w: t.w, h: t.h, file: f.split('/').pop() })
    } else if (t.kind === 'image') {
      list.push({ i, kind: t.kind, w: t.w, h: t.h, src: t.src })
    } else list.push({ i, ...t })
  })
  fs.writeFileSync(`${OUT}/index.json`, JSON.stringify(list, null, 1))
  console.log(list.map(x => JSON.stringify(x)).join('\n'))
})()
