// ─── FFT-style Dialogue Box UI ───

import type { DialogueLine, DialogueChoice } from '@/story/dialogue';

// Reuse the FFT UI palette from battle-hud
const UI = {
  panelBg: 'rgba(16, 16, 48, 0.94)',
  borderOuter: '#8e7c5e',
  borderInner: '#c4a86e',
  borderDark: '#4a3e2e',
  text: '#e8e0d0',
  textBright: '#ffffff',
  textDim: '#8888aa',
  textShadow: '1px 1px 0px #101030',
  cursorActive: '#ffe888',
  cursorHover: 'rgba(255, 232, 136, 0.15)',
  speakerColor: '#c4a86e',
};

const PANEL_STYLE = `
  background: ${UI.panelBg};
  border: 3px solid ${UI.borderOuter};
  box-shadow:
    inset 0 0 0 1px ${UI.borderInner},
    inset 0 0 0 3px ${UI.borderDark},
    4px 4px 0 rgba(0,0,0,0.5);
  font-family: 'Courier New', 'Monaco', monospace;
  color: ${UI.text};
  text-shadow: ${UI.textShadow};
  image-rendering: pixelated;
`;

const TYPEWRITER_SPEED = 30; // ms per character

/**
 * Portrait color map — placeholder colored squares for speakers
 * until real art assets are available.
 */
const PORTRAIT_COLORS: Record<string, string> = {
  Ramza: '#4488cc',
  Delita: '#cc5544',
  Agrias: '#44aa66',
  Mustadio: '#aa8844',
  'Instructor Daravon': '#8866aa',
  'Bandit Leader': '#884422',
  'Brigand Captain': '#666644',
  'Guild Enforcer': '#886644',
  'Northern Sky Knight': '#445588',
  'Brigand Scout': '#556644',
};

function getPortraitColor(speaker: string): string {
  return PORTRAIT_COLORS[speaker] ?? '#555566';
}

export class DialogueBoxUI {
  private container: HTMLDivElement;
  private portraitEl: HTMLDivElement;
  private speakerEl: HTMLDivElement;
  private textEl: HTMLDivElement;
  private continueIndicator: HTMLDivElement;
  private choiceContainer: HTMLDivElement;

  private typewriterTimer: ReturnType<typeof setTimeout> | null = null;
  private fullText = '';
  private displayedChars = 0;
  private typewriterComplete = false;

  private onAdvance: (() => void) | null = null;
  private onChoice: ((index: number) => void) | null = null;
  private visible = false;

  constructor() {
    // ─── Outer container: full-width bar at the bottom ───
    this.container = document.createElement('div');
    this.container.style.cssText = `
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      z-index: 1000;
      display: none;
      padding: 16px 24px;
    `;

    // ─── Inner panel ───
    const panel = document.createElement('div');
    panel.style.cssText = `
      ${PANEL_STYLE}
      display: flex;
      align-items: flex-start;
      padding: 16px 20px;
      max-width: 800px;
      margin: 0 auto;
      gap: 16px;
      position: relative;
    `;
    this.container.appendChild(panel);

    // ─── Portrait (placeholder colored square) ───
    this.portraitEl = document.createElement('div');
    this.portraitEl.style.cssText = `
      width: 64px;
      height: 64px;
      min-width: 64px;
      border: 2px solid ${UI.borderInner};
      box-shadow: inset 0 0 0 1px ${UI.borderDark};
      image-rendering: pixelated;
    `;
    panel.appendChild(this.portraitEl);

    // ─── Text area ───
    const textArea = document.createElement('div');
    textArea.style.cssText = 'flex:1;min-height:60px;';
    panel.appendChild(textArea);

    // Speaker name
    this.speakerEl = document.createElement('div');
    this.speakerEl.style.cssText = `
      font-size: 13px;
      font-weight: bold;
      color: ${UI.speakerColor};
      margin-bottom: 6px;
      letter-spacing: 1px;
    `;
    textArea.appendChild(this.speakerEl);

    // Dialogue text
    this.textEl = document.createElement('div');
    this.textEl.style.cssText = `
      font-size: 14px;
      line-height: 1.5;
      color: ${UI.text};
      min-height: 40px;
    `;
    textArea.appendChild(this.textEl);

    // Choice container
    this.choiceContainer = document.createElement('div');
    this.choiceContainer.style.cssText = `
      margin-top: 10px;
      display: none;
    `;
    textArea.appendChild(this.choiceContainer);

    // Continue indicator
    this.continueIndicator = document.createElement('div');
    this.continueIndicator.style.cssText = `
      position: absolute;
      bottom: 8px;
      right: 16px;
      font-size: 11px;
      color: ${UI.textDim};
      animation: dialoguePulse 1.2s ease-in-out infinite;
    `;
    this.continueIndicator.textContent = '[ Press to continue ]';
    panel.appendChild(this.continueIndicator);

    // ─── Inject pulse animation ───
    if (!document.getElementById('dialogue-box-styles')) {
      const style = document.createElement('style');
      style.id = 'dialogue-box-styles';
      style.textContent = `
        @keyframes dialoguePulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
      `;
      document.head.appendChild(style);
    }

    // ─── Click / key handler to advance ───
    this.container.addEventListener('click', (e) => {
      // Ignore if clicking a choice button
      if ((e.target as HTMLElement).closest('[data-choice]')) return;
      this.handleAdvance();
    });

    const keyHandler = (e: KeyboardEvent) => {
      if (!this.visible) return;
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'z') {
        e.preventDefault();
        this.handleAdvance();
      }
    };
    document.addEventListener('keydown', keyHandler);

