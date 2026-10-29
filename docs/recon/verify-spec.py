#!/usr/bin/env python3
"""Verifikasi ulang setiap klaim di SPEC-APEX.md / SPEC-MIRA.md terhadap bundle live.
Jalankan dari folder recon/:  python3 verify-spec.py"""
import re, os, json, sys
js={n:open(n+'.js',encoding='utf-8',errors='ignore').read() for n in ['apex','mira']}
css={n:open(n+'.css',encoding='utf-8').read() for n in ['apex','mira']}
def _html(n):
    # P0.3: pakai arsip BERSIH (646 B) bila ada; arsip lama (813 B) tercemar Cloudflare Rocket Loader.
    for cand in (n+'-index.clean.html', n+'-index.html'):
        if os.path.exists(cand):
            return open(cand,encoding='utf-8').read()
    raise FileNotFoundError(n)
def norm_html(s):
    # buang artefak injeksi Cloudflare agar perbandingan apple-to-apple
    s=re.sub(r'\s*<script[^>]*cdn-cgi/scripts[^>]*></script>','',s)
    s=re.sub(r'type="[0-9a-f]{8,}-module"','type="module"',s)
    return '\n'.join(l.rstrip() for l in s.strip().split('\n'))
html={n:_html(n) for n in ['apex','mira']}
norm=lambda s: re.sub(r'\s+','',s)
checks=[]
def ck(n,c,d=""): checks.append((n,bool(c),d))

ck("apex.js 1.108.884 byte", os.path.getsize('apex.js')==1108884, os.path.getsize('apex.js'))
ck("mira.js 1.185.588 byte", os.path.getsize('mira.js')==1185588, os.path.getsize('mira.js'))
ck("apex.css 224 byte", len(css['apex'])==224, len(css['apex']))
ck("mira.css 574 byte", len(css['mira'])==574, len(css['mira']))

for n in ['apex','mira']:
    spec=open(f'SPEC-{n.upper()}.md',encoding='utf-8').read()
    h=re.search(r'```html\n(.*?)\n```',spec,re.S).group(1)
    ck(f"{n}: blok HTML di spec == index.html live (ternormalisasi)", norm_html(h)==norm_html(html[n]))
    c=re.search(r'```css\n(.*?)\n```',spec,re.S).group(1)
    ck(f"{n}: blok CSS di spec == CSS live (ternormalisasi)", norm(c)==norm(css[n].strip()))

for a in ["apex-idle","apex-listening","apex-thinking","apex-speaking","apex-speaking-strong","apex-assembly-25","apex-assembly-60","backdrop"]:
    ck(f"apex aset /humanoid/{a}-v1.webp", f"/humanoid/{a}-v1.webp" in js['apex'])
for a in ["mira-idle","mira-hair"]:
    ck(f"mira aset /humanoid/{a}-v1.webp", f"/humanoid/{a}-v1.webp" in js['mira'])

p=json.load(open('mira-params.json')); ck("mira-params.json = 82 entri", len(p)==82, len(p))
specm=open('SPEC-MIRA.md',encoding='utf-8').read()
rows=re.findall(r'^\| `([A-Za-z0-9._]+)` \| .+ \| ([-\d.]+) \| ([-\d.]+) \| ([-\d.]+) \| \*\*([-\d.]+)\*\* \|$',specm,re.M)
ck("tabel SPEC-MIRA = 82 baris", len(rows)==82, len(rows))
ck("key tabel == key json", set(r[0] for r in rows)==set(o['key'] for o in p))
byk={o['key']:o for o in p}
ck("semua min/max/step/default tabel == json",
   all((float(a),float(b),float(c),float(d))==(byk[k]['min'],byk[k]['max'],byk[k]['step'],byk[k]['default']) for k,a,b,c,d in rows))

apex_copy=["APEX HUMANOID","a figure of light that assembles itself","ENTER",
 "the click opens the audio - the birth has a sound","STATUS: SPEAKING  INTENSITY: HIGH",
 "Run the birth again","Exit humanoid view","Open camera now","Close camera",
 "Open hand gesture","Finger tracking is on","Drive the speaking face from your microphone",
 "humanoid-portrait-frame","humanoid-mode","Apex cinematic humanoid",
 "Animated cyan and gold Apex humanoid"]
