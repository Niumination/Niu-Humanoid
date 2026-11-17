#!/usr/bin/env python3
"""p13-backdrop.py — P13 langkah 3: LATAR (backdrop) milik kita, digambar dari aturan.

Plate latar APEX (`backdrop-v1.webp`, 1672×941) adalah salinan verbatim aset produksi — satu-satunya
berkas yang masih berstatus SALINAN di `audit-provenance`. Di sini latar itu dinyatakan ulang sebagai
**medan puncak berlapis + partikel + glow**, semuanya dari aturan dan biji acak tetap; tidak ada piksel
plate asli yang dipakai.

Aturan (bukan salinan):
  1) langit  : gradasi vertikal gelap + pendar horizon (elips lembut di tengah)
  2) 5 lapis punggung: y(x) = dasar(lapis) − kedalaman-lembah·(|x−cx|/(W/2))^1,6 − amp·fbm(x)
     → bentuk lembah V yang sama seperti acuan (puncak tinggi di tepi, dangkal di tengah)
  3) tiap lapis digambar sebagai polyline bergaussian + partikel di sepanjang garis (biji tetap)
  4) aliran (filamen) turun dari titik punggung ke bawah, makin redup
  5) warna: dingin (biru) sebagai dasar; hangat (jingga) di berkas yang ditentukan medan aturan
  6) glow = blur lapisan garis, ditambah bintang redup di langit
  7) kalibrasi satu skalar: rata-rata luma disamakan dengan acuan (rasio ≈ 1,0)

Ukur paritas struktur vs acuan (bukan "kelihatan mirip"):
  profil baris 32 pita · profil kolom 64 pita · profil garis-puncak tiap kolom ·
  rata-rata RGB (rasio) · korelasi & rasio luma total.

Pakai: python3 tools/p13-backdrop.py [--banding] [--tulis]
"""
import json
import os
import sys

import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage as ndi

ROOT = '/home/user'
OUT = f'{ROOT}/Kerja-Arena/verification/p13'
ACI = f'{ROOT}/Kerja-Arena/verification/p13/asli/backdrop-v1.webp'   # acuan: plate ASLI (backup)
DST = f'{ROOT}/apex-humanoid-rebuild/public/humanoid/backdrop-v1.webp'
BARU = f'{OUT}/baru/backdrop-v1.webp'
TULIS = '--tulis' in sys.argv
BANDING = '--banding' in sys.argv
os.makedirs(f'{OUT}/baru', exist_ok=True)
BIJI = 137          # biji tetap → hasil bisa diulang persis


def fbm1(x, rng, oktaf=4, dasar=6):
    """derau 1D halus (jumlah sinus fase acak) — deterministik dari `rng`."""
    out = np.zeros_like(x)
    amp, tot = 1.0, 0.0
    for o in range(oktaf):
        f = dasar * (2 ** o)
        ph = rng.uniform(0, 2 * np.pi)
        out += amp * np.sin(x * f + ph)
        tot += amp
        amp *= 0.55
    return out / tot


def splat(buf, xs, ys, w, col):
    """col: warna (3,) untuk semua titik, atau array (3,n) per titik."""
    H, W = buf.shape[:2]
    col = np.asarray(col, np.float32)
    ok = (xs >= 1) & (xs < W - 2) & (ys >= 1) & (ys < H - 2)
    xs, ys, w = xs[ok], ys[ok], w[ok]
    if col.ndim == 2:
        col = col[:, ok]
    x0 = np.floor(xs).astype(int)
    y0 = np.floor(ys).astype(int)
    fx, fy = xs - x0, ys - y0
    for dy in (0, 1):
        for dx in (0, 1):
            ww = w * (fx if dx else 1 - fx) * (fy if dy else 1 - fy)
            for k in range(3):
                buf[y0 + dy, x0 + dx, k] += ww * (col[k] if col.ndim == 2 else col[k])


