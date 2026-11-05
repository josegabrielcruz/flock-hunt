import type { SoundManifest } from "./types"

// ─── Canvas / Display ────────────────────────────────────────────
export const GAME_W = 768
export const GAME_H = 576
export const MIN_DESKTOP_WIDTH = 1024;

// ─── Camera sprite sheet ────────────────────────────────────────
// camera-with-pole.png: 432×500, 9 frames of 48×500 (pole baked into sprite)
// Frame 0 = flying (normal), Frames 1-8 = explosion animation
export const CAMERA_FRAME_W          = 48
export const CAMERA_FRAME_H          = 500   // full sprite height including pole
export const CAMERA_HEAD_H           = 48    // camera head only — used for hit detection
export const CAMERA_FLYING_FRAME     = 0
export const CAMERA_EXPLOSION_START  = 1
export const CAMERA_EXPLOSION_FRAMES = 8     // frames 1–8 inclusive
export const CAMERA_FRAME_DURATION   = 0.08  // seconds per explosion frame (~12fps)
export const CAMERA_SINK_SPEED       = 300    // px/sec — speed at which hit camera sinks below grass

export const CAMERA_SPEED_MIN = 140    // px/sec
export const CAMERA_SPEED_MAX = 280    // px/sec
// Score scales linearly between these two values based on actual camera speed
export const CAMERA_SCORE_MIN   = 800   // points for the slowest possible camera
export const CAMERA_SCORE_MAX   = 2000  // points for the fastest possible camera (round 5)
export const CAMERA_ROUND_BONUS = 0.25  // multiplier increment per round above round 1

// ─── Grass / Ground ──────────────────────────────────────────────
// Y coordinate of the grass line (cameras hide behind this when spawning)
export const GRASS_HEIGHT = 388  // height of the grass from the grass line
export const GRASS_WIDTH = 1376  // width of the grass from the left edge to the right edge
export const GRASS_Y = GAME_H - (GRASS_HEIGHT - 20)
// Actual rendered top-of-grass y (renderer scales image to GAME_W width, preserving aspect ratio)
export const GRASS_VISUAL_Y = GAME_H - Math.round(GAME_W * GRASS_HEIGHT / GRASS_WIDTH)
export const TREE_WIDTH = 363//279
export const TREE_HEIGHT = 380//359  // example height for tree background
export const BUSH_WIDTH = 99
export const BUSH_HEIGHT = 124  // example height for bush background
export const SHRUB_WIDTH = 109
export const SHRUB_HEIGHT = 186

// ─── Bullet sprite sheet ─────────────────────────────────────────
// bullet-sprite.png: 18×21, 2 frames of 9×21
// Frame 0 = active (unspent), Frame 1 = spent (greyed)
export const BULLET_FRAME_W     = 9
export const BULLET_FRAME_H     = 21
export const BULLET_ACTIVE_FRAME = 0
export const BULLET_SPENT_FRAME  = 1

// ─── Shooting ────────────────────────────────────────────────────
export const SHOTS_PER_ROUND = 3      // bullets per camera attempt
export const HIT_SCORE = 1000         // base points per camera downed
export const PERFECT_ROUND_BONUS = 1000  // multiplied by round number on a perfect round

// ─── Round structure ─────────────────────────────────────────────
export const ROUND_CAMERAS = 10       // total camera attempts per round (shown in HUD)
export const MAX_ROUNDS    = 1        // rounds before the boss level (not yet built)
// Minimum hits required to advance each round — index 0 = round 1
export const ROUND_HIT_REQUIREMENTS = [8, 8, 7, 7, 6]
export const CAMERA_ESCAPE_Y = -80    // cameras escape off the top at this y

// ─── HUD camera track ────────────────────────────────────────────
// hud-camera.png: 94×25, 2 frames — left half white, right half orange
export const HUD_CAM_FRAME_W = 23.7     // 94 / 2
export const HUD_CAM_H       = 13
export const HUD_CAM_GAP     = 4      // pixels between icons

// ─── HUD elements ────────────────────────────────────────────────
export const AMMO_BG_W = 93
export const AMMO_BG_H = 58
export const HIT_COUNT_BG_W = 407
export const HIT_COUNT_BG_H = 58
export const SCORE_BG_W = 124
export const SCORE_BG_H = 58

