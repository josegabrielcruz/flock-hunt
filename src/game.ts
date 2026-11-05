import {
  SHOTS_PER_ROUND, ROUND_CAMERAS, MAX_ROUNDS,
  HIT_SCORE, PERFECT_ROUND_BONUS, ROUND_START_DELAY, GAME_W, GAME_H,
  MUSIC, SFX, ROUND_HIT_REQUIREMENTS,
  BOSS_SURVEILLANCE_MAX, BOSS_SURVEILLANCE_DRAIN, BOSS_RELOAD_DURATION,
  BOSS_VICTORY_PAUSE, BOSS_VICTORY_PAN_DURATION,
  AMMO_BG_W, AMMO_BG_H,
  SKEET_ROUNDS, SKEET_SHOTS, SKEET_HIT_SCORE,
  MODE_BTN_Y, MODE_BTN_H, MODE_BTN_W, MODE_CAMERA_BTN_X, MODE_SKEET_BTN_X,
  CAMERA_SPEED_MIN, CAMERA_SPEED_MAX, SPEED_MULTIPLIER,
  CAMERA_SCORE_MIN, CAMERA_SCORE_MAX, CAMERA_ROUND_BONUS,
} from './constants'
import type { GameState, RoundResult, GameMode } from './types'
import type { SpriteMap } from './assets'
import type { Vec2 } from './types'
import { FlockCamera } from './entities/FlockCamera'
import { Character } from './entities/Character'
import { BossRobot } from './entities/BossRobot'
import { SkeetTarget } from './entities/SkeetTarget'
import { Renderer } from './renderer'
import { Hud } from './hud'
import { AudioManager } from './audio'

export class Game {
  private renderer: Renderer
  private hud: Hud
  private sprites: SpriteMap

  state: GameState = 'title'
  score = 0
  round = 1
  shotsLeft = SHOTS_PER_ROUND
  introAudioPlayed = false

  cameras: FlockCamera[] = []
  character: Character = new Character()
  audioManager = AudioManager.getInstance()

  roundResults: RoundResult[] = Array.from({ length: ROUND_CAMERAS }, () => 'pending' as RoundResult)
  private cameraIndex = 0
  private roundTimer = 0
  private roundPassed = false
  private roundResultText = ''
  private cursorPos: Vec2 | null = null
  private canvas!: HTMLCanvasElement
  private gameStarting = false
  private boss: BossRobot | null = null
  private gameMode: GameMode = 'cameras'
  private waitingForDog = false
  private postDogTimer = 0   // pause between dog hiding and camera spawn
  private dogWalkTriggered = false
  private walkInStarted = false   // true if walk-in already fired during 'starting' state
  private skeetTarget: SkeetTarget | null = null
  private skeetRound = 1
  private skeetHits = 0
  private skeetShotsLeft = SKEET_SHOTS
  private playerAnonymity = BOSS_SURVEILLANCE_MAX
  private bossNeedsReload = false
  private bossReloading = false
  private bossReloadTimer = 0
  private victoryTimer = 0
  private victoryPanProgress = 0
  private reticleFlashTimer = 0
  private reticleFlashColor: 'hit' | 'miss' | null = null

  constructor(ctx: CanvasRenderingContext2D, sprites: SpriteMap) {
    this.canvas = ctx.canvas
    this.renderer = new Renderer(ctx, sprites)
    this.hud = new Hud(ctx)
    this.sprites = sprites
    this.audioManager.loadSounds(SFX)
    this.audioManager.loadMusic(MUSIC)
    this.audioManager.setGlobalVolume(0.2)
    this.character.onJump = () => this.audioManager.playSfx('bark')
  }

  updateCursor(pos: Vec2 | null): void {
    this.cursorPos = pos
  }

