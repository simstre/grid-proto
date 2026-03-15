// ─── Dialogue System ───

// ─── Types ───

export interface DialogueChoice {
  text: string;
  nextId: string;
}

export interface DialogueLine {
  id: string;
  speaker: string;
  portrait?: string;
  text: string;
  choices?: DialogueChoice[];
}

export type DialogueScript = DialogueLine[];

// ─── Script Registry ───

const scriptRegistry = new Map<string, DialogueScript>();

export function registerDialogueScript(id: string, script: DialogueScript): void {
  scriptRegistry.set(id, script);
}

export function getDialogueScript(id: string): DialogueScript | undefined {
  return scriptRegistry.get(id);
}

// ─── Dialogue Manager ───

export class DialogueManager {
  private currentScript: DialogueScript | null = null;
  private currentIndex = 0;
  private active = false;

  // Event callbacks
  onStart: (() => void) | null = null;
  onEnd: (() => void) | null = null;
  onLineChange: ((line: DialogueLine) => void) | null = null;

  /**
   * Begin a dialogue sequence by script ID.
   */
  startDialogue(scriptId: string): boolean {
    const script = scriptRegistry.get(scriptId);
    if (!script || script.length === 0) return false;

    this.currentScript = script;
    this.currentIndex = 0;
    this.active = true;

    this.onStart?.();
    this.onLineChange?.(this.getCurrentLine()!);
    return true;
  }

  /**
   * Start dialogue from a script object directly (not from registry).
   */
  startDialogueDirect(script: DialogueScript): boolean {
    if (!script || script.length === 0) return false;

    this.currentScript = script;
    this.currentIndex = 0;
    this.active = true;

    this.onStart?.();
    this.onLineChange?.(this.getCurrentLine()!);
    return true;
  }

  /**
   * Advance to the next line. If the current line has choices,
   * this is a no-op (use selectChoice instead).
   */
  advance(): boolean {
    if (!this.active || !this.currentScript) return false;

    const current = this.currentScript[this.currentIndex];
    if (current.choices && current.choices.length > 0) {
      // Must use selectChoice for lines with choices
      return false;
    }

    this.currentIndex++;
    if (this.currentIndex >= this.currentScript.length) {
      this.endDialogue();
      return false;
    }

    this.onLineChange?.(this.getCurrentLine()!);
    return true;
  }

  /**
   * Pick a dialogue choice by index. Jumps to the line with
   * the matching nextId.
   */
  selectChoice(index: number): boolean {
    if (!this.active || !this.currentScript) return false;

    const current = this.currentScript[this.currentIndex];
    if (!current.choices || index < 0 || index >= current.choices.length) return false;

    const choice = current.choices[index];
    const nextIndex = this.currentScript.findIndex((line) => line.id === choice.nextId);

    if (nextIndex === -1) {
      // Choice target not found; end dialogue
      this.endDialogue();
      return false;
    }

    this.currentIndex = nextIndex;
    this.onLineChange?.(this.getCurrentLine()!);
    return true;
  }

  /**
   * Is dialogue currently showing?
   */
  isActive(): boolean {
    return this.active;
  }

  /**
   * Get the current dialogue line, or null if not active.
   */
  getCurrentLine(): DialogueLine | null {
    if (!this.active || !this.currentScript) return null;
    return this.currentScript[this.currentIndex] ?? null;
  }

  /**
   * Immediately end the current dialogue.
   */
  endDialogue(): void {
    this.active = false;
    this.currentScript = null;
    this.currentIndex = 0;
    this.onEnd?.();
  }
}

// ─── Singleton ───

export const dialogueManager = new DialogueManager();
