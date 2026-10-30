const { chromium } = require('playwright')
;(async () => {
  const b = await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--disable-dev-shm-usage','--mute-audio']})
  const ctx = await b.newContext({viewport:{width:1440,height:900}})
  const page = await ctx.newPage()
  await page.goto('http://127.0.0.1:5180/?auto=1&skip=1&state=idle',{waitUntil:'networkidle'})
  await page.waitForTimeout(1500)
  const series = await page.evaluate(async () => {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms))
    const run = async (from, to) => {
      const seen = []
      window.dispatchEvent(new CustomEvent('hum:set-state', { detail: to }))
      const t0 = performance.now()
      await new Promise((res) => {
        const tick = () => {
          const f = window.__HUM_FADE || { p: 0, dur: 0, to }
          seen.push({ t: performance.now() - t0, p: f.p, dur: f.dur, to: f.to, dt: f.dt })
          if (f.p >= 1 && seen.length > 2) res()
          else if (performance.now() - t0 > 4000) res()
          else requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      })
      // durasi EFEKTIF = jumlah dt ter-clamp dari p<1 pertama sampai p>=1 pertama
      const i0 = seen.findIndex((x) => x.p > 0 && x.p < 1)
      let acc = 0
      let frames = 0
      let ended = false
      for (let i = i0; i >= 0 && i < seen.length; i++) {
        acc += seen[i].dt || 0
        frames++
        if (seen[i].p >= 1) { ended = true; break }
      }
      return {
        from, to,
        dur: i0 >= 0 ? seen[i0].dur : seen[0].dur,
        effectiveMs: i0 >= 0 ? Math.round(acc * 1000) : null,
        frames,
        ended,
      }
    }
    const a = await run('idle', 'thinking')
    await wait(300)
    const b2 = await run('thinking', 'speaking')
    await wait(300)
    const c = await run('speaking', 'idle')
    return [a, b2, c]
  })
  for (const s of series) {
    const target = s.dur * 1000
    const err = s.effectiveMs ? ((s.effectiveMs - target) / target) * 100 : null
    console.log(
      `${s.from}→${s.to}: dur=${s.dur}s target ${target} ms | efektif ${s.effectiveMs} ms (${s.frames} bingkai, selesai=${s.ended}) galat ${err === null ? '-' : err.toFixed(1) + '%'}`
    )
  }
  await b.close()
})()
