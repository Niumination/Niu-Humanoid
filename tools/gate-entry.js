/**
 * Gerbang A + C untuk langkah 1 Fase 3 (entry screen).
 *
 * A — DOM & copy: bandingkan teks, ukuran font, letter-spacing, warna, padding, radius,
 *     box-shadow, dan bbox tiap node dengan ground truth live.
 * C — Diff piksel: screenshot lokal vs ground truth pada 1440x900 dan 390x844,
 *     ambang memakai BASELINE TERUKUR (keputusan interview) — baseline diukur ulang
 *     pada run ini dari live-vs-live, bukan angka mati.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const GT = '/home/user/Kerja-Arena/recon/ground-truth/apex';
const OUT = '/home/user/Kerja-Arena/verification';
const LOCAL = process.env.LOCAL_URL || 'http://127.0.0.1:5180/';
const LIVE = 'https://apex-humanoid.vercel.app/';
const VIEWS = [{ w: 1440, h: 900, tag: '1440x900' }, { w: 390, h: 844, tag: '390x844' }];

fs.mkdirSync(OUT, { recursive: true });

async function shot(browser, view, url, file, { init = null, wait = 2500 } = {}) {
  const ctx = await browser.newContext({ viewport: { width: view.w, height: view.h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  if (init) await page.addInitScript(init);
  await page.goto(url, { waitUntil: 'load', timeout: 45000 });
  await page.waitForTimeout(wait);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(250);
  await page.screenshot({ path: file });
  const dom = await page.evaluate(() => {
    const texts = [];
    const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n; while ((n = tw.nextNode())) { const t = n.textContent.trim(); if (t) texts.push(t); }
    const nodes = [...document.querySelectorAll('button,div,section,img,canvas')].filter(e => e.children.length === 0 || e.tagName === 'BUTTON');
    return {
      texts,
      nodes: nodes.map(e => {
        const s = getComputedStyle(e), r = e.getBoundingClientRect();
        return {
          tag: e.tagName, text: (e.textContent || '').trim().slice(0, 60),
          font: s.fontFamily, size: s.fontSize, ls: s.letterSpacing, color: s.color,
          bg: s.backgroundColor, border: `${s.borderTopWidth} ${s.borderTopStyle} ${s.borderTopColor}`,
          radius: s.borderTopLeftRadius, shadow: s.boxShadow, padding: s.padding,
          rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }
        };
      })
    };
  });
  await ctx.close();
  return dom;
}

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--disable-dev-shm-usage'] });
  const result = { generatedAt: new Date().toISOString(), local: LOCAL, live: LIVE, views: {} };

  for (const v of VIEWS) {
    const dir = path.join(OUT, 'entry', v.tag);
    fs.mkdirSync(dir, { recursive: true });
    // 1. baseline: live vs live (dua kali)
    await shot(browser, v, LIVE, path.join(dir, 'live-a.png'));
    await shot(browser, v, LIVE, path.join(dir, 'live-b.png'));
    // 2. rebuild
    const domLocal = await shot(browser, v, LOCAL, path.join(dir, 'local.png'));
    const domLive = await shot(browser, v, LIVE, path.join(dir, 'live-c.png'));

    // 3. metrik piksel dihitung di python (PIL/numpy)
    const py = `
import json
from PIL import Image
import numpy as np
def m(a,b):
    A=np.asarray(Image.open(a).convert('RGB'),float); B=np.asarray(Image.open(b).convert('RGB'),float)
    d=np.abs(A-B).max(axis=2)
    return {'gt8':round(100*float((d>8).mean()),4),'gt32':round(100*float((d>32).mean()),4),'mae':round(float(d.mean()),4)}
print(json.dumps({'baseline':m('${dir}/live-a.png','${dir}/live-b.png'),'rebuild':m('${dir}/local.png','${dir}/live-c.png')}))
`;
    fs.writeFileSync(path.join(dir, '_m.py'), py);
    const px = JSON.parse(execFileSync('python3', [path.join(dir, '_m.py')]).toString().trim());

    // 4. Gate A: diff DOM (teks + gaya + bbox)
    const key = n => `${n.tag}|${n.text}`;
    const liveMap = new Map(domLive.nodes.map(n => [key(n), n]));
    const diffs = [];
    for (const n of domLocal.nodes) {
      const L = liveMap.get(key(n));
      if (!L) { diffs.push({ node: key(n), field: 'missing-in-live' }); continue; }
      for (const f of ['font', 'size', 'ls', 'color', 'bg', 'border', 'radius', 'shadow', 'padding']) {
        if (String(n[f]) !== String(L[f])) diffs.push({ node: key(n), field: f, local: n[f], live: L[f] });
      }
      for (const q of ['x', 'y', 'w', 'h']) {
        if (Math.abs(n.rect[q] - L.rect[q]) > 1) diffs.push({ node: key(n), field: `rect.${q}`, local: n.rect[q], live: L.rect[q] });
      }
    }
    const textDiff = JSON.stringify(domLocal.texts) === JSON.stringify(domLive.texts) ? [] :
      [{ local: domLocal.texts, live: domLive.texts }];

    result.views[v.tag] = {
      pixel: px,
      gateA: { textDiff, styleDiffs: diffs, pass: textDiff.length === 0 && diffs.length === 0 },
      verdict: {
        // keputusan interview: ambang = baseline terukur (rebuild harus <= baseline)
        gt32: px.rebuild.gt32 <= Math.max(px.baseline.gt32, 0.001) + 1e-9,
        gt8: px.rebuild.gt8 <= Math.max(px.baseline.gt8, 0.01) + 1e-9,
        mae: px.rebuild.mae <= Math.max(px.baseline.mae, 0.1) + 0.05
      }
    };
    console.log(`--- ${v.tag}`);
    console.log('  baseline live-vs-live:', JSON.stringify(px.baseline));
    console.log('  rebuild vs live     :', JSON.stringify(px.rebuild));
    console.log(`  Gate A: texts=${textDiff.length === 0 ? 'OK' : 'DIFF'} styleDiffs=${diffs.length}`);
    if (diffs.length) console.log('   ', JSON.stringify(diffs.slice(0, 6)));
  }

  fs.writeFileSync(path.join(OUT, 'entry-report.json'), JSON.stringify(result, null, 1));
  await browser.close();
  console.log('DONE →', path.join(OUT, 'entry-report.json'));
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
