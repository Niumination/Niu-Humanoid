/**
 * gate-step2.js — Gerbang A/C untuk Fase 3 langkah 2 (aset + komposisi statis).
 *
 * Untuk tiap state:
 *  - screenshot lokal (rebuild) & live pada kondisi yang sama
 *  - Gerbang A: geometry (jumlah canvas, ukuran device px, rect, object-fit, posisi backdrop)
 *  - Gerbang C: diff piksel + baseline live-vs-live pada run yang sama
 *  - unit check: plate('idle') harus IDENTIK dengan webp idle yang digambar 900×t (Im() = no-op untuk idle)
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const LOCAL = 'http://127.0.0.1:5180/';
const LIVE = 'https://apex-humanoid.vercel.app/';
const OUT = '/home/user/Kerja-Arena/verification/step2';
const VIEWS = [{ w: 1440, h: 900, tag: '1440x900' }, { w: 390, h: 844, tag: '390x844' }];
const STATES = ['idle', 'listening', 'thinking', 'speaking', 'strong'];

fs.mkdirSync(OUT, { recursive: true });

const reduce = () => { /* kunci waktu: prefers-reduced-motion melewati assembly (terbukti) */ };

async function capture(browser, view, url, file, { enter = true, wait = 3500, reduced = true } = {}) {
  const ctx = await browser.newContext({
    viewport: { width: view.w, height: view.h },
    deviceScaleFactor: 1,
    reducedMotion: reduced ? 'reduce' : 'no-preference',
  });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'load', timeout: 45000 });
  await page.waitForTimeout(900);
  if (enter) { try { await page.click('button'); } catch (e) {} }
  // tunggu keluar dari status assembly (kalau ada), maks 25 s
  await page.waitForFunction(() => !document.body.innerText.includes('ASSEMBLING'), { timeout: 25000 }).catch(() => {});
  await page.waitForTimeout(wait);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(200);
  await page.screenshot({ path: file });

  const geo = await page.evaluate(() => ({
    canvas: [...document.querySelectorAll('canvas')].map(c => {
      const r = c.getBoundingClientRect(), s = getComputedStyle(c);
      return { dev: `${c.width}x${c.height}`, rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)], fit: s.objectFit, blend: s.mixBlendMode };
    }),
    img: [...document.querySelectorAll('img')].map(i => {
      const r = i.getBoundingClientRect(), s = getComputedStyle(i);
      return { src: i.currentSrc.split('/').pop(), rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)], fit: s.objectFit, filter: s.filter, opacity: s.opacity, blend: s.mixBlendMode };
    }),
    texts: [...document.querySelectorAll('*')].filter(e => e.children.length === 0 && e.textContent.trim()).map(e => e.textContent.trim()).slice(0, 12),
  }));
  await ctx.close();
  return geo;
}

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--disable-dev-shm-usage'] });
  const report = { generatedAt: new Date().toISOString(), unit: {}, views: {} };

  for (const v of VIEWS) {
    const dir = path.join(OUT, v.tag);
    fs.mkdirSync(dir, { recursive: true });
    const rows = [];
    for (const s of STATES) {
      const urlL = `${LIVE}?state=${s}`;
      const urlB = `${LOCAL}?state=${s}`;
      const fLive = path.join(dir, `live-${s}.png`);
      const fBuild = path.join(dir, `build-${s}.png`);
      const fLive2 = path.join(dir, `live2-${s}.png`);
      const geoLive = await capture(browser, v, urlL, fLive);
      const geoBuild = await capture(browser, v, urlB, fBuild);
      await capture(browser, v, urlL, fLive2);

      const py = `
import json
from PIL import Image
import numpy as np
def m(a,b):
    A=np.asarray(Image.open(a).convert('RGB'),float); B=np.asarray(Image.open(b).convert('RGB'),float)
    d=np.abs(A-B).max(axis=2)
    return {'gt8':round(100*float((d>8).mean()),4),'gt32':round(100*float((d>32).mean()),4),'mae':round(float(d.mean()),4)}
print(json.dumps({'baseline':m('${fLive}','${fLive2}'),'rebuild':m('${fBuild}','${fLive}')}))
`;
      const pyf = path.join(dir, `_m_${s}.py`);
      fs.writeFileSync(pyf, py);
      const px = JSON.parse(execFileSync('python3', [pyf]).toString().trim());

      const geoA = {
        canvasLocal: geoBuild.canvas.length, canvasLive: geoLive.canvas.length,
        backdrop: geoBuild.img.find(i => i.src.startsWith('backdrop')) || null,
        backdropLive: geoLive.img.find(i => i.src.startsWith('backdrop')) || null,
      };
      rows.push({ state: s, pixel: px, geometry: geoA, geoBuild, geoLive });
      console.log(`${v.tag} ${s.padEnd(10)} baseline32=${px.baseline.gt32}%  rebuild32=${px.rebuild.gt32}%  MAE rebuild=${px.rebuild.mae}  canvas ${geoA.canvasLocal}/${geoA.canvasLive}`);
    }
    report.views[v.tag] = rows;
  }

  // unit check: plate idle == webp idle pada 900 x t
  const ctx = await browser.newContext({ viewport: { width: 900, height: 1000 } });
  const page = await ctx.newPage();
  await page.goto(LOCAL, { waitUntil: 'load' });
  const unit = await page.evaluate(async () => {
    const { loadAssets } = await import('/src/lib/assets.ts');
    const { buildPlate, plateHeight } = await import('/src/lib/plate.ts');
    const bag = await loadAssets();
    const plate = buildPlate(bag, 'idle');
    const h = plateHeight(bag);
    const ref = document.createElement('canvas');
    ref.width = 900; ref.height = h;
    const rc = ref.getContext('2d');
    rc.fillStyle = '#000'; rc.fillRect(0, 0, 900, h); rc.drawImage(bag.idle, 0, 0, 900, h);
    const a = plate.getContext('2d').getImageData(0, 0, 900, h).data;
    const b = rc.getImageData(0, 0, 900, h).data;
    let diff = 0, maxd = 0;
    for (let i = 0; i < a.length; i += 4) {
      const d = Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2]));
      if (d > 0) diff++;
      if (d > maxd) maxd = d;
    }
    const sp = buildPlate(bag, 'speaking');
    const c = sp.getContext('2d').getImageData(0, 0, 900, h).data;
    let brighter = 0;
    for (let i = 0; i < a.length; i += 4) if (c[i] > a[i] + 2) brighter++;
    return { plateW: 900, plateH: h, idleDiffPx: diff, idleMaxDelta: maxd, speakingBrighterPx: brighter, totalPx: a.length / 4 };
  });
  report.unit = unit;
  await ctx.close();

  fs.writeFileSync(path.join(OUT, 'step2-report.json'), JSON.stringify(report, null, 1));
  console.log('UNIT:', JSON.stringify(unit));
  await browser.close();
  console.log('DONE →', path.join(OUT, 'step2-report.json'));
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
