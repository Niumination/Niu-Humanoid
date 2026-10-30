/** gate-mira-step2.js — verifikasi mesin garis MIRA: angka live vs rebuild + tangkapan layar. */
const { chromium } = require('/home/user/tools/node_modules/playwright')
const fs = require('fs')
const LIVE = 'https://mira-humanoid.vercel.app/?auto=1&state=idle'
const BUILD = 'http://127.0.0.1:5190/?auto=1&state=idle'
const OUT = '/home/user/Kerja-Arena/verification/mira'
const INIT = () => {
  window.__DE = []
  const P = WebGL2RenderingContext.prototype
  const de = P.drawElements
  P.drawElements = function (m, c, t, o) { if (c > 1000) window.__DE.push(c); return de.apply(this, arguments) }
}
;(async () => {
  fs.mkdirSync(OUT, { recursive: true })
  const b = await chromium.launch({ args: ['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--mute-audio'] })
  const res = {}
  for (const [tag, url] of [['live', LIVE], ['build', BUILD]]) {
    const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
    const logs = []
    p.on('console', (m) => logs.push(m.text()))
    await p.addInitScript(INIT)
    await p.goto(url, { waitUntil: 'networkidle', timeout: 120000 })
    await p.waitForTimeout(10000)
    const de = await p.evaluate(() => [...new Set(window.__DE)].sort((a, b) => a - b))
    await p.screenshot({ path: `${OUT}/${tag}-step2.png` })
    res[tag] = { trace: logs.find((l) => /traced .* outline/.test(l)) || null, drawElements: de, wire: await p.evaluate(() => window.__MIRA_WIRE || null) }
    await p.close()
  }
  await b.close()
  console.log(JSON.stringify(res, null, 1))
  // debu = sampel acak (Poisson) → jumlah wajar beda tiap run; yang wajib sama adalah garis & warnanya
  const norm = (t) => (t || '').replace(/in \d+ ms/, '').replace(/\d+ dust grains/, 'N dust grains')
  const ok = norm(res.live.trace) === norm(res.build.trace)
  res.traceMatch = ok
  res.dust = { live: res.live.trace && +res.live.trace.match(/(\d+) dust/)[1], build: res.build.trace && +res.build.trace.match(/(\d+) dust/)[1] }
  console.log(ok ? '✅ garis & warna identik (debu: sampel acak, lihat .dust)' : '⛔ pesan trace BEDA', JSON.stringify(res.dust))
  console.log('drawElements>1000  live', res.live.drawElements, ' build', res.build.drawElements)
  fs.writeFileSync(`${OUT}/gate-step2.json`, JSON.stringify(res, null, 1))
})()
