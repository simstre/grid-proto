// ─── World Map UI Screen ───

import type { GameState } from '@/story/story-flags';
import { saveGameState } from '@/story/story-flags';
import { WorldMap, type WorldMapNode, type WorldNodeType } from '@/overworld/world-map';

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

const NODE_ICONS: Record<WorldNodeType, string> = {
  story_battle: '[X]',
  town: '[=]',
  random_encounter: '[!]',
  locked: '[?]',
};

export class WorldMapUI {
  private container: HTMLDivElement;
  private worldMap: WorldMap;
  private onNodeSelect: ((nodeId: string) => void) | null = null;
  private onSave: (() => void) | null = null;

  constructor(worldMap: WorldMap) {
    this.worldMap = worldMap;
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

  show(gameState: GameState): void {
    this.container.style.display = 'flex';
    this.container.innerHTML = '';

    // ─── Main layout: sidebar + map area ───
    const layout = document.createElement('div');
    layout.style.cssText = 'display:flex;width:100%;height:100%;';
    this.container.appendChild(layout);

    // ─── Sidebar ───
    const sidebar = document.createElement('div');
    sidebar.style.cssText = `
      ${PANEL_STYLE}
      width: 260px;
      min-width: 260px;
      padding: 16px;
      overflow-y: auto;
      border-right: 3px solid ${UI.borderOuter};
      display: flex;
      flex-direction: column;
    `;
    layout.appendChild(sidebar);

    // Chapter info
    const chapterInfo = document.createElement('div');
    chapterInfo.style.cssText = `
      font-size: 11px;
      color: ${UI.cursorActive};
      margin-bottom: 16px;
      letter-spacing: 2px;
      text-align: center;
    `;
    chapterInfo.textContent = `Chapter ${gameState.currentChapter}`;
    sidebar.appendChild(chapterInfo);

    // Party roster
    const rosterTitle = document.createElement('div');
    rosterTitle.style.cssText = `
      font-size: 9px;
      color: ${UI.ctGold};
      margin-bottom: 8px;
      padding-bottom: 4px;
      border-bottom: 1px solid ${UI.borderDark};
      letter-spacing: 1px;
    `;
    rosterTitle.textContent = 'PARTY';
    sidebar.appendChild(rosterTitle);

    const units = gameState.roster.getAllUnits();
    for (const unit of units) {
      const unitEl = document.createElement('div');
      unitEl.style.cssText = `
        font-size: 9px;
        margin-bottom: 6px;
        padding: 4px 6px;
        background: rgba(0,0,0,0.2);
        border: 1px solid ${UI.borderDark};
      `;
      unitEl.innerHTML = `
        <div style="display:flex;justify-content:space-between;">
          <span style="color:${UI.playerColor}">${unit.name}</span>
          <span style="color:${UI.textDim}">Lv${unit.level}</span>
        </div>
        <div style="color:${UI.textDim};margin-top:2px;">${unit.jobName}</div>
      `;
      sidebar.appendChild(unitEl);
    }

    // Gold
    const goldEl = document.createElement('div');
    goldEl.style.cssText = `
      font-size: 10px;
      margin-top: 12px;
      padding-top: 8px;
      border-top: 1px solid ${UI.borderDark};
      color: ${UI.ctGold};
    `;
    goldEl.textContent = `${gameState.inventory.gold} Gil`;
    sidebar.appendChild(goldEl);

    // Spacer
    const spacer = document.createElement('div');
    spacer.style.cssText = 'flex:1;';
    sidebar.appendChild(spacer);

    // Save button
    const saveBtn = document.createElement('div');
    saveBtn.style.cssText = `
      text-align: center;
      padding: 8px 16px;
      cursor: pointer;
      font-size: 11px;
      color: ${UI.text};
      border: 2px solid ${UI.borderOuter};
      background: rgba(0,0,0,0.3);
      transition: background 0.15s;
      margin-top: 12px;
    `;
    saveBtn.textContent = 'Save Game';
    saveBtn.addEventListener('mouseenter', () => {
      saveBtn.style.background = UI.cursorHover;
    });
    saveBtn.addEventListener('mouseleave', () => {
      saveBtn.style.background = 'rgba(0,0,0,0.3)';
    });
    saveBtn.addEventListener('click', () => {
      saveGameState(gameState);
      saveBtn.textContent = 'Saved!';
      saveBtn.style.color = UI.hpGreen;
      setTimeout(() => {
        saveBtn.textContent = 'Save Game';
        saveBtn.style.color = UI.text;
      }, 1500);
      this.onSave?.();
    });
    sidebar.appendChild(saveBtn);

    // ─── Map area ───
    const mapArea = document.createElement('div');
    mapArea.style.cssText = `
      flex: 1;
      position: relative;
      overflow: hidden;
      background:
        radial-gradient(ellipse at 50% 50%, rgba(20,20,60,1) 0%, rgba(8,8,24,1) 100%);
    `;
    layout.appendChild(mapArea);

    // Map title
    const mapTitle = document.createElement('div');
    mapTitle.style.cssText = `
      position: absolute;
      top: 16px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 14px;
      color: ${UI.cursorActive};
      letter-spacing: 3px;
      text-shadow: 2px 2px 0px #000;
    `;
    mapTitle.textContent = 'WORLD MAP';
    mapArea.appendChild(mapTitle);

    // Render nodes
    const allNodes = this.worldMap.getAllNodes();
    const availableNodes = this.worldMap.getAvailableNodes(gameState);
    const availableIds = new Set(availableNodes.map((n) => n.id));
    const currentNodeId = this.worldMap.getCurrentNodeId();

    // Draw connections first (simple lines via SVG)
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;';
    mapArea.appendChild(svg);

    for (const node of allNodes) {
      if (node.chapter > gameState.currentChapter) continue;
      for (const connId of node.connectedNodes) {
        const conn = allNodes.find((n) => n.id === connId);
        if (!conn || conn.chapter > gameState.currentChapter) continue;
        // Avoid drawing duplicate lines
        if (connId < node.id) continue;

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', `${node.position.x}%`);
        line.setAttribute('y1', `${node.position.y}%`);
        line.setAttribute('x2', `${conn.position.x}%`);
        line.setAttribute('y2', `${conn.position.y}%`);
        line.setAttribute('stroke', 'rgba(120,120,160,0.3)');
        line.setAttribute('stroke-width', '2');
        line.setAttribute('stroke-dasharray', '4,4');
        svg.appendChild(line);
      }
    }

    // Draw node buttons
    for (const node of allNodes) {
      if (node.chapter > gameState.currentChapter) continue;

      const isAccessible = availableIds.has(node.id);
      const isCurrent = node.id === currentNodeId;
      const isCompleted = node.battleId ? gameState.completedBattles.has(node.battleId) : false;

      const nodeEl = document.createElement('div');
      nodeEl.style.cssText = `
        position: absolute;
        left: ${node.position.x}%;
        top: ${node.position.y}%;
        transform: translate(-50%, -50%);
        cursor: ${isAccessible ? 'pointer' : 'default'};
        text-align: center;
      `;

      // Icon
      const iconEl = document.createElement('div');
      const iconColor = !isAccessible
        ? '#555'
        : isCurrent
          ? UI.cursorActive
          : isCompleted
            ? UI.hpGreen
            : UI.text;

      iconEl.style.cssText = `
        font-size: 14px;
        color: ${iconColor};
        margin-bottom: 2px;
        ${isCurrent ? `text-shadow: 0 0 8px ${UI.cursorActive};` : ''}
      `;
      iconEl.textContent = this.getNodeIcon(node.type, isCompleted);
      nodeEl.appendChild(iconEl);

      // Name label
      const labelEl = document.createElement('div');
      labelEl.style.cssText = `
        font-size: 7px;
        color: ${isAccessible ? UI.textDim : '#444'};
        white-space: nowrap;
        max-width: 100px;
        overflow: hidden;
        text-overflow: ellipsis;
      `;
      labelEl.textContent = node.name;
      nodeEl.appendChild(labelEl);

      if (isAccessible) {
        nodeEl.addEventListener('mouseenter', () => {
          iconEl.style.color = UI.cursorActive;
          iconEl.style.textShadow = `0 0 8px ${UI.cursorActive}`;
          labelEl.style.color = UI.text;
        });
        nodeEl.addEventListener('mouseleave', () => {
          iconEl.style.color = iconColor;
          iconEl.style.textShadow = isCurrent ? `0 0 8px ${UI.cursorActive}` : 'none';
          labelEl.style.color = UI.textDim;
        });
        nodeEl.addEventListener('click', () => {
          this.onNodeSelect?.(node.id);
        });
      }

      mapArea.appendChild(nodeEl);
    }
  }

  hide(): void {
    this.container.style.display = 'none';
    this.container.innerHTML = '';
  }

  setOnNodeSelect(callback: (nodeId: string) => void): void {
    this.onNodeSelect = callback;
  }

  setOnSave(callback: () => void): void {
    this.onSave = callback;
  }

  destroy(): void {
    this.container.remove();
  }

  private getNodeIcon(type: WorldNodeType, completed: boolean): string {
    if (completed) return '[*]';
    return NODE_ICONS[type];
  }
}
