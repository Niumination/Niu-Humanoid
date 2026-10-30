const { chromium } = require('playwright')
;(async () => {
  const b = await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--disable-dev-shm-usage','--mute-audio']})
  const page = await (await b.newContext({viewport:{width:1440,height:900}})).newPage()
  await page.goto('http://127.0.0.1:5180/?auto=1&skip=1&state=idle',{waitUntil:'networkidle'})
  await page.waitForTimeout(9000)
  const r = await page.evaluate(async () => {
    const cv = document.querySelector('canvas[aria-label^="Animated cyan"]')
    const snap = () => { const c=document.createElement('canvas');c.width=128;c.height=128
      c.getContext('2d').drawImage(cv,0,0,128,128); return c.getContext('2d').getImageData(0,0,128,128).data }
    const d=(a,b)=>{let s=0;for(let i=0;i<a.length;i+=4)s+=Math.abs(a[i]-b[i]);return +(s/(a.length/4)).toFixed(3)}
    const seq=(n)=>async()=>{const out=[];let prev=snap();for(let i=0;i<n;i++){await new Promise(r=>setTimeout(r,400));const cur=snap();out.push(d(prev,cur));prev=cur}return out}
    const before = await seq(4)()
    window.__HUM_FREEZE_T = 5
    await new Promise(r=>setTimeout(r,300))
    const after = await seq(4)()
    const info = window.__HUM_FADE
    return { before, after, info, cy: cv.width + 'x' + cv.height }
  })
  console.log('sebelum freeze:', r.before)
  console.log('sesudah freeze:', r.after, '| fade=', JSON.stringify(r.info), r.cy)
  await b.close()
})()
