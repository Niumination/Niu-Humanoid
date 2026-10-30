/** probe-mira-buffers.js — tangkap SEMUA upload array verteks di live, simpan yang besar (>10k float). */
const { chromium } = require('/home/user/tools/node_modules/playwright')
const fs = require('fs')
const INIT = () => {
  window.__BUF = []
  const P = WebGL2RenderingContext.prototype
  const bd = P.bufferData, bsd = P.bufferSubData
  const note = (kind, tgt, arr, extra) => {
    if (!arr || !arr.length || arr.length < 10000) return
    const F = arr instanceof Float32Array ? 'f32' : arr instanceof Uint32Array ? 'u32' : arr instanceof Uint16Array ? 'u16' : arr.constructor.name
    window.__BUF.push({ kind, tgt, len: arr.length, type: F, extra, head: Array.from(arr.slice(0, 6)) })
  }
  P.bufferData = function (tgt, src, usage) { note('data', tgt, src); return bd.apply(this, arguments) }
  P.bufferSubData = function (tgt, off, src) { note('sub', tgt, src, off); return bsd.apply(this, arguments) }
}
;(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--mute-audio'] })
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
  await p.addInitScript(INIT)
  await p.goto('https://mira-humanoid.vercel.app/?auto=1&state=idle', { waitUntil: 'networkidle', timeout: 120000 })
  await p.waitForTimeout(12000)
  const buf = await p.evaluate(() => window.__BUF)
  fs.writeFileSync('/home/user/Kerja-Arena/recon/mira-wire-buffers.json', JSON.stringify(buf, null, 1))
  const seen = {}
  for (const x of buf) { const k = `${x.type}:${x.len}`; seen[k] = (seen[k] || 0) + 1 }
  console.log(JSON.stringify(seen, null, 1))
  console.log('total uploads', buf.length)
  await b.close()
})()
