const { chromium } = require('playwright');
const fs=require('fs'), path=require('path');
const ROOT='/home/user/Kerja-Arena/recon/ground-truth';
(async()=>{
  const b=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--disable-dev-shm-usage']});
  const res={};
  for (const v of [{w:1440,h:900,tag:'1440x900'},{w:390,h:844,tag:'390x844'}]) {
    const dir=path.join(ROOT,'apex',v.tag); fs.mkdirSync(dir,{recursive:true});
    const ctx=await b.newContext({viewport:{width:v.w,height:v.h},deviceScaleFactor:1});
    const p=await ctx.newPage();
    for (const s of ['idle','listening','thinking','speaking','strong']) {
      await p.goto(`https://apex-humanoid.vercel.app/?auto&skip&state=${s}`,{waitUntil:'load'});
      await p.waitForTimeout(800); try{await p.click('button')}catch(e){}
      // tunggu sampai keluar dari ASSEMBLING (max 40s)
      await p.waitForFunction(()=>!document.body.innerText.includes('ASSEMBLING'),{timeout:45000}).catch(()=>{});
      await p.waitForTimeout(600); await p.evaluate(()=>document.fonts.ready);
      await p.screenshot({path:path.join(dir,`S-${s}.png`)});
      const d=await p.evaluate(()=>({texts:[...document.querySelectorAll('p,span,div,button')].map(e=>e.textContent.trim()).filter(t=>t&&t.length<90),
        pressed:[...document.querySelectorAll('button')].map(b=>({t:b.textContent.trim(),p:b.getAttribute('aria-pressed')})),
        canvases:[...document.querySelectorAll('canvas')].map(c=>({w:c.width,h:c.height,sw:c.style.width,sh:c.style.height,blend:getComputedStyle(c).mixBlendMode,filter:getComputedStyle(c).filter})),
        imgs:[...document.querySelectorAll('img')].map(i=>({src:i.currentSrc.split('/').pop(),nw:i.naturalWidth,blend:getComputedStyle(i).mixBlendMode,filter:getComputedStyle(i).filter,opacity:getComputedStyle(i).opacity})),
        classes:[...new Set([...document.querySelectorAll('*')].flatMap(e=>[...e.classList]))].sort(), storage:{...localStorage}}));
      fs.writeFileSync(path.join(dir,`S-${s}.json`),JSON.stringify(d,null,1));
      (res[v.tag]=res[v.tag]||[]).push({state:s,status:d.texts.find(t=>t.startsWith('STATUS')||t.includes('ASSEMBL')),canvases:d.canvases.length,imgs:d.imgs.length,storage:d.storage});
      console.log(`OK ${v.tag} state=${s} status=${JSON.stringify(d.texts.find(t=>t.startsWith('STATUS'))||'(none)')} canv=${d.canvases.length} imgs=${d.imgs.length}`);
    }
    await ctx.close();
  }
  fs.writeFileSync(path.join(ROOT,'REPORT-APEX-STATES.json'),JSON.stringify(res,null,1));
  await b.close(); console.log('DONE');
})().catch(e=>{console.error('FATAL',e.message);process.exit(1)});
