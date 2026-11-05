import { SPRITES } from './constants'

type SpriteKey = keyof typeof SPRITES

/** Preloaded sprite images, keyed by sprite name. */
export type SpriteMap = Partial<Record<SpriteKey, HTMLImageElement>>

/** True only when an image has fully loaded. Use before every drawImage call. */
export function isLoaded(img: HTMLImageElement | undefined): img is HTMLImageElement {
  return img !== undefined && img.complete && img.naturalWidth > 0
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => {
      // Non-fatal: resolve with placeholder so missing sprites don't crash during dev
      console.warn(`[assets] sprite not found: ${src}`)
      resolve(img)
    }
    img.src = src
  })
}

/** Loads all sprites defined in SPRITES concurrently. */
export async function loadAssets(): Promise<SpriteMap> {
  const entries = Object.entries(SPRITES) as [SpriteKey, string][]
  const results = await Promise.all(
    entries.map(async ([key, src]) => [key, await loadImage(src)] as const)
  )
  return Object.fromEntries(results) as SpriteMap
}
