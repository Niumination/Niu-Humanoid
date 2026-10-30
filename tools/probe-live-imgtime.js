const { chromium } = require('/home/user/tools/node_modules/playwright')
;(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'] })
  for (const q of ['?auto=1&state=idle', '?auto=1&state=idle&surge=1.5']) {
    const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
    await p.addInitScript(() => { window.__HUM_BG_T = 3.0 })
    await p.goto('https://apex-humanoid.vercel.app/' + q, { waitUntil: 'networkidle', timeout: 120000 })
    const rows = []
    for (let i = 0; i < 14; i++) {
      await p.waitForTimeout(1000)
      rows.push(await p.evaluate(() => {
        const img = document.querySelector('img[src*="backdrop"]')
        const c = [...document.querySelectorAll('canvas')].find(x => x.width > 1000)
        return [+getComputedStyle(img).opacity, c ? +getComputedStyle(c).opacity : -1]
      }))
    }
    console.log(q, JSON.stringify(rows))
    await p.close()
  }
  await b.close()
})()
