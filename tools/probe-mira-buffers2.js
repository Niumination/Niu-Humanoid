/** probe-mira-buffers2.js — dump penuh buffer yang berbentuk mesh garis (7584 verteks). */
const { chromium } = require('/home/user/tools/node_modules/playwright')
const fs = require('fs')
const WANT = new Set([22752, 15168, 7584, 22248])
const INIT = () => {
  window.__BUF = []
  const P = WebGL2RenderingContext.prototype
  const bd = P.bufferData, bsd = P.bufferSubData
  const note = (kind, arr, extra) => {
    if (!arr || !arr.length || ![22752, 15168, 7584, 22248].includes(arr.length)) return
    const b = new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength)
    let s = ''
    for (let i = 0; i < b.length; i += 8192) s += String.fromCharCode.apply(null, b.subarray(i, i + 8192))
    window.__BUF.push({ kind, len: arr.length, type: arr.constructor.name, extra, b64: btoa(s) })
  }
  P.bufferData = function (tgt, src, usage) { note('data', src); return bd.apply(this, arguments) }
  P.bufferSubData = function (tgt, off, src) { note('sub', src, off); return bsd.apply(this, arguments) }
}
;(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--mute-audio'] })
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
  await p.addInitScript(INIT)
  await p.goto('https://mira-humanoid.vercel.app/?auto=1&state=idle', { waitUntil: 'networkidle', timeout: 120000 })
  await p.waitForTimeout(12000)
  const buf = await p.evaluate(() => window.__BUF)
  await b.close()
  const out = []
  buf.forEach((x, i) => {
    const f = `/tmp/mira-wire-buf-${x.type}-${x.len}-${i}.bin`
    fs.writeFileSync(f, Buffer.from(x.b64, 'base64'))
    out.push({ ...x, b64: undefined, file: f })
  })
  fs.writeFileSync('/home/user/Kerja-Arena/recon/mira-wire-buffers2.json', JSON.stringify(out, null, 1))
  console.log(out.map(o => `${o.type} ${o.len} -> ${o.file}`).join('\n'))
})()
