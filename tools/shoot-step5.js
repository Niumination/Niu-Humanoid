const { chromium } = require('playwright')
const fs=require('fs')
;(async () => {
  const out='/home/user/Kerja-Arena/verification/step5'
  fs.mkdirSync(out,{recursive:true})
  const b=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required','--mute-audio']})
  const ctx=await b.newContext({viewport:{width:1440,height:900},reducedMotion:'no-preference'})
  const page=await ctx.newPage()
  page.on('console',m=>{ if(m.type()==='error') console.log('PAGE ERR', m.text().slice(0,200)) })
  page.on('pageerror',e=>console.log('PAGEERROR', String(e).slice(0,200)))
  for (const st of ['idle','listening','thinking','speaking']) {
    await page.goto(`http://127.0.0.1:5180/?auto=1&skip=1&state=${st}`,{waitUntil:'networkidle'})
    await page.waitForTimeout(1800)
    const txt = await page.locator('div[aria-live]').first().textContent().catch(()=>null)
    await page.screenshot({path:`${out}/build-${st}.png`})
    console.log(st, '| HUD =', JSON.stringify(txt))
  }
  await b.close()
})()
