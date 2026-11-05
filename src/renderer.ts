import { 
  GAME_W, 
  GAME_H, 
  TREE_WIDTH,
  TREE_HEIGHT,
  SHRUB_WIDTH,
  SHRUB_HEIGHT,
  MODE_BTN_Y, MODE_BTN_H, MODE_BTN_W,
  MODE_CAMERA_BTN_X, MODE_SKEET_BTN_X,
  VICTORY_FG_PARALLAX, VICTORY_BG_PARALLAX,
} from './constants'
import { isLoaded } from './assets'
import type { SpriteMap } from './assets'
import type { FlockCamera } from './entities/FlockCamera'
import type { Character } from './entities/Character'
import type { BossRobot } from './entities/BossRobot'
import type { SkeetTarget } from './entities/SkeetTarget'

/**
 * Orchestrates draw order.
 * Everything must be drawn back-to-front:
 *   1. Sky / far background
 *   2. Trees (behind cameras)
 *   3. Bushes (behind cameras)
 *   4. Cameras + poles
 *   5. Foreground grass (IN FRONT of cameras — critical for emergence effect)
 *   6. Character (dog equivalent)
 *   7. HUD overlay
 */
export class Renderer {
  private ctx: CanvasRenderingContext2D
  private sprites: SpriteMap

  constructor(ctx: CanvasRenderingContext2D, sprites: SpriteMap) {
    this.ctx = ctx
    this.sprites = sprites
  }

  clear(): void {
    this.ctx.clearRect(0, 0, GAME_W, GAME_H)
  }

  drawSkeetBackground(): void {
    const { ctx, sprites } = this
    // Fill with the same sky color that the skeet-shoot-bg.jpg bleeds into at its top edge
    ctx.fillStyle = '#1588ce'
    ctx.fillRect(0, 0, GAME_W, GAME_H)
    const img = sprites.skeetBg
    if (isLoaded(img)) {
      // Center the wider image horizontally, pin it to the bottom of the canvas
      const x = (GAME_W - img.naturalWidth) / 2
      ctx.drawImage(img, x, GAME_H - img.naturalHeight)
    }
  }

  drawSky(): void {
    const { ctx } = this
    ctx.fillStyle = '#1588ce'
    ctx.fillRect(0, 0, GAME_W, GAME_H)
  }

  drawForeground(): void {
    const { ctx, sprites } = this
    // if (isLoaded(sprites.treeBg)) ctx.drawImage(sprites.treeBg, 60, 80, TREE_WIDTH, TREE_HEIGHT)
    // if (isLoaded(sprites.shrubBg)) ctx.drawImage(sprites.shrubBg, GAME_W - 200, 300, SHRUB_WIDTH, SHRUB_HEIGHT)
    if (isLoaded(sprites.grassBg)) {
      const img = sprites.grassBg
      // Always fill canvas width; derive height from natural aspect ratio so any asset scales correctly
      const drawH = Math.round(GAME_W * img.naturalHeight / img.naturalWidth)
      ctx.drawImage(img, 0, GAME_H - drawH, GAME_W, drawH)
    }
  }

  drawTrees(): void {
    const { ctx, sprites } = this
    if (isLoaded(sprites.treeBg)) ctx.drawImage(sprites.treeBg, 60, 80, TREE_WIDTH, TREE_HEIGHT)
    if (isLoaded(sprites.shrubBg)) ctx.drawImage(sprites.shrubBg, GAME_W - 200, 300, SHRUB_WIDTH, SHRUB_HEIGHT)
  }

  drawForegroundHud(): void {
    // Ammo count container
    // ctx.beginPath()
    // ctx.roundRect(40, y, AMMO_BG_W, AMMO_BG_H, 10)
    // ctx.fillStyle = '#000000'
    // ctx.fill()
    // ctx.lineWidth = 4
    // ctx.strokeStyle = '#8d9029'
    // ctx.stroke()

    // Hit count container
    // ctx.beginPath()
    // ctx.roundRect(165, y, HIT_COUNT_BG_W, HIT_COUNT_BG_H, 10)
    // ctx.fillStyle = '#000000'
    // ctx.fill()
    // ctx.lineWidth = 4
    // ctx.strokeStyle = '#8d9029'
    // ctx.stroke()

    // Score container
    // ctx.beginPath()
    // ctx.roundRect(GAME_W - SCORE_BG_W - 40, y, SCORE_BG_W, SCORE_BG_H, 10)
    // ctx.fillStyle = '#000000'
    // ctx.fill()
    // ctx.lineWidth = 4
    // ctx.strokeStyle = '#8d9029'
    // ctx.stroke()
  }

  drawCameras(cameras: FlockCamera[]): void {
    for (const cam of cameras) cam.draw(this.ctx, this.sprites)
  }

