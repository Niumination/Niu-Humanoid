"""extract-mira-fn2.py — ekstrak fungsi tambahan yang dibutuhkan sistem partikel/busur."""
import re, sys
src = open('/home/user/Kerja-Arena/recon/mira.js', encoding='utf-8', errors='replace').read()
names = sys.argv[1:] or ['Uw', 'iF', 'rF', 'bN', 'qy', 'Nd', 'zf', 'IT', 'lp']
out = {}
for n in names:
    i = src.find(f'function {n}(')
    if i < 0:
        i = src.find(f' {n}=(')
        if i < 0:
            i = src.find(f',{n}=(')
    if i < 0:
        print(f'-- {n}: TIDAK DITEMUKAN'); continue
    # ambil sampai kurung kurawal seimbang
    if src[i:i+8] == 'function':
        j = src.index('{', i)
        depth = 0
        for k in range(j, len(src)):
            if src[k] == '{': depth += 1
            elif src[k] == '}':
                depth -= 1
                if depth == 0: break
        body = src[i:k+1]
    else:
        body = src[i:src.index('\n', i)]
    print(f'-- {n}: {len(body)} B')
    open(f'/home/user/Kerja-Arena/recon/mira-fn/{n}.js', 'w').write(body)
