const { chromium } = require('playwright');
const fs=require('fs');
(async()=>{
  const b=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--disable-dev-shm-usage']});
  // canvas live (2D readable) untuk idle
  const ctx=await b.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1,reducedMotion:'reduce'});
  const p=await ctx.newPage();
  await p.goto('https://apex-humanoid.vercel.app/?state=idle',{waitUntil:'load'});
  await p.waitForTimeout(900); await p.click('button');
  await p.waitForFunction(()=>!document.body.innerText.includes('ASSEMBLING'),{timeout:25000}).catch(()=>{});
  await p.waitForTimeout(3000);
  const url=await p.evaluate(()=>{for(const c of document.querySelectorAll('canvas')){try{const g=c.getContext('2d'); if(g) return c.toDataURL('image/png')}catch(e){}} return null});
  fs.writeFileSync('/tmp/live-canvas-idle.png', Buffer.from(url.split(',')[1],'base64'));
  await ctx.close();
  // canvas build
  const ctx2=await b.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1,reducedMotion:'reduce'});
  const p2=await ctx2.newPage();
  await p2.goto('http://127.0.0.1:5180/?state=idle',{waitUntil:'load'});
  await p2.waitForTimeout(800); await p2.click('button'); await p2.waitForTimeout(2500);
  const url2=await p2.evaluate(()=>{const c=document.querySelector('canvas'); return c.toDataURL('image/png')});
  fs.writeFileSync('/tmp/build-canvas-idle.png', Buffer.from(url2.split(',')[1],'base64'));
  await b.close();
  console.log('ok');
})().catch(e=>{console.error('FATAL',e.message);process.exit(1)});