  /** Foreground grass MUST be drawn after cameras so cameras appear behind it. */
  // drawForeground(): void {
  //   const { ctx, sprites } = this
  //   if (isLoaded(sprites.grass)) {
  //     ctx.drawImage(sprites.grass, 0, 0, GRASS_WIDTH, GRASS_HEIGHT)
  //   }
  // }

  drawCharacter(character: Character, layer: 'above' | 'below'): void {
    character.draw(this.ctx, this.sprites, layer)
  }

  drawBossRobot(boss: BossRobot): void {
    boss.draw(this.ctx, this.sprites)
  }

  drawSkeetTarget(target: SkeetTarget): void {
    target.draw(this.ctx, this.sprites)
  }

  drawReticle(x: number, y: number, flash: 'hit' | 'miss' | null = null, flashIntensity = 0): void {
    const { ctx } = this
    const outerR  = 14
    const dotR    = 2
    const tickGap = 4
    const tickLen = 7

    ctx.save()
    ctx.lineWidth = 1.5

    // Dark outline pass for contrast against any background
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)'
    ctx.fillStyle   = 'rgba(0, 0, 0, 0.55)'
    ctx.lineWidth   = 3
    this.drawReticleShape(ctx, x, y, outerR, dotR, tickGap, tickLen)

    // Lerp from hit/miss color back to white as flashIntensity fades 1→0
    let fgColor = 'rgba(255, 255, 255, 0.92)'
    if (flash !== null && flashIntensity > 0) {
      const [r, g, b] = flash === 'hit' ? [0, 255, 80] : [255, 60, 60]
      const t = flashIntensity
      const lr = Math.round(r * t + 255 * (1 - t))
      const lg = Math.round(g * t + 255 * (1 - t))
      const lb = Math.round(b * t + 255 * (1 - t))
      fgColor = `rgba(${lr}, ${lg}, ${lb}, 0.92)`
    }
    ctx.strokeStyle = fgColor
    ctx.fillStyle   = fgColor
    ctx.lineWidth   = 1.5
    this.drawReticleShape(ctx, x, y, outerR, dotR, tickGap, tickLen)

