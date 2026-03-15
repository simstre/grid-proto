// ─── Pre-Battle Formation Screen ───

import type { RosterUnit } from '@/overworld/roster';
import type { StoryBattle } from '@/data/campaign';
import { MAX_DEPLOYMENT } from '@/overworld/formation';

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
  playerColor: '#70a8e8',
  ctGold: '#d8b040',
  hpGreen: '#40c840',
  hpRed: '#e86860',
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

export class FormationUI {
  private container: HTMLDivElement;
  private selectedUnitIds: Set<string> = new Set();
  private onStart: ((selectedIds: string[]) => void) | null = null;
  private onBack: (() => void) | null = null;

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

  show(battle: StoryBattle, availableUnits: RosterUnit[]): void {
    this.container.style.display = 'flex';
    this.container.style.alignItems = 'center';
    this.container.style.justifyContent = 'center';
    this.container.innerHTML = '';

    // Auto-select first N units
    this.selectedUnitIds.clear();
    const maxDeploy = Math.min(availableUnits.length, MAX_DEPLOYMENT);
    for (let i = 0; i < maxDeploy; i++) {
      this.selectedUnitIds.add(availableUnits[i].id);
    }

    this.render(battle, availableUnits);
  }

  private render(battle: StoryBattle, availableUnits: RosterUnit[]): void {
    this.container.innerHTML = '';

    const panel = document.createElement('div');
    panel.style.cssText = `
      ${PANEL_STYLE}
      padding: 24px 32px;
      max-width: 550px;
      width: 90%;
      max-height: 85vh;
      overflow-y: auto;
    `;
    this.container.appendChild(panel);

    // Title
    const title = document.createElement('div');
    title.style.cssText = `
      font-size: 14px;
      color: ${UI.cursorActive};
      text-align: center;
      margin-bottom: 6px;
      letter-spacing: 2px;
    `;
    title.textContent = battle.name;
    panel.appendChild(title);

    // Description
    const desc = document.createElement('div');
    desc.style.cssText = `
      font-size: 8px;
      color: ${UI.textDim};
      text-align: center;
      margin-bottom: 16px;
      line-height: 1.8;
    `;
    desc.textContent = battle.description;
    panel.appendChild(desc);

    // Deployment info
    const deployInfo = document.createElement('div');
    deployInfo.style.cssText = `
      font-size: 9px;
      color: ${UI.ctGold};
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid ${UI.borderDark};
      letter-spacing: 1px;
    `;
    deployInfo.textContent = `DEPLOY UNITS (${this.selectedUnitIds.size}/${MAX_DEPLOYMENT})`;
    panel.appendChild(deployInfo);

    // Unit list
    for (const unit of availableUnits) {
      const isSelected = this.selectedUnitIds.has(unit.id);

      const unitRow = document.createElement('div');
      unitRow.style.cssText = `
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 6px 8px;
        margin-bottom: 4px;
        cursor: pointer;
        background: ${isSelected ? 'rgba(70,100,200,0.15)' : 'rgba(0,0,0,0.2)'};
        border: 1px solid ${isSelected ? UI.playerColor : UI.borderDark};
        transition: background 0.1s;
        font-size: 10px;
      `;

      unitRow.addEventListener('mouseenter', () => {
        unitRow.style.background = UI.cursorHover;
      });
      unitRow.addEventListener('mouseleave', () => {
        unitRow.style.background = isSelected ? 'rgba(70,100,200,0.15)' : 'rgba(0,0,0,0.2)';
      });
      unitRow.addEventListener('click', () => {
        this.toggleUnit(unit.id);
        this.render(battle, availableUnits);
      });

      // Checkbox
      const checkbox = document.createElement('span');
      checkbox.style.cssText = `
        color: ${isSelected ? UI.hpGreen : UI.textDim};
        min-width: 16px;
      `;
      checkbox.textContent = isSelected ? '[+]' : '[ ]';
      unitRow.appendChild(checkbox);

      // Name
      const nameEl = document.createElement('span');
      nameEl.style.cssText = `
        color: ${isSelected ? UI.playerColor : UI.textDim};
        flex: 1;
      `;
      nameEl.textContent = unit.name;
      unitRow.appendChild(nameEl);

      // Job
      const jobEl = document.createElement('span');
      jobEl.style.cssText = `color: ${UI.textDim}; font-size: 8px;`;
      jobEl.textContent = unit.jobName;
      unitRow.appendChild(jobEl);

      // Level
      const lvlEl = document.createElement('span');
      lvlEl.style.cssText = `color: ${UI.textDim}; font-size: 8px;`;
      lvlEl.textContent = `Lv${unit.level}`;
      unitRow.appendChild(lvlEl);

      // HP
      const hpEl = document.createElement('span');
      hpEl.style.cssText = `color: ${UI.hpGreen}; font-size: 8px; min-width: 50px; text-align: right;`;
      hpEl.textContent = `${unit.maxHP}HP`;
      unitRow.appendChild(hpEl);

      panel.appendChild(unitRow);
    }

    // Buttons
    const buttonRow = document.createElement('div');
    buttonRow.style.cssText = `
      display: flex;
      justify-content: space-between;
      margin-top: 16px;
      padding-top: 12px;
      border-top: 1px solid ${UI.borderDark};
    `;

    // Back button
    const backBtn = document.createElement('div');
    backBtn.style.cssText = `
      padding: 8px 20px;
      cursor: pointer;
      font-size: 11px;
      color: ${UI.textDim};
      border: 2px solid ${UI.borderDark};
      background: rgba(0,0,0,0.3);
      transition: background 0.15s;
    `;
    backBtn.textContent = 'Back';
    backBtn.addEventListener('mouseenter', () => {
      backBtn.style.background = UI.cursorHover;
    });
    backBtn.addEventListener('mouseleave', () => {
      backBtn.style.background = 'rgba(0,0,0,0.3)';
    });
    backBtn.addEventListener('click', () => {
      this.onBack?.();
    });
    buttonRow.appendChild(backBtn);

    // Start button
    const canStart = this.selectedUnitIds.size >= 1;
    const startBtn = document.createElement('div');
    startBtn.style.cssText = `
      padding: 8px 20px;
      cursor: ${canStart ? 'pointer' : 'default'};
      font-size: 11px;
      color: ${canStart ? UI.cursorActive : '#404060'};
      border: 2px solid ${canStart ? UI.borderOuter : UI.borderDark};
      background: rgba(0,0,0,0.3);
      transition: background 0.15s;
    `;
    startBtn.textContent = 'Start Battle';
    if (canStart) {
      startBtn.addEventListener('mouseenter', () => {
        startBtn.style.background = UI.cursorHover;
      });
      startBtn.addEventListener('mouseleave', () => {
        startBtn.style.background = 'rgba(0,0,0,0.3)';
      });
      startBtn.addEventListener('click', () => {
        this.onStart?.(Array.from(this.selectedUnitIds));
      });
    }
    buttonRow.appendChild(startBtn);

    panel.appendChild(buttonRow);
  }

  hide(): void {
    this.container.style.display = 'none';
    this.container.innerHTML = '';
  }

  setOnStart(callback: (selectedIds: string[]) => void): void {
    this.onStart = callback;
  }

  setOnBack(callback: () => void): void {
    this.onBack = callback;
  }

  destroy(): void {
    this.container.remove();
  }

  private toggleUnit(unitId: string): void {
    if (this.selectedUnitIds.has(unitId)) {
      this.selectedUnitIds.delete(unitId);
    } else if (this.selectedUnitIds.size < MAX_DEPLOYMENT) {
      this.selectedUnitIds.add(unitId);
    }
  }
}
