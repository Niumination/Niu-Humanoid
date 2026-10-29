/**
 * lib/mic — port VERBATIM jalur mikrofon APEX (debug `v()` di bundle):
 *
 *   getUserMedia({audio:true}) → MediaStreamSource → AnalyserNode(fftSize 512)
 *   rAF: getByteTimeDomainData → RMS → setSignal("output", min(1, rms*6))
 *   stop: cancel rAF, stop tracks, ctx.close(), clearSignal("output")
 *
 * Energi lalu dihaluskan di loop render (lihat HumanoidMode):
 *   speaking: peak += (mic−peak)·min(1,dt·4); excess = max(0, mic−peak)
 *             target = clamp01(mic·.74 + excess·2.8); energy += (target−energy)·min(1,dt·7)
 *             energy = max(.1, energy); strongMix = smoothstep((energy−.34)/.4)
 *   lainnya : energy *= .92 (per frame, verbatim)
 */
import { clearSignal, setSignal } from './cues'

export interface MicHandle {
  stop: () => void
  context: AudioContext
}

export async function startMic(): Promise<MicHandle> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  const Ctor: typeof AudioContext =
    (window as any).AudioContext || (window as any).webkitAudioContext
  const ctx = new Ctor()
  const src = ctx.createMediaStreamSource(stream)
  const analyser = ctx.createAnalyser()
  analyser.fftSize = 512
  src.connect(analyser)
  const buf = new Uint8Array(analyser.fftSize)
  let raf = 0
  const tick = () => {
    analyser.getByteTimeDomainData(buf)
    let sum = 0
    for (let i = 0; i < buf.length; i++) {
      const v = (buf[i] - 128) / 128
      sum += v * v
    }
    setSignal('output', Math.min(1, Math.sqrt(sum / buf.length) * 6))
    raf = requestAnimationFrame(tick)
  }
  tick()
  return {
    context: ctx,
    stop() {
      cancelAnimationFrame(raf)
      stream.getTracks().forEach((t) => t.stop())
      void ctx.close()
      clearSignal('output')
    },
  }
}
