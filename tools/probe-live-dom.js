const { chromium } = require('playwright')
;(async () => {
  const b = await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--disable-dev-shm-usage','--mute-audio']})
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
  for (const [label,url] of [['live','https://apex-humanoid.vercel.app/?auto=1&state=idle'],['build','http://127.0.0.1:5180/?auto=1&state=idle']]) {
    const p = await ctx.newPage()
    await p.goto(url,{waitUntil:'networkidle',timeout:120000}); await p.waitForTimeout(8000)
    const r = await p.evaluate(() => {
      const out = []
      document.querySelectorAll('canvas').forEach((c,i)=>{
        const s = getComputedStyle(c)
        out.push({i, w:c.width, h:c.height, cw:c.clientWidth, ch:c.clientHeight, opacity:s.opacity,
                  blend:s.mixBlendMode, z:s.zIndex, pos:s.position, transform:s.transform.slice(0,40)})
      })
      const imgs = [...document.querySelectorAll('img')].map(im=>{
        const s=getComputedStyle(im); return {src:im.currentSrc.split('/').pop(), opacity:s.opacity, blend:s.mixBlendMode, filter:s.filter, w:im.clientWidth, h:im.clientHeight}
      })
      return {canvases: out, imgs, dpr: window.devicePixelRatio}
    })
    console.log('==',label, 'dpr',r.dpr)
    console.log(JSON.stringify(r.canvases))
    console.log('imgs', JSON.stringify(r.imgs))
    await p.close()
  }
  await b.close()
})()
