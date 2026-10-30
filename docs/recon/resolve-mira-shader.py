"""resolve-mira-shader.py — rekonstruksi shader MIRA LENGKAP dari bundle.

Masalah: `recon/shaders/mira/*.glsl` hasil P3 memotong bagian yang dibangun dengan
konkatenasi variabel, mis. bundle menulis:

    Zk = `...uniform...` + rh + Mp + ev + `
      void main() { ... headPlace ... }`

sehingga file P3 hanya memuat potongan pertama + placeholder `⟨DINAMIS⟩`.

Skrip ini menelusuri definisi setiap identifier, menyambung seluruh potongan template
literal, dan mengganti `${ekspresi}` dengan token `⟪JS:ekspresi⟫` supaya bisa dievaluasi
manual (lihat --eval untuk yang berupa angka/konstanta).

Pakai:
    python3 recon/resolve-mira-shader.py Zk > /tmp/Zk.glsl
    python3 recon/resolve-mira-shader.py Qk --eval > /tmp/Qk.glsl
"""
import re
import sys

SRC = open('recon/mira.js', encoding='utf-8').read()


def find_def(name):
    """cari `name=` pada level atas dan kembalikan offset RHS."""
    for m in re.finditer(r'(?<![A-Za-z0-9_$.])' + re.escape(name) + r'\s*=', SRC):
        return m.end()
    raise SystemExit(f'definisi {name} tidak ditemukan')


def parse_expr(pos):
    """baca rangkaian `template`|identifier yang dipisah `+` sampai ekspresi selesai."""
    parts = []
    i = pos
    n = len(SRC)
    while i < n:
        # lewati spasi
        while i < n and SRC[i] in ' \t\n':
            i += 1
        if SRC[i] == '`':
            j = i + 1
            buf = []
            depth = 0
            while j < n:
                c = SRC[j]
                if c == '\\':
                    buf.append(SRC[j:j + 2])
                    j += 2
                    continue
                if c == '$' and j + 1 < n and SRC[j + 1] == '{':
                    depth += 1
                    buf.append('${')
                    j += 2
                    continue
                if c == '}' and depth:
                    depth -= 1
                    buf.append('}')
                    j += 1
                    continue
                if c == '`' and depth == 0:
                    break
                buf.append(c)
                j += 1
            text = ''.join(buf)
            # decode escape JS minimal
            text = (text.replace('\\n', '\n').replace('\\t', '\t')
                        .replace('\\"', '"').replace("\\'", "'").replace('\\`', '`'))
            parts.append(('text', text))
            i = j + 1
        else:
            m = re.match(r'[A-Za-z_$][A-Za-z0-9_$]*', SRC[i:])
            if not m:
                break
            parts.append(('ref', m.group(0)))
            i += m.end()
        # lanjut kalau ada `+`
        while i < n and SRC[i] in ' \t\n':
            i += 1
        if i < n and SRC[i] == '+':
            i += 1
            continue
        break
    return parts


def resolve(name, depth=0, seen=()):
    if name in seen:
        return ''
    if depth > 6:
        return f'⟪REF-TERLALU-DALAM:{name}⟫'
    pos = find_def(name)
    parts = parse_expr(pos)
    out = []
    for kind, val in parts:
        if kind == 'text':
            out.append(val)
        else:
            # identifier GLSL bawaan singkat? coba resolve; kalau gagal, biarkan sebagai nama
            try:
                out.append(resolve(val, depth + 1, seen + (name,)))
            except SystemExit:
                out.append(f'⟪REF:{val}⟫')
    return ''.join(out)


if __name__ == '__main__':
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    name = sys.argv[1]
    glsl = resolve(name)
    if '--eval' in sys.argv:
        # interpolasi yang isinya literal angka / konstanta sederhana dievaluasi
        def ev(m):
            expr = m.group(1)
            try:
                v = eval(expr, {'__builtins__': {}}, {})  # noqa: S307 — hanya literal angka
                return repr(float(v))
            except Exception:
                return m.group(0)
        glsl = re.sub(r'\$\{([^{}]*)\}', ev, glsl)
    print(glsl)
