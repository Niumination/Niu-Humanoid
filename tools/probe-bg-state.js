const { chromium } = require('/home/user/tools/node_modules/playwright')
const LIVE = 'https://apex-humanoid.vercel.app/?auto=1&state=idle&surge=1.5'
const BUILD = 'http://127.0.0.1:5180/?auto=1&state=idle&surge=1.5'
;(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'] })
  for (const [tag, url] of [['live', LIVE], ['build', BUILD]]) {
    const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
    await p.addInitScript(() => { window.__HUM_BG_T = 3.0 })
    await p.goto(url, { waitUntil: 'networkidle', timeout: 120000 })
    await p.waitForTimeout(8000)
    const st = await p.evaluate(() => {
      const imgs = [...document.querySelectorAll('img')].map(i => {
        const s = getComputedStyle(i); const r = i.getBoundingClientRect()
        return { src: i.src.split('/').pop(), op: s.opacity, blend: s.mixBlendMode, w: Math.round(r.width), h: Math.round(r.height), objPos: s.objectPosition }
      })
      const cs = [...document.querySelectorAll('canvas')].map(c => { const s = getComputedStyle(c); const r = c.getBoundingClientRect(); return { px: [c.width, c.height], box: [Math.round(r.left), Math.round(r.width)], op: s.opacity, blend: s.mixBlendMode } })
      return { imgs, cs }
    })
    console.log(tag, JSON.stringify(st, null, 1))
    await p.close()
  }
  await b.close()
})()
