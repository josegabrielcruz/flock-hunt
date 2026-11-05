import {
  MUSE_FRAME_W, MUSE_FRAME_H,
  MUSE_IDLE_FRAME, MUSE_EXPLODE_START, MUSE_EXPLODE_FRAMES,
  MUSE_FRAME_DURATION, MUSE_SPEED, MUSE_LAUNCH_VY, MUSE_GRAVITY,
  GAME_W, GAME_H,
} from '../constants'
import type { MuseState } from '../types'
import type { SpriteMap } from '../assets'
import { isLoaded } from '../assets'

export class SkeetTarget {
  x: number
  y: number
  state: MuseState = 'flying'

  private vx: number
  private vy: number
  private frameIndex = MUSE_IDLE_FRAME
  private frameTimer = 0
  private timeAlive = 0
  private frozenScale: number | null = null  // locked when hit so explosion doesn't keep shrinking

  constructor() {
    this.x = -MUSE_FRAME_W
    this.y = GAME_H - 90
    this.vx = MUSE_SPEED
    this.vy = MUSE_LAUNCH_VY
  }

  get isResolved(): boolean {
    if (this.state === 'missed') return true
    if (this.state === 'hit') {
      return this.frameIndex >= MUSE_EXPLODE_START + MUSE_EXPLODE_FRAMES - 1
    }
    return false
  }

  isHit(clickX: number, clickY: number): boolean {
    if (this.state !== 'flying') return false
    const scale = this.getScale()
    const dw = MUSE_FRAME_W * scale
    const dh = MUSE_FRAME_H * scale
    const dx = this.x + (MUSE_FRAME_W - dw) / 2
    const dy = this.y + (MUSE_FRAME_H - dh) / 2
    return clickX >= dx && clickX <= dx + dw && clickY >= dy && clickY <= dy + dh
  }

  registerHit(): void {
    if (this.state !== 'flying') return
    this.frozenScale = this.getScale()  // lock scale so explosion size is consistent
    this.state = 'hit'
    this.frameIndex = MUSE_EXPLODE_START
    this.frameTimer = 0
  }

  update(dt: number): void {
    if (this.state === 'flying' || this.state === 'hit') {
      if (this.state === 'flying') this.timeAlive += dt
      this.x += this.vx * dt
      this.y += this.vy * dt
      this.vy += MUSE_GRAVITY * dt
      if (this.state === 'flying' &&
          (this.x > GAME_W + MUSE_FRAME_W || this.y > GAME_H + MUSE_FRAME_H)) {
        this.state = 'missed'
      }
    }
    if (this.state === 'hit') {
      this.frameTimer += dt
      while (this.frameTimer >= MUSE_FRAME_DURATION) {
        this.frameTimer -= MUSE_FRAME_DURATION
        if (this.frameIndex < MUSE_EXPLODE_START + MUSE_EXPLODE_FRAMES - 1) {
          this.frameIndex++
        }
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D, sprites: SpriteMap): void {
    if (this.state === 'missed') return
    const sheet = sprites.museSprite
    if (!isLoaded(sheet)) return
    const scale = this.getScale()
    const dw = MUSE_FRAME_W * scale
    const dh = MUSE_FRAME_H * scale
    const dx = this.x + (MUSE_FRAME_W - dw) / 2
    const dy = this.y + (MUSE_FRAME_H - dh) / 2
    ctx.drawImage(
      sheet,
      this.frameIndex * MUSE_FRAME_W, 0,
      MUSE_FRAME_W, MUSE_FRAME_H,
      dx, dy, dw, dh,
    )
  }

  private getScale(): number {
    if (this.frozenScale !== null) return this.frozenScale
    return Math.max(0.35, 1.0 - this.timeAlive * 0.28)
  }
}
