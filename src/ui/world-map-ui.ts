// ─── World Map UI Screen ───

import type { GameState } from '@/story/story-flags';
import { saveGameState } from '@/story/story-flags';
import { WorldMap, type WorldMapNode, type WorldNodeType } from '@/overworld/world-map';
import { generateWorldMapCanvas } from '@/rendering/world-map-canvas';

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
  story_battle: '⚔',
  town: '🏠',
  random_encounter: '●',
  locked: '???',
};

// Inject CSS animations for world map nodes
const worldMapStyleId = 'world-map-styles';
if (!document.getElementById(worldMapStyleId)) {
  const style = document.createElement('style');
  style.id = worldMapStyleId;
  style.textContent = `
    @keyframes wm-pulse-gold {
      0%, 100% { text-shadow: 0 0 8px #ffe888, 0 0 16px #d8b040; }
      50% { text-shadow: 0 0 16px #ffe888, 0 0 32px #d8b040, 0 0 48px #ffe88844; }
    }
    @keyframes wm-pulse-available {
      0%, 100% { text-shadow: 0 0 4px rgba(255,255,255,0.4); }
      50% { text-shadow: 0 0 10px rgba(255,255,255,0.8), 0 0 20px rgba(255,232,136,0.3); }
    }
  `;
  document.head.appendChild(style);
}

export class WorldMapUI {
  private container: HTMLDivElement;
  private worldMap: WorldMap;
  private onNodeSelect: ((nodeId: string) => void) | null = null;
  private onSave: (() => void) | null = null;
  private onUnits: (() => void) | null = null;

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

    // Units button
    const unitsBtn = document.createElement('div');
    unitsBtn.style.cssText = `
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
    unitsBtn.textContent = 'Units';
    unitsBtn.addEventListener('mouseenter', () => {
      unitsBtn.style.background = UI.cursorHover;
    });
    unitsBtn.addEventListener('mouseleave', () => {
      unitsBtn.style.background = 'rgba(0,0,0,0.3)';
    });
    unitsBtn.addEventListener('click', () => {
      this.onUnits?.();
    });
    sidebar.appendChild(unitsBtn);

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
      background: #2a2218;
    `;
    layout.appendChild(mapArea);

    // Generate parchment world map background
    const allNodes = this.worldMap.getAllNodes();
    const mapConnections: Array<[string, string]> = [];
    for (const node of allNodes) {
      if (node.chapter > gameState.currentChapter) continue;
      for (const connId of node.connectedNodes) {
        const conn = allNodes.find(n => n.id === connId);
        if (!conn || conn.chapter > gameState.currentChapter) continue;
        if (connId < node.id) continue;
        mapConnections.push([node.id, connId]);
      }
    }

    // Render the map canvas once we know the container size
    requestAnimationFrame(() => {
      const rect = mapArea.getBoundingClientRect();
      const mapNodes = allNodes
        .filter(n => n.chapter <= gameState.currentChapter)
        .map(n => ({
          id: n.id,
          name: n.name,
          type: n.type,
          x: n.position.x,
          y: n.position.y,
        }));

      const mapCanvas = generateWorldMapCanvas(
        Math.floor(rect.width),
        Math.floor(rect.height),
        mapNodes,
        mapConnections
      );
      mapCanvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;';
      mapArea.insertBefore(mapCanvas, mapArea.firstChild);
    });

    // Render interactive node buttons on top of the map canvas
    const availableNodes = this.worldMap.getAvailableNodes(gameState);
    const availableIds = new Set(availableNodes.map((n) => n.id));
    const currentNodeId = this.worldMap.getCurrentNodeId();

