import {
  GAME_W, GAME_H,
  SHOTS_PER_ROUND,
  BULLET_FRAME_W, BULLET_FRAME_H, BULLET_ACTIVE_FRAME, BULLET_SPENT_FRAME,
  ROUND_CAMERAS, HUD_CAM_FRAME_W, HUD_CAM_H, HUD_CAM_GAP,
  ROUND_HIT_REQUIREMENTS,
  AMMO_BG_W, AMMO_BG_H, HIT_COUNT_BG_W,
  BOSS_SURVEILLANCE_MAX, BOSS_SURVEILLANCE_WARN, BOSS_TOTAL_HP,
  HIT_COUNT_BG_H, SCORE_BG_H, SCORE_BG_W,
} from './constants'
import { isLoaded } from './assets'
import type { SpriteMap } from './assets'
import type { RoundResult } from './types'

const HUD_PADDING = 12

/** Draws score, round number, shot indicators, and the 10-camera result track. */
export class Hud {
  private ctx: CanvasRenderingContext2D

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx
  }

  draw(
    sprites: SpriteMap,
    score: number,
    round: number,
    shotsLeft: number,
    results: RoundResult[],
    roundEnded: boolean,
    isBossLevel = false,
    playerAnonymity = BOSS_SURVEILLANCE_MAX,
    needsReload = false,
    isReloading = false,
    reloadProgress = 0,
    bossHp = 0,
    isSkeetMode = false,
  ): void {
    this.drawScore(score)
    this.drawRound(round)
    this.drawCenterContainer()
    this.drawShots(sprites, shotsLeft, needsReload, isReloading, reloadProgress)
    if (!isSkeetMode) {
      if (isBossLevel) {
        this.drawBossHpBar(bossHp)
        this.drawAnonymityMeter(playerAnonymity)
      } else {
        this.drawCameraTrack(sprites, results, roundEnded, round, isBossLevel)
      }
    }
  }

  private drawCenterContainer(): void {
    const { ctx } = this
    const bgY = GAME_H - 65
    ctx.beginPath()
    ctx.roundRect(165, bgY, HIT_COUNT_BG_W, HIT_COUNT_BG_H, 10)
    ctx.fillStyle = '#000000'
    ctx.fill()
    ctx.lineWidth = 4
    ctx.strokeStyle = '#8d9029'
    ctx.stroke()
  }

  private drawScore(score: number): void {
    const { ctx } = this
    const y = GAME_H - 65

    ctx.beginPath()
    ctx.roundRect(GAME_W - SCORE_BG_W - 40, y, SCORE_BG_W, SCORE_BG_H, 10)
    ctx.fillStyle = '#000000'
    ctx.fill()
    ctx.lineWidth = 4
    ctx.strokeStyle = '#8d9029'
    ctx.stroke()

    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 24px monospace'
    ctx.textAlign = 'left'
    ctx.fillText("SCORE", GAME_W - 122, GAME_H - 18)
    ctx.fillText(`${String(score).padStart(7, '0')}`, GAME_W - 150, GAME_H - 38)
  }

  private drawRound(round: number): void {
    const { ctx } = this
    const textWidth = 65
    const fontSize = 18
    ctx.fillStyle = '#000000'
    ctx.fillRect(53, GAME_H - 85, textWidth, fontSize)
    ctx.fillStyle = '#8d9029'
    ctx.font = 'bold 14px monospace'
    ctx.textAlign = 'center'
    ctx.fillText(`ROUND ${round}`, 85, GAME_H - 71)
  }

  private drawShots(sprites: SpriteMap, shotsLeft: number, needsReload: boolean, isReloading: boolean, reloadProgress: number): void {
    const { ctx } = this
    const gap = 8
    const displayW = BULLET_FRAME_W
    const displayH = BULLET_FRAME_H
    let x = 65
    let y = GAME_H - 55

    // Ammo count container
    ctx.beginPath()
    ctx.roundRect(40, y - 10, AMMO_BG_W, AMMO_BG_H, 10)
    ctx.fillStyle = '#000000'
    ctx.fill()

    for (let i = 0; i < SHOTS_PER_ROUND; i++) {
      const frame = i < shotsLeft ? BULLET_ACTIVE_FRAME : BULLET_SPENT_FRAME

      if (isLoaded(sprites.bulletSprite)) {
        ctx.drawImage(
          sprites.bulletSprite,
          frame * BULLET_FRAME_W, 0,
          BULLET_FRAME_W, BULLET_FRAME_H,
          x, y,
          displayW, displayH,
        )
      } else {
        ctx.fillStyle = frame === BULLET_ACTIVE_FRAME ? '#ff4444' : '#555'
        ctx.fillRect(x, HUD_PADDING, displayW, displayH)
      }

      x += displayW + gap
    }

    ctx.fillStyle = '#4597ed'
    ctx.font = 'bold 18px monospace'
    ctx.textAlign = 'center'
    ctx.fillText('SHOTS', 87, GAME_H - 15)

    if (needsReload || isReloading) {
      // Tinted overlay on the ammo container
      ctx.save()
      ctx.globalAlpha = 0.75
      ctx.fillStyle = isReloading ? '#4597ed' : '#fa5252'
      ctx.beginPath()
      ctx.roundRect(40, GAME_H - 65, AMMO_BG_W, AMMO_BG_H, 10)
      ctx.fill()
      ctx.restore()

      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 10px monospace'
      ctx.textAlign = 'center'
      if (isReloading) {
        ctx.fillText('RELOADING…', 87, GAME_H - 48)
        // Progress bar
        const bx = 47, bw = AMMO_BG_W - 14, bh = 5, by = GAME_H - 37
        ctx.fillStyle = 'rgba(0,0,0,0.4)'
        ctx.fillRect(bx, by, bw, bh)
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(bx, by, bw * reloadProgress, bh)
      } else {
        ctx.font = 'bold 18px monospace'
        ctx.fillStyle = '#000000'
        ctx.fillText('RELOAD', 88, GAME_H - 25)
        ctx.fillStyle = '#ffffff'
        ctx.fillText('RELOAD', 87, GAME_H - 28)
      }
    }

    ctx.lineWidth = 4
    ctx.strokeStyle = '#8d9029'
    ctx.stroke()
  }

  private drawCameraTrack(sprites: SpriteMap, results: RoundResult[], roundEnded: boolean, round: number, isBossLevel: boolean): void {
    const { ctx } = this

    // At round end, sort hits to the left and misses/pending to the right
    const display = roundEnded
      ? [...results].sort((a, _b) => (a === 'hit' ? -1 : 1))
      : results

    const totalW = ROUND_CAMERAS * HUD_CAM_FRAME_W + (ROUND_CAMERAS - 1) * HUD_CAM_GAP
    const trackX = (GAME_W - totalW + 75) / 2
    let x = trackX
    const y = GAME_H - HUD_CAM_H - 40

    ctx.fillStyle = '#8d9029'
    ctx.font = isBossLevel ? 'bold 12px monospace' : 'bold 20px monospace'
    ctx.textAlign = 'left'
    ctx.fillText(isBossLevel ? 'HP' : 'HIT', 175, y + 10)

    for (const result of display) {
      const srcX = result === 'hit' ? HUD_CAM_FRAME_W : 0
      if (isLoaded(sprites.hudCamera)) {
        ctx.drawImage(
          sprites.hudCamera,
          srcX, 0,
          HUD_CAM_FRAME_W, HUD_CAM_H,
          x, y,
          HUD_CAM_FRAME_W, HUD_CAM_H,
        )
      } else {
        ctx.fillStyle = result === 'hit' ? '#f90' : '#fff'
        ctx.fillRect(x, y, HUD_CAM_FRAME_W - 2, HUD_CAM_H - 2)
      }
      x += HUD_CAM_FRAME_W + HUD_CAM_GAP
    }

    // Blue minimum-hits bar (hidden during boss fight — HP bar has no threshold)
    if (!isBossLevel) {
      const required = ROUND_HIT_REQUIREMENTS[round - 1] ?? ROUND_HIT_REQUIREMENTS[0]
      const barW = required * HUD_CAM_FRAME_W + (required - 1) * HUD_CAM_GAP
      const barY = y + HUD_CAM_H + 8
      ctx.fillStyle = '#4597ed'
      ctx.fillRect(trackX, barY, barW, 10)
    }
  }

  private drawBossHpBar(hp: number): void {
    const { ctx } = this
    const barX = 280
    const barW = HIT_COUNT_BG_W - 130
    const barH = 10
    const anonymityBarY = GAME_H - HUD_CAM_H - 15
    const barY = anonymityBarY - 20  // 15px above the anonymity meter

    const fill = Math.max(0, Math.min(1, hp / BOSS_TOTAL_HP))
    const color = hp > 6 ? '#fa5252' : hp > 3 ? '#fab005' : '#f03e3e'

    ctx.fillStyle = '#8d9029'
    ctx.font = 'bold 16px monospace'
    ctx.textAlign = 'left'
    ctx.fillText('FlockBot', 175, barY + 8)

    ctx.fillStyle = 'rgba(0,0,0,0.55)'
    ctx.fillRect(barX, barY, barW, barH)

    ctx.fillStyle = 'rgba(255,255,255,0.3)'
    ctx.fillRect(barX, barY, barW, barH)

    ctx.fillStyle = color
    ctx.fillRect(barX, barY, barW * fill, barH)

    ctx.strokeStyle = 'rgba(255,255,255,1)'
    ctx.lineWidth = 2
    ctx.strokeRect(barX, barY, barW, barH)
  }

  private drawAnonymityMeter(anonymity: number): void {
    const { ctx } = this
    const barX = 280
    const barW = HIT_COUNT_BG_W - 130
    // sits above the camera track icons
    const trackY = GAME_H - HUD_CAM_H + 9
    const barY = trackY - 24
    const barH = 10
    const fill = Math.max(0, Math.min(1, anonymity / BOSS_SURVEILLANCE_MAX))
    const color = anonymity > BOSS_SURVEILLANCE_WARN ? '#69db7c'
      : anonymity > 15 ? '#fab005'
      : '#fa5252'

    ctx.fillStyle = '#8d9029'
    ctx.font = 'bold 16px monospace'
    ctx.textAlign = 'left'
    ctx.fillText('Privacy', 175, barY + 8)

    ctx.fillStyle = 'rgba(0,0,0,0.55)'
    ctx.fillRect(barX, barY, barW, barH)

    ctx.fillStyle = 'rgba(255,255,255,0.3)'
    ctx.fillRect(barX, barY, barW, barH)

    ctx.fillStyle = color
    ctx.fillRect(barX, barY, barW * fill, barH)

    ctx.strokeStyle = 'rgba(255,255,255,1)'
    ctx.lineWidth = 2
    ctx.strokeRect(barX, barY, barW, barH)
  }
}
