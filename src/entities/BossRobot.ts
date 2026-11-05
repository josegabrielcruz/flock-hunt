import {
  BOSS_FRAME_W, BOSS_FRAME_H,
  BOSS_DISPLAY_W, BOSS_DISPLAY_H,
  BOSS_ROW_NORMAL_Y, BOSS_ROW_DAMAGED_Y, BOSS_ROW_DEAD_Y,
  BOSS_DEAD_FRAME_W, BOSS_DEAD_FRAME_H, BOSS_DEAD_FRAMES,
  BOSS_IDLE_FRAME,
  BOSS_RUN_START, BOSS_RUN_FRAMES,
  BOSS_SOMERSAULT_START, BOSS_SOMERSAULT_FRAMES,
  BOSS_HIT_FRAME, BOSS_HIT_FLASH_DURATION,
  BOSS_TOTAL_HP, BOSS_DAMAGE_THRESHOLD,
  BOSS_FRAME_DURATION, BOSS_RUN_SPEED,
  GAME_W, GRASS_Y, BOSS_Y_OFFSET, BOSS_Y_OFFSET_DAMAGED,
  BOSS_Y_OFFSET_DEAD,
} from '../constants'
import type { BossRobotState, Direction } from '../types'
import type { SpriteMap } from '../assets'
import { isLoaded } from '../assets'

