## Tabel parameter panel MIRA — 82 entri, 20 seksi berurutan

> Urutan seksi dan urutan baris **wajib sama**. Header grup boleh muncul dua kali
> (lihat `Her hair` seksi 10 dan 14) — itu memang dua seksi terpisah di panel asli.


### Seksi 1 — Centre lines  (scope `scene`)

| key | label (teks persis) | min | max | step | default |
|---|---|---|---|---|---|
| `lines.count` | How many lines | 2 | 28 | 1 | **9** |
| `lines.width` | Line thickness (px) | 0.5 | 4 | 0.1 | **1.4** |
| `lines.glow` | Line brightness | 0 | 2.5 | 0.05 | **2.5** |
| `lines.glowVar` | Bright and dark stretches | 0 | 1 | 0.05 | **1** |
| `lines.hot` | White hot spots | 0 | 2.5 | 0.05 | **1.6** |
| `lines.gold` | Share of warm gold lines | 0 | 0.6 | 0.05 | **0.6** |
| `lines.rMin` | Closest orbit (ring = 1) | 0.85 | 1.6 | 0.05 | **0.95** |
| `lines.rMax` | Farthest orbit (ring = 1) | 1.2 | 3.2 | 0.05 | **2.05** |
| `lines.stretch` | Oval stretch | 0 | 1 | 0.05 | **0** |
| `lines.chaos` | Chaos of the shape | 0 | 1 | 0.05 | **0.6** |
| `lines.tilt` | Tilt of the orbits (deg) | 0 | 75 | 1 | **22** |
| `lines.speed` | Speed of the movement | 0 | 3 | 0.05 | **3** |
| `lines.cross` | How deep lines cross the ring | 0.55 | 1 | 0.01 | **0.86** |
| `lines.follow` | How softly they follow the ring size | 0.3 | 6 | 0.1 | **2.9** |

### Seksi 2 — Smoke  (scope `scene`)

| key | label (teks persis) | min | max | step | default |
|---|---|---|---|---|---|
| `smoke.amount` | Smoke strength | 0 | 2 | 0.05 | **0.95** |
| `smoke.width` | Smoke width (ring = 1) | 0.04 | 0.6 | 0.01 | **0.27** |

### Seksi 3 — Star dust  (scope `scene`)

| key | label (teks persis) | min | max | step | default |
|---|---|---|---|---|---|
| `dust.amount` | Grains per line | 0 | 40 | 1 | **15** |
| `dust.size` | Grain size | 0.4 | 3 | 0.05 | **1.05** |
| `dust.bright` | Grain brightness | 0 | 2.5 | 0.05 | **2.5** |
| `dust.spread` | How far grains sit from the line | 0 | 0.5 | 0.01 | **0.5** |

### Seksi 4 — Ring and centre light  (scope `scene`)

| key | label (teks persis) | min | max | step | default |
|---|---|---|---|---|---|
| `ring.diameter` | Ring diameter (px) | 220 | 420 | 2 | **310** |
| `ring.neon` | White neon on the ring | 0 | 2.5 | 0.05 | **0.1** |
| `ring.neonWidth` | Neon thickness (px) | 0.6 | 5 | 0.1 | **1.8** |
| `ring.spill` | Violet glow outside the ring | 0 | 3 | 0.05 | **1.65** |
| `light.bright` | Centre light brightness | 0 | 2.5 | 0.05 | **2** |
| `light.size` | Centre light size | 0.6 | 3 | 0.05 | **2.2** |
| `ring.listenWaves` | Bright expanding circles while she listens (0 off, 1 on) | 0 | 1 | 1 | **0** |

### Seksi 5 — Her voice  (scope `scene`)

| key | label (teks persis) | min | max | step | default |
|---|---|---|---|---|---|
| `voice.ring` | Ring flare per syllable | 0 | 2.5 | 0.05 | **2** |
| `voice.lines` | Lines react to her voice | 0 | 2.5 | 0.05 | **1.95** |

### Seksi 6 — Far waves  (scope `scene`)

