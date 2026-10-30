const { chromium } = require('/home/user/tools/node_modules/playwright')
const K = process.argv.slice(2).map(Number)
;(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'] })
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
  for (const k of K) {
    await p.addInitScript((kk) => { window.__HUM_BG_T = 3.0; window.__HUM_BLOOM_K = kk }, k)
    await p.goto('http://127.0.0.1:5180/?auto=1&state=idle&surge=1.5', { waitUntil: 'load' })
    await p.waitForTimeout(12000)
    await p.screenshot({ path: `/home/user/Kerja-Arena/verification/step8/bk-${k}.png` })
    console.log('ok', k)
  }
  await b.close()
})()
