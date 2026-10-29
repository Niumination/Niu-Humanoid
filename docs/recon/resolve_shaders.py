#!/usr/bin/env python3
"""P3b — rekonstruksi shader lengkap dari ekspresi konkatenasi di bundle.

Bundle membangun shader seperti:  Zk=`uniform ...;`+rh+Mp+ev+`void main(){...}`
dan `rh`, `Mp`, `ev` adalah potongan GLSL lain. Skrip ini:
  1. menemukan assignment `NAME=<ekspresi>;` yang memuat penanda GLSL,
  2. mengurai operand tingkat-atas yang dipisah `+`,
  3. me-resolve identifier operand secara rekursif,
  4. menulis GLSL final verbatim + menandai operand yang TIDAK bisa di-resolve
     (mis. dihasilkan programatik lewat .join()/loop) sebagai DINAMIS.
"""
import re, os, json, sys, glob

MARK = re.compile(r'(void main|gl_FragColor|gl_Position|#include <|uniform\s+(float|vec|sampler|mat)|attribute\s+(float|vec|mat))')
ESC = {'n':'\n','t':'\t','r':'\r','\\':'\\','"':'"',"'":"'",'`':'`','b':'\b','f':'\f','0':'\0'}

def decode(raw):
    out=[];i=0
    while i<len(raw):
        c=raw[i]
        if c=='\\' and i+1<len(raw):
            n=raw[i+1]
            if n=='u':
                try: out.append(chr(int(raw[i+2:i+6],16))); i+=6; continue
                except Exception: pass
            if n=='x':
                try: out.append(chr(int(raw[i+2:i+4],16))); i+=4; continue
                except Exception: pass
            out.append(ESC.get(n,n)); i+=2; continue
        out.append(c); i+=1
    return ''.join(out)

class Bundle:
    def __init__(self, path):
        self.src=open(path,encoding='utf-8',errors='ignore').read()
        self.n=path
    def find_assign(self, name):
        """cari 'NAME=' di level atas; kembalikan posisi awal ekspresi + akhir (;)"""
        for m in re.finditer(r'(?<![\w$.])'+re.escape(name)+r'\s*=\s*', self.src):
            st=m.end()
            en=self.scan_expr_end(st)
            return st,en
        return None
    def scan_expr_end(self, st):
        s=self.src; i=st; depth=0; N=len(s)
        while i<N:
            c=s[i]
            if c in '"\'`':
                q=c; i+=1
                while i<N:
                    if s[i]=='\\': i+=2; continue
                    if s[i]==q: break
                    i+=1
                i+=1; continue
            if c in '([{': depth+=1
            elif c in ')]}': depth-=1
            elif c==';' and depth<=0: return i
            elif c==',' and depth<=0: return i
            i+=1
        return N
    def split_plus(self, st, en):
        """pecah ekspresi pada '+' tingkat atas"""
        s=self.src; parts=[]; cur=st; i=st; depth=0
        while i<en:
            c=s[i]
            if c in '"\'`':
                q=c; i+=1
                while i<en:
                    if s[i]=='\\': i+=2; continue
                    if s[i]==q: break
                    i+=1
                i+=1; continue
            if c in '([{': depth+=1
            elif c in ')]}': depth-=1
            elif c=='+' and depth==0:
                parts.append(s[cur:i].strip()); cur=i+1
            i+=1
        parts.append(s[cur:en].strip())
        return [p for p in parts if p]

