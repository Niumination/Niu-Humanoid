import { useEffect, useRef, useState } from 'react'
import { loadAssets, type AssetBag } from '../lib/assets'

/** kanvas komposisi on-screen: 900x900 device px (terukur dari live) */
const COMPOSE = 900
import { buildPlate } from '../lib/plate'
import { buildAssembly, renderBirthFrame, TIMELINE, type Assembly } from '../lib/birth'
import { buildVeinCanvas } from '../lib/veins'
import { fireMoment, MOMENTS } from '../lib/cues'
import '../lib/audio' // registrasi renderer "apexSound" (efek samping, seperti bundle)
import { buildEdgeParticles, buildEdgePoints, type EdgeParticle } from '../lib/edge'
import {
  buildListeningRings, buildVeins, createFade, drawState, drawTransition, normalizeState,
  transitionDuration, type Fade, type State,
} from '../lib/render'
import { drawEdgeParticles } from '../lib/edge'
import { getSignal } from '../lib/cues'
import { startMic, type MicHandle } from '../lib/mic'
import { HandTracker } from './HandTracker'
import { Backdrop } from './Backdrop'
import { Figure } from './Figure'
import { frozenTime, numHook } from '../lib/hooks'
import { setSoundEnabled, isSoundEnabled } from '../lib/cues'

const YA = '#19ddff' // warna aksen APEX di bundle (const no="#19ddff")

/**
 * HumanoidMode — Fase 3 langkah 2: aset + komposisi statis.
 * Sudah benar untuk: backdrop full-bleed, plate state (Im() verbatim), frame portrait
 * persegi min(100vw,100vh) di tengah, ring CSS (humRingBase/humRingPulse), overlay HUD.
 * BELUM ada: partikel/boil/hatch + shockwave (langkah 3), audio (4), blend state (5),
 * hand tracking (6), bloom (8).
 */
