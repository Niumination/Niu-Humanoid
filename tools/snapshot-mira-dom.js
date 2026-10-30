const { chromium } = require('playwright');
const fs=require('fs'),path=require('path');
const ROOT='/home/user/Kerja-Arena/recon/ground-truth/mira';
(async()=>{
  const b=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--disable-dev-shm-usage']});
  const ctx=await b.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1});
  const p=await ctx.newPage();
  await p.addInitScript(()=>{window.__dialCalls=[];});
  await p.goto('https://mira-humanoid.vercel.app/?t=6',{waitUntil:'load'});
  await p.waitForTimeout(5000); await p.evaluate(()=>document.fonts.ready);
  const d=await p.evaluate(()=>{
    const g=e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return{font:s.fontFamily,size:s.fontSize,ls:s.letterSpacing,color:s.color,bg:s.backgroundColor,opacity:s.opacity,transition:s.transition,padding:s.padding,border:s.borderWidth+' '+s.borderStyle+' '+s.borderColor,borderRadius:s.borderRadius,mixBlendMode:s.mixBlendMode,filter:s.filter,animation:s.animation,rect:{x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)}}};
    return {
      html:document.documentElement.outerHTML,
      texts:[...document.querySelectorAll('*')].filter(e=>e.children.length===0&&e.textContent.trim()).map(e=>e.tagName+':'+e.textContent.trim()).slice(0,60),
      classes:[...new Set([...document.querySelectorAll('*')].flatMap(e=>[...e.classList]))].sort(),
      testids:[...document.querySelectorAll('[data-testid]')].map(e=>e.getAttribute('data-testid')),
      buttons:[...document.querySelectorAll('button')].map(b=>({t:b.textContent.trim(),aria:b.getAttribute('aria-label'),pressed:b.getAttribute('aria-pressed'),...g(b)})),
      canvases:[...document.querySelectorAll('canvas')].map(c=>({w:c.width,h:c.height,sw:c.style.width,sh:c.style.height,blend:getComputedStyle(c).mixBlendMode,pos:getComputedStyle(c).position,z:getComputedStyle(c).zIndex})),
      imgs:[...document.querySelectorAll('img')].map(i=>({src:i.currentSrc.split('/').pop(),nw:i.naturalWidth,nh:i.naturalHeight,blend:getComputedStyle(i).mixBlendMode,filter:getComputedStyle(i).filter,opacity:getComputedStyle(i).opacity})),
      storage:{...localStorage},
      ariaLive:[...document.querySelectorAll('[aria-live]')].map(e=>({live:e.getAttribute('aria-live'),text:e.textContent.trim().slice(0,80)}))
    };
  });
  fs.writeFileSync(path.join(ROOT,'entered-1440x900.json'),JSON.stringify(d,null,1));
  fs.writeFileSync(path.join(ROOT,'entered-1440x900.html'),d.html);
  console.log('texts:',JSON.stringify(d.texts.slice(0,30)));
  console.log('classes:',d.classes);
  console.log('testids:',d.testids,'| storage:',JSON.stringify(d.storage).slice(0,300));
  console.log('canvases:',JSON.stringify(d.canvases));
  console.log('imgs:',JSON.stringify(d.imgs));
  console.log('ariaLive:',JSON.stringify(d.ariaLive));
  console.log('buttons:');
  for(const x of d.buttons) console.log('  ',x.t,'| aria=',x.aria,'| pressed=',x.pressed,'| size',x.size,'ls',x.ls,'bg',x.bg,'pad',x.padding,'rect',JSON.stringify(x.rect),'trans',x.transition);
  await b.close();
})().catch(e=>{console.error('FATAL',e.message);process.exit(1)});