    // Draw node buttons
    for (const node of allNodes) {
      if (node.chapter > gameState.currentChapter) continue;

      const isAccessible = availableIds.has(node.id);
      const isCurrent = node.id === currentNodeId;
      const isCompleted = node.battleId ? gameState.completedBattles.has(node.battleId) : false;
      const isLocked = node.type === 'locked';

      // Hide locked nodes entirely
      if (isLocked && !isAccessible) continue;

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
      let iconColor: string;
      let iconAnimation = '';

      if (isCurrent) {
        iconColor = UI.cursorActive;
        iconAnimation = 'animation: wm-pulse-gold 1.5s ease-in-out infinite;';
      } else if (isCompleted) {
        iconColor = '#6a9a6a';
      } else if (isAccessible) {
        iconColor = '#fffbe0';
        iconAnimation = 'animation: wm-pulse-available 2s ease-in-out infinite;';
      } else {
        iconColor = '#555';
      }

      iconEl.style.cssText = `
        font-size: 22px;
        color: ${iconColor};
        margin-bottom: 3px;
        ${iconAnimation}
      `;
      iconEl.textContent = this.getNodeIcon(node.type, isCompleted);
      nodeEl.appendChild(iconEl);

      // Name label
      const labelEl = document.createElement('div');
      const labelColor = isCurrent
        ? UI.cursorActive
        : isCompleted
          ? '#7a8a7a'
          : isAccessible
            ? UI.text
            : '#555';
      labelEl.style.cssText = `
        font-size: 11px;
        color: ${labelColor};
        white-space: nowrap;
        max-width: 140px;
        overflow: hidden;
        text-overflow: ellipsis;
        text-shadow: 1px 1px 2px #000, 0 0 4px rgba(0,0,0,0.8);
      `;
      labelEl.textContent = node.name;
      nodeEl.appendChild(labelEl);

      // "(You are here)" indicator for current node
      if (isCurrent) {
        const hereEl = document.createElement('div');
        hereEl.style.cssText = `
          font-size: 9px;
          color: ${UI.cursorActive};
          white-space: nowrap;
          margin-top: 1px;
          text-shadow: 1px 1px 2px #000;
          letter-spacing: 0.5px;
        `;
        hereEl.textContent = '(You are here)';
        nodeEl.appendChild(hereEl);
      }

      // Completed checkmark overlay
      if (isCompleted) {
        const checkEl = document.createElement('div');
        checkEl.style.cssText = `
          font-size: 14px;
          color: ${UI.hpGreen};
          position: absolute;
          top: -2px;
          right: -8px;
          text-shadow: 1px 1px 2px #000;
        `;
        checkEl.textContent = '✓';
        nodeEl.appendChild(checkEl);
      }

      if (isAccessible) {
        nodeEl.addEventListener('mouseenter', () => {
          iconEl.style.color = UI.cursorActive;
          iconEl.style.animation = 'wm-pulse-gold 1s ease-in-out infinite';
          labelEl.style.color = UI.textBright;
        });
        nodeEl.addEventListener('mouseleave', () => {
          iconEl.style.color = iconColor;
          iconEl.style.animation = iconAnimation ? iconAnimation.replace('animation: ', '').replace(';', '') : 'none';
          labelEl.style.color = labelColor;
        });
        nodeEl.addEventListener('click', () => {
          this.onNodeSelect?.(node.id);
        });
      }

      mapArea.appendChild(nodeEl);
    }

    // Legend at the bottom of map area
    const legend = document.createElement('div');
    legend.style.cssText = `
      position: absolute;
      bottom: 12px;
      left: 50%;
      transform: translateX(-50%);
      ${PANEL_STYLE}
      padding: 6px 16px;
      font-size: 10px;
      display: flex;
      gap: 20px;
      white-space: nowrap;
    `;
    legend.innerHTML = `
      <span>⚔ Battle</span>
      <span>🏠 Town</span>
      <span>● Encounter</span>
    `;
    mapArea.appendChild(legend);
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

  setOnUnits(callback: () => void): void {
    this.onUnits = callback;
  }

  destroy(): void {
    this.container.remove();
  }

  private getNodeIcon(type: WorldNodeType, completed: boolean): string {
    if (completed) return NODE_ICONS[type];
    return NODE_ICONS[type];
  }
}