def resolve(b, expr, depth=0, seen=None):
    """kembalikan (text, chunks, dynamic)"""
    seen=seen or set()
    expr=expr.strip()
    if depth>8: return ('',[],True)
    # literal template / string tunggal
    m=re.fullmatch(r'`([\s\S]*)`',expr,re.S)
    if m:
        raw=m.group(1)
        dyn = '${' in raw
        if dyn:
            raw=re.sub(r'\$\{[^}]*\}','/* DINAMIS: interpolasi JS */',raw)
        return (decode(raw),[('literal',len(raw))],dyn)
    m=re.fullmatch(r'"([\s\S]*)"|'+r"'([\s\S]*)'",expr,re.S)
    if m:
        raw=m.group(1) if m.group(1) is not None else m.group(2)
        return (decode(raw),[('literal',len(raw))],False)
    # identifier (mungkin dipanggil / di-join / ternary) → cari assignment-nya
    m=re.fullmatch(r'([A-Za-z_$][\w$]*)',expr)
    if m:
        name=m.group(1)
        if name in seen: return ('',[(name,'cycle')],True)
        f=b.find_assign(name)
        if not f: return ('',[(name,'UNRESOLVED')],True)
        st,en=f
        return resolve(b, b.src[st:en], depth+1, seen|{name})
    # ekspresi gabungan / pemanggilan fungsi / ternary → coba urai operand +
    parts=b.split_plus(0,len(expr)) if False else None
    dyn=True; chunks=[]; texts=[]
    # coba: identifier + .join(...) atau fungsi()
    if re.match(r'^[A-Za-z_$][\w$]*$',expr): dyn=True
    chunks.append((expr[:60],'EXPR'))
    return ('', chunks, dyn)

def resolve_expr(b, expr, depth=0, seen=frozenset()):
    expr=expr.strip()
    if depth>10: return ('',[('maxdepth','')],True)
    m=re.fullmatch(r'`([\s\S]*)`',expr,re.S)
    if m:
        raw=m.group(1); dyn='${' in raw
        if dyn: raw=re.sub(r'\$\{[^}]*\}','/* ⟨DINAMIS: interpolasi JS⟩ */',raw)
        return (decode(raw),[('literal',len(raw),bool(dyn))],dyn)
    m=re.fullmatch(r'"((?:[^"\\]|\\.)*)"',expr,re.S) or re.fullmatch(r"'((?:[^'\\]|\\.)*)'",expr,re.S)
    if m:
        raw=m.group(1); return (decode(raw),[('literal',len(raw),False)],False)
    m=re.fullmatch(r'([A-Za-z_$][\w$]*)',expr)
    if m:
        name=m.group(1)
        if name in seen: return ('',[(name,0,True)],True)
        f=b.find_assign(name)
        if not f: return ('',[(name,0,True)],True)
        st,en=f
        return resolve_expr(b, b.src[st:en], depth+1, seen|{name})
    # ekspresi majemuk: pecah pada + tingkat atas
    parts=b.split_plus(0,0)  # placeholder
    return ('',[(expr[:70].replace('\n',' '),0,True)],True)

def resolve_expression(b, expr, depth=0, seen=frozenset()):
    """resolve ekspresi apa pun: literal | ident | A+B | A.join(...) | ternary"""
    expr=expr.strip()
    if depth>10: return ('',[('maxdepth',0,True)],True)
    # 1) literal tunggal (harus benar-benar satu literal utuh)
    if closes_at_end(expr):
        return resolve_expr(b, expr, depth, seen)
    # 2) identifier tunggal
    if re.fullmatch(r'[A-Za-z_$][\w$]*',expr):
        return resolve_expr(b, expr, depth, seen)
    # 3) pecah pada + tingkat atas
    parts=split_plus_in(b,expr)
    if len(parts)>1:
        texts=[];chunks=[];dyn=False
        for p in parts:
            t,c,d=resolve_expression(b,p,depth+1,seen)
            texts.append(t); chunks+=c; dyn=dyn or d
        return (''.join(texts), chunks, dyn)
    # 4) pemanggilan .join / fungsi → DINAMIS
    return ('/* ⟨DINAMIS: dihasilkan JS — tidak bisa disalin verbatim: '+expr[:100].replace('\n',' ')+' ⟩ */',[(expr[:60],0,True)],True)


