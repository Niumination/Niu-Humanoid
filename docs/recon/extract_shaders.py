#!/usr/bin/env python3
"""P3 — ekstraksi shader GLSL dari bundle ter-minify.

Masalah: shader di bundle tidak selalu berupa template literal utuh.
Sebagian ditulis sebagai string ber-quote dengan escape \\n, sebagian dipecah
dan disambung dengan +, sebagian lagi DIHASILKAN secara programatik
(mis. `...${gr(i.width)}...`).join("\\n").

Pendekatan: tokenisasi seluruh string literal ( ' " ` ) + decode escape,
lalu gabungkan token yang berdekatan dan sama-sama berisi penanda GLSL.
"""
import re, os, json, glob, sys

GLSL_MARK = re.compile(r'(void main|gl_FragColor|gl_Position|#include <|uniform\s+(float|vec|sampler|mat)|attribute\s+(float|vec|mat))')
GAP_OK = re.compile(r'^[\s`\'"${}()+\[\],.:?;]*$')
ESC = {'n':'\n','t':'\t','r':'\r','\\':'\\','"':'"',"'":"'",'`':'`','0':'\0','b':'\b','f':'\f'}

def decode(raw):
    out=[];i=0
    while i < len(raw):
        c=raw[i]
        if c=='\\' and i+1 < len(raw):
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

def tokenize_strings(s):
    """kembalikan list (start,end,quote,decoded) untuk setiap string literal top-level sederhana."""
    toks=[];i=0;N=len(s)
    while i<N:
        c=s[i]
        if c=='/' and i+1<N and s[i+1]=='/':
            j=s.find('\n',i); i=N if j<0 else j+1; continue
        if c=='/' and i+1<N and s[i+1]=='*':
            j=s.find('*/',i+2); i=N if j<0 else j+2; continue
        if c in '"\'`':
            q=c; j=i+1; buf=[]
            while j<N:
                if s[j]=='\\': buf.append(s[j:j+2]); j+=2; continue
                if s[j]==q: break
                if q!='`' and s[j]=='\n': break
                buf.append(s[j]); j+=1
            raw=''.join(buf)
            toks.append((i,j+1,q,decode(raw)))
            i=j+1; continue
        i+=1
    return toks

def build_runs(toks):
    runs=[]; cur=None
    for (a,b,q,dec) in toks:
        mark = bool(GLSL_MARK.search(dec))
        if cur is None:
            if mark: cur=dict(start=a,end=b,parts=[dec],tokens=[(a,b,q)],hasmain=('void main' in dec))
            continue
        gap = toks and None
        cur["gap_ok"]=True
        # gap berupa teks di antara token sebelumnya dan token ini
        g = None
        prev_end=cur['end']
        g=None
        # perlu akses source; disimpan di closure luar
        cur['_next']=True
        if mark or len(dec)>20:
            cur['parts'].append(dec); cur['tokens'].append((a,b,q)); cur['end']=b
            cur['hasmain']=cur['hasmain'] or ('void main' in dec)
        if len(''.join(cur['parts']))>40000:
            runs.append(cur); cur=None
    if cur: runs.append(cur)
    return runs

if __name__=='__main__':
    res={}
    for n in ['apex','mira']:
        s=open(n+'.js',encoding='utf-8',errors='ignore').read()
        toks=tokenize_strings(s)
        # kelompokkan: token GLSL + token lanjutan yang jaraknya dekat & gap "aman"
        runs=[]; i=0
        while i < len(toks):
            a,b,q,dec=toks[i]
            if not GLSL_MARK.search(dec):
                i+=1; continue
            group=[toks[i]]; j=i+1
            while j < len(toks):
                na,nb,nq,ndec=toks[j]
                gap=s[group[-1][1]:na]
                if len(gap)>240 or not GAP_OK.match(gap): break
                group.append(toks[j]); j+=1
                if len(''.join(x[3] for x in group))>40000: break
            runs.append(group); i=j
        os.makedirs(f'shaders/{n}',exist_ok=True)
        for f in glob.glob(f'shaders/{n}/*.glsl'): os.remove(f)
        out=[]
        for k,g in enumerate(runs):
            text=''.join(x[3] for x in g)
            if 'void main' not in text and 'uniform' not in text: continue
            out.append(dict(pos=g[0][0],end=g[-1][1],bytes=len(text),chunks=len(g),text=text,
                            main='void main' in text))
        print(f"== {n}: {len(toks)} string literal, {len(runs)} run GLSL, {len(out)} kandidat shader", file=sys.stderr)
        json.dump([{k:v for k,v in o.items() if k!='text'} for o in out],open(f'shaders/{n}.runs.json','w'),indent=1)
        for k,o in enumerate(sorted(out,key=lambda x:-x['bytes'])):
            open(f'shaders/{n}/run-{k:02d}-{o["bytes"]}b.txt','w').write(o['text'])
        print(f"   terbesar: {[ (o['bytes'],o['chunks'],o['main']) for o in sorted(out,key=lambda x:-x['bytes'])[:12]]}", file=sys.stderr)
