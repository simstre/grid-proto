import type { BattleState, BattleUnit } from '@/battle/battle-manager';

/**
 * FFT-style battle HUD.
 * Uses the game's signature dark indigo panels with tan/gold double borders,
 * and the distinctive menu cursor style.
 */

// FFT UI palette
const UI = {
  panelBg: 'rgba(16, 16, 48, 0.94)',
  panelBgInner: 'rgba(24, 24, 60, 0.96)',
  borderOuter: '#8e7c5e',     // Tan/gold outer border
  borderInner: '#c4a86e',     // Brighter inner border
  borderDark: '#4a3e2e',      // Dark border accent
  text: '#e8e0d0',            // Off-white parchment text
  textBright: '#ffffff',
  textDim: '#8888aa',
  textShadow: '1px 1px 0px #101030',
  cursorActive: '#ffe888',    // FFT yellow cursor
  cursorHover: 'rgba(255, 232, 136, 0.15)',
  hpGreen: '#40c840',
  hpYellow: '#d8c020',
  hpRed: '#d83030',
  mpBlue: '#5888d8',
  ctGold: '#d8b040',
  playerColor: '#70a8e8',
  enemyColor: '#e86860',
  allyColor: '#60c860',
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

export class BattleHUD {
  private container: HTMLDivElement;
  private actionMenu: HTMLDivElement;
  private unitInfo: HTMLDivElement;
  private turnOrder: HTMLDivElement;
  private phaseIndicator: HTMLDivElement;
  private tileInfo: HTMLDivElement;
  private targetInfo: HTMLDivElement;

  private onAction: ((action: string) => void) | null = null;

  constructor(overlay: HTMLElement) {
    this.container = document.createElement('div');
    this.container.style.cssText = 'width:100%;height:100%;position:relative;';

    // ─── Action Menu (bottom-left, FFT command window) ───
    this.actionMenu = document.createElement('div');
    this.actionMenu.style.cssText = `
      position:absolute;bottom:24px;left:24px;
      ${PANEL_STYLE}
      padding:6px 4px;min-width:130px;display:none;
    `;
    this.container.appendChild(this.actionMenu);

    // ─── Unit Info Panel (top-left, FFT status panel) ───
    this.unitInfo = document.createElement('div');
    this.unitInfo.style.cssText = `
      position:absolute;top:16px;left:16px;
      ${PANEL_STYLE}
      padding:10px 14px;min-width:200px;display:none;
    `;
    this.container.appendChild(this.unitInfo);

    // ─── Turn Order (top-right) ───
    this.turnOrder = document.createElement('div');
    this.turnOrder.style.cssText = `
      position:absolute;top:16px;right:16px;
      ${PANEL_STYLE}
      padding:8px 12px;min-width:120px;font-size:11px;
    `;
    this.container.appendChild(this.turnOrder);

    // ─── Phase Indicator (top-center) ───
    this.phaseIndicator = document.createElement('div');
    this.phaseIndicator.style.cssText = `
      position:absolute;top:16px;left:50%;transform:translateX(-50%);
      ${PANEL_STYLE}
      padding:5px 20px;font-size:12px;text-transform:uppercase;letter-spacing:3px;
    `;
    this.container.appendChild(this.phaseIndicator);

    // ─── Tile Info (bottom-right) ───
    this.tileInfo = document.createElement('div');
    this.tileInfo.style.cssText = `
      position:absolute;bottom:24px;right:24px;
      ${PANEL_STYLE}
      padding:8px 12px;font-size:11px;min-width:140px;
    `;
    this.container.appendChild(this.tileInfo);

    // ─── Target Info (bottom-center, shows when hovering enemy) ───
    this.targetInfo = document.createElement('div');
    this.targetInfo.style.cssText = `
      position:absolute;bottom:24px;left:50%;transform:translateX(-50%);
      ${PANEL_STYLE}
      padding:8px 14px;font-size:12px;display:none;
    `;
    this.container.appendChild(this.targetInfo);

    overlay.appendChild(this.container);
  }

  setActionCallback(cb: (action: string) => void): void {
    this.onAction = cb;
  }

  update(state: BattleState, hoveredTile: { x: number; y: number } | null): void {
    this.updatePhaseIndicator(state);
    this.updateActionMenu(state);
    this.updateUnitInfo(state);
    this.updateTurnOrder(state);
    this.updateTileInfo(state, hoveredTile);
    this.updateTargetInfo(state, hoveredTile);
  }

  private updatePhaseIndicator(state: BattleState): void {
    const labels: Record<string, string> = {
      init: 'Initializing',
      advancing_ct: 'Advancing...',
      unit_turn_start: 'Turn Start',
      select_action: 'Select Command',
      select_move: 'Move',
      select_target: 'Select Target',
      confirm_facing: 'Select Direction',
      executing_action: 'Executing',
      unit_turn_end: 'Turn End',
      ai_thinking: 'Enemy Phase',
      battle_won: 'Complete',
      battle_lost: 'Game Over',
    };

    if (state.phase === 'battle_won') {
      this.phaseIndicator.innerHTML = `<span style="color:#40e840;font-size:20px;letter-spacing:5px">VICTORY</span>`;
    } else if (state.phase === 'battle_lost') {
      this.phaseIndicator.innerHTML = `<span style="color:#e84040;font-size:20px;letter-spacing:5px">DEFEAT</span>`;
    } else {
      const turnText = state.turnCount > 0 ? `<span style="color:${UI.textDim};font-size:10px;margin-left:12px">Turn ${state.turnCount}</span>` : '';
      this.phaseIndicator.innerHTML = `${labels[state.phase] || state.phase}${turnText}`;
    }
  }

  private updateActionMenu(state: BattleState): void {
    const isPlayerPhase = ['select_action', 'select_move', 'select_target', 'confirm_facing'].includes(state.phase);
    const unit = state.units.find((u) => u.id === state.activeUnitId);

    if (!isPlayerPhase || !unit || unit.team !== 'player') {
      this.actionMenu.style.display = 'none';
      return;
    }

    this.actionMenu.style.display = 'block';
    this.actionMenu.innerHTML = '';

    // FFT menu title
    const title = document.createElement('div');
    title.style.cssText = `
      font-size:10px;color:${UI.ctGold};padding:2px 10px 4px;
      border-bottom:1px solid ${UI.borderDark};margin-bottom:2px;
      letter-spacing:1px;
    `;
    title.textContent = unit.name;
    this.actionMenu.appendChild(title);

    const actions = [
      { label: 'Move', key: 'move', enabled: !unit.hasMoved && state.phase === 'select_action' },
      { label: 'Act', key: 'attack', enabled: !unit.hasActed && state.phase === 'select_action' },
      { label: 'Wait', key: 'wait', enabled: state.phase === 'select_action' },
    ];

    if (state.phase !== 'select_action') {
      actions.push({ label: 'Back', key: 'cancel', enabled: true });
    }

    for (const action of actions) {
      const btn = document.createElement('div');
      btn.style.cssText = `
        padding:5px 10px 5px 20px;
        cursor:${action.enabled ? 'pointer' : 'default'};
        color:${action.enabled ? UI.text : '#404060'};
        font-size:13px;
        position:relative;
        transition:background 0.1s;
      `;

      // FFT-style cursor marker for enabled items
      if (action.enabled) {
        btn.innerHTML = `<span style="position:absolute;left:6px;color:${UI.cursorActive};display:none">►</span>${action.label}`;
        btn.addEventListener('mouseenter', () => {
          btn.style.background = UI.cursorHover;
          (btn.firstElementChild as HTMLElement).style.display = 'inline';
        });
        btn.addEventListener('mouseleave', () => {
          btn.style.background = 'transparent';
          (btn.firstElementChild as HTMLElement).style.display = 'none';
        });
        btn.addEventListener('click', () => {
          if (this.onAction) this.onAction(action.key);
        });
      } else {
        btn.innerHTML = `<span style="position:absolute;left:6px;color:transparent">►</span>${action.label}`;
      }

      this.actionMenu.appendChild(btn);
    }
  }

  private updateUnitInfo(state: BattleState): void {
    const unit = state.units.find((u) => u.id === state.activeUnitId);
    if (!unit) {
      this.unitInfo.style.display = 'none';
      return;
    }

    this.unitInfo.style.display = 'block';
    const hpRatio = unit.currentHP / unit.maxHP;
    const hpColor = hpRatio > 0.5 ? UI.hpGreen : hpRatio > 0.25 ? UI.hpYellow : UI.hpRed;
    const teamColor = this.getTeamColor(unit.team);

    const hpBarWidth = 120;
    const mpBarWidth = 120;
    const ctBarWidth = 120;

    this.unitInfo.innerHTML = `
      <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:2px;">
        <span style="font-size:14px;font-weight:bold;color:${teamColor}">${unit.name}</span>
        <span style="font-size:10px;color:${UI.textDim}">${unit.jobName}</span>
      </div>
      <div style="font-size:10px;color:${UI.textDim};margin-bottom:6px">Lv ${Math.floor(unit.maxHP / 10)}</div>

      <div style="margin-bottom:4px;">
        <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:1px;">
          <span>HP</span>
          <span style="color:${hpColor}">${unit.currentHP}<span style="color:${UI.textDim}">/${unit.maxHP}</span></span>
        </div>
        ${this.createBar(unit.currentHP / unit.maxHP, hpColor, hpBarWidth)}
      </div>

      <div style="margin-bottom:6px;">
        <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:1px;">
          <span>MP</span>
          <span style="color:${UI.mpBlue}">${unit.currentMP}<span style="color:${UI.textDim}">/${unit.maxMP}</span></span>
        </div>
        ${this.createBar(unit.currentMP / unit.maxMP, UI.mpBlue, mpBarWidth)}
      </div>

      <div style="margin-bottom:4px;">
        <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:1px;">
          <span>CT</span>
          <span style="color:${UI.ctGold}">${Math.floor(unit.ct)}</span>
        </div>
        ${this.createBar(Math.min(unit.ct / 100, 1), UI.ctGold, ctBarWidth)}
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:2px 12px;font-size:10px;color:${UI.textDim};margin-top:6px;border-top:1px solid ${UI.borderDark};padding-top:4px;">
        <span>PA: <span style="color:${UI.text}">${unit.pa}</span></span>
        <span>MA: <span style="color:${UI.text}">${unit.ma}</span></span>
        <span>Sp: <span style="color:${UI.text}">${unit.speed}</span></span>
        <span>Mv: <span style="color:${UI.text}">${unit.move}</span></span>
        <span>Jp: <span style="color:${UI.text}">${unit.jump}</span></span>
        <span>Br: <span style="color:${UI.text}">${unit.brave}</span></span>
      </div>
    `;
  }

  private createBar(ratio: number, color: string, width: number): string {
    const filled = Math.max(0, Math.min(width, Math.round(width * ratio)));
    return `
      <div style="
        width:${width}px;height:4px;
        background:#181830;
        border:1px solid ${UI.borderDark};
        position:relative;
        overflow:hidden;
      ">
        <div style="
          width:${filled}px;height:100%;
          background:${color};
          position:absolute;top:0;left:0;
        "></div>
        <div style="
          width:${filled}px;height:1px;
          background:rgba(255,255,255,0.3);
          position:absolute;top:0;left:0;
        "></div>
      </div>
    `;
  }

  private updateTurnOrder(state: BattleState): void {
    const entries = state.turnOrder.slice(0, 10).map((id, i) => {
      const unit = state.units.find((u) => u.id === id);
      if (!unit) return '';
      const isActive = id === state.activeUnitId;
      const color = this.getTeamColor(unit.team);
      const marker = isActive ? `<span style="color:${UI.cursorActive}">► </span>` : `<span style="color:${UI.textDim}">${i + 1}. </span>`;
      return `<div style="padding:1px 0;color:${isActive ? UI.textBright : UI.text};${isActive ? 'font-weight:bold;' : ''}">${marker}<span style="color:${color}">${unit.name}</span></div>`;
    });

    this.turnOrder.innerHTML = `
      <div style="font-size:10px;color:${UI.ctGold};padding-bottom:3px;margin-bottom:3px;border-bottom:1px solid ${UI.borderDark};letter-spacing:1px;">TURN ORDER</div>
      ${entries.join('')}
    `;
  }

  private updateTileInfo(state: BattleState, hoveredTile: { x: number; y: number } | null): void {
    if (!hoveredTile || hoveredTile.x < 0 || hoveredTile.x >= state.map.width || hoveredTile.y < 0 || hoveredTile.y >= state.map.height) {
      this.tileInfo.style.display = 'none';
      return;
    }

    const { x, y } = hoveredTile;
    const tile = state.map.tiles[x][y];

    const terrainLabel = tile.terrain.charAt(0).toUpperCase() + tile.terrain.slice(1);
    const walkLabel = tile.walkable ? '' : `<span style="color:${UI.hpRed}"> [Impassable]</span>`;

    this.tileInfo.style.display = 'block';
    this.tileInfo.innerHTML = `
      <div style="color:${UI.ctGold};font-size:10px;letter-spacing:1px;margin-bottom:3px;">TERRAIN</div>
      <div>${terrainLabel}${walkLabel}</div>
      <div style="color:${UI.textDim};font-size:10px;margin-top:2px;">
        Height: ${tile.height} &nbsp; (${x}, ${y})
      </div>
    `;
  }

  private updateTargetInfo(state: BattleState, hoveredTile: { x: number; y: number } | null): void {
    if (!hoveredTile) {
      this.targetInfo.style.display = 'none';
      return;
    }

    const target = state.units.find((u) => u.x === hoveredTile.x && u.y === hoveredTile.y && u.isAlive && u.id !== state.activeUnitId);
    if (!target) {
      this.targetInfo.style.display = 'none';
      return;
    }

    const hpRatio = target.currentHP / target.maxHP;
    const hpColor = hpRatio > 0.5 ? UI.hpGreen : hpRatio > 0.25 ? UI.hpYellow : UI.hpRed;
    const teamColor = this.getTeamColor(target.team);

    this.targetInfo.style.display = 'block';
    this.targetInfo.innerHTML = `
      <div style="display:flex;align-items:baseline;gap:8px;">
        <span style="color:${teamColor};font-weight:bold">${target.name}</span>
        <span style="font-size:10px;color:${UI.textDim}">${target.jobName}</span>
      </div>
      <div style="margin-top:4px;">
        <span style="font-size:11px">HP: </span>
        <span style="color:${hpColor}">${target.currentHP}/${target.maxHP}</span>
        &nbsp;
        <span style="font-size:11px">MP: </span>
        <span style="color:${UI.mpBlue}">${target.currentMP}/${target.maxMP}</span>
      </div>
    `;
  }

  private getTeamColor(team: string): string {
    switch (team) {
      case 'player': return UI.playerColor;
      case 'enemy': return UI.enemyColor;
      case 'ally': return UI.allyColor;
      default: return UI.ctGold;
    }
  }
}