  /** Called by InputHandler on every click/tap. */
  handleShot(pos: Vec2): void {
    if ((this.state === 'title' || this.state === 'gameOver') && !this.gameStarting) {
      const inCamera = pos.x >= MODE_CAMERA_BTN_X && pos.x <= MODE_CAMERA_BTN_X + MODE_BTN_W &&
                       pos.y >= MODE_BTN_Y && pos.y <= MODE_BTN_Y + MODE_BTN_H
      const inSkeet  = pos.x >= MODE_SKEET_BTN_X  && pos.x <= MODE_SKEET_BTN_X  + MODE_BTN_W &&
                       pos.y >= MODE_BTN_Y && pos.y <= MODE_BTN_Y + MODE_BTN_H
      if (!inCamera && !inSkeet) return
      if (inSkeet) return  // clay shooting not yet available
      this.gameMode = inCamera ? 'cameras' : 'skeet'
      this.gameStarting = true
      this.canvas.style.cursor = 'none'
      this.audioManager.stopMusic()
      this.state = 'starting'
      this.audioManager.playSfx('gameStart', () => {
        this.gameStarting = false
        if (this.gameMode === 'cameras') this.startGame()
        else this.startSkeetGame()
      })
      return
    }
    if (this.state === 'skeetPlaying') {
      if (this.skeetShotsLeft <= 0) return
      this.audioManager.playSfx('gunShot')
      this.skeetShotsLeft--
      if (this.skeetTarget?.isHit(pos.x, pos.y)) {
        this.skeetTarget.registerHit()
        this.skeetHits++
        this.score += SKEET_HIT_SCORE
        this.setReticleFlash('hit')
      } else {
        this.setReticleFlash('miss')
      }
      return
    }
    if (this.state === 'roundResult' && !this.roundPassed) {
      this.goToTitle()
      return
    }
    if (this.state === 'bossIntro') {
      this.launchBossLevel()
      return
    }
    if (this.state === 'bossLevel') {
      // Click on ammo area triggers reload when out of shots
      if (this.bossNeedsReload && !this.bossReloading) {
        if (this.isClickInAmmoArea(pos)) {
          this.bossReloading = true
          this.bossReloadTimer = 0
        }
        return
      }
      if (this.bossReloading || this.shotsLeft <= 0) return
      this.audioManager.playSfx('gunShot')
      this.shotsLeft--
      if (this.boss?.isHit(pos.x, pos.y)) {
        this.boss.registerHit()
        this.score += HIT_SCORE
        this.setReticleFlash('hit')
      } else {
        this.setReticleFlash('miss')
      }
      return
    }
    if (this.state !== 'playing') return
    if (this.shotsLeft <= 0) return

    this.shotsLeft--

    const hitCam = this.cameras.find(cam => cam.isHit(pos.x, pos.y))
    if (hitCam) {
      const camScore = this.computeCameraScore(Math.abs(hitCam.vx), this.round)
      hitCam.registerHit()
      this.score += camScore
      // this.audioManager.playSfx('gunShot', () => {
      //   this.audioManager.playSfx('cameraFall')
      //   hitCam.startFalling()
      // })
      this.audioManager.playSfx('gunShot')
      this.audioManager.playSfx('cameraFall')
      hitCam.startFalling()
      this.setReticleFlash('hit')
      return
    }

    // Missed — no camera hit; bullets are still consumed
    this.audioManager.playSfx('gunShot')
    this.setReticleFlash('miss')
  }

  update(dt: number): void {
    if (this.reticleFlashTimer > 0) {
      this.reticleFlashTimer = Math.max(0, this.reticleFlashTimer - dt)
      if (this.reticleFlashTimer === 0) this.reticleFlashColor = null
    }
    switch (this.state) {
      case 'title': break
      case 'starting':
        // Camera mode: start the walk-in while the jingle plays so there's no dead-air gap
        if (this.gameMode === 'cameras') {
          this.character.update(dt)
          if (!this.dogWalkTriggered) {
            this.dogWalkTriggered = true
            this.walkInStarted = true  // remember walk fired during 'starting' so beginRound() doesn't re-trigger
            this.character.enterWalkIn()
          }
        }
        break
      case 'roundStart':  this.updateRoundStart(dt);  break
      case 'playing':     this.updatePlaying(dt);     break
      case 'roundEnd':    this.updateRoundEnd(dt);    break
      case 'roundResult': this.updateRoundResult(dt); break
      case 'bossLevel':   this.updateBossLevel(dt);   break
      case 'bossIntro':   this.updateBossIntro(dt);   break
      case 'bossVictory': this.updateBossVictory(dt); break
      case 'skeetPlaying': this.updateSkeetPlaying(dt); break
      case 'gameOver':    break
      default: break
    }
  }

