const { chromium } = require('playwright')
;(async () => {
  const b=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--disable-dev-shm-usage','--mute-audio']})
  const p=await (await b.newContext({viewport:{width:1440,height:900}})).newPage()
  await p.goto('http://127.0.0.1:5180/?auto=1&state=idle',{waitUntil:'networkidle'})
  await p.waitForTimeout(5000)
  const stats = await p.evaluate(() => {
    const g = window.__HUM_BG_GEO
    let gold=0, cyan=0
    for (let i=0;i<g.count;i++){
      const r=g.aCol[i*3], gg=g.aCol[i*3+1], b=g.aCol[i*3+2]
      if (r>b*1.25 && r*255>100) gold++; else cyan++
    }
    // gambar proyeksi 2D (pakai uMap live untuk 1440x900)
    const uMap = [2.2210414452709886,-2,-1.1105207226354943,1]
    const c = document.createElement('canvas'); c.width=1440; c.height=900
    const x = c.getContext('2d'); x.fillStyle='#000'; x.fillRect(0,0,1440,900)
    for (let i=0;i<g.count;i++){
      const nx = g.aUv[i*2]*uMap[0]+uMap[2], ny = g.aUv[i*2+1]*uMap[1]+uMap[3]
      const px = (nx*0.5+0.5)*1440, py = (1-(ny*0.5+0.5))*900
      x.fillStyle = `rgb(${Math.round(g.aCol[i*3]*255)},${Math.round(g.aCol[i*3+1]*255)},${Math.round(g.aCol[i*3+2]*255)})`
      x.fillRect(px, py, 1, 1)
    }
    return {count:g.count, gold, cyan, data:c.toDataURL('image/png')}
  })
  console.log('count',stats.count,'gold',stats.gold,'cyan',stats.cyan)
  const fs=require('fs')
  fs.writeFileSync('/home/user/Kerja-Arena/verification/step8/build-geo2d.png', Buffer.from(stats.data.split(',')[1],'base64'))
  await b.close()
})()
