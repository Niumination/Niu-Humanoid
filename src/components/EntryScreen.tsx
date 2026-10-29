/**
 * EntryScreen — disalin 1:1 dari bundle (offset 1107550–1108700).
 * Warna, ukuran, letter-spacing, radius, shadow: verbatim. Jangan "dirapikan".
 */
const YA = '#22d3ee'

export function EntryScreen({ onEnter }: { onEnter: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000', display: 'grid', placeItems: 'center' }}>
      <div style={{ textAlign: 'center', fontFamily: 'var(--font-ui)' }}>
        <div style={{ color: YA, fontSize: 22, letterSpacing: '0.3em', marginBottom: 8 }}>APEX HUMANOID</div>
        <div style={{ color: '#9fd8e8', fontSize: 12, letterSpacing: '0.12em', marginBottom: 28 }}>
          a figure of light that assembles itself
        </div>
        <button
          onClick={onEnter}
          style={{
            padding: '12px 34px',
            background: 'transparent',
            color: YA,
            cursor: 'pointer',
            border: `1px solid ${YA}66`,
            borderRadius: 10,
            fontFamily: 'var(--font-ui)',
            fontSize: 14,
            letterSpacing: '0.25em',
            boxShadow: `0 0 24px ${YA}22`,
          }}
        >
          ENTER
        </button>
        <div style={{ color: '#4a6b75', fontSize: 10, letterSpacing: '0.1em', marginTop: 18 }}>
          the click opens the audio - the birth has a sound
        </div>
      </div>
    </div>
  )
}
