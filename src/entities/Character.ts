import {
  GAME_W, GRASS_VISUAL_Y,
  DOG_FRAME_H, DOG_WALK_FRAME_W, DOG_WALK_FRAMES, DOG_FRAME_DURATION,
  DOG_WALK_SPEED, DOG_RISE_SPEED, DOG_EXIT_DELAY,
  DOG_LAUGH_FRAME_W, DOG_LAUGH_FRAMES, DOG_SUCCESS_FRAME_W, DOG_ROW1_Y,
  DOG_SINK_SPEED, DOG_JUMP_FRAME_DUR, DOG_JUMP_HEIGHT,
} from '../constants'
import type { CharacterState } from '../types'
import type { SpriteMap } from '../assets'
import { isLoaded } from '../assets'

// Row 0 source-x offsets (all frames 225px wide)
const ALERT_SRCX   = DOG_WALK_FRAMES * DOG_WALK_FRAME_W        // 1125
const JUMP1_SRCX   = ALERT_SRCX + DOG_WALK_FRAME_W              // 1350
const JUMP2_SRCX   = JUMP1_SRCX + DOG_WALK_FRAME_W              // 1575
// Row 1 source-x offsets
const SUCCESS_SRCX = DOG_LAUGH_FRAMES * DOG_LAUGH_FRAME_W       // 450

// x where the dog pauses before jumping — roughly center-left of canvas
const MIDSCREEN_X  = GAME_W / 2 - DOG_WALK_FRAME_W / 2 
// Standing y: dog feet at visual grass line
const STAND_Y = (GRASS_VISUAL_Y - DOG_FRAME_H) + 125
const RISE_STAND_Y = (GRASS_VISUAL_Y - DOG_FRAME_H) + 70

type DogPhase = 'walk' | 'alert' | 'jump1' | 'jump2' | 'sink' | 'rise' | 'display' | 'retreat'

export class Character {
  state: CharacterState = 'hidden'

  private phase: DogPhase = 'walk'
  private x = 0
  private y = 0
  private isSuccess = false

  private walkFrameIndex = 0
  private walkFrameTimer = 0
  private laughFrameIndex = 0
  private laughFrameTimer = 0
  private phaseTimer = 0
  private skipRise = false
  private jumpProgress = 0  // 0→1 across both jump phases; drives the sin arc

  onJump: (() => void) | null = null

  // Above grass on the way up; switches to below-grass at the apex (start of jump2)
  get isAboveGrass(): boolean {
    return this.phase === 'walk' || this.phase === 'alert' || this.phase === 'jump1'
  }

  /** Sequence 1: walk in from left, alert, jump, sink behind grass, done. */
  enterWalkIn(): void {
    this.state = 'entering'
    this.phase = 'walk'
    this.isSuccess = false
    this.skipRise = true
    this.x = -DOG_WALK_FRAME_W
    this.y = STAND_Y
    this.walkFrameIndex = 0
    this.walkFrameTimer = 0
    this.jumpProgress = 0
    this.phaseTimer = 0
  }

  /** Sequence 2: rise from behind grass at camera x, display holding camera, retreat. */
  enterSuccess(riseX: number): void {
    this.state = 'entering'
    this.phase = 'rise'
    this.isSuccess = true
    this.skipRise = false
    this.x = Math.max(0, Math.min(GAME_W - DOG_SUCCESS_FRAME_W, riseX))
    this.y = GRASS_VISUAL_Y + 50
    this.laughFrameIndex = 0
    this.laughFrameTimer = 0
    this.phaseTimer = 0
  }

  /** Sequence 3: rise from behind grass at midscreen, display snickering, retreat. */
  enterLaugh(): void {
    this.state = 'entering'
    this.phase = 'rise'
    this.isSuccess = false
    this.skipRise = false
    this.x = MIDSCREEN_X
    this.y = GRASS_VISUAL_Y
    this.laughFrameIndex = 0
    this.laughFrameTimer = 0
    this.phaseTimer = 0
  }

  update(dt: number): void {
    if (this.state === 'hidden') return
    switch (this.phase) {
      case 'walk':    this.updateWalk(dt);    break
      case 'alert':   this.updateAlert(dt);   break
      case 'jump1':   this.updateJump1(dt);   break
      case 'jump2':   this.updateJump2(dt);   break
      case 'sink':    this.updateSink(dt);    break
      case 'rise':    this.updateRise(dt);    break
      case 'display': this.updateDisplay(dt); break
      case 'retreat': this.updateRetreat(dt); break
    }
  }

