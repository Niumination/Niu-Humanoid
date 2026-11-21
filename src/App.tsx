import { useEffect, useState } from 'react'
import { EntryScreen } from './components/EntryScreen'
import { HumanoidMode } from './components/HumanoidMode'
import { readTuning } from './lib/humTuning'

/**
 * App — Fase 3 langkah 1 (entry) + langkah 2 (aset & komposisi statis) selesai.
 * Langkah 3–8 (timeline birth, audio, blend state, hand tracking, HUD penuh, bloom)
 * menyusul berurutan; lihat verification/VERIFICATION.md untuk status gerbang.
 */
export function App() {
  // bundle: const[i,e]=useState(()=>!!new URLSearchParams(location.search).get("auto"))
  // `?auto` ATAU `?t=` masuk otomatis. `?t=` adalah jangkar waktu (P15-B) yang dipakai gerbang;
  // tanpa itu, jangkar tidak bisa dipakai untuk masuk ke mode humanoid. Tanpa `?t=`, perilaku lama utuh.
  const [entered, setEntered] = useState(() => {
    if (typeof window === 'undefined') return false
    const q = new URLSearchParams(window.location.search)
    return !!q.get('auto') || q.has('t')
  })
  const [state, setState] = useState<string>('idle')

  useEffect(() => {
    const t = readTuning()
    setState(t.state)
  }, [])

  // HARNESS SEAM (bukan bagian bundle): memungkinkan gate mengubah state tanpa reload,
  // dipakai untuk mengukur durasi transisi crossfade.
  useEffect(() => {
    const h = (e: Event) => setState(String((e as CustomEvent).detail))
    window.addEventListener('hum:set-state', h as EventListener)
    return () => window.removeEventListener('hum:set-state', h as EventListener)
  }, [])

  return entered ? <HumanoidMode state={state} onExit={() => setEntered(false)} /> : <EntryScreen onEnter={() => setEntered(true)} />
}
