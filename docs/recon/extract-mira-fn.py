"""extract-mira-fn.py — tarik fungsi utuh dari bundle MIRA berdasarkan nama.

Fungsi ditulis minified satu baris; skrip ini memotongnya dengan pencocokan kurung yang
benar (parameter default `{}` / `[]` di daftar argumen tidak boleh dianggap badan fungsi).

Pakai:
    python3 recon/extract-mira-fn.py SN Bf Pw Iw Lw Dw RT bT xN _N yN
Keluaran: recon/mira-fn/<nama>.js
"""
import re
import sys

SRC = open('recon/mira.js', encoding='utf-8').read()


def find_fn(name):
    pat = re.compile(r'(?:function\s+' + re.escape(name) + r'\s*\(|(?<![A-Za-z0-9_$])'
                     + re.escape(name) + r'\s*=\s*(?:\([^)]*\)|[A-Za-z_$][A-Za-z0-9_$]*)\s*=>)')
    for m in pat.finditer(SRC):
        return m.start()
    return None


def paren_end(pos):
    p = SRC.index('(', pos)
    d = 0
    k = p
    instr = None
    while k < len(SRC):
        c = SRC[k]
        if instr:
            if c == '\\':
                k += 2
                continue
            if c == instr:
                instr = None
        else:
            if c in '"\'`':
                instr = c
            elif c == '(':
                d += 1
            elif c == ')':
                d -= 1
                if d == 0:
                    return k
        k += 1
    raise SystemExit('paren tidak seimbang ' + name)


def body_end(pos):
    """akhir ekspresi fungsi (badan blok atau ekspresi panah)."""
    if SRC[pos] == 'f':
        k = paren_end(pos)
        i = SRC.index('{', k + 1)
        return brace_end(i)
    # arrow: `name = (…) => expr` atau `name = x => expr`
    i = SRC.index('=>', pos) + 2
    while SRC[i] in ' \n':
        i += 1
    if SRC[i] == '{':
        return brace_end(i)
    # ekspresi: sampai `;` level atas
    d = 0
    k = i
    instr = None
    while k < len(SRC):
        c = SRC[k]
        if instr:
            if c == '\\':
                k += 2
                continue
            if c == instr:
                instr = None
        else:
            if c in '"\'`':
                instr = c
            elif c in '([{':
                d += 1
            elif c in ')]}':
                if d == 0:
                    return k - 1
                d -= 1
            elif c == ';' and d == 0:
                return k
        k += 1
    raise SystemExit('arrow tidak selesai ' + name)


def brace_end(i):
    d = 0
    k = i
    instr = None
    while k < len(SRC):
        c = SRC[k]
        if instr:
            if c == '\\':
                k += 2
                continue
            if c == instr:
                instr = None
        else:
            if c in '"\'`':
                instr = c
            elif c == '{':
                d += 1
            elif c == '}':
                d -= 1
                if d == 0:
                    return k
        k += 1
    raise SystemExit('brace tidak seimbang')


if __name__ == '__main__':
    import os
    os.makedirs('recon/mira-fn', exist_ok=True)
    names = sys.argv[1:] or ['SN']
    for n in names:
        p = find_fn(n)
        if p is None:
            print(f'✗ {n}: tidak ditemukan')
            continue
        e = body_end(p)
        src = SRC[p:e + 1]
        open(f'recon/mira-fn/{n}.js', 'w').write(src)
        print(f'✓ {n}: {len(src)} byte')