  draw(ctx: CanvasRenderingContext2D, sprites: SpriteMap, layer: 'above' | 'below'): void {
    if (this.state === 'hidden') return
    if (layer === 'above' && !this.isAboveGrass) return
    if (layer === 'below' && this.isAboveGrass) return

    const sheet = sprites.dogSprite
    const frameW = (this.phase === 'rise' || this.phase === 'display' || this.phase === 'retreat')
      ? (this.isSuccess ? DOG_SUCCESS_FRAME_W : DOG_LAUGH_FRAME_W)
      : DOG_WALK_FRAME_W

    if (!isLoaded(sheet)) {
      // Fallback rect — visible even when sprite hasn't loaded yet
      ctx.fillStyle = this.isSuccess ? '#69db7c' : '#ff6b6b'
      ctx.fillRect(this.x, this.y, frameW, DOG_FRAME_H)
      return
    }

    switch (this.phase) {
      case 'walk':
        ctx.drawImage(sheet, this.walkFrameIndex * DOG_WALK_FRAME_W, 0, DOG_WALK_FRAME_W, DOG_FRAME_H, this.x, this.y, DOG_WALK_FRAME_W, DOG_FRAME_H)
        break
      case 'alert':
        ctx.drawImage(sheet, ALERT_SRCX, 0, DOG_WALK_FRAME_W, DOG_FRAME_H, this.x, this.y, DOG_WALK_FRAME_W, DOG_FRAME_H)
        break
      case 'jump1':
        ctx.drawImage(sheet, JUMP1_SRCX, 0, DOG_WALK_FRAME_W, DOG_FRAME_H, this.x, this.y, DOG_WALK_FRAME_W, DOG_FRAME_H)
        break
      case 'jump2':
      case 'sink':
        ctx.drawImage(sheet, JUMP2_SRCX, 0, DOG_WALK_FRAME_W, DOG_FRAME_H, this.x, this.y, DOG_WALK_FRAME_W, DOG_FRAME_H)
        break
      case 'rise':
      case 'display':
      case 'retreat':
        if (this.isSuccess) {
          ctx.drawImage(sheet, SUCCESS_SRCX, DOG_ROW1_Y, DOG_SUCCESS_FRAME_W, DOG_FRAME_H, this.x, this.y, DOG_SUCCESS_FRAME_W, DOG_FRAME_H)
        } else {
          ctx.drawImage(sheet, this.laughFrameIndex * DOG_LAUGH_FRAME_W, DOG_ROW1_Y, DOG_LAUGH_FRAME_W, DOG_FRAME_H, this.x, this.y, DOG_LAUGH_FRAME_W, DOG_FRAME_H)
        }
        break
    }
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private updateWalk(dt: number): void {
    this.walkFrameTimer += dt
    while (this.walkFrameTimer >= DOG_FRAME_DURATION) {
      this.walkFrameTimer -= DOG_FRAME_DURATION
      this.walkFrameIndex = (this.walkFrameIndex + 1) % DOG_WALK_FRAMES
    }
    this.x += DOG_WALK_SPEED * dt
    if (this.x >= MIDSCREEN_X) {
      this.x = MIDSCREEN_X
      this.phase = 'alert'
      this.phaseTimer = 0
    }
  }

  private updateAlert(dt: number): void {
    this.phaseTimer += dt
    if (this.phaseTimer >= 0.45) {
      this.phase = 'jump1'
      this.phaseTimer = 0
      this.onJump?.()
    }
  }

  private updateJump1(dt: number): void {
    // Advance first half of arc (progress 0 → 0.5)
    this.jumpProgress = Math.min(this.jumpProgress + dt / (DOG_JUMP_FRAME_DUR * 2), 0.5)
    this.y = STAND_Y - Math.sin(this.jumpProgress * Math.PI) * DOG_JUMP_HEIGHT
    if (this.jumpProgress >= 0.5) {
      this.phase = 'jump2'
    }
  }

  private updateJump2(dt: number): void {
    // Advance second half of arc (progress 0.5 → 1.0)
    this.jumpProgress = Math.min(this.jumpProgress + dt / (DOG_JUMP_FRAME_DUR * 2), 1.0)
    this.y = STAND_Y - Math.sin(this.jumpProgress * Math.PI) * DOG_JUMP_HEIGHT
    if (this.jumpProgress >= 1.0) {
      this.y = STAND_Y  // snap back to exact landing position
      this.phase = 'sink'
      this.phaseTimer = 0
    }
  }

  private updateSink(dt: number): void {
    this.y += DOG_SINK_SPEED * dt
    if (this.y >= GRASS_VISUAL_Y + 100) {
      this.y = GRASS_VISUAL_Y
      if (this.skipRise) {
        this.skipRise = false
        this.state = 'hidden'  // walk-in complete — no rise
      } else {
        this.phase = 'rise'
        this.phaseTimer = 0
      }
    }
  }

  private updateRise(dt: number): void {
    this.y -= DOG_RISE_SPEED * dt
    this.advanceLaugh(dt)
    if (this.y <= RISE_STAND_Y) {
      this.y = RISE_STAND_Y
      this.phase = 'display'
      this.phaseTimer = 0
      this.state = this.isSuccess ? 'success' : 'laugh'
    }
  }

  private updateDisplay(dt: number): void {
    this.phaseTimer += dt
    this.advanceLaugh(dt)
    if (this.phaseTimer >= DOG_EXIT_DELAY / 1000) {
      this.phase = 'retreat'
      this.phaseTimer = 0
    }
  }

  private updateRetreat(dt: number): void {
    this.y += DOG_RISE_SPEED * dt
    if (this.y >= GRASS_VISUAL_Y + 50) {
      this.state = 'hidden'
    }
  }

  private advanceLaugh(dt: number): void {
    if (this.isSuccess) return
    this.laughFrameTimer += dt
    while (this.laughFrameTimer >= DOG_FRAME_DURATION) {
      this.laughFrameTimer -= DOG_FRAME_DURATION
      this.laughFrameIndex = (this.laughFrameIndex + 1) % DOG_LAUGH_FRAMES
    }
  }
}
