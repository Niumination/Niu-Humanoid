/**
 * lib/audio — port VERBATIM graph audio APEX (tidak ada file audio; semua disintesis).
 *
 * Pemetaan nama minified → nama di sini:
 *   f_()  → initGraph()      graph utama + noise buffer 2 s
 *   l1()  → impulse()        IR convolver (noise × (1−i/n)^decay)
 *   a0()  → driveCurve()     kurva waveshaper 1024 titik
 *   Gu()  → now()            currentTime + auto-resume
 *   Ta()  → send()           routing ke reverb (3.2 s / 6 s)
 *   jr()  → track()          daftar node aktif
 *   Ef()  → fm()             pluck FM (carrier + modulator ratio 2.76)
 *   OU()  → noiseSweep()     noise → filter bandpass/lowpass menyapu
 *   bg()  → boom()           sub sine + envelope + opsional drive
 *   u1()  → choir()          sawtooth ×3 panner + formant bandpass + drive
 *   kU()  → voiceBus()       gain bus + start/stop kolektif
 *   FU()  → loop()           timer berulang
 *   BU()  → loadingLoop()    hum filter-sweep
 *   zU()  → workingTick()    tick mekanis
 *   HU()  → alertCue()       2× 392 Hz + FM 554 Hz + tremolo 6.5 Hz
 *   VU()  → failedCue()      880/294/110
 *   qU()  → readyCue()       110/294/880
 *   jU()  → needsYouCue()    330 + 467 (dua ketuk)
 *   XU()  → riser()          noise → lowpass 120→4400 + 3 saw ramp
 *   YU()  → whistle()        2900→3280 + noise sweep
 *   ZU()  → assemblyCue()    cue birth (rumble + riser + 54 pluck + choir @ ignition)
 *   Kv()/Xw() → playMoment()/stopMoment()
 *   QU()  → graphState()
 *
 * Angka-angka di bawah adalah nilai verbatim bundle; jangan "dirapikan".
 */
import { WORLD, registerRenderer } from './cues'

/** konstan global bundle */
const DU = 0.75 // bus reverb 1 (3.2 s)
let NU = 0.72 // master gain (Lm.gain = NU*.62)
/** timing cue birth (TE.full) */
const TE_FULL = { con: 0.34, chk: 1.55, thr: 5.35, call: 5.92, set: 10.1, end: 13.1 }
/** timing birth (Rs) */
const RS = { total: 7.4, ignition: 6.2, hornPeak: 6.2 + 3.2 * 0.19 }

type Ctx = AudioContext | OfflineAudioContext

let rt: Ctx | null = null
let master: GainNode | null = null
let comp: DynamicsCompressorNode | null = null
let dry: GainNode | null = null
let revA: GainNode | null = null
let revB: GainNode | null = null
let convA: ConvolverNode | null = null
let convB: ConvolverNode | null = null
let noise: AudioBuffer | null = null
let live: AudioNode[] = []
let playing: Record<string, { stop?: () => void }> = {}

/**
 * Seam harness (BUKAN bagian bundle): memaksa graph memakai konteks tertentu,
 * dipakai gate-step4 untuk render offline. Di runtime normal tidak dipanggil.
 */
export function __setAudioContextForTest(ctx: Ctx | null) {
  rt = ctx
  master = null
  comp = null
  dry = null
  revA = null
  revB = null
  convA = null
  convB = null
  noise = null
  live = []
}

export const getAudioContext = () => rt

function impulse(c: Ctx, seconds: number, decay: number): AudioBuffer {
  const n = Math.floor(c.sampleRate * seconds)
  const b = c.createBuffer(2, n, c.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const d = b.getChannelData(ch)
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay)
  }
  return b
}

function driveCurve(k: number): Float32Array {
  const t = new Float32Array(1024)
  for (let n = 0; n < 1024; n++) {
    const r = (n * 2) / 1024 - 1
    t[n] = ((1 + k) * r) / (1 + k * Math.abs(r))
  }
  return t
}

