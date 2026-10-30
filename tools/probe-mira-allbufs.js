/** probe-mira-allbufs.js — simpan SEMUA upload buffer verteks/indeks dari live (untuk rekonstruksi geometri). */
const { chromium } = require('/home/user/tools/node_modules/playwright')
const fs = require('fs')
const DIR = '/home/user/Kerja-Arena/recon/ground-truth/mira/buffers-all'
const INIT = () => {
  window.__ALL = []
  const P = WebGL2RenderingContext.prototype
  const bd = P.bufferData
  const oGet = HTMLCanvasElement.prototype.getContext
  HTMLCanvasElement.prototype.getContext = function (t, o) {
    const c = oGet.apply(this, arguments)
    if (c && (t === 'webgl2' || t === 'webgl') && !window.__GLX) window.__GLX = c
    return c
  }
  P.bufferData = function (tgt, src, usage) {
    if ((tgt === 34962 || tgt === 34963) && src && src.byteLength) {
      const b = new Uint8Array(src.buffer, src.byteOffset, src.byteLength)
      let s = ''
      for (let i = 0; i < b.length; i += 8192) s += String.fromCharCode.apply(null, b.subarray(i, i + 8192))
      window.__ALL.push({ tgt, n: src.length, ctor: src.constructor.name, b64: btoa(s) })
    }
    return bd.apply(this, arguments)
  }
}
;(async () => {
  fs.mkdirSync(DIR, { recursive: true })
  const b = await chromium.launch({ args: ['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--mute-audio'] })
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
  await p.addInitScript(INIT)
  await p.goto('https://mira-humanoid.vercel.app/?auto=1&state=idle', { waitUntil: 'networkidle', timeout: 120000 })
  await p.waitForTimeout(9000)
  const all = await p.evaluate(() => window.__ALL)
  await b.close()
  const idx = []
  all.forEach((x, i) => {
    const f = `${DIR}/${String(i).padStart(3, '0')}-${x.ctor}-${x.n}.bin`
    fs.writeFileSync(f, Buffer.from(x.b64, 'base64'))
    idx.push({ i, file: f.split('/').pop(), tgt: x.tgt, n: x.n, ctor: x.ctor, bytes: Buffer.from(x.b64, 'base64').length })
  })
  fs.writeFileSync(`${DIR}/index.json`, JSON.stringify(idx, null, 1))
  console.log(idx.map(x => `${x.i} ${x.ctor} n=${x.n} bytes=${x.bytes} tgt=${x.tgt}`).join('\n'))
})()