  draw(): void {
    this.renderer.clear()

    if (this.state === 'title') {
      if (!this.introAudioPlayed) {
        this.introAudioPlayed = true
        this.audioManager.playMusic('titleMusic')
      }
      this.renderer.drawTitleScreen()
      return
    }
    if (this.state === 'gameOver') {
      this.renderer.drawGameOverScreen(this.score)
      return
    }
    if (this.state === 'bossIntro') {
      this.renderer.drawSky()
      this.renderer.drawTrees()
      this.renderer.drawForeground()
      this.renderer.drawForegroundHud()
      // this.renderer.drawBossIntroScreen()
      return
    }
    if (this.state === 'bossVictory' && this.boss) {
      this.renderer.drawBossVictoryScene(this.victoryPanProgress, this.boss)
      return
    }
    if (this.state === 'skeetPlaying' || (this.state === 'starting' && this.gameMode === 'skeet')) {
      this.renderer.drawSkeetBackground()
      if (this.skeetTarget) this.renderer.drawSkeetTarget(this.skeetTarget)
      this.renderer.drawForegroundHud()
      this.hud.draw(this.sprites, this.score, this.skeetRound, this.skeetShotsLeft, [], false, false, 100, false, false, 0, 0, true)
      if (this.cursorPos) this.renderer.drawReticle(this.cursorPos.x, this.cursorPos.y, this.reticleFlashColor, this.reticleFlashTimer)
      return
    }
    this.renderer.drawSky()
    this.renderer.drawCameras(this.cameras)
    this.renderer.drawTrees()
    this.renderer.drawCharacter(this.character, 'below')  // behind grass: sinking/rising/success/laugh
    this.renderer.drawForeground()
    if (this.state === 'bossLevel' && this.boss) this.renderer.drawBossRobot(this.boss)
    this.renderer.drawForegroundHud()
    this.renderer.drawCharacter(this.character, 'above')  // above grass: walk/alert/jump
    this.hud.draw(
      this.sprites, this.score, this.round, this.shotsLeft,
      this.roundResults,
      this.state === 'roundResult',  // roundEnd no longer entered in this flow
      this.state === 'bossLevel',
      this.playerAnonymity,
      this.bossNeedsReload && !this.bossReloading,
      this.bossReloading,
      this.bossReloading ? this.bossReloadTimer / BOSS_RELOAD_DURATION : 0,
      this.boss?.currentHp ?? 0,
    )
    if (this.state === 'roundResult') {
      this.renderer.drawResultBanner(this.roundResultText)
    }
    if (this.cursorPos) this.renderer.drawReticle(this.cursorPos.x, this.cursorPos.y, this.reticleFlashColor, this.reticleFlashTimer)
  }

  private goToTitle(): void {
    this.canvas.style.cursor = ''
    this.gameStarting = false
    this.boss = null
    this.skeetTarget = null
    this.state = 'title'
    this.introAudioPlayed = false
    this.audioManager.stopMusic()
  }

  private getResultText(hits: number, required: number): string {
    if (hits === ROUND_CAMERAS) return 'Perfect!'
    if (hits >= required) return Math.random() < 0.5 ? 'Great Job!' : 'Nice Work!'
    return 'Game Over'
  }


  // ── Private state transitions ─────────────────────────────────────

  private startGame(): void {
    this.canvas.style.cursor = 'none'
    this.boss = null
    this.score = 0
    this.round = 1
    // DEV: swap to the desired entry point:
    //   this.beginRound()              ← normal game
    //   this.startBossLevel()          ← skip to boss intro
    // this.debugSkipToBossVictory()  //← skip straight to victory cinematic
    this.beginRound()
  }

  private beginRound(): void {
    this.state = 'roundStart'
    this.shotsLeft = SHOTS_PER_ROUND
    this.cameras = []
    this.cameraIndex = 0
    this.roundResults = Array.from({ length: ROUND_CAMERAS }, () => 'pending' as RoundResult)
    this.roundTimer = ROUND_START_DELAY / 1000
    // Preserve dogWalkTriggered if walk-in already fired during 'starting'; clear the flag
    this.dogWalkTriggered = this.walkInStarted
    this.walkInStarted = false
    this.waitingForDog = false
  }

