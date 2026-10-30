const { chromium } = require('playwright')
;(async () => {
  const b=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--disable-dev-shm-usage','--mute-audio']})
  const page=await (await b.newContext({viewport:{width:1440,height:900}})).newPage()
  await page.goto('http://127.0.0.1:5180/?auto=1&state=idle',{waitUntil:'networkidle'})
  await page.waitForTimeout(6000)
  const r = await page.evaluate(() => {
    const g = window.__HUM_BG_GEO
    if (!g) return null
    let baseSum=0, szSum=0, tw1=0
    for (let i=0;i<g.count;i++){ baseSum+=g.aBase[i]; szSum+=g.aSz[i]; if (g.aTw[i]>0.75) tw1++ }
    // ambil beberapa titik untuk melihat distribusi uv
    const uv=[]; for (let i=0;i<10;i++) uv.push([+g.aUv[i*2].toFixed(3), +g.aUv[i*2+1].toFixed(3)])
    return {count:g.count, aspect:+g.aspect.toFixed(3), avgBase:+(baseSum/g.count).toFixed(3),
            avgSz:+(szSum/g.count).toFixed(2), tw1, uv}
  })
  console.log(JSON.stringify(r,null,1))
  await b.close()
})()
