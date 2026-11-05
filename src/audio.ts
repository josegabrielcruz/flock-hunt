import { Howl, Howler } from 'howler';
import type {SoundManifest} from './types'

export class AudioManager {
  private static instance: AudioManager;
  private sounds: Map<string, Howl> = new Map();
  private isMuted: boolean = false;
  private activeMusicName: string = ''

  private constructor() {}

  public static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  /** Preload short SFX using Web Audio (low latency). */
  public loadSounds(soundManifest: SoundManifest): void {
    Object.entries(soundManifest).forEach(([name, path]) => {
      if (!this.sounds.has(name)) {
        this.sounds.set(name, new Howl({
          src: [path],
          preload: true,
          html5: false,         // Web Audio API — minimal latency for SFX
          format: ['mp3', 'ogg'],
        }));
      }
    });
  }

  /** Preload music tracks using HTML5 audio (streaming, avoids memory spike). */
  public loadMusic(soundManifest: SoundManifest): void {
    Object.entries(soundManifest).forEach(([name, path]) => {
      if (!this.sounds.has(name)) {
        this.sounds.set(name, new Howl({
          src: [path],
          preload: true,
          html5: true,          // stream large files instead of buffering entirely
          format: ['mp3', 'ogg'],
        }));
      }
    });
  }

  /** Fire-and-forget SFX — does not interrupt music or other concurrent sounds. */
  public playSfx(name: string, onEnd?: () => void): number | null {
    const sound = this.sounds.get(name);
    if (!sound) {
      console.warn(`AudioManager: Sound "${name}" not found.`);
      onEnd?.();  // fallback so callers aren't stuck waiting
      return null;
    }
    const id = sound.play();
    if (onEnd) {
      if (typeof id === 'number') {
        sound.once('end', onEnd, id);
      } else {
        onEnd();  // play() didn't return an id; fire immediately so callers don't get stuck
      }
    }
    return id;
  }

  /** Play a looping music track — stops the current track first. */
  public playMusic(name: string): number | null {
    if (this.activeMusicName) this.stopMusic();
    const sound = this.sounds.get(name);
    if (!sound) {
      console.warn(`AudioManager: Sound "${name}" not found.`);
      return null;
    }
    this.activeMusicName = name;
    sound.loop(false);
    return sound.play();
  }

  /** Stop the currently playing music track. */
  public stopMusic(): void {
    if (!this.activeMusicName) return;
    this.sounds.get(this.activeMusicName)?.stop();
    this.activeMusicName = '';
  }

  public stop(name: string, id?: number): void {
    this.sounds.get(name)?.stop(id);
    if (this.activeMusicName === name) this.activeMusicName = '';
  }

  public pause(name: string, id?: number): void {
    this.sounds.get(name)?.pause(id);
  }

  public setSoundVolume(name: string, volume: number): void {
    this.sounds.get(name)?.volume(volume);
  }

  public setGlobalVolume(volume: number): void {
    Howler.volume(volume);
  }

  /** Resume a suspended AudioContext — must be called from a user gesture handler. */
  public resumeContext(): void {
    Howler.ctx?.resume();
  }

  /** True only when the active music track is audibly playing. */
  public isMusicPlaying(): boolean {
    if (!this.activeMusicName) return false;
    return this.sounds.get(this.activeMusicName)?.playing() ?? false;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setMuted(muted: boolean): void {
    if (this.isMuted === muted) return;
    this.isMuted = muted;
    Howler.mute(this.isMuted);
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    Howler.mute(this.isMuted);
    return this.isMuted;
  }

  public unloadAll(): void {
    this.sounds.forEach(sound => sound.unload());
    this.sounds.clear();
    this.activeMusicName = '';
  }
}
