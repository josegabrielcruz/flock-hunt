import {
  CAMERA_FRAME_W, CAMERA_FRAME_H, CAMERA_HEAD_H, CAMERA_SINK_SPEED,
  CAMERA_FLYING_FRAME, CAMERA_EXPLOSION_START, CAMERA_EXPLOSION_FRAMES,
  CAMERA_FRAME_DURATION,
  CAMERA_SPEED_MIN, CAMERA_SPEED_MAX,
  GRASS_Y, GAME_W,
  GAME_H, SPEED_MULTIPLIER
} from '../constants'
import type { CameraState, Direction } from '../types'
import type { SpriteMap } from '../assets'
import { isLoaded } from '../assets'

const CAMERA_W = CAMERA_FRAME_W
const CAMERA_H = CAMERA_FRAME_H

export class FlockCamera {
  x: number
  y: number
  vx: number
  vy: number
  state: CameraState = 'flying'
  direction: Direction

  private frameIndex = CAMERA_FLYING_FRAME
  private frameTimer  = 0
  private escaping = false

  constructor(spawnX: number, round: number) {
    this.x = spawnX - CAMERA_W / 2
    this.y = GRASS_Y + 150
    this.direction = spawnX < GAME_W / 2 ? 'right' : 'left'
    const speed = CAMERA_SPEED_MIN + Math.random() * ((CAMERA_SPEED_MAX + SPEED_MULTIPLIER[round]) - CAMERA_SPEED_MIN)
    this.vx = this.direction === 'right' ? speed : -speed
    this.vy = -speed * 0.6
  }

  update(dt: number): void {
    switch (this.state) {
      case 'flying':   this.updateFlying(dt);   break
      case 'hit':      this.updateHit(dt);       break
      case 'falling':  this.updateFalling(dt);   break
      default: break
    }
  }

  draw(ctx: CanvasRenderingContext2D, sprites: SpriteMap): void {
    if (this.state === 'escaped') return
    this.drawHead(ctx, sprites)
  }

  // Hit detection uses only the camera head area, not the pole portion of the sprite
  isHit(clickX: number, clickY: number): boolean {
    return (
      this.state === 'flying' &&
      clickX >= this.x &&
      clickX <= this.x + CAMERA_W &&
      clickY >= this.y &&
      clickY <= this.y + CAMERA_HEAD_H
    )
  }

  registerHit(): void {
    if (this.state !== 'flying') return
    this.state = 'hit'
    this.frameIndex = CAMERA_EXPLOSION_START
    this.frameTimer = 0
    this.vx = 0
    this.vy = 0
  }

  escape(): void {
    if (this.state === 'flying') this.state = 'escaped'
  }

  // Disable wall bouncing so the camera exits naturally on its current trajectory
  beginEscape(): void {
    if (this.state === 'flying') this.escaping = true
  }

  // Resolved when the camera head is fully below the grass line
  get isResolved(): boolean {
    return (
      (this.state === 'falling' && this.y >= GAME_H - 50) ||
      this.state === 'escaped'
    )
  }

  // ── Private update helpers ───────────────────────────────────────

  private updateFlying(dt: number): void {
    this.x += this.vx * dt
    this.y += this.vy * dt
    this.vy += 60 * dt

    if (this.escaping) {
      // No bouncing — let the camera fly off whichever edge it reaches first
      if (this.x + CAMERA_W < 0 || this.x > GAME_W || this.y > GAME_H) {
        this.state = 'escaped'
      }
      return
    }

    if (this.x < 0) {
      this.x = 0
      this.vx = Math.abs(this.vx)
      this.direction = 'right'
    } else if (this.x + CAMERA_W > GAME_W) {
      this.x = GAME_W - CAMERA_W
      this.vx = -Math.abs(this.vx)
      this.direction = 'left'
    }

    if (this.y >= GAME_H - 50) {
      this.state = 'escaped'
    }

    if (this.y < 0) {
      this.vy *= -1
    }
  }

  // Loops explosion until game.ts calls startFalling() via the gunShot onEnd callback
  private updateHit(dt: number): void {
    this.advanceExplosionFrame(dt)
    const lastFrame = CAMERA_EXPLOSION_START + CAMERA_EXPLOSION_FRAMES - 1
    if (this.frameIndex > lastFrame) this.frameIndex = CAMERA_EXPLOSION_START
  }

  startFalling(): void {
    if (this.state !== 'hit') return
    this.state = 'falling'
    this.frameIndex = CAMERA_EXPLOSION_START
  }

  // Sink straight down at constant speed — no gravity, no rotation
  private updateFalling(dt: number): void {
    this.y += CAMERA_SINK_SPEED * dt
    this.advanceExplosionFrame(dt)
    const lastFrame = CAMERA_EXPLOSION_START + CAMERA_EXPLOSION_FRAMES - 1
    if (this.frameIndex > lastFrame) this.frameIndex = CAMERA_EXPLOSION_START
  }

  private advanceExplosionFrame(dt: number): void {
    this.frameTimer += dt
    while (this.frameTimer >= CAMERA_FRAME_DURATION) {
      this.frameTimer -= CAMERA_FRAME_DURATION
      this.frameIndex++
    }
  }

  // ── Draw helpers ─────────────────────────────────────────────────

  private drawHead(ctx: CanvasRenderingContext2D, sprites: SpriteMap): void {
    const sheet = sprites.cameraSprite

    ctx.save()
    // Translate to horizontal center of sprite at the camera head's y position
    ctx.translate(this.x + CAMERA_W / 2, this.y)
    if (this.direction === 'left') ctx.scale(-1, 1)

    if (isLoaded(sheet)) {
      ctx.drawImage(
        sheet,
        this.frameIndex * CAMERA_FRAME_W, 0,
        CAMERA_FRAME_W, CAMERA_FRAME_H,
        -CAMERA_W / 2, 0,   // draw from top of camera head downward (pole extends below)
        CAMERA_W, CAMERA_H,
      )
    } else {
      ctx.fillStyle = this.state === 'flying' ? '#888' : '#f90'
      ctx.fillRect(-CAMERA_W / 2, 0, CAMERA_W, CAMERA_H)
    }

    ctx.restore()
  }
}

