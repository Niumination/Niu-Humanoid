const { chromium } = require('playwright')
const OUT='/home/user/Kerja-Arena/verification/step8'
;(async () => {
  const b=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--disable-dev-shm-usage','--mute-audio']})
  const ctx=await b.newContext({viewport:{width:1440,height:900}})
  const shot=async(url,file,wait=9000)=>{
    const p=await ctx.newPage(); await p.goto(url,{waitUntil:'networkidle',timeout:120000})
    await p.waitForTimeout(wait); await p.screenshot({path:file}); await p.close(); console.log('ok',file)
  }
  // isolasi titik "breath" (tw=.5): bgrest=0 & bgpulse=0 mematikan wander & rest
  await shot('https://apex-humanoid.vercel.app/?auto=1&state=idle&bgrest=0&bgpulse=0',`${OUT}/live-breathonly.png`)
  await shot('http://127.0.0.1:5180/?auto=1&state=idle&bgrest=0&bgpulse=0',`${OUT}/build-breathonly.png`)
  await shot('https://apex-humanoid.vercel.app/?auto=1&state=idle&bgrest=1&bgpulse=0',`${OUT}/live-rest1.png`)
  await shot('http://127.0.0.1:5180/?auto=1&state=idle&bgrest=1&bgpulse=0',`${OUT}/build-rest1.png`)
  await b.close()
})()
