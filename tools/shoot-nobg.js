const { chromium } = require('playwright')
const OUT='/home/user/Kerja-Arena/verification/step8'
;(async()=>{
  const b=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--disable-dev-shm-usage','--mute-audio']})
  const ctx=await b.newContext({viewport:{width:1440,height:900}})
  for (const [name,url] of [
    ['live-bgON','https://apex-humanoid.vercel.app/?auto=1&state=idle'],
    ['live-bgOFF','https://apex-humanoid.vercel.app/?auto=1&state=idle&nobg=1'],
    ['build-steady','http://127.0.0.1:5180/?auto=1&state=idle'],
  ]) {
    const p=await ctx.newPage()
    await p.goto(url,{waitUntil:'networkidle',timeout:120000})
    await p.waitForTimeout(9000)
    await p.screenshot({path:`${OUT}/${name}.png`})
    await p.close(); console.log('ok',name)
  }
  await b.close()
})()
