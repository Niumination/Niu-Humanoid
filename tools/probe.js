const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--disable-dev-shm-usage']});
  const ctx = await b.newContext({viewport:{width:1440,height:900}});
  const p = await ctx.newPage();
  p.on('pageerror',e=>console.log('PAGEERR',String(e).slice(0,200)));
  // ---- APEX: klik ENTER lalu amati teks seiring waktu
  await p.goto('https://apex-humanoid.vercel.app/', {waitUntil:'load'});
  await p.waitForTimeout(2500);
  console.log('APEX before click, buttons:', await p.$$eval('button', bs=>bs.map(b=>b.textContent.trim())));
  await p.click('button');
  for (const t of [500, 1500, 3000, 5000, 8000, 12000]) {
    await p.waitForTimeout(t===500?500:t - (t===1500?500:t===3000?1500:t===5000?3000:t===8000?5000:8000));
    const info = await p.evaluate(()=>({
      texts:[...document.querySelectorAll('p,span,div,button')].map(e=>e.textContent.trim()).filter(t=>t&&t.length<90).slice(0,14),
      canvases:document.querySelectorAll('canvas').length,
      imgs:[...document.querySelectorAll('img')].map(i=>i.src.split('/').pop()+'('+i.naturalWidth+'x'+i.naturalHeight+')'),
      testids:[...document.querySelectorAll('[data-testid]')].map(e=>e.getAttribute('data-testid')),
      freeze:window.__HUM_FREEZE_T
    }));
    console.log(`t≈${t}ms`, JSON.stringify(info).slice(0,700));
  }
  await p.screenshot({path:'/tmp/apex-after-click.png'});
  // ---- MIRA: cari pemicu panel
  const p2 = await ctx.newPage();
  await p2.goto('https://mira-humanoid.vercel.app/?t=6', {waitUntil:'load'});
  await p2.waitForTimeout(4000);
  console.log('\nMIRA buttons:', await p2.$$eval('button', bs=>bs.map(b=>b.textContent.trim())));
  console.log('MIRA inputs:', await p2.$$eval('input', is=>is.map(i=>i.type+':'+(i.name||i.getAttribute('aria-label')||''))));
  const labels = await p2.evaluate(()=>[...document.querySelectorAll('*')].filter(e=>e.children.length===0&&e.textContent.trim()).map(e=>e.tagName+':'+e.textContent.trim()).filter(s=>s.length<70).slice(0,40));
  console.log('MIRA leaf texts:', JSON.stringify(labels));
  await p2.screenshot({path:'/tmp/mira-probe.png'});
  await b.close();
})().catch(e=>{console.error('FATAL',e.message);process.exit(1)});
