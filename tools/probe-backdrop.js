const { chromium } = require('playwright')
;(async () => {
  const b=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--disable-dev-shm-usage','--mute-audio']})
  const page=await (await b.newContext({viewport:{width:1440,height:900}})).newPage()
  page.on('pageerror',e=>console.log('PAGEERROR',String(e).slice(0,300)))
  page.on('console',m=>{if(m.type()==='error')console.log('ERR',m.text().slice(0,300))})
  await page.goto('http://127.0.0.1:5180/?auto=1&state=idle',{waitUntil:'networkidle'})
  await page.waitForTimeout(9000)
  const info = await page.evaluate(() => {
    const cv = document.querySelector('[data-testid="backdrop-canvas"]')
    const img = document.querySelector('[data-testid="backdrop-still"]')
    const gl = cv && cv.getContext('webgl')
    return {
      canvas: cv ? {w:cv.width,h:cv.height,cw:cv.clientWidth,ch:cv.clientHeight,opacity:getComputedStyle(cv).opacity,blend:getComputedStyle(cv).mixBlendMode} : null,
      img: img ? {opacity:getComputedStyle(img).opacity, fit:getComputedStyle(img).objectFit, pos:getComputedStyle(img).objectPosition} : null,
      glLost: gl ? gl.isContextLost() : 'no-gl',
    }
  })
  console.log(JSON.stringify(info,null,1))
  await page.screenshot({path:'/home/user/Kerja-Arena/verification/step8/build-backdrop.png'})
  await b.close()
})()