/** f_() */
function initGraph(): Ctx {
  if (rt && master) return rt
  const Ctor: typeof AudioContext =
    (window as any).AudioContext || (window as any).webkitAudioContext
  const c: Ctx = rt ?? new Ctor()
  rt = c
  comp = c.createDynamicsCompressor()
  comp.threshold.value = -8
  comp.knee.value = 12
  comp.ratio.value = 3.5
  comp.attack.value = 0.006
  comp.release.value = 0.25
  master = c.createGain()
  master.gain.value = NU * 0.62
  dry = c.createGain()
  convA = c.createConvolver()
  convA.buffer = impulse(c, 3.2, 2.4)
  convB = c.createConvolver()
  convB.buffer = impulse(c, 6, 1.7)
  const g = DU
  revA = c.createGain()
  revA.gain.value = g
  revB = c.createGain()
  revB.gain.value = g * 1.15
  dry.connect(comp)
  convA.connect(revA)
  revA.connect(comp)
  convB.connect(revB)
  revB.connect(comp)
  comp.connect(master)
  master.connect((c as AudioContext).destination as AudioNode)
  const n = Math.floor(c.sampleRate * 2)
  noise = c.createBuffer(1, n, c.sampleRate)
  const data = noise.getChannelData(0)
  for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1
  return c
}

/** Gu() */
function now(): number {
  const c = initGraph()
  try {
    if ((c as AudioContext).state === 'suspended') void (c as AudioContext).resume()
  } catch { /* OfflineAudioContext tidak punya resume */ }
  return c.currentTime
}

/** Ta(node, reverb1, reverb2) */
function send(node: AudioNode, a: number, b: number) {
  if (!dry || !convA || !convB || !rt) return
  node.connect(dry)
  if (a > 0) {
    const g = rt.createGain()
    g.gain.value = a
    node.connect(g)
    g.connect(convA)
  }
  if (b > 0) {
    const g = rt.createGain()
    g.gain.value = b
    node.connect(g)
    g.connect(convB)
  }
}

/** jr(node) */
function track(node: AudioScheduledSourceNode) {
  live.push(node)
  node.onended = () => {
    live = live.filter((x) => x !== node)
  }
}

/** Ef() — pluck FM */
export function fm(o: {
  f?: number
  ratio?: number
  index?: number
  indexEnd?: number
  dur?: number
  peak?: number
  attack?: number
  delay?: number
  fEnd?: number | null
  detune?: number
  send?: number
  big?: number
  type?: OscillatorType
  drive?: number
  t0?: number | null
} = {}) {
  const {
    f: f0 = 440,
    ratio = 2.76,
    index = 600,
    indexEnd = 8,
    dur = 0.2,
    peak = 0.18,
    attack = 0.012,
    delay = 0,
    fEnd = null,
    detune = 0,
    send: snd = 0.45,
    big = 0,
    type = 'sine',
    drive = 0,
    t0 = null,
  } = o
  const c = rt!
  const t = (t0 ?? now()) + delay
  const car = c.createOscillator()
  car.type = type
  car.detune.value = detune
  car.frequency.setValueAtTime(f0, t)
  if (fEnd) car.frequency.exponentialRampToValueAtTime(fEnd, t + dur)
  const mod = c.createOscillator()
  mod.type = 'sine'
  mod.frequency.setValueAtTime(f0 * ratio, t)
  if (fEnd) mod.frequency.exponentialRampToValueAtTime(fEnd * ratio, t + dur)
  const idx = c.createGain()
  idx.gain.setValueAtTime(Math.max(index, 1), t)
  idx.gain.exponentialRampToValueAtTime(Math.max(indexEnd, 1), t + dur)
  mod.connect(idx)
  idx.connect(car.frequency)
  const env = c.createGain()
  env.gain.setValueAtTime(1e-4, t)
  env.gain.exponentialRampToValueAtTime(peak, t + attack)
  env.gain.exponentialRampToValueAtTime(1e-4, t + dur)
  let out: AudioNode = env
  car.connect(env)
  if (drive > 0) {
    const ws = c.createWaveShaper()
    ws.curve = driveCurve(drive)
    env.connect(ws)
    out = ws
  }
  send(out, snd, big)
  car.start(t)
  mod.start(t)
  car.stop(t + dur + 0.05)
  mod.stop(t + dur + 0.05)
  track(car)
  track(mod)
}