// ─── Timing (ms) ─────────────────────────────────────────────────
export const DOG_ENTER_DELAY = 800    // delay before dog appears after round resolves
export const DOG_EXIT_DELAY = 2200    // how long dog stays visible
export const ROUND_START_DELAY = 1000 // pause before cameras launch

// ─── Dog sprite sheet ────────────────────────────────────────────────────────
// robot-dog-sprite-sheet.png: 1800×420, 2 rows × 210px height
// Row 0 (y=0):   frames 0-4 walk (225px), frame 5 alert (225px), 6 jump1, 7 jump2
// Row 1 (y=210): frames 0-1 laugh (225px each), frames 2-3 success/holding (265px each)
export const DOG_FRAME_H         = 140
export const DOG_WALK_FRAME_W    = 150
export const DOG_WALK_FRAMES     = 5
export const DOG_FRAME_DURATION  = 0.12   // sec per walk/laugh frame
export const DOG_WALK_SPEED      = 100    // px/sec
export const DOG_RISE_SPEED      = 150    // px/sec vertical movement
export const DOG_SINK_SPEED      = 120    // px/sec vertical movement
export const DOG_JUMP_HEIGHT     = 160     // px above STAND_Y at arc peak
export const DOG_JUMP_FRAME_DUR  = 0.5   // sec per jump phase (jump1, jump2)
export const DOG_LAUGH_FRAME_W   = 150
export const DOG_LAUGH_FRAMES    = 2
export const DOG_SUCCESS_FRAME_W = 177
export const DOG_ROW1_Y          = 140    // y offset for row 1

// ─── Boss Robot sprite sheet ─────────────────────────────────────────────────
// robot-sprite-sheet.png: 1610×697
// Row 0 (y=  0): normal  — 10 frames × 161×282
// Row 1 (y=282): damaged — 10 frames × 161×282  (same frame layout as row 0)
// Row 2 (y=564): dead    —  1 frame  × 276×133
// Frame layout (rows 0 & 1):  0=idle, 1-4=run, 5-9=somersault
export const BOSS_FRAME_W           = 161
export const BOSS_FRAME_H           = 282
export const BOSS_ROW_NORMAL_Y      = 0
export const BOSS_ROW_DAMAGED_Y     = 282
export const BOSS_ROW_DEAD_Y        = 564
export const BOSS_DEAD_FRAME_W      = 276
export const BOSS_DEAD_FRAME_H      = 282  // updated — frame height now matches rows 0 & 1
export const BOSS_DEAD_FRAMES       = 10   // destruction sequence, plays once then holds
export const BOSS_IDLE_FRAME        = 0
export const BOSS_RUN_START         = 1
export const BOSS_RUN_FRAMES        = 4
export const BOSS_SOMERSAULT_START  = 5
export const BOSS_SOMERSAULT_FRAMES = 5
export const BOSS_HIT_FRAME         = 10   // 11th frame (0-indexed) — shared by rows 0 & 1
export const BOSS_HIT_FLASH_DURATION = 0.15 // seconds to show the hit frame before resuming
export const BOSS_TOTAL_HP          = 10
export const BOSS_DAMAGE_THRESHOLD  = 5     // switch to damaged row after this many hits
export const BOSS_FRAME_DURATION    = 0.1   // sec per animation frame
export const BOSS_RUN_SPEED         = 700   // px/sec
export const BOSS_DISPLAY_W         = 161
export const BOSS_DISPLAY_H         = 282
export const BOSS_SURVEILLANCE_MAX   = 100  // full anonymity (0 = detected → game over)
export const BOSS_SURVEILLANCE_DRAIN = 2   // units per second drained while boss is idle
export const BOSS_SURVEILLANCE_WARN  = 35   // meter turns red below this threshold
export const BOSS_RELOAD_DURATION    = 0.5  // seconds to complete a manual reload
export const BOSS_Y_OFFSET          = 272
export const BOSS_Y_OFFSET_DAMAGED  = 281
export const BOSS_Y_OFFSET_DEAD     = 10

// ─── Boss victory cinematic ──────────────────────────────────────────────────
export const BOSS_VICTORY_PAUSE        = 4    // seconds to hold before the pan starts
export const BOSS_VICTORY_PAN_DURATION = 15    // seconds for the full parallax pan
export const VICTORY_FG_PARALLAX       = 2.5  // foreground slides down 1.3× canvas height
export const VICTORY_BG_PARALLAX       = 0.85 // background slides up slower (depth cue)

