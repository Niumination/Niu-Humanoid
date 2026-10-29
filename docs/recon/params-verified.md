# PARAMETER MIRA — verifikasi (P4 / Fase 1.4)

Total: **82 entri** · scope: scene 40 + humanoid 42
Seksi (header grup, urut): **20** — nama grup unik 19 (grup `Her hair` muncul 2× sebagai seksi terpisah)

## Urutan seksi & jumlah baris

| # | grup | scope | jumlah |
|---|---|---|---|
| 1 | Centre lines | `scene` | 14 |
| 2 | Smoke | `scene` | 2 |
| 3 | Star dust | `scene` | 4 |
| 4 | Ring and centre light | `scene` | 7 |
| 5 | Her voice | `scene` | 2 |
| 6 | Far waves | `scene` | 3 |
| 7 | Floating particles | `scene` | 2 |
| 8 | Background | `scene` | 3 |
| 9 | Glow (whole picture) | `scene` | 3 |
| 10 | Her hair | `humanoid` | 1 |
| 11 | Her head | `humanoid` | 3 |
| 12 | Her states | `humanoid` | 4 |
| 13 | Her face | `humanoid` | 4 |
| 14 | Her hair | `humanoid` | 8 |
| 15 | Her lines at rest | `humanoid` | 6 |
| 16 | Her breathing | `humanoid` | 2 |
| 17 | The build | `humanoid` | 4 |
| 18 | Lightning | `humanoid` | 3 |
| 19 | Fog and far waves | `humanoid` | 4 |
| 20 | Glow (her whole picture) | `humanoid` | 3 |

Jumlah baris: 82 (harus = 82)

## 7 alias `stands:` (humanoid → scene)

| key humanoid | default | → scene | default scene | selisih |
|---|---|---|---|---|
| `hum.fog.spread` | 0.85 | `field.spread` | 0.0 | **BEDA** |
| `hum.fog.amount` | 1.0 | `field.alpha` | 1.0 | sama |
| `hum.waves.opacity` | 0.3 | `waves.opacity` | 0.36 | **BEDA** |
| `hum.waves.speed` | 0.6 | `waves.speed` | 3.0 | **BEDA** |
| `hum.glow.strength` | 0.9 | `bloom.strength` | 1.3 | **BEDA** |
| `hum.glow.threshold` | 0.6 | `bloom.threshold` | 0.18 | **BEDA** |
| `hum.glow.radius` | 0.62 | `bloom.radius` | 0.62 | sama |

Catatan: 5 dari 7 pasangan punya default **berbeda** — jangan disamakan (jebakan Gerbang B).

## Entri dengan step ≠ 0.05 (pemeriksaan tambahan)

- `lines.count` step=1.0 (min 2.0, max 28.0, def 9.0)
- `lines.width` step=0.1 (min 0.5, max 4.0, def 1.4)
- `lines.tilt` step=1.0 (min 0.0, max 75.0, def 22.0)
- `lines.cross` step=0.01 (min 0.55, max 1.0, def 0.86)
- `lines.follow` step=0.1 (min 0.3, max 6.0, def 2.9)
- `smoke.width` step=0.01 (min 0.04, max 0.6, def 0.27)
- `dust.amount` step=1.0 (min 0.0, max 40.0, def 15.0)
- `dust.spread` step=0.01 (min 0.0, max 0.5, def 0.5)
- `ring.diameter` step=2.0 (min 220.0, max 420.0, def 310.0)
- `ring.neonWidth` step=0.1 (min 0.6, max 5.0, def 1.8)
- `ring.listenWaves` step=1.0 (min 0.0, max 1.0, def 0.0)
- `waves.opacity` step=0.01 (min 0.0, max 1.0, def 0.36)
- `field.alpha` step=0.01 (min 0.0, max 1.0, def 1.0)
- `field.spread` step=0.01 (min 0.0, max 1.0, def 0.0)
- `bloom.threshold` step=0.01 (min 0.0, max 1.0, def 0.18)
- `bloom.radius` step=0.01 (min 0.1, max 1.0, def 0.62)
- `hum.hair.moving` step=1.0 (min 0.0, max 60.0, def 60.0)
- `hum.hair.swayAmt` step=0.01 (min 0.0, max 1.5, def 0.6)
- `hum.strike.flash` step=0.01 (min 0.0, max 1.5, def 0.38)
- `hum.fog.spread` step=0.01 (min 0.0, max 1.0, def 0.85)
- `hum.fog.amount` step=0.01 (min 0.0, max 1.0, def 1.0)
- `hum.waves.opacity` step=0.01 (min 0.0, max 1.0, def 0.3)
- `hum.glow.threshold` step=0.01 (min 0.0, max 1.0, def 0.6)
- `hum.glow.radius` step=0.01 (min 0.1, max 1.0, def 0.62)

## Rentang unik

- min 0.0 … max 3.0: 16 entri
- min 0.0 … max 1.0: 13 entri
- min 0.0 … max 2.0: 11 entri
- min 0.0 … max 2.5: 8 entri
- min 0.0 … max 1.5: 3 entri
- min 0.4 … max 3.0: 2 entri
- min 0.1 … max 1.0: 2 entri
- min 1.0 … max 4.0: 2 entri
- min 1.0 … max 2.5: 2 entri
- min 0.3 … max 2.5: 2 entri
- min 2.0 … max 28.0: 1 entri
- min 0.5 … max 4.0: 1 entri
- min 0.0 … max 0.6: 1 entri
- min 0.85 … max 1.6: 1 entri
- min 1.2 … max 3.2: 1 entri
- min 0.0 … max 75.0: 1 entri
- min 0.55 … max 1.0: 1 entri
- min 0.3 … max 6.0: 1 entri
- min 0.04 … max 0.6: 1 entri
- min 0.0 … max 40.0: 1 entri
- min 0.0 … max 0.5: 1 entri
- min 220.0 … max 420.0: 1 entri
- min 0.6 … max 5.0: 1 entri
- min 0.6 … max 3.0: 1 entri
- min 0.2 … max 3.0: 1 entri
- min 0.3 … max 3.0: 1 entri
- min 0.0 … max 4.0: 1 entri
- min 0.0 … max 60.0: 1 entri
- min 0.1 … max 3.0: 1 entri
- min 0.5 … max 1.6: 1 entri
- min 0.2 … max 2.0: 1 entri