for c in apex_copy: ck(f"apex copy {c[:36]!r}", c in js['apex'])

mira_copy=["MIRA HUMANOID","a figure of light that weaves herself out of her own heart","ENTER",
 "the click opens the audio - her build has a sound","IDLE","LISTENING","TALKING","REPLAY",
 "ENABLE CAMERA","CAMERA OFF","The camera is on","loading hand tracking","starting the camera",
 "camera on - show your hand","hand found - point, pinch to touch her","no camera found",
 "camera blocked - allow it in the browser settings","this browser has no camera access here",
 "context lost","no log","running","MIC ","SOUND ","SPEED "]
for c in mira_copy: ck(f"mira copy {c[:36]!r}", c in js['mira'])

for g in ["__HUM_SURGE","__HUM_ENERGY","__HUM_CLICK","__HUM_FREEZE_T","__HUM_SPEAK_AMP",
 "__HUM_BOIL_AMP","__HUM_RIM","__HUM_DOT","__HUM_BLEND","__HUM_BG_REST","__HUM_BG_PULSE",
 "__HUM_BG_T","__HUM_SKIP_ASSEMBLY","__HUM_ASM_OFF","__HUM_ASM_EL","__HUM_ATTN",
 "__HUM_FORCE_2D","__HUM_NO_BG"]: ck(f"apex global {g}", g in js['apex'])
for q in ["skip","asmoff","asmel","nobg","bgrest","bgpulse","surge","state"]:
    ck(f"apex query ?{q}", f'get("{q}")' in js['apex'])
ck("apex default BG_REST .22","__HUM_BG_REST!=null?window.__HUM_BG_REST:.22" in js['apex'])
ck("apex default BG_PULSE 2.6","__HUM_BG_PULSE:2.6" in js['apex'])
ck("apex default SPEAK_AMP .55","__HUM_SPEAK_AMP!=null?Number(window.__HUM_SPEAK_AMP):.55" in js['apex'])
ck("apex dt dijepit 0.05","Math.min(.05," in js['apex'])
ck("apex ambang strong (e-.34)/.4","(oe-.34)/.4" in js['apex'])
ck("apex surge dijepit 4.5",">4.5" in js['apex'])
for b in ["source-over","lighter","screen","plus-lighter","destination-in"]:
    ck(f"apex blend mode {b}", b in js['apex'])
for c in ["min(100vw, 100vh)","clamp(9px, 1.05vmin, 13px)","rgba(0, 10, 14, 0.72)",
 "humRingBase 3.4s ease-in-out infinite","humRingPulse 4.55s linear infinite",
 "opacity 140ms","opacity 900ms","prefers-reduced-motion: reduce","width, height, left, top, opacity"]:
    ck(f"apex {c[:34]}", c in js['apex'])
ck('apex peta state idle/listening/thinking/speaking/strong','idle:"/humanoid/apex-idle-v1.webp",listening:' in js['apex'])
ck('apex getContext("2d") = 8', js['apex'].count('getContext("2d")')==8, js['apex'].count('getContext("2d")'))
ck('mira getContext("2d") = 6', js['mira'].count('getContext("2d")')==6, js['mira'].count('getContext("2d")'))
for n,cnt in [("div",19),("canvas",19),("button",14),("img",9),("p",5),("video",3),("span",1),("section",1)]:
    ck(f'apex "{n}" = {cnt}', js['apex'].count('"'+n+'"')==cnt, js['apex'].count('"'+n+'"'))
for n,cnt in [("div",17),("canvas",16),("button",11),("img",6),("video",3),("span",2)]:
    ck(f'mira "{n}" = {cnt}', js['mira'].count('"'+n+'"')==cnt, js['mira'].count('"'+n+'"'))

for c in ["mira-btn","mira-page-row","mira-own-row","mira-body","mira-humanoid-camera",
 "mira-humanoid-sound","miraEnter","miraExit"]: ck(f"mira class {c}", c in js['mira'])