export function HumanoidMode({ state, onExit }: { state: string; onExit: () => void }) {
  const [bag, setBag] = useState<AssetBag | null>(null)
  const plateRef = useRef<HTMLCanvasElement | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [birthText, setBirthText] = useState('ASSEMBLING... 25%')  // nilai awal verbatim bundle
  const [strongHigh, setStrongHigh] = useState(false)  // bundle: le(l.current>.58) tiap 180 ms
  const bgVisible = strongHigh   // bundle: B = le(l.current > .58) — saklar yang sama dengan HUD
  const [cameraOn, setCameraOn] = useState(false)      // bundle: D (komponen MU ter-mount)
  const [cameraAsked, setCameraAsked] = useState(false) // bundle: te (kamera pernah diminta)
  const attentionRef = useRef({ x: 0, y: 0, strength: 0 })
  const hornRef = useRef<HTMLDivElement | null>(null)
  // bundle: m = useRef(p.current + Rs.total*1e3) — jangkar waktu untuk shockwave latar
  const birthRef = useRef<number>(performance.now() + TIMELINE.total * 1000)
  const [ringsUrl, setRingsUrl] = useState<string | null>(null)
  const [replay, setReplay] = useState(0)
  const [micOn, setMicOn] = useState(false)
  const micRef = useRef<MicHandle | null>(null)
  const [soundOn, setSoundOn] = useState(() => isSoundEnabled())
  const autoDebug = typeof window !== 'undefined' && !!new URLSearchParams(window.location.search).get('auto')
  const assemblyRef = useRef<Assembly | null>(null)
  const progressRef = useRef(0)
  const strongRef = useRef(0)
  const strongMixRef = useRef(0)
  const stateRef = useRef(state)
  stateRef.current = state
  const noBg = typeof window !== 'undefined' && !!(window as any).__HUM_NO_BG
  // ?figonly=1 — menyembunyikan jalur 2D untuk menguji pipeline figur GPU terisolasi.
  const figOnly =
    typeof window !== 'undefined' && !!new URLSearchParams(window.location.search).get('figonly')

  useEffect(() => {
    let alive = true
    loadAssets()
      .then(b => { if (alive) setBag(b) })
      .catch(() => { if (alive) setErr('failed') })
    return () => { alive = false }
  }, [])

  // --- Fase 3 langkah 3–5: satu loop: birth (Rs.total 7.4 s) lalu steady-state ---
  useEffect(() => {
    if (!bag || !plateRef.current) return
    const cv = plateRef.current
    const ge = cv.getContext('2d')!
    // bundle: r.current.idle DIGANTI dengan bU(idle) → dasar semua plate & lapisan steady
    const idleVein = buildVeinCanvas(bag.idle)
    const plateIdle = buildPlate(bag, 'idle', idleVein)
    const scratch = document.createElement('canvas')
    scratch.width = COMPOSE
    scratch.height = COMPOSE
    // bundle: assembly: CU(bU(idle)) — bU meredupkan haze, mengubah set sampel >95
    assemblyRef.current = buildAssembly(idleVein)
    // bundle: edgeParticles: PU(AU(idle)), veins: RU(idle), listeningRings dari webp listening
    const edgeParticles: EdgeParticle[] = buildEdgeParticles(buildEdgePoints(bag.idle))
    const veins = buildVeins(bag.idle)
    const rings = buildListeningRings(bag.listening)
    try {
      rings.toBlob((b) => { if (b && aliveToBlob) setRingsUrl(URL.createObjectURL(b)) }, 'image/png')
    } catch { /* toBlob tidak tersedia */ }
    // idle = bU(idle); thinking/speaking/strong tetap webp mentah (bundle hanya mengganti .idle)
    const images = { idle: idleVein, thinking: bag.thinking, speaking: bag.speaking, strong: bag.strong }

    const mk = () => {
      const c = document.createElement('canvas')
      c.width = COMPOSE
      c.height = COMPOSE
      return c
    }
    const prevCv = mk(), nextCv = mk(), glowCv = mk(), maskCv = mk()

    let aliveToBlob = true
    const reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    const skipFlag = !!(window as any).__HUM_SKIP_ASSEMBLY
    const asmEl = (window as any).__HUM_ASM_EL as number | undefined
    const asmOff = (window as any).__HUM_ASM_OFF as number | undefined

    // --- energi (l.current / f.current di bundle) ---
    let energy = 0
    let micPeak = 0
    let strongMix = 0
    strongRef.current = 0
    let fade: Fade = createFade(normalizeState(stateRef.current))
    let fadeFrom: State = normalizeState(stateRef.current)

    const stepEnergy = (st: State, dt: number) => {
      if (st === 'speaking') {
        const mic = getSignal('output')
        micPeak += (mic - micPeak) * Math.min(1, dt * 4)
        const excess = Math.max(0, mic - micPeak)
        const target = Math.max(0, Math.min(1, mic * 0.74 + excess * 2.8))
        energy += (target - energy) * Math.min(1, dt * 7)
        energy = Math.max(0.1, energy)
        const k = Math.max(0, Math.min(1, (energy - 0.34) / 0.4))
        strongMix = k * k * (3 - 2 * k)
      } else {
        energy *= 0.92
        strongMix = 0
      }
      strongRef.current = energy
      strongMixRef.current = strongMix
    }

    const horns = hornRef.current
    const updateHorn = (assemblySeconds: number) => {
      // bundle: glow "horn" — opacity/ukuran/posisi mengikuti fase surge
      if (!horns) return
      let u = assemblySeconds - 6.2
      const surge = numHook('__HUM_SURGE')
      if (surge != null) u = Number(surge) + (TIMELINE.total - TIMELINE.hornPeak)
      if (u <= 0 || u > 4.5) {
        horns.style.opacity = '0'
        return
      }
      const rect = cv.getBoundingClientRect()
      const h = u * 0.75 * rect.height
      const cx = rect.left + rect.width * 0.5
      const cy = rect.top + rect.height * 0.43
      const size = 2.6 * h
      horns.style.opacity = String(Math.min(1, 0.9 * Math.exp(-u / 1.6)))
      horns.style.width = `${size}px`
      horns.style.height = `${size}px`
      horns.style.left = `${cx - size / 2}px`
      horns.style.top = `${cy - size / 2}px`
    }

    const drawSteady = (t: number, dtIn: number) => {
      // EKSTENSI (F-39): `__HUM_FREEZE_T` di bundle hanya mengunci uniform shader (uT).
      // Karena rebuild ini murni 2D, hook yang sama dipakai untuk mengunci SELURUH jam
      // animasi (dt → 0) supaya bingkai benar-benar identik — dipakai Gerbang C.
      const frozen = frozenTime() != null
      const dt = frozen ? 0 : dtIn
      const target = normalizeState(stateRef.current)
      if (target !== fadeFrom) {
        // snapshot kanvas sekarang → dipakai sebagai lapisan "sebelum"
        const pc = prevCv.getContext('2d')!
        pc.clearRect(0, 0, COMPOSE, COMPOSE)
        pc.drawImage(cv, 0, 0)
        fadeFrom = target
        fade = { to: target, p: 0, dur: reduce ? 0.001 : transitionDuration(target) }
      }
      stepEnergy(fade.to, dt)
      const frame = { state: fade.to, energy, strongMix, t, reduced: reduce, images, veins, rings }
      ge.clearRect(0, 0, COMPOSE, COMPOSE)
      if (fade.p < 1) fade = drawTransition(ge, COMPOSE, COMPOSE, fade, dt, frame, prevCv, nextCv, glowCv, maskCv)
      else drawState(ge, COMPOSE, COMPOSE, frame)
      // HARNESS SEAM: status crossfade untuk gerbang D (tidak memengaruhi rendering)
      ;(window as any).__HUM_FADE = { p: fade.p, dur: fade.dur, to: fade.to, dt }
      updateHorn(TIMELINE.total)
      // bundle: at(_e, Te, Ye, Ge, pt, 1) — intensitas 1 di steady-state; `if (He) return`
      if (!reduce) drawEdgeParticles(ge, COMPOSE, COMPOSE, dt, fade.to, energy, 1, edgeParticles)
    }

    if (reduce || skipFlag) {
      progressRef.current = 1
      setBirthText('')            // bundle: J("") → readout disembunyikan
      // bundle: Ye = min(.05, (fe-ke)/1e3) — dt nyata, termasuk jalur reduced/skip
      let lastSkip = performance.now()
      const draw = (now: number) => {
        const dt = Math.min(0.05, Math.max(0, (now - lastSkip) / 1000))
        lastSkip = now
        drawSteady(frozenTime() ?? now / 1000, dt)
        raf = requestAnimationFrame(draw)
      }
      let raf = requestAnimationFrame(draw)
      return () => cancelAnimationFrame(raf)
    }

    const t0 = performance.now() - (asmOff ? asmOff * 1000 : 0)
    let raf = 0
    let done = false
    let last = performance.now()
    const frame = (now?: number) => {
      const nowMs = now ?? performance.now()
      const dt = Math.min(0.05, Math.max(0, (nowMs - last) / 1000))
      last = nowMs
      const t = asmEl != null ? asmEl : (performance.now() - t0) / 1000
      if (!done && t >= TIMELINE.total) {
        done = true
        progressRef.current = 1
        setBirthText('')
        // state steady pertama langsung tanpa crossfade
        fade = createFade(normalizeState(stateRef.current))
        fadeFrom = fade.to
      }
      if (done) {
        drawSteady(frozenTime() ?? nowMs / 1000, dt)
        raf = requestAnimationFrame(frame)
        return
      }
      updateHorn(t)
      ge.clearRect(0, 0, COMPOSE, COMPOSE)
      const s = renderBirthFrame(
        ge, COMPOSE, COMPOSE, t, assemblyRef.current!, plateIdle, scratch, dt, edgeParticles,
        nowMs / 1000
      )
      progressRef.current = s
      // bundle tetap menggambar tiap frame walau __HUM_ASM_EL membekukan waktu
      raf = requestAnimationFrame(frame)
    }
    frame()
    return () => {
      aliveToBlob = false
      if (raf) cancelAnimationFrame(raf)
    }
  }, [bag, replay])

  // readout ASSEMBLING: setInterval 160 ms, clamp 99%, kosong saat selesai

  useEffect(() => {
    const reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    if (reduce || (window as any).__HUM_SKIP_ASSEMBLY) { setBirthText(''); return }
    // bundle: PE(Yh.ASSEMBLY) tepat sebelum readout mulai
    fireMoment(MOMENTS.ASSEMBLY)
    const xe = setInterval(() => {
      const p = progressRef.current
      setBirthText(p >= 1 ? '' : `ASSEMBLING... ${Math.min(99, Math.round(p * 100))}%`)
      if (p >= 1) clearInterval(xe)
    }, 160)
    return () => clearInterval(xe)
  }, [])

  const toggleMic = async () => {
    if (micOn) {
      micRef.current?.stop()
      micRef.current = null
      setMicOn(false)
      return
    }
    try {
      micRef.current = await startMic()
      setMicOn(true)
    } catch {
      /* bundle: catch {} — senyap */
    }
  }

  const toggleSound = () => {
    const next = !soundOn
    setSoundEnabled(next)
    setSoundOn(next)
  }

  // bundle: setInterval(() => le(l.current > .58), 180)
  useEffect(() => {
    const id = setInterval(() => setStrongHigh(strongRef.current > 0.58), 180)
    return () => clearInterval(id)
  }, [])

  return (
    <section
      data-testid="humanoid-mode"
      aria-label="Apex cinematic humanoid"
      style={{ position: 'fixed', inset: 0, zIndex: 75, overflow: 'hidden', background: '#000', color: YA, fontFamily: 'var(--font-ui)' }}
    >
      {/* latar: xU — img statis + point-cloud WebGL (komponen & urutan verbatim) */}
      {!noBg && <Backdrop visible={bgVisible} birthRef={birthRef} />}

      {/* frame portrait: persegi min(100vw,100vh), di tengah */}
      <div
        data-testid="humanoid-portrait-frame"
        style={{
          position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
          width: 'min(100vw, 100vh)', height: 'min(100vw, 100vh)', overflow: 'hidden', pointerEvents: 'none',
        }}
      >
        {/* plate 2D (jalur lama, tetap ada seperti bundle: kanvas 2D di bawah figur) */}
        <canvas
          ref={plateRef}
          aria-label="Animated cyan and gold Apex humanoid"
          width={COMPOSE}
          height={COMPOSE}
          style={{ width: '100%', height: '100%', display: 'block', opacity: figOnly ? 0 : 1 }}
        />
        {/* figur GPU — port pU/hU/fU + bloom (langkah 8, port penuh).
            URUTAN PENTING: di bundle kanvas WebGL figur berada SETELAH kanvas 2D dalam DOM
            (probe-live-canvastype: [backdrop gl, plate 2d, figure gl]) dan bersifat opak,
            jadi figur menutupi plate. */}
        <Figure state={state} visible birthRef={birthRef} />
      </div>

      {/* ring CSS — keyframes & nilai verbatim dari bundle */}
      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <style>{`
            @keyframes humRingBase { 0%, 100% { opacity: 0.22; } 50% { opacity: 0.32; } }
            @keyframes humRingPulse {
              0% { transform: scale(1); opacity: 0; }
              50% { opacity: 0.26; }
              100% { transform: scale(1.05); opacity: 0; }
            }
          `}</style>
      </div>

      {/* cincin listening — tiga <img> yang sama, blend plus-lighter, keyframes verbatim */}
      {ringsUrl && bgVisible && normalizeState(state) === 'listening' && (
        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          {[
            'humRingBase 3.4s ease-in-out infinite',
            'humRingPulse 4.55s linear infinite',
          ].map((anim) => (
            <img
              key={anim}
              src={ringsUrl}
              alt=""
              style={{
                position: 'absolute', inset: 0, width: '100%', height: '100%',
                mixBlendMode: 'plus-lighter', animation: anim,
              }}
            />
          ))}
        </div>
      )}

      {/* glow "horn" — radial-gradient, mix-blend-mode screen, ukuran/opacity per frame */}
      <div
        ref={hornRef}
        aria-hidden="true"
        style={{
          position: 'fixed', left: 0, top: 0, width: 0, height: 0, borderRadius: '50%',
          pointerEvents: 'none', mixBlendMode: 'screen', opacity: 0, zIndex: 1,
          background:
            'radial-gradient(circle, rgba(0,0,0,0) 0 58%, rgba(150,225,255,0.8) 77%, rgba(0,0,0,0) 96%)',
          willChange: 'width, height, left, top, opacity',
        }}
      />

      {/* HUD */}
      <div aria-live="polite" style={{ position: 'absolute', right: 18, top: 18, fontSize: 11, letterSpacing: '0.16em' }}>
        {birthText || (normalizeState(state) === 'speaking' && strongHigh ? 'STATUS: SPEAKING  INTENSITY: HIGH' : `STATUS: ${normalizeState(state).toUpperCase()}`)}
      </div>
      <button
        onClick={onExit}
        aria-label="Exit humanoid view"
        style={{ position: 'absolute', left: 18, top: 18, padding: '5px 10px', background: 'rgba(0, 10, 14, 0.72)', color: YA, border: `1px solid ${YA}55`, borderRadius: 6, fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-ui)' }}
      >
        EXIT
      </button>
      {/* tombol kamera — label & perilaku verbatim bundle */}
      <button
        type="button"
        onClick={() => {
          // bundle: te ? re(Q=>!Q) : oe(!0)  → klik-1 "menyiapkan", klik-2 baru menyalakan kamera
          if (cameraAsked) setCameraOn((v) => !v)
          else setCameraAsked(true)
        }}
        aria-label={cameraOn ? 'Close camera' : cameraAsked ? 'Open camera now' : 'Open hand gesture'}
        style={{
          position: 'absolute', top: 18, left: 88, zIndex: 2, minHeight: 44, padding: '0 14px',
          border: `1px solid ${YA}40`, borderRadius: 9, background: 'rgba(0, 10, 14, 0.72)', color: YA,
          fontFamily: "'Share Tech Mono', monospace", fontSize: 12, letterSpacing: '0.08em',
          cursor: 'pointer', boxShadow: `0 0 18px ${YA}10`,
        }}
      >
        {cameraOn ? 'Close camera' : cameraAsked ? 'Open camera now' : 'Open hand gesture'}
      </button>
      {cameraOn && (
        <>
          <HandTracker
            attentionRef={attentionRef}
            onPinch={(x, y) => { attentionRef.current = { x, y, strength: 1 } }}
            onPalm={() => window.dispatchEvent(new CustomEvent('apex-gesture-quiet'))}
            onSnap={() => {
              const st = String(stateRef.current || '')
              if (!st.includes('speak') && !st.includes('listen'))
                window.dispatchEvent(new CustomEvent('apex-gesture-snap'))
            }}
          />
          <button
            type="button"
            onClick={() => setCameraOn(true)}
            aria-label="Camera tracking is on — open controls"
            title="Finger tracking is on"
            style={{
              position: 'absolute', top: 33, left: 270, zIndex: 2, width: 14, height: 14, borderRadius: '50%',
              border: 'none', cursor: 'pointer', background: '#ff4444', boxShadow: '0 0 10px #ff4444aa',
              animation: 'fadeInOut 1.6s ease infinite', padding: 0,
            }}
          />
        </>
      )}
      {err && <div style={{ position: 'absolute', left: 18, bottom: 18, fontSize: 11, color: '#ff4444aa' }}>{err}</div>}

      {/* debug bar — hanya dengan ?auto, label & urutan verbatim bundle */}
      {autoDebug && (
        <div
          data-testid="debug-bar"
          style={{
            position: 'fixed', bottom: 10, left: '50%', transform: 'translateX(-50%)', zIndex: 200,
            display: 'flex', gap: 6, fontFamily: 'var(--font-ui)',
          }}
        >
          {['idle', 'listening', 'thinking', 'speaking'].map((st) => (
            <button
              key={st}
              onClick={() => window.dispatchEvent(new CustomEvent('hum:set-state', { detail: st }))}
              style={{
                padding: '5px 11px',
                background: normalizeState(state) === st ? '#22d3ee33' : '#0a0f12',
                color: '#9fd8e8', border: '1px solid #22d3ee55', borderRadius: 6, fontSize: 11,
                cursor: 'pointer', fontFamily: 'var(--font-ui)',
              }}
            >
              {st}
            </button>
          ))}
          <button
            onClick={toggleMic}
            title="Drive the speaking face from your microphone"
            style={{
              padding: '5px 11px', background: micOn ? '#f5a62333' : '#0a0f12',
              color: micOn ? '#f5a623' : '#9fd8e8',
              border: `1px solid ${micOn ? '#f5a623' : '#22d3ee'}55`, borderRadius: 6, fontSize: 11,
              cursor: 'pointer', fontFamily: 'var(--font-ui)',
            }}
          >
            🎙 MIC {micOn ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={() => setReplay((v) => v + 1)}
            title="Run the birth again"
            style={{
              padding: '5px 11px', background: '#0a0f12', color: '#9fd8e8',
              border: '1px solid #22d3ee55', borderRadius: 6, fontSize: 11, cursor: 'pointer',
              fontFamily: 'var(--font-ui)',
            }}
          >
            ↻ REPLAY
          </button>
          <button
            onClick={toggleSound}
            style={{
              padding: '5px 11px', background: '#0a0f12',
              color: soundOn ? '#9fd8e8' : '#4a6b75', border: '1px solid #22d3ee55', borderRadius: 6,
              fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font-ui)',
            }}
          >
            {soundOn ? '♪ SOUND ON' : '♪ SOUND OFF'}
          </button>
        </div>
      )}
    </section>
  )
}
