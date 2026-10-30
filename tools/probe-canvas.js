const { chromium } = require('playwright');
const fs=require('fs');
(async()=>{
  const b=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--disable-dev-shm-usage']});
  const ctx=await b.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1,reducedMotion:'reduce'});
  const p=await ctx.newPage();
  await p.goto('https://apex-humanoid.vercel.app/?state=idle',{waitUntil:'load'});
  await p.waitForTimeout(900); await p.click('button');
  await p.waitForFunction(()=>!document.body.innerText.includes('ASSEMBLING'),{timeout:25000}).catch(()=>{});
  await p.waitForTimeout(3500);
  const canvases = await p.$$('canvas');
  for (let i=0;i<canvases.length;i++) {
    const box = await canvases[i].boundingBox();
    console.log(`canvas#${i}`, JSON.stringify(box));
    if (box) await canvases[i].screenshot({path:`/tmp/live-canvas-${i}.png`});
  }
  // juga ambil piksel mentah canvas via toDataURL (kalau tidak tainted)
  const hashes = await p.evaluate(()=>[...document.querySelectorAll('canvas')].map(c=>{
    try{const d=c.getContext('2d'); if(!d) return 'webgl'; const px=d.getImageData(0,0,Math.min(c.width,8),Math.min(c.height,8)).data; return 'readable:'+c.width+'x'+c.height;}catch(e){return 'err:'+e.name}
  }));
  console.log('contexts:', hashes);
  await b.close();
})().catch(e=>{console.error('FATAL',e.message);process.exit(1)});