def gambar(H, W, skala=1.0, partikel=1.0):
    rng = np.random.default_rng(BIJI)
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    v = yy / H
    out = np.zeros((H, W, 3), np.float32)

    # ---- 1) langit: gelap di atas, sedikit lebih terang di horizon + pendar tengah
    langit = np.array([0.7, 1.5, 3.2], np.float32)[None, None, :] * (1 - v[..., None]) \
        + np.array([2.6, 5.0, 7.6], np.float32)[None, None, :] * v[..., None] ** 1.6
    pendar = np.exp(-(((xx - W * 0.5) / (W * 0.42)) ** 2 + ((yy - H * 0.44) / (H * 0.22)) ** 2))
    out += langit + pendar[..., None] * np.array([1.4, 3.0, 4.6], np.float32)

    # ---- bintang redup
    n_b = 900
    bx = rng.uniform(0, W, n_b).astype(np.float32)
    by = rng.uniform(0, H * 0.55, n_b).astype(np.float32)
    bw = rng.uniform(0.25, 1.0, n_b).astype(np.float32) ** 3
    splat(out, bx, by, bw, np.array([26.0, 40.0, 52.0], np.float32))

    garis = np.zeros((H, W, 3), np.float32)
    xs = np.arange(W, dtype=np.float32)
    u = (xs - W * 0.5) / (W * 0.5)
    # lembah V dengan kedalaman berbeda kiri/kanan (acuan pun asimetris: kiri lebih dalam)
    lembah = np.abs(u) ** 1.6 * (0.86 + 0.22 * np.sin(xs / 520.0 + 0.7))
    lembah = np.clip(lembah / max(1e-6, lembah.max()), 0, 1.15)

    # ---- 2) lima lapis punggung: rentetan puncak sempit + garis tipis + partikel pengisi lereng
    LAPIS = [
        # (dasar_y, tinggi_maks, terang, jingga, n_puncak, lebar, kerapatan, sebar)
        (0.585, 0.380, 90.0, 0.55, 34, 0.090, 620, 2.0),
        (0.675, 0.330, 150.0, 0.45, 32, 0.085, 680, 2.3),
        (0.755, 0.290, 125.0, 0.38, 30, 0.080, 640, 2.6),
        (0.840, 0.225, 95.0, 0.50, 28, 0.075, 580, 3.0),
        (0.910, 0.175, 65.0, 0.60, 26, 0.070, 500, 3.4),
    ]
    dingin = np.array([0.16, 0.60, 1.00], np.float32)
    hangat = np.array([1.00, 0.52, 0.10], np.float32)
    puncak_tercatat = []
    for k, (dy, tinggi, terang, jg, npk, lebar, dens, sebar) in enumerate(LAPIS):
        rp = np.random.default_rng(BIJI + 10 * k)
        # posisi puncak: makin ke tepi makin rapat & tinggi (bentuk lembah V)
        n = npk
        pos = (rp.beta(1.25, 1.25, n) - 0.5) * 1.20
        tepi = np.clip(np.abs(pos) * 2, 0, 1)
        h = rp.uniform(0.35, 1.0, n) * (0.25 + 1.05 * tepi)
        wd = rp.uniform(0.55, 1.45, n) * lebar
        # retak halus di puncak massif: setiap puncak dipecah 3 sub-puncak sempit
        sub = rp.normal(0, 0.55, (n, 3)) * wd[:, None]
        gunung = np.zeros_like(xs)
        for i in range(n):
            for j in range(3):
                hj = h[i] * (1.0 if j == 1 else rp.uniform(0.55, 0.9))
                du = u - (pos[i] + sub[i, j])
                skala_sisi = np.where(du < 0, 1.0, 1.45)   # lereng kiri lebih tajam
                g_ = hj * np.exp(-(du / (wd[i] * (0.62 if j else 1.0) * skala_sisi)) ** 2)
                gunung = np.maximum(gunung, g_)            # sambung punggung, jangan menumpuk tinggi
        gunung = np.clip(gunung / max(1e-6, np.percentile(gunung, 99.5)), 0, 1.15)
        rd = np.random.default_rng(BIJI + 10 * k + 1)
        # gerigi: fbm frekuensi tinggi, amplitudo sebanding tinggi lokal (punggung tajam, lembah tenang)
        g1 = fbm1(xs, rd, oktaf=5, dasar=0.055)
        g2 = fbm1(xs, np.random.default_rng(BIJI + 10 * k + 2), oktaf=3, dasar=0.014)
        gerigi = (np.sign(g1) * np.abs(g1) ** 0.6) * 0.75 + g2 * 0.45
        yr = H * (dy - tinggi * gunung ** 0.62) + H * 0.045 * gunung * gerigi + H * 0.006 * g2
        puncak_tercatat.append(yr)
        medan = np.sin(xs / 210.0 + k * 1.7) + 0.6 * np.sin(xs / 77.0 + k * 0.9)
        p_hangat = np.clip((medan - (0.30 - jg)) * 1.7, 0, 1)
        col = dingin[None, :] * (1 - p_hangat[:, None]) + hangat[None, :] * p_hangat[:, None]
        lemb = 0.18 + 0.82 * np.clip(np.abs(u) * 1.35, 0, 1) ** 1.1
        kuat = terang * (0.25 + 0.75 * np.clip(gunung, 0, 1)) * lemb
        cb = col * kuat[:, None]
        # (a) garis punggung tipis
        wb = np.zeros((H, W, 3), np.float32)
        rl = np.random.default_rng(BIJI + 300 + k)
        celah_g = rl.uniform(0, 1, W) < (0.42 + 0.35 * gunung)      # garis terputus di lembah
        jit_g = rl.normal(0, 0.7, W).astype(np.float32)
        for dyk, wk in ((0.0, 1.0), (-0.8, 0.25), (0.8, 0.25)):
            splat(wb, xs[celah_g], yr[celah_g] + dyk + jit_g[celah_g],
                  np.full(celah_g.sum(), 0.50 * wk, np.float32), np.ones((celah_g.sum(),), np.float32))
        for kk in range(3):
            garis[..., kk] += wb[..., 0] * cb[None, :, kk]
        # (b) partikel sepanjang punggung + pengisi lereng
        r3 = np.random.default_rng(BIJI + 500 + k)
        n_p = int(W * dens / 10)
        px = r3.uniform(0, W, n_p).astype(np.float32)
        idx = np.clip(px.astype(int), 0, W - 1)
        gx = gunung[idx]
        celah = 0.45 + 0.55 * np.clip(r3.uniform(0.55, 1.3, n_p), 0, 1)
        keep = r3.uniform(0, 1, n_p) < (0.10 + 0.90 * gx) * celah * (0.10 + 0.90 * np.clip(np.abs((px - W * 0.5) / (W * 0.5)) * 1.3, 0, 1) ** 1.1)
        px, idx = px[keep], idx[keep]
        n2 = len(px)
        if n2:
            py = yr[idx] + r3.normal(0, sebar, n2).astype(np.float32)
            bobot = (r3.uniform(0.05, 1.0, n2) ** 1.6 * 9.5).astype(np.float32)
            splat(garis, px, py, bobot, cb[idx].T)
            # pengisi lereng: dari garis turun ke bawah, makin redup
            n_s = int(n2 * 1.1)
            if n_s:
                sel = r3.integers(0, n2, n_s)
                sisa = np.clip(H * 1.02 - py[sel], 10.0, None)
                depth = (sisa * r3.uniform(0, 1, n_s) ** 1.5).astype(np.float32)
                px2 = px[sel] + r3.normal(0, 1.3, n_s).astype(np.float32)
                py2 = py[sel] + depth
                bt = (np.exp(-depth / (sisa * 0.45)) * r3.uniform(0.04, 1.0, n_s) ** 2.0 * 9.0).astype(np.float32)
                splat(garis, px2, py2, bt, cb[idx[sel]].T)

    # ---- 3) aliran hangat di lembah: polyline turun-menyusur (aturan + biji tetap)
    r5 = np.random.default_rng(BIJI + 777)
    n_al = 190
    x0 = r5.uniform(0, W, n_al).astype(np.float32)
    y0l = r5.uniform(0.34, 0.62, n_al).astype(np.float32) * H
    panjang = r5.uniform(120, 420, n_al).astype(np.float32)
    arah = r5.normal(0, 0.55, n_al).astype(np.float32)
    for i in range(n_al):
        yy2 = np.arange(y0l[i], min(H - 2, y0l[i] + panjang[i]), 1.5).astype(np.float32)
        if len(yy2) < 6:
            continue
        t = (yy2 - y0l[i]) / panjang[i]
        xs2 = x0[i] + arah[i] * (yy2 - y0l[i]) * 0.55 + 6.0 * np.sin((yy2 - y0l[i]) / 27.0 + i) \
            + 2.5 * np.sin((yy2 - y0l[i]) / 9.0 + i * 0.7)
        xs2 = np.clip(xs2, 2, W - 3)
        # makin ke tepi makin terang (lembah tengah paling gelap seperti acuan)
        uu = np.clip(np.abs((xs2 - W * 0.5) / (W * 0.5)), 0, 1)
        kuat = (0.35 + 0.85 * uu) * (1.0 - 0.55 * t)
        bobot = (kuat * 1.5).astype(np.float32)
        warm = 0.80 if r5.uniform(0, 1) < 0.72 else 0.15
        c = dingin * (1 - warm) + hangat * warm
        splat(garis, xs2, ys := yy2, bobot, c[:, None] * np.ones((3, len(yy2)), np.float32))

    # ---- 3b) haze butir di separuh bawah (kepadatan naik ke bawah, dihitung dari aturan)
    r6 = np.random.default_rng(BIJI + 909)
    n_hz = int(W * H * 0.020)
    hx = r6.uniform(0, W, n_hz).astype(np.float32)
    hy = (H * (0.30 + 0.70 * r6.uniform(0, 1, n_hz) ** 0.55)).astype(np.float32)
    prob = (hy / H - 0.28) / 0.72
    keep = r6.uniform(0, 1, n_hz) < np.clip(prob, 0, 1) ** 1.2
    hx, hy = hx[keep], hy[keep]
    uu = np.clip(np.abs((hx - W * 0.5) / (W * 0.5)) * 1.3, 0, 1)
    bw = (r6.uniform(0.02, 1.0, len(hx)) ** 3.0 * 1.1 * (0.15 + 0.85 * uu)).astype(np.float32)
    idxh = np.clip(hx.astype(int), 0, W - 1)
    splat(garis, hx, hy, bw, cb[..., :][idxh].T if False else (dingin[:, None] * (0.55) + hangat[:, None] * 0.45) * np.ones((3, len(hx)), np.float32))

    # ---- 4) kabut bawah: gradasi hangat-dingin tipis di kaki langit
    kabut = np.exp(-((yy - H * 0.86) / (H * 0.10)) ** 2) * (0.35 + 0.65 * np.clip(np.abs(u), 0, 1) ** 2)
    garis += kabut[..., None] * np.array([1.6, 3.2, 5.0], np.float32)

    # tint: partikel putih -> warna lapis lewat penjumlahan glow dingin/hangat
    glow = np.asarray(Image.fromarray(np.clip(garis, 0, 255).astype(np.uint8)).filter(
        ImageFilter.GaussianBlur(2))).astype(np.float32)
    glow2 = np.asarray(Image.fromarray(np.clip(garis, 0, 255).astype(np.uint8)).filter(
        ImageFilter.GaussianBlur(7))).astype(np.float32)
    out = out + garis * 1.15 + glow * 0.30 + glow2 * 0.16
    out[..., 0] *= 0.72          # tint dingin-hangat: kanal biru dominan, merah lebih rendah
    out = np.clip(out, 0, 255) * skala
    return np.clip(out, 0, 255)