// ─── Sprite paths ────────────────────────────────────────────────
const BASE = import.meta.env.BASE_URL + 'sprites/'
const AUDIO_BASE = import.meta.env.BASE_URL + 'audio/'

export const SPRITES = {
  cameraSprite: BASE + 'camera-with-pole.png',  // 432×500 — 9 frames (pole baked in)
  bulletSprite: BASE + 'bullet-sprite.png',  // 18×21 — 2 frames (active, spent)
  hudCamera:    BASE + 'hud-camera-sprite.png',
  gameTitle:    BASE + 'game-title.png',
  treeBg:       BASE + 'tree-16bit.png',
  bushBg:       BASE + 'bush-bg.png',
  shrubBg:      BASE + 'tall-shrub.png',
  grassBg:      BASE + 'grass-and-dirt.png',
  grass:        BASE + 'grass.png',
  ammoBg:       BASE + 'ammo-count-bg.png',
  hitCountBg:   BASE + 'hit-count-bg.png',
  scoreBg:      BASE + 'score-bg.png',
  bossSprite:   BASE + 'all-robot-sprite-sheet.png', // 2760×846 — boss robot (3 rows)
  museSprite:   BASE + 'muse-explode.png',           // 2060×150 — skeet target (10 frames)
  skeetBg:      BASE + 'clay-shooting-bg.jpg',         // 1376×115 — skeet background strip
  dogSprite:    BASE + 'robot-dog-sprite-sheet.png', // 1800×420 — dog character (2 rows)
  dataCenters:  BASE + 'data-centers.jpg',
} as const

export const MUSIC: SoundManifest = {
  titleMusic: AUDIO_BASE + '01-Title-BGM.mp3',
}

export const SFX: SoundManifest = {
  gameStart:    AUDIO_BASE + '02-Game-A-B-Start.mp3',
  roundEnd:     AUDIO_BASE + '06-Clear.mp3',
  gunShot:      AUDIO_BASE + '11-Gunshot.mp3',
  miss:         AUDIO_BASE + '12-Miss.mp3',
  cameraFall:   AUDIO_BASE + '13-Dead-Duck-Falls.mp3',
  cameraLands:  AUDIO_BASE + '14-Dead-Duck-Lands.mp3',
  perfect:      AUDIO_BASE + '07-Perfect.mp3',
  bark:         AUDIO_BASE + '03-Bark.mp3',
  explode:      AUDIO_BASE + '17-Explode.mp3',
  victoryTheme: AUDIO_BASE + '19-Victory.mp3'
}

export const SPEED_MULTIPLIER = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270]

// ─── Skeet / Muse target ─────────────────────────────────────────────────────
// muse-explode.png: 2060×150, 10 frames of 206×150
// Frame 0 = normal (flying), Frames 1-9 = explosion sequence (plays once)
export const MUSE_FRAME_W        = 206
export const MUSE_FRAME_H        = 150
export const MUSE_IDLE_FRAME     = 0
export const MUSE_EXPLODE_START  = 1
export const MUSE_EXPLODE_FRAMES = 9
export const MUSE_FRAME_DURATION = 0.08  // sec per explosion frame
export const MUSE_SPEED          = 420   // px/sec horizontal
export const MUSE_LAUNCH_VY      = -400  // px/sec initial upward velocity
export const MUSE_GRAVITY        = 300   // px/sec² downward acceleration

// ─── Skeet game ──────────────────────────────────────────────────────────────
export const SKEET_ROUNDS    = 10
export const SKEET_SHOTS     = 3     // no reload — 3 shots per target
export const SKEET_HIT_SCORE = 500

// ─── Title screen mode-select buttons ────────────────────────────────────────
// Two buttons centered in the 768px canvas
export const MODE_BTN_Y        = 370
export const MODE_BTN_H        = 45
export const MODE_BTN_W        = 230
export const MODE_CAMERA_BTN_X = 129   // (GAME_W - 2*BTN_W - 50gap) / 2
export const MODE_SKEET_BTN_X  = 409   // MODE_CAMERA_BTN_X + BTN_W + 50gap