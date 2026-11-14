#!/usr/bin/env python3
"""halo.py — profil pendar (halo) di sekitar piksel paling terang, LIVE vs OURS.

Pakai: python3 tools/halo.py <tag> [dir]
Rerata luminansi pada radius 0/3/6/9/12 px dari piksel > persentil 99,5.
"""
import glob
import os
import sys

import numpy as np
from PIL import Image

tag = sys.argv[1]
d = sys.argv[2] if len(sys.argv) > 2 else os.environ.get('OUT', '/tmp/probe-layers')
RS = [0, 3, 6, 9, 12]


def med(who):
    fs = sorted(glob.glob(f'{d}/{who}-{tag}-*.png'))
    if not fs:
        sys.exit(f'tidak ada berkas {who}-{tag} di {d}')
    st = np.stack([np.asarray(Image.open(f).convert('RGB')).astype(np.float32) for f in fs])
    return np.median(st, axis=0).mean(2)


L = med('LIVE')
O = med('OURS')
H, W = L.shape


def prof(a):
    thr = np.percentile(a, 99.5)
    ys, xs = np.nonzero(a > thr)
    out = []
    for r in RS:
        vals = [a[max(0, y - r):min(H, y + r + 1), max(0, x - r):min(W, x + r + 1)].mean()
                for y, x in zip(ys[::5], xs[::5])]
        out.append(float(np.mean(vals)))
    return np.array(out)


pl, po = prof(L), prof(O)
print(f'{tag:14s} live ' + ' '.join(f'{v:6.1f}' for v in pl))
print(f'{"":14s} ours ' + ' '.join(f'{v:6.1f}' for v in po))
print(f'{"":14s} rasi ' + ' '.join(f'{b/max(a,1e-6):6.2f}' for a, b in zip(pl, po)))