  private spawnNextCamera(): void {
    const spawnX = this.getRandomInt(50, GAME_W - 50)
    this.cameras = [new FlockCamera(spawnX, this.round)]
    this.state = 'playing'
  }

  private updateRoundStart(dt: number): void {
    this.character.update(dt)
    // Trigger walk-in sequence once, then wait for it to finish
    if (!this.dogWalkTriggered) {
      this.dogWalkTriggered = true
      this.character.enterWalkIn()
    }
    if (this.character.state !== 'hidden') return
    this.roundTimer -= dt
    if (this.roundTimer <= 0) this.spawnNextCamera()
  }

  private updatePlaying(dt: number): void {
    for (const cam of this.cameras) cam.update(dt)
    this.character.update(dt)

    if (this.shotsLeft <= 0) {
      for (const cam of this.cameras) cam.beginEscape()
    }

    // Gate: wait for dog to finish, then hold briefly before spawning the next camera
    if (this.waitingForDog) {
      if (this.character.state !== 'hidden') return
      this.postDogTimer += dt
      if (this.postDogTimer < 0.4) return  // 0.4s buffer after retreat completes
      this.postDogTimer = 0
      this.waitingForDog = false
      this.cameraIndex++
      if (this.cameraIndex < ROUND_CAMERAS) {
        this.shotsLeft = SHOTS_PER_ROUND
        this.spawnNextCamera()
      } else {
        // All cameras done — compute result and transition directly
        const hits = this.roundResults.filter(r => r === 'hit').length
        const required = ROUND_HIT_REQUIREMENTS[this.round - 1] ?? ROUND_HIT_REQUIREMENTS[0]
        this.roundPassed = hits >= required
        this.roundResultText = this.getResultText(hits, required)
        this.state = 'roundResult'
        this.roundTimer = 0
        if (hits === ROUND_CAMERAS) {
          this.audioManager.playSfx('perfect')
          this.score += PERFECT_ROUND_BONUS * this.round
        }
      }
      return
    }

    const currentCam = this.cameras[0]
    if (!currentCam || !currentCam.isResolved) return

    // Camera resolved — trigger dog and start waiting
    const result = currentCam.state === 'escaped' ? 'miss' : 'hit'
    this.roundResults[this.cameraIndex] = result
    this.waitingForDog = true
    this.postDogTimer = 0
    if (result === 'hit') {
      this.character.enterSuccess(currentCam.x)
      this.audioManager.playSfx('roundEnd')
    } else {
      this.audioManager.playSfx('miss')
      this.character.enterLaugh()
    }
  }

  private updateRoundEnd(dt: number): void {
    this.character.update(dt)
    this.roundTimer -= dt

    if (this.roundTimer <= 0 && this.character.state === 'hidden') {
      const camsDown = this.roundResults.filter(r => r === 'hit').length
      if (camsDown > 0) {
        this.character.enterSuccess(this.cameras[0]?.x ?? GAME_W / 2)
        this.audioManager.playSfx('roundEnd')
      }
      else this.character.enterLaugh()
      this.roundTimer = 9999
    }
    if (this.character.state === 'hidden' && this.roundTimer >= 9995) {
      const hits = this.roundResults.filter(r => r === 'hit').length
      const required = ROUND_HIT_REQUIREMENTS[this.round - 1] ?? ROUND_HIT_REQUIREMENTS[0]
      this.roundPassed = hits >= required
      this.roundResultText = this.getResultText(hits, required)
      this.state = 'roundResult'
      this.roundTimer = 0
    }
  }

  private updateRoundResult(dt: number): void {
    this.roundTimer += dt
    if (this.roundPassed) {
      if (this.roundTimer > 2) {
        if (this.round >= MAX_ROUNDS) {
          this.startBossLevel()
        } else {
          this.round++
          this.beginRound()
        }
      }
    } else {
      if (this.roundTimer > 5) this.goToTitle()
    }
  }

