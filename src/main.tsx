import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from './App'

// StrictMode sengaja TIDAK dipakai: bundle produksi hanya mount sekali. Di dev,
// StrictMode menjalankan effect dua kali → AudioContext + cue audio ganda
// (250 vs 125 osilator) yang membuat gerbang langkah 4 gagal palsu.
createRoot(document.getElementById('root')!).render(<App />)
