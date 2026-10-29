/**
 * HandTracker — port VERBATIM komponen `MU()` bundle APEX.
 *
 * Alur (urutan & angka persis):
 *   1. getUserMedia({video:{facingMode:"user",width:320,height:240}, audio:true}) →
 *      bila gagal, ulangi TANPA audio (b = audio tersedia?)
 *   2. video.play(); bila ada audio → AudioContext + Analyser(fftSize 1024) untuk deteksi snap
 *   3. Coba worker (blob module) yang memuat MediaPipe CPU; timeout 20 s
 *   4. Worker siap → kirim frame 256×192, poll 40 ms, kirim bila ≥80 ms sejak kiriman terakhir
 *      Worker gagal → fallback: import langsung @mediapipe (delegate GPU), deteksi tiap 125 ms
 *   5. Semua kegagalan luar → pesan PERSIS "camera unavailable" (satu-satunya teks galat)
 */
import { useEffect, useRef, useState } from 'react'
import {
  HAND_CONST,
  HandSignals,
  WORKER_SOURCE,
  type Point,
} from '../lib/handTracking'

const C = '#19ddff'

export interface HandTrackerHandle {
  error: string
}

export function HandTracker({
  attentionRef,
  onPinch,
  onPalm,
  onSnap,
}: {
  attentionRef: React.MutableRefObject<{ x: number; y: number; strength: number }>
  onPinch: (x: number, y: number) => void
  onPalm: () => void
  onSnap: () => void
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [message, setMessage] = useState('')
  const lastMessage = useRef('')
  const setMsg = (m: string) => {
    if (lastMessage.current !== m) {
      lastMessage.current = m
      setMessage(m)
    }
  }
  const cbRef = useRef({ onPinch, onPalm, onSnap })
  cbRef.current = { onPinch, onPalm, onSnap }

  useEffect(() => {
    let alive = true
    let raf = 0
    let stream: MediaStream | null = null
    // `any`: variabel ini di-assign di dalam closure Promise executor (TS menyempitkannya ke null)
    let worker: any = null
    let workerUrl: string | null = null
    let landmarker: any = null
    let audioCtx: AudioContext | null = null
    let analyser: AnalyserNode | null = null
    let buf: Float32Array | null = null
    let lastLandmarkAt = 0
    let busy = false
    let lastSend = 0
    let hasAudio = false
    let snapAvg = 0.02
    let lastSnap = 0
    let audioEnv = { avg: 0.02 }
    let stopLoops: () => void = () => {}

    const signals = new HandSignals({
      onPinch: (x, y) => cbRef.current.onPinch(x, y),
      onPalm: () => cbRef.current.onPalm(),
      onSnap: () => cbRef.current.onSnap(),
      setAttention: (x, y, hold) => {
        // bundle: typeof window > "u" || !window.__HUM_ATTN  (artinya: kecuali __HUM_ATTN)
        if (typeof window !== 'undefined' && (window as any).__HUM_ATTN) return
        const a = attentionRef.current
        a.x += (x - a.x) * 0.5
        a.y += (y - a.y) * 0.5
        ;(a as any).fingerHold = hold
      },
    })

    const handleLandmarks = (points: Point[] | null, now: number) => {
      if (!alive) return
      if (!points) {
        signals.update(null, now)
        return
      }
      lastLandmarkAt = now
      signals.update(points, now)
    }

    ;(async () => {
      try {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user', width: 320, height: 240 },
            audio: true,
          })
          hasAudio = stream.getAudioTracks().length > 0
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user', width: 320, height: 240 },
          })
        }
        if (!alive) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        const video = videoRef.current!
        video.srcObject = stream
        await video.play()

        if (hasAudio) {
          try {
            const AC: typeof AudioContext =
              (window as any).AudioContext || (window as any).webkitAudioContext
            const actx = new AC()
            audioCtx = actx
            await actx.resume()
            const src = actx.createMediaStreamSource(stream)
            analyser = audioCtx.createAnalyser()
            analyser.fftSize = 1024
            src.connect(analyser)
            buf = new Float32Array(analyser.fftSize)
          } catch {
            hasAudio = false
          }
        }

        // --- loop snap ---
        const snapTick = () => {
          if (!alive) return
          raf = requestAnimationFrame(snapTick)
          if (!analyser || !buf) return
          const now = performance.now()
          analyser.getFloatTimeDomainData(buf)
          let peak = 0
          for (let i = 0; i < buf.length; i += 4) {
            const v = Math.abs(buf[i])
            if (v > peak) peak = v
          }
          const before = audioEnv.avg
          const fired = signals.audio(peak, now, audioEnv)
          audioEnv = { avg: fired.avg }
          snapAvg = before
          lastSnap = now
        }
        raf = requestAnimationFrame(snapTick)

        // --- worker MediaPipe (CPU) ---
        const ok = await new Promise<boolean>((resolve) => {
          try {
            workerUrl = URL.createObjectURL(new Blob([WORKER_SOURCE], { type: 'text/javascript' }))
            worker = new Worker(workerUrl, { type: 'module' })
            const timer = setTimeout(() => resolve(false), HAND_CONST.WORKER_TIMEOUT_MS)
            worker.onmessage = (ev: MessageEvent) => {
              const d = ev.data
              if (d.type === 'ready') {
                clearTimeout(timer)
                resolve(true)
              } else if (d.type === 'fail') {
                clearTimeout(timer)
                resolve(false)
              } else if (d.type === 'lm') {
                busy = false
                handleLandmarks(d.lm, performance.now())
              }
            }
            worker.onerror = () => {
              clearTimeout(timer)
              resolve(false)
            }
            worker.postMessage({ type: 'init' })
          } catch {
            resolve(false)
          }
        })
        if (!alive) return

        if (ok) {
          const canvas = document.createElement('canvas')
          canvas.width = HAND_CONST.FRAME_W
          canvas.height = HAND_CONST.FRAME_H
          const ctx = canvas.getContext('2d', { willReadFrequently: true })!
          const id = setInterval(() => {
            if (!alive || busy || !video || video.readyState < 2) return
            const now = performance.now()
            if (now - lastSend < HAND_CONST.FRAME_MIN_MS) return
            lastSend = now
            try {
              ctx.drawImage(video, 0, 0, HAND_CONST.FRAME_W, HAND_CONST.FRAME_H)
              const img = ctx.getImageData(0, 0, HAND_CONST.FRAME_W, HAND_CONST.FRAME_H)
              busy = true
              worker!.postMessage(
                { type: 'frame', buf: img.data.buffer, w: HAND_CONST.FRAME_W, h: HAND_CONST.FRAME_H, t: now },
                [img.data.buffer]
              )
            } catch {
              /* frame dibuang */
            }
          }, HAND_CONST.FRAME_POLL_MS)
          stopLoops = () => clearInterval(id)
        } else {
          try {
            worker?.terminate()
          } catch {
            /* sudah mati */
          }
          worker = null
          const vision: any = await import(/* @vite-ignore */ HAND_CONST.VISION)
          const resolver = await vision.FilesetResolver.forVisionTasks(HAND_CONST.WASM)
          landmarker = await vision.HandLandmarker.createFromOptions(resolver, {
            baseOptions: { modelAssetPath: HAND_CONST.MODEL, delegate: 'GPU' },
            runningMode: 'VIDEO',
            numHands: 1,
          })
          if (!alive) return
          const id = setInterval(() => {
            if (!alive || !video || video.readyState < 2) return
            const now = performance.now()
            let res: any
            try {
              res = landmarker.detectForVideo(video, now)
            } catch {
              return
            }
            handleLandmarks(res?.landmarks?.[0] || null, now)
          }, HAND_CONST.DETECT_MS)
          stopLoops = () => clearInterval(id)
        }
      } catch {
        if (alive) setMsg(HAND_CONST.ERROR_TEXT)
      }
    })()

    return () => {
      alive = false
      cancelAnimationFrame(raf)
      stopLoops()
      try {
        ;(worker as Worker | null)?.terminate()
      } catch {
        /* noop */
      }
      try {
        if (workerUrl) URL.revokeObjectURL(workerUrl)
      } catch {
        /* noop */
      }
      try {
        landmarker?.close()
      } catch {
        /* noop */
      }
      try {
        void audioCtx?.close()
      } catch {
        /* noop */
      }
      try {
        stream?.getTracks().forEach((t) => t.stop())
      } catch {
        /* noop */
      }
    }
  }, [attentionRef])

  return (
    <>
      <video
        ref={videoRef}
        muted
        playsInline
        aria-hidden="true"
        style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
      />
      {message === HAND_CONST.ERROR_TEXT && (
        <div
          data-testid="camera-error"
          style={{
            position: 'absolute',
            top: 116,
            left: 18,
            zIndex: 2,
            padding: '5px 10px',
            border: `1px solid ${C}33`,
            borderRadius: 7,
            background: 'rgba(0, 10, 14, 0.6)',
            color: C,
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: 10.5,
            letterSpacing: '0.08em',
            pointerEvents: 'none',
            opacity: 0.85,
          }}
        >
          {message}
        </div>
      )}
    </>
  )
}
