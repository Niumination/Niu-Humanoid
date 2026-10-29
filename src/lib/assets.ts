/**
 * lib/assets — peta aset VERBATIM dari bundle (wU) + backdrop.
 * Urutan pemuatan & path harus sama; aset disalin byte-for-byte ke public/humanoid/.
 */
export const ASSET_MAP = {
  idle: '/humanoid/apex-idle-v1.webp',
  listening: '/humanoid/apex-listening-v1.webp',
  thinking: '/humanoid/apex-thinking-v1.webp',
  speaking: '/humanoid/apex-speaking-v1.webp',
  strong: '/humanoid/apex-speaking-strong-v1.webp',
  assembly25: '/humanoid/apex-assembly-25-v1.webp',
  assembly60: '/humanoid/apex-assembly-60-v1.webp',
} as const
export const BACKDROP = '/humanoid/backdrop-v1.webp'

export type AssetKey = keyof typeof ASSET_MAP
export type AssetBag = Record<AssetKey | 'backdrop', HTMLImageElement>

/** Sama seperti bundle: Promise.all(Object.entries(wU).map(... new Image())) */
export function loadAssets(): Promise<AssetBag> {
  const entries: [string, string][] = [...Object.entries(ASSET_MAP), ['backdrop', BACKDROP]]
  return Promise.all(
    entries.map(
      ([k, src]) =>
        new Promise<[string, HTMLImageElement]>((res, rej) => {
          const im = new Image()
          im.decoding = 'async'
          im.onload = () => res([k, im])
          im.onerror = rej
          im.src = src
        })
    )
  ).then(list => Object.fromEntries(list) as AssetBag)
}
