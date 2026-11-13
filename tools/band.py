#!/usr/bin/env python3
"""band.py — bandingkan median N bingkai LIVE vs OURS untuk satu tag probe-layers.

Pakai: python3 tools/band.py <tag> [dir]
Keluaran: rerata, MAE, jumlah piksel di atas ambang, dan rasio per pita luma (live → ours).
"""
import glob
import os
import sys

import numpy as np
from PIL import Image

tag = sys.argv[1]
d = sys.argv[2] if len(sys.argv) > 2 else os.environ.get('OUT', '/tmp/probe-layers')
BANDS = [(5, 20), (20, 40), (40, 60), (60, 90), (90, 120), (120, 150), (150, 200), (200, 256)]


def med(who):
    fs = sorted(glob.glob(f'{d}/{who}-{tag}-*.png'))
    if not fs:
        sys.exit(f'tidak ada berkas untuk {who}-{tag} di {d}')
    st = np.stack([np.asarray(Image.open(f).convert('RGB')).astype(np.float32) for f in fs])
    return np.median(st, axis=0).mean(2)


L = med('LIVE')
O = med('OURS')
print(f'{tag:14s} rerata live {L.mean():6.2f} ours {O.mean():6.2f} | MAE {np.abs(L-O).mean():5.2f}')
print('  piksel di atas ambang (live / ours): ' + ' · '.join(f'>{t}: {int((L > t).sum())}/{int((O > t).sum())}' for t in (20, 60, 100, 150)))
for lo, hi in BANDS:
    m = (L >= lo) & (L < hi)
    if m.sum() < 40:
        continue
    print(f'  live {lo:3d}-{hi:3d}: n={int(m.sum()):6d} live {L[m].mean():6.1f} ours {O[m].mean():6.1f} rasio {O[m].mean()/max(L[m].mean(), 1e-6):.3f}')
