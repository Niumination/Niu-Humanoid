const { chromium } = require('playwright')
;(async () => {
  const b = await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--disable-dev-shm-usage','--mute-audio']})
  const page = await (await b.newContext({viewport:{width:1440,height:900}})).newPage()
  await page.goto('http://127.0.0.1:5180/?auto=1&skip=1&state=idle',{waitUntil:'networkidle'})
  await page.waitForTimeout(1500)
  const r = await page.evaluate(async () => {
    // hitung frame app: bungkus requestAnimationFrame? cukup andalkan p yang berubah
    const samples = []
    const t0 = performance.now()
    let rafCount = 0
    const tick = () => { rafCount++; if (performance.now()-t0 < 1000) requestAnimationFrame(tick) }
    requestAnimationFrame(tick)
    await new Promise(r => setTimeout(r, 1000))
    // ukur pertumbuhan p saat fade berjalan
    window.dispatchEvent(new CustomEvent('hum:set-state', {detail:'thinking'}))
    const t1 = performance.now()
    const ps = []
    while (performance.now() - t1 < 600) {
      const f = window.__HUM_FADE || {}
      ps.push({t: Math.round(performance.now()-t1), p: +(f.p||0).toFixed(3), dt: f.dt})
      await new Promise(r => setTimeout(r, 60))
    }
    return { probesRafPerSec: rafCount, ps }
  })
  console.log('probe rAF/detik =', r.probesRafPerSec)
  console.log(r.ps.map(x=>`${x.t}ms p=${x.p} dt=${x.dt}`).join('\n'))
  await b.close()
})()