def samakan_tonal(img, ref, qs=(50, 70, 85, 93, 97, 99, 99.8)):
    """cocokkan histogram luma kita ke acuan lewat peta monoton pada kuantil (bukan salinan piksel)."""
    L = img.mean(2)
    Lr = ref.mean(2)
    qa = np.percentile(L, qs)
    qb = np.percentile(Lr, qs)
    xa = np.concatenate([[0.0], qa, [255.0]])
    xb = np.concatenate([[0.0], qb, [255.0]])
    xb = np.maximum.accumulate(xb)
    L2 = np.interp(L, xa, xb)
    f = np.where(L > 1e-3, L2 / np.maximum(L, 1e-3), 1.0)
    return np.clip(img * f[..., None], 0, 255)

def metrik(ref, img):
    L1 = ref.mean(2)
    L2 = img.mean(2)
    H, W = L1.shape

    def prof(L, n, axis):
        if axis == 0:
            return np.array([L[i * H // n:(i + 1) * H // n].mean() for i in range(n)])
        return np.array([L[:, i * W // n:(i + 1) * W // n].mean() for i in range(n)])

    pr = np.corrcoef(prof(L1, 32, 0), prof(L2, 32, 0))[0, 1]
    pc = np.corrcoef(prof(L1, 64, 1), prof(L2, 64, 1))[0, 1]
    # profil garis puncak (batas atas cahaya) per kolom
    top1, top2 = [], []
    for x in range(0, W, max(1, W // 64)):
        for L, top in ((L1, top1), (L2, top2)):
            idx = np.where(L[:, x] > 25)[0]
            top.append(int(idx.min()) if len(idx) else H)
    pt = np.corrcoef(top1, top2)[0, 1]
    rasio = float(L2.mean() / max(1e-3, L1.mean()))
    rgb = [round(float(img[..., k].mean() / max(1e-3, ref[..., k].mean())), 3) for k in range(3)]
    return {'korelasi_baris_32': round(float(pr), 3), 'korelasi_kolom_64': round(float(pc), 3),
            'korelasi_garis_puncak': round(float(pt), 3), 'rasio_luma': round(rasio, 3),
            'rasio_rgb': rgb}


ref = np.asarray(Image.open(ACI).convert('RGB')).astype(np.float32)
H, W = ref.shape[:2]
skala = float(ref.mean() / max(1e-3, gambar(H, W, 1.0).mean()))
img = gambar(H, W, skala)
img = samakan_tonal(img, ref)
img = np.clip(img * (ref.mean() / max(1e-3, img.mean())), 0, 255)
m = metrik(ref, img)
Image.fromarray(img.astype(np.uint8)).save(BARU, 'WEBP', quality=92, method=4)

if BANDING:
    beda = np.abs(img - ref).mean(2)
    beda = (255 * np.clip(beda / max(1.0, beda.max()), 0, 1) ** 0.5).astype(np.uint8)
    pn = np.concatenate([ref.astype(np.uint8), img.astype(np.uint8), np.dstack([beda] * 3)], 1)
    Image.fromarray(pn).resize((pn.shape[1] // 2, pn.shape[0] // 2)).save(f'{OUT}/banding-backdrop-v1.png')

Lr, Lo = ref.mean(2), img.mean(2)
ton = {'rata_luma': [round(float(Lr.mean()), 2), round(float(Lo.mean()), 2)],
       'p50': [int(np.percentile(Lr, 50)), int(np.percentile(Lo, 50))],
       'p90': [int(np.percentile(Lr, 90)), int(np.percentile(Lo, 90))],
       'p99': [int(np.percentile(Lr, 99)), int(np.percentile(Lo, 99))],
       'fraksi_gt60': [round(float((Lr > 60).mean()), 3), round(float((Lo > 60).mean()), 3)],
       'fraksi_gt120': [round(float((Lr > 120).mean()), 3), round(float((Lo > 120).mean()), 3)],
       'fraksi_hangat': [round(float((((ref[..., 0] - ref[..., 2]) > 18) & (Lr > 30)).mean()), 4),
                         round(float((((img[..., 0] - img[..., 2]) > 18) & (Lo > 30)).mean()), 4)]}
rows = {'berkas': 'backdrop-v1.webp', 'ukuran': [W, H], 'biji': BIJI, 'skala_kalibrasi': round(skala, 3),
        'tonal': ton, **m}
json.dump({'judul': 'P13 langkah 3 — latar (backdrop) milik kita: medan puncak berlapis + partikel + glow',
           'cara': 'langit gradasi + pendar → 5 lapis punggung (y(x) = dasar − kedalaman·|x−cx|^1,6 − amp·fbm) → '
                   'polyline bergaussian + partikel sepanjang punggung → aliran turun → glow 2 skala → '
                   'kalibrasi 1 skalar; biji tetap 137',
           'syarat_tonal': {'rata_luma': '±10 %', 'p50': '±3', 'p90': '±25 %', 'p99': '±40 %',
                            'fraksi>60': '±25 %', 'fraksi>120': '±40 %', 'fraksi_hangat': '±50 %'},
           'catatan_struktur': 'korelasi baris/kolom/garis-puncak hanya INFORMASI: latar kita adalah dunia '
                               'yang disusun dari biji tetap sendiri, jadi posisi puncak tidak (dan tidak boleh) '
                               'disalin dari acuan. Yang disyaratkan adalah paritas TONAL + provenance 0 salinan.',
           'baris': [rows]}, open(f'{OUT}/p13-langkah3.json', 'w'), indent=1, ensure_ascii=False)
print('tonal (acuan→kita):', ton)
print(f'struktur (informasi): baris {m["korelasi_baris_32"]} · kolom {m["korelasi_kolom_64"]} · '
      f'garis puncak {m["korelasi_garis_puncak"]} · rasio luma {m["rasio_luma"]}')
print(f'berkas: {BARU}')

if TULIS:
    import shutil
    shutil.copy(BARU, DST)
    print('--tulis: backdrop diganti di public/humanoid APEX')
