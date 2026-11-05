// ─── Game state machine ──────────────────────────────────────────

export type GameState =
  | 'title'
  | 'starting'
  | 'roundStart'
  | 'playing'
  | 'roundEnd'
  | 'roundResult'
  | 'bossLevel'
  | 'bossIntro'
  | 'bossVictory'
  | 'skeetPlaying'  // skeet game mode active
  | 'gameOver'

// ─── Camera target states ────────────────────────────────────────

export type CameraState =
  | 'flying'       // in the air on its flight path
  | 'hit'          // shot — brief flash before falling
  | 'falling'      // sinking downward
  | 'escaped'      // flew off screen without being shot

// ─── Dog / character states ──────────────────────────────────────

export type CharacterState =
  | 'hidden'
  | 'entering'     // sniffing/approaching from the grass
  | 'success'      // holding up downed camera
  | 'laugh'        // player missed — mocking player

// ─── Boss robot ──────────────────────────────────────────────────

export type BossRobotState = 'idle' | 'running' | 'somersault' | 'dead'

// ─── Game mode ───────────────────────────────────────────────────

export type GameMode = 'cameras' | 'skeet'

// ─── Skeet target ────────────────────────────────────────────────

export type MuseState = 'flying' | 'hit' | 'missed'

// ─── Direction ──────────────────────────────────────────────────

export type Direction = 'left' | 'right'

// ─── Round result tracking ───────────────────────────────────────

export type RoundResult = 'pending' | 'hit' | 'miss'

// ─── Shared vector ───────────────────────────────────────────────

export interface Vec2 {
  x: number
  y: number
}

export interface SoundRegistry { 
  [key: string]: HTMLAudioElement
}

export interface SoundManifest {
  [key: string]: string 
}