import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from './App'
import { pasangReducedMotion } from './lib/a11y'

// StrictMode sengaja TIDAK dipakai: bundle produksi hanya mount sekali. Di dev,
// StrictMode menjalankan effect dua kali → AudioContext + cue audio ganda
// (250 vs 125 osilator) yang membuat gerbang langkah 4 gagal palsu.
// P15-B (A7): tandai `data-reduced-motion` di <html> supaya gerbang bisa memverifikasi tanpa menebak.
pasangReducedMotion()

// P15-B (A4): landmark <main> + judul h1 untuk pembaca layar. Tidak mengubah tata letak:
// #root sudah `position: fixed; inset: 0`, <main> memakai kotak yang sama.
createRoot(document.getElementById('root')!).render(
  <main style={{ position: 'fixed', top: 0, right: 0, bottom: 0, left: 0 }}>
    <h1 className="sr-only">Apex Humanoid</h1>
    <App />
  </main>
)