    document.body.appendChild(this.container);
  }

  /**
   * Display a dialogue line with typewriter effect.
   */
  show(line: DialogueLine): void {
    this.visible = true;
    this.container.style.display = 'block';

    // Portrait
    const color = line.portrait ?? getPortraitColor(line.speaker);
    this.portraitEl.style.background = color;

    // Speaker name
    this.speakerEl.textContent = line.speaker;

    // Text (typewriter)
    this.fullText = line.text;
    this.displayedChars = 0;
    this.typewriterComplete = false;
    this.textEl.textContent = '';
    this.continueIndicator.style.display = 'none';
    this.choiceContainer.style.display = 'none';

    this.startTypewriter();

    // If the line has choices, they appear after typewriter finishes
    // (handled in typewriter completion)
  }

  /**
   * Hide the dialogue box.
   */
  hide(): void {
    this.visible = false;
    this.container.style.display = 'none';
    this.stopTypewriter();
  }

  /**
   * Display choice buttons.
   */
  showChoices(choices: DialogueChoice[]): void {
    this.choiceContainer.style.display = 'block';
    this.choiceContainer.innerHTML = '';
    this.continueIndicator.style.display = 'none';

    choices.forEach((choice, index) => {
      const btn = document.createElement('div');
      btn.setAttribute('data-choice', String(index));
      btn.style.cssText = `
        padding: 6px 12px 6px 24px;
        cursor: pointer;
        font-size: 13px;
        color: ${UI.text};
        position: relative;
        transition: background 0.1s;
        margin-bottom: 2px;
      `;
      btn.innerHTML = `<span style="position:absolute;left:8px;color:${UI.cursorActive};display:none">►</span>${choice.text}`;

      btn.addEventListener('mouseenter', () => {
        btn.style.background = UI.cursorHover;
        (btn.firstElementChild as HTMLElement).style.display = 'inline';
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.background = 'transparent';
        (btn.firstElementChild as HTMLElement).style.display = 'none';
      });
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.onChoice?.(index);
      });

      this.choiceContainer.appendChild(btn);
    });
  }

  /**
   * Set callback for advancing (click/key to go to next line).
   */
  setOnAdvance(callback: () => void): void {
    this.onAdvance = callback;
  }

  /**
   * Set callback for choice selection.
   */
  setOnChoice(callback: (index: number) => void): void {
    this.onChoice = callback;
  }

  /**
   * Check if the dialogue box is currently visible.
   */
  isVisible(): boolean {
    return this.visible;
  }

  /**
   * Destroy the DOM elements.
   */
  destroy(): void {
    this.stopTypewriter();
    this.container.remove();
  }

  // ─── Internal ───

  private handleAdvance(): void {
    if (!this.typewriterComplete) {
      // Skip typewriter — show full text immediately
      this.completeTypewriter();
    } else {
      // Advance to next line
      this.onAdvance?.();
    }
  }

  private startTypewriter(): void {
    this.stopTypewriter();

    const tick = () => {
      if (this.displayedChars >= this.fullText.length) {
        this.completeTypewriter();
        return;
      }

      this.displayedChars++;
      this.textEl.textContent = this.fullText.slice(0, this.displayedChars);
      this.typewriterTimer = setTimeout(tick, TYPEWRITER_SPEED);
    };

    this.typewriterTimer = setTimeout(tick, TYPEWRITER_SPEED);
  }

  private stopTypewriter(): void {
    if (this.typewriterTimer !== null) {
      clearTimeout(this.typewriterTimer);
      this.typewriterTimer = null;
    }
  }

  private completeTypewriter(): void {
    this.stopTypewriter();
    this.displayedChars = this.fullText.length;
    this.textEl.textContent = this.fullText;
    this.typewriterComplete = true;
    this.continueIndicator.style.display = 'block';
  }
}