/** OU() — noise menyapu filter */
export function noiseSweep(o: {
  from?: number
  to?: number
  q?: number
  dur?: number
  peak?: number
  attack?: number
  delay?: number
  type?: BiquadFilterType
  send?: number
  big?: number
  t0?: number | null
} = {}) {
  const {
    from = 400,
    to = 2400,
    q = 7,
    dur = 0.3,
    peak = 0.16,
    attack = 0.04,
    delay = 0,
    type = 'bandpass',
    send: snd = 0.55,
    big = 0,
    t0 = null,
  } = o
  const c = rt!
  const t = (t0 ?? now()) + delay
  const src = c.createBufferSource()
  src.buffer = noise
  src.loop = true
  const flt = c.createBiquadFilter()
  flt.type = type
  flt.Q.value = q
  flt.frequency.setValueAtTime(from, t)
  flt.frequency.exponentialRampToValueAtTime(to, t + dur)
  const env = c.createGain()
  env.gain.setValueAtTime(1e-4, t)
  env.gain.exponentialRampToValueAtTime(peak, t + attack)
  env.gain.exponentialRampToValueAtTime(1e-4, t + dur)
  src.connect(flt)
  flt.connect(env)
  send(env, snd, big)
  src.start(t)
  src.stop(t + dur + 0.06)
  track(src)
}

/** bg() — sub boom */
export function boom(o: {
  f?: number
  dur?: number
  peak?: number
  delay?: number
  fEnd?: number | null
  send?: number
  big?: number
  drive?: number
  attack?: number
  t0?: number | null
} = {}) {
  const {
    f: f0 = 62,
    dur = 0.22,
    peak = 0.22,
    delay = 0,
    fEnd = null,
    send: snd = 0.15,
    big = 0,
    drive = 0,
    attack = 0.016,
    t0 = null,
  } = o
  const c = rt!
  const t = (t0 ?? now()) + delay
  const osc = c.createOscillator()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(f0, t)
  if (fEnd) osc.frequency.exponentialRampToValueAtTime(fEnd, t + dur)
  const env = c.createGain()
  env.gain.setValueAtTime(1e-4, t)
  env.gain.exponentialRampToValueAtTime(peak, t + attack)
  env.gain.exponentialRampToValueAtTime(1e-4, t + dur)
  let out: AudioNode = env
  osc.connect(env)
  if (drive > 0) {
    const ws = c.createWaveShaper()
    ws.curve = driveCurve(drive)
    env.connect(ws)
    out = ws
  }
  send(out, snd, big)
  osc.start(t)
  osc.stop(t + dur + 0.05)
  track(osc)
}

