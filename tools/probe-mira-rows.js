/** probe-mira-rows.js — tangkap rowTexture (1×1374 RGBA32F) dari live. */
const { chromium } = require('/home/user/tools/node_modules/playwright')
const fs = require('fs')
const INIT = () => {
  window.__R = null
  const P = WebGL2RenderingContext.prototype
  const ts = P.texSubImage2D
  P.texSubImage2D = function (...a) {
    const d = a[8]
    if (d && d.length === 5496) {
      const b = new Uint8Array(d.buffer, d.byteOffset, d.byteLength)
      let s = ''
      for (let i = 0; i < b.length; i += 8192) s += String.fromCharCode.apply(null, b.subarray(i, i + 8192))
      window.__R = btoa(s)
    }
    return ts.apply(this, a)
  }
}
;(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--mute-audio'] })
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
  await p.addInitScript(INIT)
  await p.goto('https://mira-humanoid.vercel.app/?auto=1&state=idle', { waitUntil: 'networkidle', timeout: 120000 })
  await p.waitForTimeout(9000)
  const r = await p.evaluate(() => window.__R)
  await b.close()
  if (!r) return console.log('TIDAK ADA rowTexture tertangkap')
  const f = '/home/user/Kerja-Arena/recon/ground-truth/mira/rows-1x1374.f32'
  fs.writeFileSync(f, Buffer.from(r, 'base64'))
  console.log('tersimpan', f)
})()
