import { Howl, Howler } from 'howler';

/**
 * Audio manager for battle SFX and BGM.
 * Uses Howler.js for cross-browser Web Audio support.
 *
 * SFX: CC0 from OpenGameArt.org "RPG Sound Pack"
 * BGM: CC-BY 4.0 from OpenGameArt.org "Generic 8-bit JRPG Soundtrack"
 */

export type SfxName =
  | 'attack1' | 'attack2' | 'attack3'
  | 'magic' | 'spell' | 'sword'
  | 'cursor' | 'select' | 'cancel' | 'confirm'
  | 'hit' | 'death' | 'step';

export type BgmName = 'battle' | 'victory' | 'gameover' | 'fanfare' | 'overworld';

interface SfxEntry {
  howl: Howl;
  volume: number;
}

class AudioManager {
  private sfx = new Map<SfxName, SfxEntry>();
  private bgm = new Map<BgmName, Howl>();
  private currentBgm: Howl | null = null;
  private currentBgmName: BgmName | null = null;

  private sfxVolume = 0.5;
  private bgmVolume = 0.35;
  private muted = false;
  private initialized = false;

  /**
   * Load all audio assets. Call once at startup.
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    // Load SFX
    const sfxFiles: Array<[SfxName, string, number]> = [
      ['attack1', '/audio/sfx/attack1.wav', 0.6],
      ['attack2', '/audio/sfx/attack2.wav', 0.6],
      ['attack3', '/audio/sfx/attack3.wav', 0.6],
      ['magic', '/audio/sfx/magic.wav', 0.5],
      ['spell', '/audio/sfx/spell.wav', 0.4],
      ['sword', '/audio/sfx/sword.wav', 0.5],
      ['cursor', '/audio/sfx/cursor.wav', 0.3],
      ['select', '/audio/sfx/select.wav', 0.4],
      ['cancel', '/audio/sfx/cancel.wav', 0.4],
      ['confirm', '/audio/sfx/confirm.wav', 0.4],
      ['hit', '/audio/sfx/hit.wav', 0.6],
      ['death', '/audio/sfx/death.wav', 0.5],
      ['step', '/audio/sfx/step.wav', 0.2],
    ];

    for (const [name, src, vol] of sfxFiles) {
      this.sfx.set(name, {
        howl: new Howl({ src: [src], preload: true }),
        volume: vol,
      });
    }

    // Load BGM
    const bgmFiles: Array<[BgmName, string, boolean]> = [
      ['battle', '/audio/bgm/battle.ogg', true],
      ['victory', '/audio/bgm/victory.ogg', false],
      ['gameover', '/audio/bgm/gameover.ogg', false],
      ['fanfare', '/audio/bgm/fanfare.ogg', false],
      ['overworld', '/audio/bgm/overworld.ogg', true],
    ];

    for (const [name, src, loop] of bgmFiles) {
      this.bgm.set(name, new Howl({
        src: [src],
        loop,
        volume: this.bgmVolume,
        preload: true,
      }));
    }

    this.initialized = true;
    console.log('Audio initialized');
  }

  /**
   * Play a sound effect.
   */
  playSfx(name: SfxName): void {
    if (this.muted) return;
    const entry = this.sfx.get(name);
    if (entry) {
      entry.howl.volume(entry.volume * this.sfxVolume);
      entry.howl.play();
    }
  }

  /**
   * Play a random attack sound.
   */
  playAttack(): void {
    const attacks: SfxName[] = ['attack1', 'attack2', 'attack3'];
    this.playSfx(attacks[Math.floor(Math.random() * attacks.length)]);
  }

  /**
   * Start playing background music. Stops current BGM if different.
   */
  playBgm(name: BgmName): void {
    if (this.currentBgmName === name && this.currentBgm?.playing()) return;

    this.stopBgm();

    const track = this.bgm.get(name);
    if (track) {
      track.volume(this.bgmVolume);
      track.play();
      this.currentBgm = track;
      this.currentBgmName = name;
    }
  }

  /**
   * Stop current BGM with a fade out.
   */
  stopBgm(fadeMs: number = 500): void {
    if (this.currentBgm) {
      const bgm = this.currentBgm;
      bgm.fade(bgm.volume(), 0, fadeMs);
      setTimeout(() => bgm.stop(), fadeMs);
      this.currentBgm = null;
      this.currentBgmName = null;
    }
  }

  /**
   * Toggle mute.
   */
  toggleMute(): boolean {
    this.muted = !this.muted;
    Howler.mute(this.muted);
    return this.muted;
  }

  isMuted(): boolean {
    return this.muted;
  }

  setSfxVolume(vol: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, vol));
  }

  setBgmVolume(vol: number): void {
    this.bgmVolume = Math.max(0, Math.min(1, vol));
    if (this.currentBgm) {
      this.currentBgm.volume(this.bgmVolume);
    }
  }
}

// Singleton
export const audio = new AudioManager();