  private getRandomInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min
  }

  private startSkeetGame(): void {
    this.score = 0
    this.skeetRound = 1
    this.skeetHits = 0
    this.skeetShotsLeft = SKEET_SHOTS
    this.skeetTarget = new SkeetTarget()
    this.state = 'skeetPlaying'
  }

  private updateSkeetPlaying(dt: number): void {
    this.skeetTarget?.update(dt)
    if (this.skeetTarget?.isResolved) {
      this.skeetRound++
      if (this.skeetRound > SKEET_ROUNDS) {
        this.canvas.style.cursor = ''
        this.state = 'gameOver'
      } else {
        this.skeetTarget = new SkeetTarget()
        this.skeetShotsLeft = SKEET_SHOTS
      }
    }
  }

  private startBossLevel(): void {
    this.state = 'bossIntro'
    this.roundTimer = 0
  }

  private launchBossLevel(): void {
    this.state = 'bossLevel'
    this.boss = new BossRobot()
    this.boss.onDead = () => this.audioManager.playSfx('explode')
    this.shotsLeft = SHOTS_PER_ROUND
    this.playerAnonymity = BOSS_SURVEILLANCE_MAX
    this.bossNeedsReload = false
    this.bossReloading = false
    this.bossReloadTimer = 0
    this.roundTimer = 0
  }

  private updateBossIntro(dt: number): void {
    this.roundTimer += dt
    if (this.roundTimer >= 2) this.launchBossLevel()
  }

  private updateBossVictory(dt: number): void {
    this.boss?.update(dt)  // keep death animation ticking
    this.victoryTimer += dt
    const panElapsed = this.victoryTimer - BOSS_VICTORY_PAUSE
    if (panElapsed > 0) {
      this.victoryPanProgress = Math.min(1, panElapsed / BOSS_VICTORY_PAN_DURATION)
      if (this.victoryPanProgress >= 1) {
        this.canvas.style.cursor = ''
        // this.state = 'gameOver'
        // this.audioManager.stopMusic()
      }
    }
  }

  private updateBossLevel(dt: number): void {
    if (!this.boss) return
    this.boss.update(dt)

    // Surveillance drain — boss idle = scanning the player
    if (this.boss.isIdle) {
      this.playerAnonymity = Math.max(0, this.playerAnonymity - BOSS_SURVEILLANCE_DRAIN * dt)
      if (this.playerAnonymity <= 0) {
        this.canvas.style.cursor = ''
        this.state = 'gameOver'
        this.audioManager.stopMusic()
        return
      }
    }

    // Reload management
    if (this.bossReloading) {
      this.bossReloadTimer += dt
      if (this.bossReloadTimer >= BOSS_RELOAD_DURATION) {
        this.shotsLeft = SHOTS_PER_ROUND
        this.bossReloading = false
        this.bossNeedsReload = false
        this.bossReloadTimer = 0
      }
    } else if (this.shotsLeft <= 0) {
      this.bossNeedsReload = true
    }

    if (this.boss.isDead) {
      this.audioManager.stopMusic()
      this.audioManager.playMusic('victoryTheme')
      this.state = 'bossVictory'
      this.victoryTimer = 0
      this.victoryPanProgress = 0
    }
  }

  // Linearly maps camera speed to a base score, then applies a per-round multiplier
  private computeCameraScore(speed: number, round: number): number {
    const maxSpeed = CAMERA_SPEED_MAX + SPEED_MULTIPLIER[MAX_ROUNDS - 1]
    const t = Math.max(0, Math.min(1, (speed - CAMERA_SPEED_MIN) / (maxSpeed - CAMERA_SPEED_MIN)))
    const speedScore = Math.round(CAMERA_SCORE_MIN + t * (CAMERA_SCORE_MAX - CAMERA_SCORE_MIN))
    return Math.round(speedScore * (1 + (round - 1) * CAMERA_ROUND_BONUS))
  }

  private setReticleFlash(color: 'hit' | 'miss'): void {
    this.reticleFlashColor = color
    this.reticleFlashTimer = 1.0
  }

  private isClickInAmmoArea(pos: Vec2): boolean {
    const ammoX = 40
    const ammoY = GAME_H - 65
    return pos.x >= ammoX && pos.x <= ammoX + AMMO_BG_W &&
           pos.y >= ammoY && pos.y <= ammoY + AMMO_BG_H
  }
}
