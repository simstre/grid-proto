// ─── Title Screen ───

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
};

const PANEL_STYLE = `
  background: ${UI.panelBg};
  border: 3px solid ${UI.borderOuter};
  box-shadow:
    inset 0 0 0 1px ${UI.borderInner},
    inset 0 0 0 3px ${UI.borderDark},
    4px 4px 0 rgba(0,0,0,0.5);
  font-family: 'Press Start 2P', 'Courier New', monospace;
  color: ${UI.text};
  text-shadow: ${UI.textShadow};
`;

export type TitleMenuAction = 'new_game' | 'continue' | 'controls';

export class TitleScreen {
  private container: HTMLDivElement;
  private onSelect: ((action: TitleMenuAction) => void) | null = null;
  private controlsPanel: HTMLDivElement | null = null;

  constructor() {
    this.container = document.createElement('div');
    this.container.style.cssText = `
      position: fixed;
      top: 0; left: 0;
      width: 100%; height: 100%;
      z-index: 2000;
      display: none;
      background: #0a0a1e;
      font-family: 'Press Start 2P', 'Courier New', monospace;
    `;
    document.body.appendChild(this.container);
  }

  show(hasSaveData: boolean): void {
    this.container.style.display = 'flex';
    this.container.style.flexDirection = 'column';
    this.container.style.alignItems = 'center';
    this.container.style.justifyContent = 'center';

    this.container.innerHTML = '';

    // Title
    const title = document.createElement('div');
    title.style.cssText = `
      font-size: 36px;
      color: ${UI.cursorActive};
      text-shadow: 2px 2px 0px #000, 0 0 20px rgba(255,232,136,0.3);
      margin-bottom: 12px;
      letter-spacing: 6px;
    `;
    title.textContent = 'GRID PROTO';
    this.container.appendChild(title);

    // Subtitle
    const subtitle = document.createElement('div');
    subtitle.style.cssText = `
      font-size: 11px;
      color: ${UI.textDim};
      margin-bottom: 60px;
      letter-spacing: 3px;
    `;
    subtitle.textContent = 'A Tactical RPG';
    this.container.appendChild(subtitle);

    // Menu panel
    const menu = document.createElement('div');
    menu.style.cssText = `
      ${PANEL_STYLE}
      padding: 12px 8px;
      min-width: 220px;
    `;
    this.container.appendChild(menu);

    const items: Array<{ label: string; action: TitleMenuAction; enabled: boolean }> = [
      { label: 'New Game', action: 'new_game', enabled: true },
      { label: 'Continue', action: 'continue', enabled: hasSaveData },
      { label: 'Controls', action: 'controls', enabled: true },
    ];

    for (const item of items) {
      const btn = document.createElement('div');
      btn.style.cssText = `
        padding: 8px 14px 8px 28px;
        cursor: ${item.enabled ? 'pointer' : 'default'};
        color: ${item.enabled ? UI.text : '#404060'};
        font-size: 13px;
        position: relative;
        transition: background 0.1s;
      `;

      if (item.enabled) {
        btn.innerHTML = `<span style="position:absolute;left:10px;color:${UI.cursorActive};display:none">►</span>${item.label}`;
        btn.addEventListener('mouseenter', () => {
          btn.style.background = UI.cursorHover;
          (btn.firstElementChild as HTMLElement).style.display = 'inline';
        });
        btn.addEventListener('mouseleave', () => {
          btn.style.background = 'transparent';
          (btn.firstElementChild as HTMLElement).style.display = 'none';
        });
        btn.addEventListener('click', () => {
          if (item.action === 'controls') {
            this.toggleControls();
          } else {
            this.onSelect?.(item.action);
          }
        });
      } else {
        btn.innerHTML = `<span style="position:absolute;left:10px;color:transparent">►</span>${item.label}`;
      }

      menu.appendChild(btn);
    }

    // Controls panel (hidden by default)
    this.controlsPanel = document.createElement('div');
    this.controlsPanel.style.cssText = `
      ${PANEL_STYLE}
      padding: 14px 20px;
      margin-top: 20px;
      min-width: 280px;
      display: none;
      font-size: 10px;
      line-height: 2;
    `;
    this.controlsPanel.innerHTML = `
      <div style="color:${UI.cursorActive};margin-bottom:8px;font-size:11px;letter-spacing:2px;">CONTROLS</div>
      <div><span style="color:${UI.textBright}">WASD</span> <span style="color:${UI.textDim}">- Pan camera</span></div>
      <div><span style="color:${UI.textBright}">Q / E</span> <span style="color:${UI.textDim}">- Rotate map</span></div>
      <div><span style="color:${UI.textBright}">Scroll</span> <span style="color:${UI.textDim}">- Zoom in/out</span></div>
      <div><span style="color:${UI.textBright}">Click</span> <span style="color:${UI.textDim}">- Select/Confirm</span></div>
      <div><span style="color:${UI.textBright}">Escape</span> <span style="color:${UI.textDim}">- Cancel</span></div>
      <div><span style="color:${UI.textBright}">M</span> <span style="color:${UI.textDim}">- Toggle mute</span></div>
    `;
    this.container.appendChild(this.controlsPanel);
  }

  hide(): void {
    this.container.style.display = 'none';
    this.container.innerHTML = '';
    this.controlsPanel = null;
  }

  setOnSelect(callback: (action: TitleMenuAction) => void): void {
    this.onSelect = callback;
  }

  destroy(): void {
    this.container.remove();
  }

  private toggleControls(): void {
    if (!this.controlsPanel) return;
    const isHidden = this.controlsPanel.style.display === 'none';
    this.controlsPanel.style.display = isHidden ? 'block' : 'none';
  }
}
