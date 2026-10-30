const { chromium } = require('playwright')
;(async () => {
  const b=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--disable-dev-shm-usage','--mute-audio']})
  const p=await (await b.newContext({viewport:{width:1440,height:900}})).newPage()
  await p.goto('http://127.0.0.1:5180/?auto=1&state=idle',{waitUntil:'networkidle'})
  await p.waitForTimeout(3000)
  const r = await p.evaluate(() => {
    const c1=document.createElement('canvas'); const g1=c1.getContext('webgl')
    const c2=document.createElement('canvas'); const g2=c2.getContext('webgl2')
    const q=(gl)=>gl?{ver:gl.getParameter(gl.VERSION), pt:Array.from(gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE)), maxPt:gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE)[1]}:null
    const used = document.querySelector('[data-testid="backdrop-canvas"]')
    return {webgl1:q(g1), webgl2:q(g2), mine: used? {ctx2d:!!used.getContext('2d'), tag: used.getContext('webgl')?'webgl1':'?'} : null}
  })
  console.log(JSON.stringify(r,null,1))
  await b.close()
})()
