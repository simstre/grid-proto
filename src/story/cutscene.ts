// ─── Cutscene Sequencer ───

import { dialogueManager, getDialogueScript } from '@/story/dialogue';
import type { GameState } from '@/story/story-flags';

// ─── Types ───

export type CutsceneActionType =
  | 'dialogue'
  | 'camera_pan'
  | 'unit_enter'
  | 'unit_exit'
  | 'wait'
  | 'fade'
  | 'set_flag';

export interface CutsceneStep {
  action: CutsceneActionType;
  params: Record<string, unknown>;
}

export interface Cutscene {
  id: string;
  name: string;
  steps: CutsceneStep[];
}

// ─── Cutscene Registry ───

const cutsceneRegistry = new Map<string, Cutscene>();

export function registerCutscene(cutscene: Cutscene): void {
  cutsceneRegistry.set(cutscene.id, cutscene);
}

export function getCutscene(id: string): Cutscene | undefined {
  return cutsceneRegistry.get(id);
}

// ─── Cutscene Manager ───

export class CutsceneManager {
  private currentCutscene: Cutscene | null = null;
  private stepIndex = 0;
  private playing = false;
  private waitTimer = 0;
  private waitingForDialogue = false;
  private fadeAlpha = 0;
  private fadeTarget = 0;
  private fadeSpeed = 0;
  private fading = false;

  // External hook for applying game-state changes
  private gameState: GameState | null = null;

  // Callbacks
  onStart: (() => void) | null = null;
  onEnd: (() => void) | null = null;
  onCameraPan: ((x: number, y: number, duration: number) => void) | null = null;
  onUnitEnter: ((unitId: string, x: number, y: number) => void) | null = null;
  onUnitExit: ((unitId: string) => void) | null = null;
  onFade: ((alpha: number) => void) | null = null;

  setGameState(state: GameState): void {
    this.gameState = state;
  }

  /**
   * Start playing a cutscene by ID.
   */
  playCutscene(cutsceneId: string): boolean {
    const cutscene = cutsceneRegistry.get(cutsceneId);
    if (!cutscene || cutscene.steps.length === 0) return false;

    this.currentCutscene = cutscene;
    this.stepIndex = 0;
    this.playing = true;
    this.waitTimer = 0;
    this.waitingForDialogue = false;
    this.fading = false;

    this.onStart?.();
    this.executeCurrentStep();
    return true;
  }

  /**
   * Tick the cutscene forward.
   */
  update(dt: number): void {
    if (!this.playing || !this.currentCutscene) return;

    // Handle wait timer
    if (this.waitTimer > 0) {
      this.waitTimer -= dt;
      if (this.waitTimer <= 0) {
        this.waitTimer = 0;
        this.nextStep();
      }
      return;
    }

    // Handle fade
    if (this.fading) {
      const dir = this.fadeTarget > this.fadeAlpha ? 1 : -1;
      this.fadeAlpha += dir * this.fadeSpeed * dt;

      if ((dir > 0 && this.fadeAlpha >= this.fadeTarget) ||
          (dir < 0 && this.fadeAlpha <= this.fadeTarget)) {
        this.fadeAlpha = this.fadeTarget;
        this.fading = false;
        this.onFade?.(this.fadeAlpha);
        this.nextStep();
      } else {
        this.onFade?.(this.fadeAlpha);
      }
      return;
    }

    // Handle waiting for dialogue to finish
    if (this.waitingForDialogue) {
      if (!dialogueManager.isActive()) {
        this.waitingForDialogue = false;
        this.nextStep();
      }
      return;
    }
  }

  /**
   * Skip to the end of the cutscene.
   */
  skip(): void {
    if (!this.playing || !this.currentCutscene) return;

    // Apply any remaining set_flag steps
    for (let i = this.stepIndex; i < this.currentCutscene.steps.length; i++) {
      const step = this.currentCutscene.steps[i];
      if (step.action === 'set_flag' && this.gameState) {
        const flag = step.params['flag'] as string;
        const value = step.params['value'] as boolean;
        if (flag) this.gameState.storyFlags[flag] = value;
      }
    }

    // End any active dialogue
    if (dialogueManager.isActive()) {
      dialogueManager.endDialogue();
    }

    this.endCutscene();
  }

  /**
   * Is a cutscene currently playing?
   */
  isPlaying(): boolean {
    return this.playing;
  }

  /**
   * Get the current fade alpha (0 = transparent, 1 = opaque).
   */
  getFadeAlpha(): number {
    return this.fadeAlpha;
  }

  // ─── Internal ───

  private executeCurrentStep(): void {
    if (!this.currentCutscene || this.stepIndex >= this.currentCutscene.steps.length) {
      this.endCutscene();
      return;
    }

    const step = this.currentCutscene.steps[this.stepIndex];

    switch (step.action) {
      case 'dialogue': {
        const scriptId = step.params['scriptId'] as string;
        const script = getDialogueScript(scriptId);
        if (script) {
          this.waitingForDialogue = true;
          dialogueManager.startDialogue(scriptId);
        } else {
          this.nextStep();
        }
        break;
      }

      case 'camera_pan': {
        const x = (step.params['x'] as number) ?? 0;
        const y = (step.params['y'] as number) ?? 0;
        const duration = (step.params['duration'] as number) ?? 1;
        this.onCameraPan?.(x, y, duration);
        this.waitTimer = duration;
        break;
      }

      case 'unit_enter': {
        const unitId = step.params['unitId'] as string;
        const x = (step.params['x'] as number) ?? 0;
        const y = (step.params['y'] as number) ?? 0;
        this.onUnitEnter?.(unitId, x, y);
        this.nextStep();
        break;
      }

      case 'unit_exit': {
        const unitId = step.params['unitId'] as string;
        this.onUnitExit?.(unitId);
        this.nextStep();
        break;
      }

      case 'wait': {
        const duration = (step.params['duration'] as number) ?? 1;
        this.waitTimer = duration;
        break;
      }

      case 'fade': {
        const target = (step.params['target'] as number) ?? 1;
        const duration = (step.params['duration'] as number) ?? 1;
        this.fadeTarget = target;
        this.fadeSpeed = duration > 0 ? 1 / duration : 100;
        this.fading = true;
        break;
      }

      case 'set_flag': {
        const flag = step.params['flag'] as string;
        const value = (step.params['value'] as boolean) ?? true;
        if (this.gameState && flag) {
          this.gameState.storyFlags[flag] = value;
        }
        this.nextStep();
        break;
      }

      default:
        this.nextStep();
        break;
    }
  }

  private nextStep(): void {
    this.stepIndex++;
    if (!this.currentCutscene || this.stepIndex >= this.currentCutscene.steps.length) {
      this.endCutscene();
    } else {
      this.executeCurrentStep();
    }
  }

  private endCutscene(): void {
    this.playing = false;
    this.currentCutscene = null;
    this.stepIndex = 0;
    this.waitTimer = 0;
    this.waitingForDialogue = false;
    this.fading = false;
    this.onEnd?.();
  }
}

// ─── Singleton ───

export const cutsceneManager = new CutsceneManager();
