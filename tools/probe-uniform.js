#!/usr/bin/env node
/**
 * probe-uniform.js — baca uniform WebGL yang BENAR-BENAR dipakai halaman (live atau build kita).
 * Membungkus getUniformLocation + uniform1f/1i/2f/3f/4f sebelum skrip situs berjalan, lalu
 * melaporkan nilai terakhir per nama uniform. Dipakai untuk membuktikan/menyanggah dugaan
 * parameter tanpa menebak dari gambar (P11: membuktikan uniform figur identik live vs kita).
 *
 * Pakai: node tools/probe-uniform.js 390 844   |   node tools/probe-uniform.js 1440 900
 * Env: PW=/tmp/pw/node_modules/playwright (jalankan tools/siapkan-alat.sh sekali per sesi)
 */
const { chromium } = require(process.env.PW || '/tmp/pw/node_modules/playwright')
const W = Number(process.argv[2]), H = Number(process.argv[3])
const NAMES = ['uSize', 'uPatchUV', 'uPixelRatio', 'uDotSharp', 'uRim', 'uBloomR', 'uStateA', 'uStateB',
  'uBoilT', 'uBoilAmp', 'uVein', 'uStrongMix', 'uEnergy', 'uPulseA', 'uPulseB', 'uYaw', 'uPitch',
  'uSizeK', 'uRest', 'uPulse', 'uBackK', 'uClick']
const init = `(() => {
  window.__HUM_BG_T = 3.0
  window.__U = {}
  const wrap = (proto) => {
    if (!proto || proto.__wrapped) return
    proto.__wrapped = true
    const gul = proto.getUniformLocation
    proto.getUniformLocation = function (p, n) { const loc = gul.call(this, p, n); try { if (loc) loc.__n = n } catch (e) {} return loc }
    for (const [fn, n] of [['uniform1f', 1], ['uniform1i', 1], ['uniform2f', 2], ['uniform3f', 3], ['uniform4f', 4]]) {
      const orig = proto[fn]
      if (!orig) continue
      proto[fn] = function (loc, ...a) { try { if (loc && loc.__n && a.length >= n) window.__U[loc.__n] = a.slice(0, n).join(',') } catch (e) {} return orig.call(this, loc, ...a) }
    }
  }
  wrap(window.WebGLRenderingContext && WebGLRenderingContext.prototype)
  wrap(window.WebGL2RenderingContext && WebGL2RenderingContext.prototype)
})();`
;(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--disable-dev-shm-usage','--mute-audio'] })
  for (const [name, url] of [['LIVE','https://apex-humanoid.vercel.app/'],['OURS','http://127.0.0.1:8805/']]) {
    const p = await b.newPage({ viewport: { width: W, height: H } })
    await p.addInitScript(init)
    await p.goto(url + '?auto=1&state=idle&surge=1.5', { waitUntil: 'networkidle', timeout: 120000 })
    await p.waitForTimeout(8600)
    const u = await p.evaluate((names) => {
      const out = {}
      for (const n of names) if (window.__U[n] !== undefined) out[n] = window.__U[n]
      return out
    }, NAMES)
    console.log(`${name} ${W}x${H}: ${JSON.stringify(u)}`)
    await p.close()
  }
  await b.close()
})()
