const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
  const p = await b.newPage();
  await p.goto('data:text/html,<canvas id=c></canvas><script>const gl=document.getElementById("c").getContext("webgl2");document.title=gl?("WEBGL2 "+gl.getParameter(gl.VERSION)):"NO WEBGL";</script>');
  console.log('title:', await p.title());
  await b.close();
})().catch(e=>{console.error('ERR', e.message.split('\n')[0]); process.exit(1)});
