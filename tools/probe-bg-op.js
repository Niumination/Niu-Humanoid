const { chromium } = require('/home/user/tools/node_modules/playwright')
;(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'] })
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
  await p.addInitScript(() => {
    window.__HUM_BG_T = 3.0
    window.__n = 0
    new MutationObserver((ms) => { for (const m of ms) for (const n of m.addedNodes) if (n.tagName === 'CANVAS') window.__n++ })
      .observe(document.documentElement, { childList: true, subtree: true })
  })
  await p.goto('http://127.0.0.1:5180/?auto=1&state=idle&surge=1.5', { waitUntil: 'networkidle', timeout: 60000 })
  for (let i = 0; i < 6; i++) {
    await p.waitForTimeout(1500)
    const s = await p.evaluate(() => {
      const c = document.querySelector('[data-testid="backdrop-canvas"]')
      return { t: performance.now() | 0, created: window.__n, op: c ? getComputedStyle(c).opacity : null, ctxLost: c ? (() => { try { return c.getContext('webgl2') ? 'ok' : 'noctx' } catch (e) { return 'err' } })() : null }
    })
    console.log(JSON.stringify(s))
  }
  await b.close()
})()
