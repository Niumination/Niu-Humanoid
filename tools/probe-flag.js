const { chromium } = require('playwright');
(async()=>{
  const b=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--disable-dev-shm-usage']});
  const ctx=await b.newContext({viewport:{width:900,height:700}});
  const p=await ctx.newPage();
  await p.goto('https://apex-humanoid.vercel.app/?skip&state=listening&bgrest=0.3&surge=1.5',{waitUntil:'load'});
  await p.waitForTimeout(600);
  console.log('BEFORE click:', await p.evaluate(()=>({skip:window.__HUM_SKIP_ASSEMBLY,nobg:window.__HUM_NO_BG,rest:window.__HUM_BG_REST,surge:window.__HUM_SURGE,blend:window.__HUM_BLEND,freeze:window.__HUM_FREEZE_T})));
  await p.click('button'); await p.waitForTimeout(1200);
  console.log('AFTER  click:', await p.evaluate(()=>({skip:window.__HUM_SKIP_ASSEMBLY,blend:window.__HUM_BLEND,status:document.body.innerText.match(/STATUS: [A-Z]+|ASSEMBLING\.\.\. \d+%/)?.[0]})));
  await b.close();
})().catch(e=>{console.error('FATAL',e.message);process.exit(1)});
