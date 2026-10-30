const { chromium } = require('/home/user/tools/node_modules/playwright')
const cases = JSON.parse(process.argv[2])
;(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'] })
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
  for (const c of cases) {
    await p.addInitScript((cc) => { window.__HUM_BG_T = 3.0; window.__HUM_BLOOM_K = cc.b; window.__HUM_SIZE_K = cc.s }, c)
    await p.goto('http://127.0.0.1:5180/?auto=1&state=idle&surge=1.5', { waitUntil: 'load' })
    await p.waitForTimeout(12000)
    await p.screenshot({ path: `/home/user/Kerja-Arena/verification/step8/tune-${c.s}-${c.b}.png` })
    console.log('ok', c.s, c.b)
  }
  await b.close()
})()