def closes_at_end(expr):
    """True bila expr adalah SATU literal utuh (bukan gabungan yang kebetulan diawali/diakhiri backtick)."""
    if not expr or expr[0] not in '"\'`': return False
    q=expr[0]; i=1
    while i<len(expr):
        if expr[i]=='\\': i+=2; continue
        if expr[i]==q: return i==len(expr)-1
        i+=1
    return False

def split_plus_in(b, expr):
    s=expr; parts=[]; cur=0; i=0; depth=0
    while i<len(s):
        c=s[i]
        if c in '"\'`':
            q=c;i+=1
            while i<len(s):
                if s[i]=='\\': i+=2; continue
                if s[i]==q: break
                i+=1
            i+=1; continue
        if c in '([{': depth+=1
        elif c in ')]}': depth-=1
        elif c=='+' and depth==0:
            parts.append(s[cur:i].strip()); cur=i+1
        i+=1
    parts.append(s[cur:].strip())
    return [p for p in parts if p]

def main():
    report={}
    for n in ['apex','mira']:
        b=Bundle(n+'.js')
        s=b.src
        # kandidat: assignment yang ekspresinya memuat penanda GLSL
        cands=[]
        for m in re.finditer(r'(?<![\w$.])([A-Za-z_$][\w$]*)\s*=\s*(?=[`"\'])', s):
            name=m.group(1); st=m.end()
            en=b.scan_expr_end(st)
            expr=s[st:en]
            if MARK.search(expr) or re.search(r'\b(rh|Mp|ev)\b',expr):
                text,chunks,dyn=resolve_expression(b,expr)
                if len(text)>250 and MARK.search(text):
                    cands.append(dict(name=name,pos=m.start(),bytes=len(text),dyn=dyn,text=text,
                                      chunks=[(c[0],c[1] if len(c)>1 else 0,c[2] if len(c)>2 else False) for c in chunks],
                                      kind=('frag' if 'gl_FragColor' in text else 'vert')))
        # dedupe by text hash, urutkan menurun
        seen=set(); uniq=[]
        for c in sorted(cands,key=lambda x:-x['bytes']):
            h=hash(c['text'])
            if h in seen: continue
            seen.add(h); uniq.append(c)
        os.makedirs(f'shaders/{n}',exist_ok=True)
        for f in glob.glob(f'shaders/{n}/*'): os.remove(f)
        for i,c in enumerate(uniq):
            fn=f"shaders/{n}/{i:02d}-{c['kind']}-{c['bytes']}b-{c['name']}.glsl"
            hdr=(f"// ==== recon shader {n} #{i:02d} — variabel bundle: {c['name']} ====\n"
                 f"// sumber: {n}.js offset {c['pos']} | {c['bytes']} byte hasil rekonstruksi\n"
                 f"// jenis: {c['kind']} | operand: {len(c['chunks'])} | ada bagian DINAMIS: {c['dyn']}\n"
                 f"// DISALIN VERBATIM (escape JS sudah di-decode) — jangan dirapikan (aturan main #3)\n\n")
            open(fn,'w').write(hdr+c['text'])
        report[n]=[dict(file=f"{i:02d}-{c['kind']}-{c['bytes']}b-{c['name']}.glsl",name=c['name'],pos=c['pos'],
                        bytes=c['bytes'],kind=c['kind'],dyn=c['dyn'],operands=len(c['chunks'])) for i,c in enumerate(uniq)]
        print(f"== {n}: {len(cands)} assignment GLSL → {len(uniq)} shader unik", file=sys.stderr)
        for i,c in enumerate(uniq):
            print(f"   {i:02d} {c['kind']:4} {c['bytes']:>6}B var={c['name']:<6} dyn={c['dyn']!s:<5} operands={len(c['chunks'])}", file=sys.stderr)
    json.dump(report,open('shaders/REPORT2.json','w'),indent=1)

if __name__=='__main__':
    main()
