const { chromium } = require('playwright');
const fs=require('fs');
(async()=>{
  const b=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--disable-dev-shm-usage']});
  for (const st of ['idle','thinking','speaking','strong','listening']) {
    const ctx=await b.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1,reducedMotion:'reduce'});
    const p=await ctx.newPage();
    await p.goto(`https://apex-humanoid.vercel.app/?state=${st}`,{waitUntil:'load'});
    await p.waitForTimeout(900); await p.click('button');
    await p.waitForFunction(()=>!document.body.innerText.includes('ASSEMBLING'),{timeout:25000}).catch(()=>{});
    await p.waitForTimeout(3000);
    const dataUrl = await p.evaluate(()=>{
      const cs=[...document.querySelectorAll('canvas')];
      for (const c of cs) { try { const g=c.getContext('2d'); if(g){ const d=c.toDataURL('image/png'); return {w:c.width,h:c.height,url:d}; } } catch(e){} }
      return null;
    });
    if (dataUrl) {
      fs.writeFileSync(`/tmp/liveplate-${st}.png`, Buffer.from(dataUrl.url.split(',')[1],'base64'));
      console.log(`${st}: ${dataUrl.w}x${dataUrl.h} → /tmp/liveplate-${st}.png`);
    } else console.log(`${st}: tidak ada canvas 2d yang bisa dibaca`);
    await ctx.close();
  }
  await b.close();
})().catch(e=>{console.error('FATAL',e.message);process.exit(1)});
