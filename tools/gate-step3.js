/**
 * gate-step3.js — Gerbang A/C untuk Fase 3 langkah 3 (timeline birth).
 * Kunci waktu: ?asmel=<t> untuk LIVE (terbukti membekukan) dan __HUM_ASM_EL=<t> untuk rebuild.
 * Keduanya dibandingkan pada t yang sama; baseline = live-vs-live pada t yang sama.
 */
const { chromium } = require('playwright');
const fs = require('fs'); const path = require('path');
const { execFileSync } = require('child_process');
const LIVE = 'https://apex-humanoid.vercel.app/';
const BUILD = 'http://127.0.0.1:5180/';
const OUT = '/home/user/Kerja-Arena/verification/step3';
const TS = [1, 3, 5, 6.5];
fs.mkdirSync(OUT, { recursive: true });

async function grab(browser, url, file, { asmel = null, init = null, wait = 2600 } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  if (init) await page.addInitScript(init);
  await page.goto(url, { waitUntil: 'load', timeout: 45000 });
  await page.waitForTimeout(900);
  try { await page.click('button'); } catch (e) {}
  await page.waitForTimeout(wait);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: file });
  const txt = await page.evaluate(() => (document.body.innerText.match(/ASSEMBLING\.\.\. \d+%|STATUS: [A-Z]+/) || [''])[0]);
  await ctx.close();
  return txt;
}

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--disable-dev-shm-usage'] });
  const rows = [];
  for (const t of TS) {
    const fLiveA = path.join(OUT, `live-t${t}-a.png`);
    const fLiveB = path.join(OUT, `live-t${t}-b.png`);
    const fBuild = path.join(OUT, `build-t${t}.png`);
    const txtLive = await grab(browser, `${LIVE}?asmel=${t}`, fLiveA);
    const txtLive2 = await grab(browser, `${LIVE}?asmel=${t}`, fLiveB);
    const txtBuild = await grab(browser, `${BUILD}?asmel=${t}`, fBuild, { init: `window.__HUM_ASM_EL=${t};` });

    const py = `
import json
from PIL import Image
import numpy as np
def m(a,b):
    A=np.asarray(Image.open(a).convert('RGB'),float); B=np.asarray(Image.open(b).convert('RGB'),float)
    d=np.abs(A-B).max(axis=2); return {'gt8':round(100*float((d>8).mean()),4),'gt32':round(100*float((d>32).mean()),4),'mae':round(float(d.mean()),4),'meanA':round(float(A.mean()),2),'meanB':round(float(B.mean()),2)}
print(json.dumps({'baseline':m('${fLiveA}','${fLiveB}'),'rebuild':m('${fBuild}','${fLiveA}')}))`;
    const pyf = path.join(OUT, `_m_${t}.py`); fs.writeFileSync(pyf, py);
    const px = JSON.parse(execFileSync('python3', [pyf]).toString().trim());
    rows.push({ t, textLive: txtLive, textLive2: txtLive2, textBuild: txtBuild, pixel: px });
    console.log(`t=${t}s  live="${txtLive}" build="${txtBuild}" | baseline32=${px.baseline.gt32}% rebuild32=${px.rebuild.gt32}% MAE=${px.rebuild.mae} | mean live=${px.rebuild.meanA} build=${px.rebuild.meanB}`);
  }
  fs.writeFileSync(path.join(OUT, 'step3-report.json'), JSON.stringify({ generatedAt: new Date().toISOString(), rows }, null, 1));
  await browser.close();
  console.log('DONE');
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