/** u1() — suara paduan suara/formant */
export function choir(o: {
  f?: number
  dur?: number
  peak?: number
  bend?: number[]
  formants?: [number, number, number][]
  drive?: number
  spread?: number
  wobble?: number
  shimmer?: boolean
  send?: number
  big?: number
  t0?: number | null
} = {}) {
  const {
    f: f0 = 52,
    dur = 4,
    peak = 0.5,
    bend = [0.93, 1, 1.05, 1, 0.955],
    formants = [
      [205, 5, 1],
      [540, 7, 0.62],
      [1150, 9, 0.28],
    ],
    drive = 2.8,
    spread = 0.62,
    wobble = 0.75,
    shimmer = false,
    send: snd = 0.5,
    big = 1,
    t0 = null,
  } = o
  const c = rt!
  const t = t0 ?? now()
  const bus = c.createGain()
  const oscs: OscillatorNode[] = []
  ;(
    [
      [-spread, -9],
      [0, 0],
      [spread, 11],
    ] as [number, number][]
  ).forEach(([pan, det]) => {
    const osc = c.createOscillator()
    osc.type = 'sawtooth'
    osc.detune.value = det
    osc.frequency.setValueCurveAtTime(new Float32Array(bend.map((b) => f0 * b)), t, dur)
    const g = c.createGain()
    g.gain.value = 0.32
    osc.connect(g)
    if (c.createStereoPanner) {
      const p = c.createStereoPanner()
      p.pan.value = pan
      g.connect(p)
      p.connect(bus)
    } else g.connect(bus)
    osc.start(t)
    osc.stop(t + dur + 0.12)
    track(osc)
    oscs.push(osc)
  })
  // vibrato yang memodulasi semua osilator
  const lfo = c.createOscillator()
  lfo.type = 'sine'
  lfo.frequency.value = wobble
  const lfoAmt = c.createGain()
  lfoAmt.gain.value = f0 * 0.014
  lfo.connect(lfoAmt)
  oscs.forEach((o2) => lfoAmt.connect(o2.frequency))
  lfo.start(t)
  lfo.stop(t + dur + 0.12)
  track(lfo)
  // sub satu oktaf
  const sub = c.createOscillator()
  sub.type = 'sine'
  sub.frequency.setValueAtTime(f0 / 2, t)
  const subG = c.createGain()
  subG.gain.value = 0.55
  sub.connect(subG)
  subG.connect(bus)
  sub.start(t)
  sub.stop(t + dur + 0.12)
  track(sub)
  // napas
  const breath = c.createBufferSource()
  breath.buffer = noise
  breath.loop = true
  const bp = c.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = 430
  bp.Q.value = 1.1
  const bg2 = c.createGain()
  bg2.gain.value = 0.07
  breath.connect(bp)
  bp.connect(bg2)
  bg2.connect(bus)
  breath.start(t)
  breath.stop(t + dur + 0.12)
  track(breath)
  // drive + formant
  const ws = c.createWaveShaper()
  ws.curve = driveCurve(drive)
  bus.connect(ws)
  const formBus = c.createGain()
  formants.forEach(([freq, q, gain]) => {
    const bp2 = c.createBiquadFilter()
    bp2.type = 'bandpass'
    bp2.frequency.value = freq
    bp2.Q.value = q
    const g2 = c.createGain()
    g2.gain.value = gain
    ws.connect(bp2)
    bp2.connect(g2)
    g2.connect(formBus)
  })
  const direct = c.createGain()
  direct.gain.value = 0.42
  ws.connect(direct)
  direct.connect(formBus)
  const lp = c.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 4400
  lp.Q.value = 0.7
  const env = c.createGain()
  env.gain.setValueAtTime(1e-4, t)
  env.gain.exponentialRampToValueAtTime(peak, t + dur * 0.19)
  env.gain.setValueAtTime(peak, t + dur * 0.52)
  env.gain.exponentialRampToValueAtTime(1e-4, t + dur)
  formBus.connect(lp)
  lp.connect(env)
  send(env, snd, big)
  if (shimmer)
    [2100, 3400, 5100].forEach((freq, i) => {
      const osc = c.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = freq * (1 + (i - 1) * 0.004)
      const g2 = c.createGain()
      g2.gain.setValueAtTime(1e-4, t + dur * 0.42)
      g2.gain.exponentialRampToValueAtTime([0.022, 0.014, 0.008][i], t + dur * 0.72)
      g2.gain.exponentialRampToValueAtTime(1e-4, t + dur)
      osc.connect(g2)
      send(g2, 0.4, 1)
      osc.start(t + dur * 0.42)
      osc.stop(t + dur + 0.1)
      track(osc)
    })
}

/** FU() */
function loop(ms: number, fn: () => void) {
  fn()
  const id = setInterval(fn, ms)
  return { stop: () => clearInterval(id) }
}

