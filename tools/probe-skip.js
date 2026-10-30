const { chromium } = require('playwright');
(async()=>{
  const b=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--disable-dev-shm-usage']});
  for (const [label,url,reduced] of [
    ['?skip&state=idle','https://apex-humanoid.vercel.app/?skip&state=idle',false],
    ['?auto&skip','https://apex-humanoid.vercel.app/?auto&skip',false],
    ['?skip + reduced-motion','https://apex-humanoid.vercel.app/?skip&state=idle',true],
    ['?asmel=0','https://apex-humanoid.vercel.app/?asmel=0',false],
  ]) {
    const ctx=await b.newContext({viewport:{width:1440,height:900},reducedMotion:reduced?'reduce':'no-preference'});
    const p=await ctx.newPage();
    await p.goto(url,{waitUntil:'load'}); await p.waitForTimeout(700);
    const before=await p.evaluate(()=>!!document.querySelector('button')&&document.body.innerText.includes('ENTER'));
    try{await p.click('button')}catch(e){}
    const seen=[];
    for (let i=0;i<6;i++){ await p.waitForTimeout(700); seen.push(await p.evaluate(()=>{const m=document.body.innerText.match(/ASSEMBLING\.\.\. \d+%|STATUS: [A-Z]+/g);return m?m[0]:'(none)'})); }
    console.log(`${label.padEnd(26)} entry=${before} → ${JSON.stringify(seen)}`);
    await ctx.close();
  }
  await b.close();
})().catch(e=>{console.error('FATAL',e.message);process.exit(1)});
