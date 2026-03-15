// ─── Post-Battle Results Screen ───

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
  hpGreen: '#40c840',
  ctGold: '#d8b040',
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

export interface UnitRewardInfo {
  name: string;
  jobName: string;
  expGained: number;
  jpGained: number;
  leveledUp: boolean;
  newLevel: number;
}

export interface BattleResultsData {
  battleName: string;
  goldEarned: number;
  itemsFound: string[];
  unitRewards: UnitRewardInfo[];
}

export class BattleResults {
  private container: HTMLDivElement;
  private onContinue: (() => void) | null = null;

  constructor() {
    this.container = document.createElement('div');
    this.container.style.cssText = `
      position: fixed;
      top: 0; left: 0;
      width: 100%; height: 100%;
      z-index: 2000;
      display: none;
      background: rgba(5, 5, 20, 0.85);
      font-family: 'Press Start 2P', 'Courier New', monospace;
    `;
    document.body.appendChild(this.container);
  }

  show(data: BattleResultsData): void {
    this.container.style.display = 'flex';
    this.container.style.alignItems = 'center';
    this.container.style.justifyContent = 'center';

    this.container.innerHTML = '';

    const panel = document.createElement('div');
    panel.style.cssText = `
      ${PANEL_STYLE}
      padding: 24px 32px;
      max-width: 500px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
    `;
    this.container.appendChild(panel);

    // Title
    const title = document.createElement('div');
    title.style.cssText = `
      font-size: 18px;
      color: ${UI.cursorActive};
      text-align: center;
      margin-bottom: 6px;
      letter-spacing: 3px;
    `;
    title.textContent = 'BATTLE COMPLETE!';
    panel.appendChild(title);

    // Battle name
    const battleName = document.createElement('div');
    battleName.style.cssText = `
      font-size: 10px;
      color: ${UI.textDim};
      text-align: center;
      margin-bottom: 20px;
    `;
    battleName.textContent = data.battleName;
    panel.appendChild(battleName);

    // Gold
    const goldRow = document.createElement('div');
    goldRow.style.cssText = `
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      margin-bottom: 8px;
      padding-bottom: 8px;
      border-bottom: 1px solid ${UI.borderDark};
    `;
    goldRow.innerHTML = `
      <span>Gold Earned</span>
      <span style="color:${UI.ctGold}">${data.goldEarned} Gil</span>
    `;
    panel.appendChild(goldRow);

    // Items
    if (data.itemsFound.length > 0) {
      const itemsRow = document.createElement('div');
      itemsRow.style.cssText = `
        font-size: 10px;
        margin-bottom: 12px;
        padding-bottom: 8px;
        border-bottom: 1px solid ${UI.borderDark};
      `;
      itemsRow.innerHTML = `
        <div style="color:${UI.ctGold};margin-bottom:4px;">ITEMS FOUND</div>
        ${data.itemsFound.map((item) => `<div style="color:${UI.text};padding:2px 0;">  ${item}</div>`).join('')}
      `;
      panel.appendChild(itemsRow);
    }

    // Unit rewards
    const unitsTitle = document.createElement('div');
    unitsTitle.style.cssText = `
      font-size: 10px;
      color: ${UI.ctGold};
      margin-bottom: 8px;
      letter-spacing: 1px;
    `;
    unitsTitle.textContent = 'UNIT REWARDS';
    panel.appendChild(unitsTitle);

    for (const unit of data.unitRewards) {
      const unitRow = document.createElement('div');
      unitRow.style.cssText = `
        margin-bottom: 8px;
        padding: 6px 8px;
        background: rgba(0,0,0,0.2);
        border: 1px solid ${UI.borderDark};
        font-size: 10px;
      `;

      let levelUpHtml = '';
      if (unit.leveledUp) {
        levelUpHtml = `<div style="color:${UI.hpGreen};margin-top:3px;">LEVEL UP! -> Lv ${unit.newLevel}</div>`;
      }

      unitRow.innerHTML = `
        <div style="display:flex;justify-content:space-between;margin-bottom:2px;">
          <span style="color:${UI.textBright}">${unit.name}</span>
          <span style="color:${UI.textDim}">${unit.jobName}</span>
        </div>
        <div style="color:${UI.textDim}">
          EXP +${unit.expGained} &nbsp; JP +${unit.jpGained}
        </div>
        ${levelUpHtml}
      `;
      panel.appendChild(unitRow);
    }

    // Continue button
    const continueBtn = document.createElement('div');
    continueBtn.style.cssText = `
      text-align: center;
      margin-top: 20px;
      padding: 10px 24px;
      cursor: pointer;
      font-size: 13px;
      color: ${UI.cursorActive};
      border: 2px solid ${UI.borderOuter};
      background: rgba(0,0,0,0.3);
      transition: background 0.15s;
    `;
    continueBtn.textContent = 'Continue';
    continueBtn.addEventListener('mouseenter', () => {
      continueBtn.style.background = UI.cursorHover;
    });
    continueBtn.addEventListener('mouseleave', () => {
      continueBtn.style.background = 'rgba(0,0,0,0.3)';
    });
    continueBtn.addEventListener('click', () => {
      this.onContinue?.();
    });
    panel.appendChild(continueBtn);
  }

  showDefeat(onRetry: () => void, onQuit: () => void): void {
    this.container.style.display = 'flex';
    this.container.style.alignItems = 'center';
    this.container.style.justifyContent = 'center';

    this.container.innerHTML = '';

    const panel = document.createElement('div');
    panel.style.cssText = `
      ${PANEL_STYLE}
      padding: 30px 40px;
      text-align: center;
    `;
    this.container.appendChild(panel);

    const title = document.createElement('div');
    title.style.cssText = `
      font-size: 20px;
      color: #e84040;
      margin-bottom: 20px;
      letter-spacing: 4px;
    `;
    title.textContent = 'DEFEAT';
    panel.appendChild(title);

    const msg = document.createElement('div');
    msg.style.cssText = `
      font-size: 10px;
      color: ${UI.textDim};
      margin-bottom: 24px;
    `;
    msg.textContent = 'Your party has been wiped out.';
    panel.appendChild(msg);

    const buttons = document.createElement('div');
    buttons.style.cssText = 'display:flex;gap:16px;justify-content:center;';

    for (const { label, cb } of [
      { label: 'Retry', cb: onRetry },
      { label: 'Quit', cb: onQuit },
    ]) {
      const btn = document.createElement('div');
      btn.style.cssText = `
        padding: 8px 20px;
        cursor: pointer;
        font-size: 12px;
        color: ${UI.text};
        border: 2px solid ${UI.borderOuter};
        background: rgba(0,0,0,0.3);
        transition: background 0.15s;
      `;
      btn.textContent = label;
      btn.addEventListener('mouseenter', () => {
        btn.style.background = UI.cursorHover;
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.background = 'rgba(0,0,0,0.3)';
      });
      btn.addEventListener('click', cb);
      buttons.appendChild(btn);
    }

    panel.appendChild(buttons);
  }

  hide(): void {
    this.container.style.display = 'none';
    this.container.innerHTML = '';
  }

  setOnContinue(callback: () => void): void {
    this.onContinue = callback;
  }

  destroy(): void {
    this.container.remove();
  }
}
