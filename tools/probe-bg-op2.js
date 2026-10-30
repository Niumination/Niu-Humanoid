const { chromium } = require('/home/user/tools/node_modules/playwright')
;(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'] })
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
  await p.addInitScript(() => {
    window.__HUM_BG_T = 3.0
    window.__seen = []
    const t0 = performance.now()
    const tick = () => {
      const c = document.querySelector('[data-testid="backdrop-canvas"]')
      if (c) window.__seen.push([Math.round(performance.now() - t0), getComputedStyle(c).opacity])
      if (performance.now() - t0 < 12000) setTimeout(tick, 250)
    }
    document.addEventListener('DOMContentLoaded', () => setTimeout(tick, 100))
  })
  await p.goto('http://127.0.0.1:5180/?auto=1&state=idle&surge=1.5', { waitUntil: 'networkidle', timeout: 60000 })
  await p.waitForTimeout(13000)
  const s = await p.evaluate(() => window.__seen.filter((x, i) => i % 4 === 0 || x[1] !== '0'))
  console.log(JSON.stringify(s))
  await b.close()
})()
