const { chromium } = require('playwright')
const OUT='/home/user/Kerja-Arena/verification/step5'
const LIVE='https://apex-humanoid.vercel.app/'
const BUILD='http://127.0.0.1:5180/'
;(async () => {
  const b=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--disable-dev-shm-usage','--mute-audio']})
  const ctx=await b.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'})
  const shot=async(url,file)=>{const p=await ctx.newPage();await p.goto(url,{waitUntil:'networkidle'});await p.waitForTimeout(1500);await p.screenshot({path:file});await p.close()}
  for (const st of ['idle','listening','thinking','speaking']) {
    await shot(`${LIVE}?auto=1&skip=1&state=${st}`,`${OUT}/1440-live-${st}.png`)
    await shot(`${LIVE}?auto=1&skip=1&state=${st}`,`${OUT}/1440-live2-${st}.png`)
    await shot(`${BUILD}?auto=1&skip=1&state=${st}`,`${OUT}/1440-build-${st}.png`)
    console.log('ok', st)
  }
  await b.close()
})()