    ctx.restore()
  }

  private drawReticleShape(
    ctx: CanvasRenderingContext2D,
    x: number, y: number,
    outerR: number, dotR: number, tickGap: number, tickLen: number,
  ): void {
    ctx.beginPath()
    ctx.arc(x, y, outerR, 0, Math.PI * 2)
    ctx.stroke()

    ctx.beginPath()
    ctx.arc(x, y, dotR, 0, Math.PI * 2)
    ctx.fill()

    const s = outerR + tickGap
    const e = s + tickLen
    ;[[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([dx, dy]) => {
      ctx.beginPath()
      ctx.moveTo(x + dx * s, y + dy * s)
      ctx.lineTo(x + dx * e, y + dy * e)
      ctx.stroke()
    })
  }

  drawResultBanner(text: string): void {
    const { ctx } = this
    const w = 320
    const h = 96
    const x = (GAME_W - w) / 2
    const y = (GAME_H - h) / 2

    ctx.save()
    ctx.beginPath()
    ctx.roundRect(x, y, w, h, 16)
    ctx.fillStyle = '#000000'
    ctx.fill()
    ctx.lineWidth = 3
    ctx.strokeStyle = '#ffffff'
    ctx.stroke()

    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 32px monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, GAME_W / 2, GAME_H / 2)
    ctx.restore()
  }

  drawBossIntroScreen(): void {
    const { ctx } = this
    const w = 560
    const h = 180
    const x = (GAME_W - w) / 2
    const y = (GAME_H - h) / 2

    ctx.save()
    ctx.beginPath()
    ctx.roundRect(x, y, w, h, 16)
    ctx.fillStyle = '#000000'
    ctx.fill()
    ctx.lineWidth = 3
    ctx.strokeStyle = '#ffffff'
    ctx.stroke()

    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const cx = GAME_W / 2
    const cy = GAME_H / 2

    // ctx.fillStyle = '#ff4400'
    // ctx.font = 'bold 22px monospace'
    // ctx.fillText('BOSS LEVEL', cx, cy - 56)

    ctx.fillStyle = '#ffffff'
    ctx.font = '14px monospace'
    ctx.fillText('Defeat the FlockBot before you lose your privacy!', cx, cy - 18)
    ctx.fillStyle = '#ffcc44'
    ctx.fillText('Remember to click your ammo to reload.', cx, cy + 14)

    ctx.fillStyle = 'rgba(223,141,62,1)'
    ctx.font = '13px monospace'
    ctx.fillText('CLICK TO BEGIN', cx, cy + 58)
    ctx.restore()
  }

  // Parallax pan: foreground slides down (out), data centers rises up from below (in)
  drawBossVictoryScene(panProgress: number, boss: BossRobot): void {
    const { ctx, sprites } = this
    // Cubic ease-in-out for cinematic feel
    const t = panProgress
    const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

    ctx.fillStyle = '#1588ce'
    ctx.fillRect(0, 0, GAME_W, GAME_H)

    // Data centers — slides up from below at parallax background speed
    if (isLoaded(sprites.dataCenters)) {
      const img = sprites.dataCenters
      const drawH = Math.round(GAME_W * img.naturalHeight / img.naturalWidth)
      // Pin once the image bottom reaches the canvas bottom — never scroll past that point
      const rawBgY = GAME_H - eased * GAME_H * VICTORY_BG_PARALLAX
      const bgY = Math.max(GAME_H - drawH, rawBgY)
      ctx.drawImage(img, 0, bgY, GAME_W, drawH)
    }

    // Foreground group — all slide down together at fg parallax speed
    const fgOffset = eased * GAME_H * VICTORY_FG_PARALLAX
    ctx.save()
    ctx.translate(0, fgOffset)
    if (isLoaded(sprites.treeBg))  ctx.drawImage(sprites.treeBg,  60, 80, TREE_WIDTH, TREE_HEIGHT)
    if (isLoaded(sprites.shrubBg)) ctx.drawImage(sprites.shrubBg, GAME_W - 200, 300, SHRUB_WIDTH, SHRUB_HEIGHT)
    if (isLoaded(sprites.grassBg)) {
      const img = sprites.grassBg
      const drawH = Math.round(GAME_W * img.naturalHeight / img.naturalWidth)
      ctx.drawImage(img, 0, GAME_H - drawH, GAME_W, drawH)
    }
    boss.draw(ctx, sprites)
    ctx.restore()
  }

  drawGameOverScreen(score: number): void {
    const { ctx } = this
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, GAME_W, GAME_H)

    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 36px monospace'
    ctx.textAlign = 'center'
    ctx.fillText('MISSION COMPLETE', GAME_W / 2, GAME_H * 0.28)

    ctx.fillStyle = '#8d9029'
    ctx.font = 'bold 16px monospace'
    ctx.fillText(`FINAL SCORE  ${String(score).padStart(7, '0')}`, GAME_W / 2, GAME_H * 0.44)

    ctx.fillStyle = '#ff4400'
    ctx.font = 'bold 20px monospace'
    ctx.fillText('BOSS LEVEL', GAME_W / 2, GAME_H * 0.60)
    ctx.fillStyle = '#888888'
    // ctx.font = 'bold 14px monospace'
    // ctx.fillText('COMING SOON', GAME_W / 2, GAME_H * 0.68)

    ctx.fillStyle = 'rgba(223,141,62,1)'
    ctx.font = '14px monospace'
    ctx.fillText('CLICK TO PLAY AGAIN', GAME_W / 2, GAME_H * 0.84)
  }

  drawTitleScreen(): void {
    const { ctx, sprites } = this
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, GAME_W, GAME_H)
    if (isLoaded(sprites.gameTitle)) {
      // Center title image in the upper portion of the screen
      const tw = sprites.gameTitle.width
      ctx.drawImage(sprites.gameTitle, (GAME_W - tw) / 2, GAME_H * 0.05)
    } else {
      ctx.fillStyle = '#fff'
      ctx.font = '48px monospace'
      ctx.textAlign = 'center'
      ctx.fillText('FLOCK HUNT', GAME_W / 2, GAME_H / 3)
    }
    ctx.fillStyle = 'rgba(223,141,62,1)'
    ctx.font = '14px monospace'
    ctx.textAlign = 'center'
    ctx.fillText('SELECT A GAME MODE', GAME_W / 2, MODE_BTN_Y - 18)
    this.drawModeButton(MODE_CAMERA_BTN_X, 'CAMERA HUNT', false)
    this.drawModeButton(MODE_SKEET_BTN_X, 'CLAY SHOOTING', true)
  }

  private drawModeButton(x: number, label: string, disabled = false): void {
    const { ctx } = this
    const color = disabled ? 'rgba(120, 120, 120, 0.5)' : 'rgba(223,141,62,1)'
    ctx.fillStyle = '#000000'
    ctx.beginPath()
    ctx.roundRect(x, MODE_BTN_Y, MODE_BTN_W, MODE_BTN_H, 8)
    ctx.fill()
    ctx.strokeStyle = color
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.roundRect(x, MODE_BTN_Y, MODE_BTN_W, MODE_BTN_H, 8)
    ctx.stroke()
    ctx.fillStyle = color
    ctx.font = 'bold 16px monospace'
    ctx.textAlign = 'center'
    ctx.fillText(label, x + MODE_BTN_W / 2, MODE_BTN_Y + MODE_BTN_H / 2 + 6)
    if (disabled) {
      ctx.fillStyle = 'rgba(120, 120, 120, 0.6)'
      ctx.font = '10px monospace'
      ctx.fillText('COMING SOON', x + MODE_BTN_W / 2, MODE_BTN_Y + MODE_BTN_H / 2 + 18)
    }
  }
}