/** kU() — bus gain dengan stop kolektif */
function voiceBus(build: (bus: GainNode, t: number) => AudioScheduledSourceNode[]) {
  const c = rt!
  const t = now()
  const bus = c.createGain()
  bus.gain.setValueAtTime(1e-4, t)
  const nodes = build(bus, t)
  nodes.forEach((n) => n.start(t))
  return {
    stop() {
      const r = c.currentTime
      bus.gain.cancelScheduledValues(r)
      bus.gain.setValueAtTime(Math.max(bus.gain.value, 1e-4), r)
      bus.gain.exponentialRampToValueAtTime(1e-4, r + 0.4)
      setTimeout(() => nodes.forEach((n) => { try { n.stop() } catch { /* sudah berhenti */ } }), 520)
    },
  }
}

/** BU() — loop loading */
function loadingLoop(peak: number, _level: number) {
  return voiceBus((bus, t) => {
    const c = rt!
    bus.gain.exponentialRampToValueAtTime(0.5, t + 0.6)
    const nodes: AudioScheduledSourceNode[] = []
    const o = c.createOscillator()
    o.type = 'sine'
    o.frequency.value = 146.8
    const l = c.createGain()
    l.gain.value = 0.09
    const f = c.createOscillator()
    f.type = 'triangle'
    f.frequency.value = peak
    const d = c.createGain()
    d.gain.value = 0.075
    f.connect(d)
    d.connect(l.gain)
    const p = c.createBiquadFilter()
    p.type = 'lowpass'
    p.Q.value = 9
    p.frequency.value = 340
    const m = c.createOscillator()
    m.type = 'triangle'
    m.frequency.value = peak * 0.73
    const g = c.createGain()
    g.gain.value = 170
    m.connect(g)
    g.connect(p.frequency)
    o.connect(l)
    l.connect(p)
    p.connect(bus)
    nodes.push(o, f, m)
    const src = c.createBufferSource()
    src.buffer = noise
    src.loop = true
    const bp = c.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 820
    bp.Q.value = 9
    const sg = c.createGain()
    sg.gain.value = 0.009
    const a = c.createOscillator()
    a.type = 'sine'
    a.frequency.value = peak * 0.61
    const eg = c.createGain()
    eg.gain.value = 520
    a.connect(eg)
    eg.connect(bp.frequency)
    src.connect(bp)
    bp.connect(sg)
    sg.connect(bus)
    nodes.push(src, a)
    send(bus, 0.6, 0.35)
    return nodes
  })
}

const workingTick = () => {
  fm({ f: 98, ratio: 2.76, index: 520, indexEnd: 6, dur: 0.55, peak: 0.13, attack: 0.02, send: 0.6, big: 0.85 })
  boom({ f: 49, dur: 0.5, peak: 0.09, send: 0.3, big: 0.5 })
}

/** HU() */
function alertCue() {
  const t = now()
  ;[0, 0.62].forEach((delay) => {
    const c = rt!
    const a = c.createOscillator()
    a.type = 'sine'
    a.frequency.value = 392
    const b = c.createOscillator()
    b.type = 'sine'
    b.frequency.value = 392 * 1.414
    const r = c.createGain()
    r.gain.value = 240
    b.connect(r)
    r.connect(a.frequency)
    const env = c.createGain()
    env.gain.setValueAtTime(1e-4, t + delay)
    env.gain.exponentialRampToValueAtTime(0.1, t + delay + 0.07)
    env.gain.exponentialRampToValueAtTime(1e-4, t + delay + 0.44)
    const trem = c.createOscillator()
    trem.type = 'sine'
    trem.frequency.value = 6.5
    const tremAmt = c.createGain()
    tremAmt.gain.value = 0.042
    trem.connect(tremAmt)
    tremAmt.connect(env.gain)
    a.connect(env)
    send(env, 0.6, 0.55)
    a.start(t + delay)
    b.start(t + delay)
    trem.start(t + delay)
    a.stop(t + delay + 0.5)
    b.stop(t + delay + 0.5)
    trem.stop(t + delay + 0.5)
    track(a)
    track(b)
    track(trem)
  })
}