for m in ["lib/orbScreen","lib/miraHairPic","lib/figureHead3d","lib/miraBuild","lib/miraFace",
 "lib/miraDebug","lib/miraDial","lib/miraPace"]: ck(f"mira modul {m}", m in js['mira'])
ck("mira 9 mode debug",'["","orb","mask","breakup","near","hot","nearhot","core","corehot"]' in js['mira'])
for c in ["HOT_THRESHOLD_DEFAULT","HAIR_ZONE_GLSL","brightness(0) invert(1)","opacity .25s linear",
 "https://esm.sh/@mediapipe/tasks-vision@0.10.14",
 "hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task"]:
    ck(f"mira {c[:38]}", c in js['mira'])
for c in ['rgba(16, 6, 30, 0.72)','rgba(110,50,230,0.08)','rgba(90,30,200,0)','rgba(140,80,255,0)',
 'rgba(150,80,255,0.32)','rgba(200,150,255,0.8)','rgba(230,205,255,0.55)']:
    ck(f"mira {c}", c in js['mira'])
for c in ['violetDeep   = vec3(0.18, 0.05, 0.38)','violetMain   = vec3(0.48, 0.20, 1.00)',
 'violetBright = vec3(0.72, 0.38, 1.00)','lavender     = vec3(0.88, 0.72, 1.00)',
 'baseViolet   = vec3(0.40, 0.12, 0.92)','whiteViolet  = vec3(1.00, 0.95, 1.00)']:
    ck(f"mira palet {c[:12]}", c in js['mira'])
ck("mira komposisi alpha field","membraneL * 0.5 * iField + membrane * 0.26 * iMatter" in js['mira'])
ck("mira energyHot","smoothstep(iHotLo, iHotLo + 0.07, energyField)" in js['mira'])
ck("mira energyField","fbm3(warped * 1.5 + vec2(hotT * 0.28, -hotT * 0.21))" in js['mira'])
ck("mira visibility","smoothstep(0.32, 0.70, fbm(warped * 0.6 + 12.0 + vec2(slowT * 0.3, -slowT * 0.2)))" in js['mira'])
ck("mira uTaper:{value:26}","uTaper:{value:26}" in js['mira'])
ck("mira uHot:{value:3.2}","uHot:{value:3.2}" in js['mira'])
ck("mira uCorePx:{value:.6}","uCorePx:{value:.6}" in js['mira'])
ck("mira uSketchBright:{value:.55}","uSketchBright:{value:.55}" in js['mira'])
ck("apex uMap = Vector4(2,-2,-1,1)","new rn(2,-2,-1,1)" in js['apex'])
ck("apex dpr dijepit 1.5","window.devicePixelRatio||1,1.5)" in js['apex'])

audio={'mira':{"createOscillator":16,"createGain":36,"createBiquadFilter":8,"createBufferSource":5,
 "createWaveShaper":4,"createConvolver":2,"createStereoPanner":4,"createAnalyser":3,
 "createDynamicsCompressor":1},
 'apex':{"createOscillator":16,"createGain":35,"createBiquadFilter":7,"createBufferSource":4,
 "createWaveShaper":4,"createConvolver":2,"createStereoPanner":2,"createAnalyser":3,
 "createDynamicsCompressor":1}}
for n,d in audio.items():
    for k,v in d.items(): ck(f"{n} audio {k} = {v}", js[n].count(k)==v, js[n].count(k))

ck("apex komentar 'IN ITS OWN HUE'","at pulse peak the color brightens IN ITS OWN HUE - never lifted toward white" in js['apex'])
ck("mira komentar 'never a white sketch'",'never a white sketch (Ruben: "the build' in js['mira'])
ck("mira 19 komentar niat desain", len([l for l in open('mira-design-comments.txt').read().split("\n") if l.strip()])==19)
ck("apex 2 komentar niat desain", len([l for l in open('apex-design-comments.txt').read().split("\n") if l.strip()])==2)

fails=[c for c in checks if not c[1]]
for n,ok,d in fails: print("GAGAL:",n,"|",d)
print(f"\n>>> {len(checks)-len(fails)}/{len(checks)} klaim di file spec cocok dengan bundle live.")
sys.exit(1) if fails else None
