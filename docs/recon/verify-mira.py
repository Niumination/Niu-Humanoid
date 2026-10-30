"""verify-mira.py — verifikasi Fase 1.3–1.5 untuk MIRA terhadap bundle live (recon/mira.js).
Membandingkan: 82 param (key/label/min/max/step/default/grup/urutan), 7 alias `stands`,
13 query param, hook window. Cetak laporan + tulis recon/mira-verified.json.
"""
import json, re, sys

src = open('recon/mira.js', encoding='utf-8').read()
params = json.load(open('recon/mira-params.json'))

print(f"bundle {len(src)} byte · params.json {len(params)} entri\n")

# ---- 1. blok literal param di bundle: {key:"…",…stands:"…",…label:"…",…min:…,max:…,step:…}
blocks = re.findall(r'\{key:"([^"]+)"([^{}]{0,400}?)\}', src)
seen, dup, unknown = {}, [], []
lit = {}
for key, tail in blocks:
    if not re.match(r'^[a-z][a-z0-9]*\.[a-zA-Z.]+$', key):
        continue
    d = {}
    m = re.search(r'stands:"([^"]+)"', tail); d['stands'] = m.group(1) if m else None
    m = re.search(r'label:"([^"]*)"', tail); d['label'] = m.group(1) if m else None
    m = re.search(r'group:"([^"]*)"', tail); d['group'] = m.group(1) if m else None
    for k in ("min", "max", "step", "def"):
        m = re.search(rf'\b{k}:(-?[\d.]+)', tail)
        d['default' if k == 'def' else k] = float(m.group(1)) if m else None
    if key in lit:
        dup.append(key)
    lit[key] = d

print(f"blok param unik di bundle: {len(lit)}  (duplikat: {len(dup)} {dup[:5]})")

# ---- 2. bandingkan 82 entri
bad = []
for i, p in enumerate(params):
    L = lit.get(p['key'])
    if not L:
        bad.append((i, p['key'], 'TIDAK ADA DI BUNDLE', None)); continue
    for f in ('label', 'group', 'min', 'max', 'step', 'default', 'stands'):
        a, b = p.get(f), L.get(f)
        if isinstance(a, float) and isinstance(b, float):
            ok = abs(a - b) < 1e-9
        else:
            ok = a == b
        if not ok:
            bad.append((i, p['key'], f, (a, b)))
print(f"param cocok: {len(params)-len(bad)}/{len(params)}")
for b in bad[:20]:
    print("  ✗", b)

# ---- 3. urutan grup (20 seksi, 'Her hair' 2×)
groups = []
for p in params:
    if not groups or groups[-1][0] != p['group']:
        groups.append([p['group'], 0])
    groups[-1][1] += 1
print(f"\nseksi: {len(groups)}")
for i, (g, n) in enumerate(groups, 1):
    print(f"  {i:2d}. {g}  ({n})")

# ---- 4. alias
alias = {p['key']: p['stands'] for p in params if p.get('stands')}
print(f"\nalias `stands`: {len(alias)}")
for k, v in alias.items():
    print(f"  {k} → {v}   (default {dict((x['key'],x['default']) for x in params)[k]} vs {dict((x['key'],x['default']) for x in params).get(v)})")

# ---- 5. query param
qs = sorted(set(re.findall(r'\.get\("([a-z_]+)"\)', src)))
print(f"\nquery param terdeteksi ({len(qs)}): {qs}")

# ---- 6. hook window
hooks = sorted(set(re.findall(r'window\.(__[A-Z_]+|__MIRA_[A-Z_]+)', src)))
print(f"\nhook window ({len(hooks)}): {hooks}")

json.dump({'paramMatches': len(params)-len(bad), 'paramTotal': len(params), 'mismatches': bad,
           'sections': groups, 'aliases': alias, 'queryParams': qs, 'hooks': hooks},
          open('recon/mira-verified.json', 'w'), indent=1)
print("\n→ recon/mira-verified.json")
