const { chromium } = require('/home/user/tools/node_modules/playwright')
;(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'] })
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
  for (const i of [1, 2]) {
    await p.addInitScript(() => { window.__HUM_BG_T = 3.0 })
    await p.goto('http://127.0.0.1:5180/?auto=1&state=idle&surge=1.5', { waitUntil: 'load' })
    await p.waitForTimeout(13000)
    await p.screenshot({ path: `/home/user/Kerja-Arena/verification/step8/build-rep${i}.png` })
    console.log('ok', i)
  }
  await b.close()
})()