| key | label (teks persis) | min | max | step | default |
|---|---|---|---|---|---|
| `waves.opacity` | Far waves strength | 0 | 1 | 0.01 | **0.36** |
| `waves.width` | Far waves width | 0.2 | 3 | 0.05 | **1.6** |
| `waves.speed` | Far waves speed | 0 | 3 | 0.05 | **3** |

### Seksi 7 — Floating particles  (scope `scene`)

| key | label (teks persis) | min | max | step | default |
|---|---|---|---|---|---|
| `motes.opacity` | Particle brightness | 0 | 2 | 0.05 | **2** |
| `motes.size` | Particle size | 0.4 | 3 | 0.05 | **1** |

### Seksi 8 — Background  (scope `scene`)

| key | label (teks persis) | min | max | step | default |
|---|---|---|---|---|---|
| `field.alpha` | Background field strength | 0 | 1 | 0.01 | **1** |
| `field.near` | Background haze near the ring | 0 | 3 | 0.05 | **1.45** |
| `field.spread` | Fog across the whole screen (0 = only near the ring) | 0 | 1 | 0.01 | **0** |

### Seksi 9 — Glow (whole picture)  (scope `scene`)

| key | label (teks persis) | min | max | step | default |
|---|---|---|---|---|---|
| `bloom.strength` | Glow strength | 0 | 3 | 0.05 | **1.3** |
| `bloom.threshold` | Only brighter than this glows | 0 | 1 | 0.01 | **0.18** |
| `bloom.radius` | Glow reach | 0.1 | 1 | 0.01 | **0.62** |

### Seksi 10 — Her hair  (scope `humanoid`)

| key | label (teks persis) | min | max | step | default |
|---|---|---|---|---|---|
| `hum.hair.light` | Hair brightness | 0 | 2.5 | 0.05 | **1** |

### Seksi 11 — Her head  (scope `humanoid`)

| key | label (teks persis) | min | max | step | default |
|---|---|---|---|---|---|
| `hum.head.follow` | How far she turns toward you | 0 | 2 | 0.05 | **1** |
| `hum.head.life` | How much she moves on her own | 0 | 2 | 0.05 | **1** |
| `hum.head.speed` | How quickly she turns | 0.3 | 3 | 0.05 | **1** |

### Seksi 12 — Her states  (scope `humanoid`)

| key | label (teks persis) | min | max | step | default |
|---|---|---|---|---|---|
| `hum.state.talkSpeed` | How much faster everything moves while she talks | 1 | 4 | 0.05 | **2** |
| `hum.state.talkBright` | How much brighter she is while she talks | 1 | 2.5 | 0.05 | **1.35** |
| `hum.state.listenSpeed` | How much faster everything moves while she listens | 1 | 4 | 0.05 | **1.5** |
| `hum.state.listenBright` | How much brighter she is while she listens | 1 | 2.5 | 0.05 | **1.15** |

### Seksi 13 — Her face  (scope `humanoid`)

| key | label (teks persis) | min | max | step | default |
|---|---|---|---|---|---|
| `hum.face.glow` | Face light while she speaks | 0 | 3 | 0.05 | **1** |
| `hum.face.warmth` | Face light edge colour (0 her lilac, 1 her gold) | 0 | 1 | 0.05 | **0** |
| `hum.face.size` | Face light size | 0.3 | 2.5 | 0.05 | **1** |
| `hum.face.move` | Face movement while she speaks | 0 | 3 | 0.05 | **1** |

### Seksi 14 — Her hair  (scope `humanoid`)