const failedCue = () =>
  [880, 294, 110].forEach((f, i) =>
    fm({ f, ratio: 2.76, index: 320, indexEnd: 14, dur: 0.42, peak: [0.055, 0.1, 0.15][i], attack: 0.018, delay: i * 0.1, fEnd: f * 0.93, send: 0.45, big: 0.35 })
  )

const readyCue = () =>
  [110, 294, 880].forEach((f, i) =>
    fm({ f, ratio: 2.76, index: 260, indexEnd: 6, dur: 0.66, peak: [0.17, 0.09, 0.05][i], attack: 0.17, delay: i * 0.07, send: 0.8, big: 0.6 })
  )

const needsYouCue = () =>
  [0, 0.19].forEach((delay) => {
    fm({ f: 330, ratio: 1.414, index: 380, indexEnd: 14, dur: 0.12, peak: 0.14, attack: 0.014, delay, send: 0.6, big: 0.4 })
    fm({ f: 467, ratio: 1.414, index: 260, indexEnd: 10, dur: 0.12, peak: 0.07, attack: 0.02, delay, send: 0.6 })
  })

/** XU() — riser */
function riser(t: number, check: boolean, big: number) {
  const s = big ?? 1
  const c = rt!
  const n = TE_FULL
  const r = n.thr - n.chk
  const start = n.chk - 0.2
  const end = n.chk + r * s
  const env = c.createGain()
  env.gain.setValueAtTime(1e-4, t + start)
  env.gain.exponentialRampToValueAtTime(0.08, t + n.chk)
  env.gain.exponentialRampToValueAtTime(0.19, t + end - 0.12)
  env.gain.exponentialRampToValueAtTime(1e-4, t + end + 0.14)
  const lp = c.createBiquadFilter()
  lp.type = 'lowpass'
  lp.Q.value = 7
  lp.frequency.setValueAtTime(120, t + start)
  lp.frequency.exponentialRampToValueAtTime(120 + 4280 * s, t + end)
  const ws = c.createWaveShaper()
  ws.curve = driveCurve(1)
  const amp = c.createGain()
  amp.gain.setValueAtTime(1, t + start)
  amp.gain.setValueAtTime(1, t + n.chk + r * 0.6 * s)
  amp.gain.linearRampToValueAtTime(1 + 3.2 * s, t + end)
  ;[55, 82.5, 110.9].forEach((f, i) => {
    const osc = c.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(f, t + start)
    osc.frequency.exponentialRampToValueAtTime(f * (1 + 1.9 * s), t + end)
    const g = c.createGain()
    g.gain.value = [1, 0.5, 0.28][i]
    osc.connect(g)
    g.connect(amp)
    osc.start(t + start)
    osc.stop(t + end + 0.35)
    track(osc)
  })
  amp.connect(ws)
  ws.connect(lp)
  lp.connect(env)
  send(env, 0.6, 0.4)
  void check
}

/** YU() — whistle */
function whistle(t: number) {
  const c = rt!
  const n = TE_FULL
  const dur = n.call - n.thr
  const osc = c.createOscillator()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(2900, t + n.thr)
  osc.frequency.linearRampToValueAtTime(3280, t + n.call)
  const g = c.createGain()
  g.gain.setValueAtTime(1e-4, t + n.thr)
  g.gain.exponentialRampToValueAtTime(0.028, t + n.thr + 0.05)
  g.gain.exponentialRampToValueAtTime(1e-4, t + n.call)
  osc.connect(g)
  send(g, 0.8, 0.6)
  osc.start(t + n.thr)
  osc.stop(t + n.call + 0.05)
  track(osc)
  noiseSweep({ from: 280, to: 5200, q: 1.2, dur: dur * 0.95, peak: 0.1, attack: dur * 0.88, send: 0.5, big: 0.6, t0: t + n.thr })
}