// Random float in [min, max]
function rand(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

export class BossRobot {
  private x: number
  private direction: Direction = 'right'
  private state: BossRobotState = 'idle'
  private hp: number = BOSS_TOTAL_HP

  onDead: (() => void) | null = null

  private frameIndex = BOSS_IDLE_FRAME
  private frameTimer = 0

  // How long to stay in the current idle or run burst before re-deciding
  private behaviorTimer = 0
  private behaviorDuration = 0

  // Target x the robot is running toward (so we know when to stop mid-screen)
  private runTargetX = 0

  // Somersault queues once per idle-end or randomly while running
  private somersaultPending = false
  private somersaultTimer = 0   // elapsed seconds; exits after all frames play

  // Death animation — plays once and holds on the last frame
  private deadFrameIndex = 0
  private deadFrameTimer = 0

  // Hit flash — briefly shows the hit frame, then resumes normal animation
  private hitFlashing = false
  private hitFlashTimer = 0

  constructor() {
    // Start just off-screen left, walking in
    this.x = -BOSS_DISPLAY_W
    this.direction = 'right'
    this.startRun(GAME_W / 4 + rand(0, GAME_W / 2))
  }

  get isDead(): boolean { return this.hp <= 0 }
  get currentHp(): number { return this.hp }
  get isIdle(): boolean { return this.state === 'idle' }

  registerHit(): void {
    if (this.state === 'dead') return
    this.hp = Math.max(0, this.hp - 1)
    this.hitFlashing = true
    this.hitFlashTimer = 0
    if (this.hp <= 0) {
      this.state = 'dead'
      this.onDead?.()
    }
  }

  isHit(clickX: number, clickY: number): boolean {
    if (this.state === 'dead') return false
    if (this.state === 'running') return false
    if (this.state === 'somersault') return false
    const y = GRASS_Y - BOSS_DISPLAY_H + BOSS_Y_OFFSET
    return (
      clickX >= this.x &&
      clickX <= this.x + BOSS_DISPLAY_W &&
      clickY >= y &&
      clickY <= y + BOSS_DISPLAY_H
    )
  }

  update(dt: number): void {
    // Tick hit flash independently of other state
    if (this.hitFlashing) {
      this.hitFlashTimer += dt
      if (this.hitFlashTimer >= BOSS_HIT_FLASH_DURATION) this.hitFlashing = false
    }

    if (this.state === 'dead') {
      // Advance destruction frames once; hold on last
      if (this.deadFrameIndex < BOSS_DEAD_FRAMES - 1) {
        this.deadFrameTimer += dt
        while (this.deadFrameTimer >= BOSS_FRAME_DURATION) {
          this.deadFrameTimer -= BOSS_FRAME_DURATION
          this.deadFrameIndex = Math.min(this.deadFrameIndex + 1, BOSS_DEAD_FRAMES - 1)
        }
      }
      return
    }

    this.advanceFrame(dt)

    switch (this.state) {
      case 'running':    this.updateRunning(dt);    break
      case 'idle':       this.updateIdle(dt);       break
      case 'somersault': this.updateSomersault(dt); break
    }
  }

  draw(ctx: CanvasRenderingContext2D, sprites: SpriteMap): void {
    const sheet = sprites.bossSprite
    if (!isLoaded(sheet)) return
    const offsetY = this.hp > BOSS_DAMAGE_THRESHOLD ? BOSS_Y_OFFSET : BOSS_Y_OFFSET_DAMAGED
    const y = GRASS_Y - BOSS_DISPLAY_H + offsetY

    if (this.state === 'dead') {
      this.drawDead(ctx, sheet, y)
      return
    }

    const srcY = this.hp > BOSS_DAMAGE_THRESHOLD ? BOSS_ROW_NORMAL_Y : BOSS_ROW_DAMAGED_Y
    const flipped = this.direction === 'left'
    // Use hit frame when flashing, otherwise use the current animation frame
    const srcFrameIndex = this.hitFlashing ? BOSS_HIT_FRAME : this.frameIndex

    ctx.save()
    if (flipped) {
      ctx.scale(-1, 1)
      ctx.drawImage(
        sheet,
        srcFrameIndex * BOSS_FRAME_W, srcY,
        BOSS_FRAME_W, BOSS_FRAME_H,
        -(this.x + BOSS_DISPLAY_W), y,
        BOSS_DISPLAY_W, BOSS_DISPLAY_H,
      )
    } else {
      ctx.drawImage(
        sheet,
        srcFrameIndex * BOSS_FRAME_W, srcY,
        BOSS_FRAME_W, BOSS_FRAME_H,
        this.x, y,
        BOSS_DISPLAY_W, BOSS_DISPLAY_H,
      )
    }
    ctx.restore()
  }

  // ── Private helpers ───────────────────────────────────────────────

  private drawDead(ctx: CanvasRenderingContext2D, sheet: HTMLImageElement, standingY: number): void {
    const deadY = standingY + BOSS_DISPLAY_H - BOSS_DEAD_FRAME_H + BOSS_Y_OFFSET_DEAD
    // Frame 1+ uses wider frame (276px): clamp x so it doesn't overflow canvas edges
    const drawX = this.deadFrameIndex >= 1
      ? Math.max(0, Math.min(GAME_W - BOSS_DEAD_FRAME_W, this.x))
      : this.x
    ctx.drawImage(
      sheet,
      this.deadFrameIndex * BOSS_DEAD_FRAME_W, BOSS_ROW_DEAD_Y,
      BOSS_DEAD_FRAME_W, BOSS_DEAD_FRAME_H,
      drawX, deadY,
      BOSS_DEAD_FRAME_W, BOSS_DEAD_FRAME_H,
    )
  }

  private startRun(targetX: number): void {
    this.state = 'running'
    this.runTargetX = Math.max(0, Math.min(GAME_W - BOSS_DISPLAY_W, targetX))
    this.direction = this.runTargetX > this.x ? 'right' : 'left'
    this.frameIndex = BOSS_RUN_START
    this.frameTimer = 0
    // Random chance to somersault partway through the run
    this.somersaultPending = Math.random() < 0.35
  }

  private startIdle(): void {
    this.state = 'idle'
    this.frameIndex = BOSS_IDLE_FRAME
    this.behaviorTimer = 0
    this.behaviorDuration = rand(0.2, 1)
  }

  private startSomersault(): void {
    this.state = 'somersault'
    this.frameIndex = BOSS_SOMERSAULT_START
    this.frameTimer = 0
    this.somersaultTimer = 0
    this.somersaultPending = false
  }

  private updateRunning(dt: number): void {
    const speed = BOSS_RUN_SPEED * dt
    const dx = this.runTargetX - this.x
    if (Math.abs(dx) <= speed) {
      // Reached the target
      this.x = this.runTargetX
      if (this.somersaultPending) {
        this.startSomersault()
      } else {
        this.startIdle()
      }
    } else {
      this.x += dx > 0 ? speed : -speed
      // Randomly trigger a somersault mid-run (only once per run burst)
      if (this.somersaultPending && Math.random() < 0.003) {
        this.startSomersault()
      }
    }
  }

  private updateIdle(dt: number): void {
    this.behaviorTimer += dt
    if (this.behaviorTimer >= this.behaviorDuration) {
      this.pickNextBehavior()
    }
  }

  private updateSomersault(dt: number): void {
    // x keeps moving so the somersault carries forward momentum
    const speed = BOSS_RUN_SPEED * dt
    this.x += this.direction === 'right' ? speed : -speed
    this.x = Math.max(0, Math.min(GAME_W - BOSS_DISPLAY_W, this.x))

    this.somersaultTimer += dt
    const totalDuration = BOSS_SOMERSAULT_FRAMES * BOSS_FRAME_DURATION
    if (this.somersaultTimer >= totalDuration) {
      if (this.state !== 'dead') this.pickNextBehavior()
    }
  }

  private pickNextBehavior(): void {
    const margin = BOSS_DISPLAY_W * 0.5
    // Pick a random x position across the canvas, weighted away from the current position
    const targetX = rand(margin, GAME_W - margin)
    if (Math.abs(targetX - this.x) < 60) {
      // Too close — just idle briefly
      this.startIdle()
    } else {
      this.startRun(targetX)
    }
  }

  private advanceFrame(dt: number): void {
    if (this.state === 'idle') return  // idle is a single static frame
    this.frameTimer += dt
    while (this.frameTimer >= BOSS_FRAME_DURATION) {
      this.frameTimer -= BOSS_FRAME_DURATION
      this.frameIndex++
      this.clampFrame()
    }
  }

  private clampFrame(): void {
    switch (this.state) {
      case 'running':
        if (this.frameIndex >= BOSS_RUN_START + BOSS_RUN_FRAMES) {
          this.frameIndex = BOSS_RUN_START
        }
        break
      case 'somersault':
        if (this.frameIndex >= BOSS_SOMERSAULT_START + BOSS_SOMERSAULT_FRAMES) {
          this.frameIndex = BOSS_SOMERSAULT_START  // hold last somersault frame until state exits
        }
        break
    }
  }
}