| key | label (teks persis) | min | max | step | default |
|---|---|---|---|---|---|
| `hum.hair.glow` | Hair glow when she listens or speaks | 0 | 4 | 0.05 | **1.5** |
| `hum.hair.moving` | How many strands move on their own | 0 | 60 | 1 | **60** |
| `hum.hair.mass` | How much the whole hair sways | 0 | 2 | 0.05 | **0.7** |
| `hum.hair.top` | How much the hair over her head moves | 0 | 2 | 0.05 | **0.6** |
| `hum.hair.swayAmt` | How far they sway | 0 | 1.5 | 0.01 | **0.6** |
| `hum.hair.swaySpeed` | How fast they sway | 0 | 2 | 0.05 | **0.45** |
| `hum.hair.pulse` | Light running down the moving strands | 0 | 2 | 0.05 | **0.6** |
| `hum.hair.twinkle` | Sparkles twinkling in the hair | 0 | 2 | 0.05 | **0.6** |

### Seksi 15 — Her lines at rest  (scope `humanoid`)

| key | label (teks persis) | min | max | step | default |
|---|---|---|---|---|---|
| `hum.lines.bright` | Her lines over the picture | 0 | 1.5 | 0.05 | **0.15** |
| `hum.lines.glow` | Soft glow around her lines | 0 | 3 | 0.05 | **1** |
| `hum.lines.pulse` | Light travelling along her lines | 0 | 2 | 0.05 | **0.7** |
| `hum.lines.pulseSpeed` | Speed of that light | 0.1 | 3 | 0.05 | **1** |
| `hum.body.bright` | Her picture brightness | 0.5 | 1.6 | 0.05 | **1** |
| `hum.aura` | Violet light behind her head | 0 | 2 | 0.05 | **0.8** |

### Seksi 16 — Her breathing  (scope `humanoid`)

| key | label (teks persis) | min | max | step | default |
|---|---|---|---|---|---|
| `hum.breath.depth` | How deep she breathes | 0 | 3 | 0.05 | **1** |
| `hum.breath.speed` | How fast she breathes | 0.3 | 2.5 | 0.05 | **1** |

### Seksi 17 — The build  (scope `humanoid`)

| key | label (teks persis) | min | max | step | default |
|---|---|---|---|---|---|
| `hum.build.core` | The core at her heart (brightness) | 0 | 3 | 0.05 | **1** |
| `hum.build.matter` | Her matter in flight (brightness) | 0 | 3 | 0.05 | **1** |
| `hum.build.shock` | The wave at her ignition | 0 | 3 | 0.05 | **1** |
| `hum.build.surge` | How bright she burns at ignition | 0 | 3 | 0.05 | **1** |

### Seksi 18 — Lightning  (scope `humanoid`)

| key | label (teks persis) | min | max | step | default |
|---|---|---|---|---|---|
| `hum.strike.flash` | How much a strike lights the room | 0 | 1.5 | 0.01 | **0.38** |
| `hum.strike.bright` | Bolt brightness | 0.2 | 2 | 0.05 | **1** |
| `hum.touch.wave` | Current through her when you touch or pinch | 0 | 3 | 0.05 | **1** |

### Seksi 19 — Fog and far waves  (scope `humanoid`)

| key | label (teks persis) | min | max | step | default |
|---|---|---|---|---|---|
| `hum.fog.spread` | Fog across the whole screen *(alias scene `field.spread`)* | 0 | 1 | 0.01 | **0.85** |
| `hum.fog.amount` | Fog strength *(alias scene `field.alpha`)* | 0 | 1 | 0.01 | **1** |
| `hum.waves.opacity` | Far waves strength *(alias scene `waves.opacity`)* | 0 | 1 | 0.01 | **0.3** |
| `hum.waves.speed` | Far waves speed *(alias scene `waves.speed`)* | 0 | 3 | 0.05 | **0.6** |

### Seksi 20 — Glow (her whole picture)  (scope `humanoid`)

| key | label (teks persis) | min | max | step | default |
|---|---|---|---|---|---|
| `hum.glow.strength` | Glow strength *(alias scene `bloom.strength`)* | 0 | 3 | 0.05 | **0.9** |
| `hum.glow.threshold` | Only brighter than this glows *(alias scene `bloom.threshold`)* | 0 | 1 | 0.01 | **0.6** |
| `hum.glow.radius` | Glow reach *(alias scene `bloom.radius`)* | 0.1 | 1 | 0.01 | **0.62** |