/** GU — dua "suara" utama */
export const VOICES = [
  {
    k: 'A',
    name: 'Tripod',
    play: (dur: number, t: number) =>
      choir({ f: 52, dur, peak: 0.52, drive: 2.8, t0: t, formants: [[205, 5, 1], [540, 7, 0.62], [1150, 9, 0.28]], bend: [0.93, 1, 1.05, 1, 0.955] }),
  },
  {
    k: 'B',
    name: 'Leviathan',
    play: (dur: number, t: number) =>
      choir({ f: 36, dur: dur * 1.08, peak: 0.56, drive: 3.4, wobble: 0.5, spread: 0.7, t0: t, formants: [[128, 4, 1], [330, 6, 0.55], [760, 8, 0.2]], bend: [0.96, 1, 1.03, 0.99, 0.93] }),
  },
]

const swell = (dur: number, t: number) => boom({ f: 41, dur, peak: 0.17, attack: 0.4, send: 0.5, big: 1, t0: t })

/** ZU() — cue birth */
export function assemblyCue() {
  const t = now()
  boom({ f: 30, fEnd: 44, dur: 1.5, peak: 0.13, attack: 0.7, send: 0.8, big: 1, t0: t })
  riser(t, false, 1)
  const count = 54
  const n = TE_FULL
  const start = 1.1
  const end = n.thr - 0.06
  for (let i = 0; i < count; i++) {
    const k = i / (count - 1)
    const at = t + start + (end - start) * Math.pow(k, 0.62) + (Math.random() - 0.5) * 0.05
    fm({ f: 260 + k * 700, ratio: 2.76, index: 320 + k * 420, indexEnd: 7, dur: 0.11 + Math.random() * 0.04, peak: 0.018 + k * 0.026, attack: 0.003, send: 0.6, big: 0.3 + k * 0.35, drive: k > 0.7 ? (k - 0.7) * 5 : 0, t0: at })
    if (i % 9 === 0) boom({ f: 54 + k * 26, dur: 0.22, peak: 0.05 + k * 0.04, send: 0.35, big: 0.45, t0: at })
  }
  whistle(t)
  const dur = 3.2
  VOICES[0].play(dur, t + RS.ignition)
  swell(2.6, t + RS.ignition + dur * 0.72)
}

/** Kv() */
export function playMoment(moment: string) {
  /* debug/harness: __HUM_NO_AUDIO mematikan seluruh sintesis */
  if (typeof window !== 'undefined' && (window as any).__HUM_NO_AUDIO) return null
  const cues: Record<string, () => { stop?: () => void } | null> = {
    loading: () => loadingLoop(0.34, 0.009),
    working: () => loop(2600, workingTick),
    ready: () => (readyCue(), null),
    needsYou: () => (needsYouCue(), null),
    alert: () => (alertCue(), null),
    failed: () => (failedCue(), null),
    assembly: () => (assemblyCue(), null),
  }
  const cue = cues[moment]
  if (!cue) return null
  initGraph()
  if ((rt as AudioContext).state === 'suspended') void (rt as AudioContext).resume()
  const stop = cue()
  if (stop && stop.stop) {
    stopMoment(moment)
    playing[moment] = stop
  }
  return stop || null
}

/** Xw() */
export function stopMoment(moment: string) {
  const p = playing[moment]
  if (p) {
    try { p.stop?.() } catch { /* abaikan */ }
    delete playing[moment]
  }
}

/** QU() */
export function graphState(): string {
  try {
    initGraph()
    if ((rt as AudioContext).state === 'suspended') void (rt as AudioContext).resume()
    return (rt as AudioContext).state
  } catch {
    return 'unavailable'
  }
}

export const audioTimings = { TE_FULL, RS }

// registrasi renderer, persis seperti bundle: AE({name:"apexSound", ...})
registerRenderer({
  name: 'apexSound',
  onEnter(m: string) {
    if (m === WORLD.WORKING) playMoment('working')
  },
  onExit(m: string) {
    if (m === WORLD.WORKING) stopMoment('working')
  },
  onMoment(m: string) {
    if (m === 'ready') playMoment('ready')
    else if (m === 'failed') playMoment('failed')
    else if (m === 'assembly') assemblyCue()
  },
  onCheck() {
    /* bundle: onCheck(i){} — kosong */
  },
})
