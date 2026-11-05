import { GAME_W, GAME_H } from './constants'
import { loadAssets } from './assets'
import { InputHandler } from './input'
import { Game } from './game'

async function init(): Promise<void> {
  const canvas = document.getElementById('game') as HTMLCanvasElement
  const wrap   = document.getElementById('game-wrap') as HTMLDivElement
  const btn    = document.getElementById('sound-toggle') as HTMLButtonElement
  const ctx = canvas.getContext('2d')!

  // Physical pixels = logical size × DPR for sharp rendering on HiDPI screens
  const dpr = window.devicePixelRatio ?? 1
  canvas.width  = GAME_W * dpr
  canvas.height = GAME_H * dpr
  ctx.scale(dpr, dpr)
  ctx.imageSmoothingEnabled = false

  // CSS letterbox: scale canvas + wrapper to fill viewport while preserving 4:3 aspect ratio
  function fitCanvas(): void {
    const scale = Math.min(window.innerWidth / GAME_W, window.innerHeight / GAME_H)
    const w = `${GAME_W * scale}px`
    const h = `${GAME_H * scale}px`
    canvas.style.width  = w
    canvas.style.height = h
    wrap.style.width    = w
    wrap.style.height   = h
  }
  fitCanvas()
  window.addEventListener('resize', fitCanvas)

  const sprites = await loadAssets()
  const game = new Game(ctx, sprites)
  const input = new InputHandler(canvas)

  // Default: mute on touch devices (autoplay policies + battery), unmute on desktop
  const isTouchDevice = navigator.maxTouchPoints > 0 || ('ontouchstart' in window)
  game.audioManager.setMuted(isTouchDevice)
  btn.setAttribute('aria-pressed', String(!isTouchDevice))

  btn.addEventListener('click', () => {
    const nowMuted = game.audioManager.toggleMute()
    btn.setAttribute('aria-pressed', String(!nowMuted))
  })

  input.onShot(pos => game.handleShot(pos))
  input.onMove(pos => game.updateCursor(pos))

  let lastTime = 0
  function loop(timestamp: number): void {
    const dt = Math.min((timestamp - lastTime) / 1000, 0.05)
    lastTime = timestamp
    game.update(dt)
    game.draw()
    requestAnimationFrame(loop)
  }

  requestAnimationFrame((t) => {
    lastTime = t
    loop(t)
  })
}

init()
