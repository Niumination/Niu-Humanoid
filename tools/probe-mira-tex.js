/** probe-mira-tex.js — tangkap upload tekstur 1×N (rowTexture) dari live. */
const { chromium } = require('/home/user/tools/node_modules/playwright')
const fs = require('fs')
const INIT = () => {
  window.__TEX = []
  const P = WebGL2RenderingContext.prototype
  const ti = P.texImage2D
  P.texImage2D = function (...a) {
    // texImage2D(target, level, internalformat, width, height, border, format, type, data)
    if (a.length >= 6 && (a[3] === 1 || a[4] === 1)) {
      const [t, l, ifmt, w, h, b, fmt, type, data] = a.length === 9 ? a : [a[0],a[1],a[2],a[3],a[4],a[5],a[6],a[7],a[8]]
      const out = { w, h, ifmt, fmt, type, ctor: data && data.constructor.name, len: data && data.length }
      if (data) {
        const bytes = new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
        let s = ''
        for (let i = 0; i < bytes.length; i += 8192) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192))
        out.b64 = btoa(s)
        out.head = Array.from(data.slice(0, 12))
      }
      window.__TEX.push(out)
    }
    return ti.apply(this, arguments)
  }
}
;(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--mute-audio'] })
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
  await p.addInitScript(INIT)
  await p.goto('https://mira-humanoid.vercel.app/?auto=1&state=idle', { waitUntil: 'networkidle', timeout: 120000 })
  await p.waitForTimeout(10000)
  const tex = await p.evaluate(() => window.__TEX)
  await b.close()
  tex.forEach((t, i) => {
    const f = `/home/user/Kerja-Arena/recon/ground-truth/mira/tex-${t.w}x${t.h}-${i}.bin`
    if (t.b64) fs.writeFileSync(f, Buffer.from(t.b64, 'base64'))
    console.log(JSON.stringify({ ...t, b64: undefined, file: t.b64 ? f : null }))
  })
})()
