// ─── Units Management Screen ───

import type { GameState } from '@/story/story-flags';
import type { RosterUnit } from '@/overworld/roster';
import type { JobId } from '@/data/jobs';
import { JOBS, getJobLevel, canUnlockJob, JP_LEVEL_THRESHOLDS } from '@/data/jobs';
import { ABILITIES, getAbilitiesForJob, type AbilityDefinition, type AbilityType } from '@/data/abilities';
import { EQUIPMENT, getEquipmentBySlot, getEquipment, type EquipmentDefinition, type EquipmentSlot } from '@/data/equipment';
import { equipmentManager, type UnitEquipment } from '@/units/equipment';
import type { PlayerInventory } from '@/overworld/shop';

// ─── UI Constants ───

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

type TabId = 'stats' | 'job' | 'abilities' | 'equipment';

export class UnitsScreen {
  private container: HTMLDivElement;
  private onBack: (() => void) | null = null;
  private gameState: GameState | null = null;
  private selectedUnitId: string | null = null;
  private activeTab: TabId = 'stats';

  // Equipment sub-state
  private selectedEquipSlot: EquipmentSlot | null = null;
  private hoveredEquipId: string | null = null;

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

  show(gameState: GameState): void {
    this.gameState = gameState;
    this.container.style.display = 'flex';
    this.activeTab = 'stats';
    this.selectedEquipSlot = null;
    this.hoveredEquipId = null;

    // Auto-select the first unit
    const units = gameState.roster.getAllUnits();
    if (units.length > 0 && !this.selectedUnitId) {
      this.selectedUnitId = units[0].id;
    }

    this.render();
  }

  hide(): void {
    this.container.style.display = 'none';
    this.container.innerHTML = '';
  }

  setOnBack(callback: () => void): void {
    this.onBack = callback;
  }

  destroy(): void {
    this.container.remove();
  }

  // ─── Render ───

  private render(): void {
    if (!this.gameState) return;
    this.container.innerHTML = '';

    const layout = document.createElement('div');
    layout.style.cssText = 'display:flex;width:100%;height:100%;flex-direction:column;';
    this.container.appendChild(layout);

    // Main content area (left panel + center panel)
    const mainArea = document.createElement('div');
    mainArea.style.cssText = 'display:flex;flex:1;overflow:hidden;';
    layout.appendChild(mainArea);

    // Left panel: unit list
    this.renderUnitList(mainArea);

    // Center panel: unit detail
    this.renderUnitDetail(mainArea);

    // Bottom: navigation bar
    this.renderNavBar(layout);
  }

  // ─── Left Panel: Unit List ───

  private renderUnitList(parent: HTMLElement): void {
    if (!this.gameState) return;

    const panel = document.createElement('div');
    panel.style.cssText = `
      ${PANEL_STYLE}
      width: 240px;
      min-width: 240px;
      padding: 16px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
    `;
    parent.appendChild(panel);

    // Title
    const title = document.createElement('div');
    title.style.cssText = `
      font-size: 11px;
      color: ${UI.ctGold};
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid ${UI.borderDark};
      letter-spacing: 2px;
      text-align: center;
    `;
    title.textContent = 'UNITS';
    panel.appendChild(title);

    const units = this.gameState.roster.getAllUnits();
    for (const unit of units) {
      const isSelected = unit.id === this.selectedUnitId;

      const unitEl = document.createElement('div');
      unitEl.style.cssText = `
        font-size: 9px;
        margin-bottom: 6px;
        padding: 8px 8px;
        background: ${isSelected ? 'rgba(70,100,200,0.15)' : 'rgba(0,0,0,0.2)'};
        border: 2px solid ${isSelected ? UI.ctGold : UI.borderDark};
        cursor: pointer;
        transition: background 0.1s;
      `;

      unitEl.addEventListener('mouseenter', () => {
        if (!isSelected) unitEl.style.background = UI.cursorHover;
      });
      unitEl.addEventListener('mouseleave', () => {
        unitEl.style.background = isSelected ? 'rgba(70,100,200,0.15)' : 'rgba(0,0,0,0.2)';
      });
      unitEl.addEventListener('click', () => {
        this.selectedUnitId = unit.id;
        this.selectedEquipSlot = null;
        this.hoveredEquipId = null;
        this.render();
      });

      unitEl.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="color:${UI.playerColor}">${unit.name}</span>
          <span style="color:${UI.textDim}">Lv${unit.level}</span>
        </div>
        <div style="color:${UI.textDim};margin-top:3px;">${unit.jobName}</div>
      `;
      panel.appendChild(unitEl);
    }
  }

  // ─── Center Panel: Unit Detail ───

  private renderUnitDetail(parent: HTMLElement): void {
    if (!this.gameState || !this.selectedUnitId) {
      // Show placeholder
      const placeholder = document.createElement('div');
      placeholder.style.cssText = `
        ${PANEL_STYLE}
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        color: ${UI.textDim};
      `;
      placeholder.textContent = 'Select a unit';
      parent.appendChild(placeholder);
      return;
    }

    const unit = this.gameState.roster.getUnit(this.selectedUnitId);
    if (!unit) return;

    const panel = document.createElement('div');
    panel.style.cssText = `
      ${PANEL_STYLE}
      flex: 1;
      padding: 16px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
    `;
    parent.appendChild(panel);

    // Tabs
    this.renderTabs(panel);

    // Tab content
    const content = document.createElement('div');
    content.style.cssText = 'flex:1;overflow-y:auto;margin-top:12px;';
    panel.appendChild(content);

    switch (this.activeTab) {
      case 'stats':
        this.renderStatsTab(content, unit);
        break;
      case 'job':
        this.renderJobTab(content, unit);
        break;
      case 'abilities':
        this.renderAbilitiesTab(content, unit);
        break;
      case 'equipment':
        this.renderEquipmentTab(content, unit);
        break;
    }
  }

  // ─── Tabs ───

  private renderTabs(parent: HTMLElement): void {
    const tabBar = document.createElement('div');
    tabBar.style.cssText = `
      display: flex;
      gap: 4px;
      border-bottom: 2px solid ${UI.borderDark};
      padding-bottom: 8px;
    `;
    parent.appendChild(tabBar);

    const tabs: { id: TabId; label: string }[] = [
      { id: 'stats', label: 'Stats' },
      { id: 'job', label: 'Job' },
      { id: 'abilities', label: 'Abilities' },
      { id: 'equipment', label: 'Equipment' },
    ];

    for (const tab of tabs) {
      const isActive = this.activeTab === tab.id;
      const tabBtn = document.createElement('div');
      tabBtn.style.cssText = `
        padding: 6px 14px;
        font-size: 9px;
        cursor: pointer;
        color: ${isActive ? UI.ctGold : UI.textDim};
        background: ${isActive ? 'rgba(216,176,64,0.12)' : 'transparent'};
        border: 1px solid ${isActive ? UI.ctGold : UI.borderDark};
        border-bottom: none;
        transition: background 0.1s;
        letter-spacing: 1px;
      `;
      tabBtn.textContent = tab.label;

      if (!isActive) {
        tabBtn.addEventListener('mouseenter', () => {
          tabBtn.style.background = UI.cursorHover;
        });
        tabBtn.addEventListener('mouseleave', () => {
          tabBtn.style.background = 'transparent';
        });
      }
      tabBtn.addEventListener('click', () => {
        this.activeTab = tab.id;
        this.selectedEquipSlot = null;
        this.hoveredEquipId = null;
        this.render();
      });

      tabBar.appendChild(tabBtn);
    }
  }

  // ─── Stats Tab ───

  private renderStatsTab(parent: HTMLElement, unit: RosterUnit): void {
    // Name + Level
    const header = document.createElement('div');
    header.style.cssText = `margin-bottom: 12px;`;
    header.innerHTML = `
      <div style="font-size:14px;color:${UI.playerColor};margin-bottom:4px;">${unit.name}</div>
      <div style="font-size:10px;color:${UI.textDim};">Level ${unit.level} ${unit.jobName}</div>
    `;
    parent.appendChild(header);

    // EXP bar
    this.renderBar(parent, 'EXP', unit.exp, 100, UI.ctGold);

    // Job level
    const jp = unit.jobJP[unit.jobId] ?? 0;
    const jobLevel = getJobLevel(jp);
    const nextThreshold = jobLevel < JP_LEVEL_THRESHOLDS.length
      ? JP_LEVEL_THRESHOLDS[jobLevel]
      : JP_LEVEL_THRESHOLDS[JP_LEVEL_THRESHOLDS.length - 1];
    const prevThreshold = jobLevel > 1 ? JP_LEVEL_THRESHOLDS[jobLevel - 1] : 0;
    const jpInLevel = jp - prevThreshold;
    const jpForLevel = nextThreshold - prevThreshold;

    const jobLevelEl = document.createElement('div');
    jobLevelEl.style.cssText = `font-size:9px;color:${UI.textDim};margin-bottom:4px;margin-top:8px;`;
    jobLevelEl.textContent = `Job Level ${jobLevel} (${jp} JP)`;
    parent.appendChild(jobLevelEl);
    this.renderBar(parent, 'JP', jpInLevel, jpForLevel, '#aa88ee');

    // HP / MP bars
    const hpMpSection = document.createElement('div');
    hpMpSection.style.cssText = 'margin-top:12px;';
    parent.appendChild(hpMpSection);
    this.renderBar(hpMpSection, `HP ${unit.maxHP}`, unit.maxHP, unit.maxHP, UI.hpGreen);
    this.renderBar(hpMpSection, `MP ${unit.maxMP}`, unit.maxMP, unit.maxMP, '#6090e0');

    // Stats grid
    const statsGrid = document.createElement('div');
    statsGrid.style.cssText = `
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 6px;
      margin-top: 16px;
    `;
    parent.appendChild(statsGrid);

    const stats: [string, number][] = [
      ['PA', unit.pa],
      ['MA', unit.ma],
      ['Speed', unit.speed],
      ['Move', unit.move],
      ['Jump', unit.jump],
      ['Brave', unit.brave],
      ['Faith', unit.faith],
    ];

    for (const [name, value] of stats) {
      const statEl = document.createElement('div');
      statEl.style.cssText = `
        font-size: 9px;
        padding: 4px 8px;
        background: rgba(0,0,0,0.2);
        border: 1px solid ${UI.borderDark};
        display: flex;
        justify-content: space-between;
      `;
      statEl.innerHTML = `
        <span style="color:${UI.textDim};">${name}</span>
        <span style="color:${UI.textBright};">${value}</span>
      `;
      statsGrid.appendChild(statEl);
    }
  }

  private renderBar(parent: HTMLElement, label: string, current: number, max: number, color: string): void {
    const barContainer = document.createElement('div');
    barContainer.style.cssText = `margin-bottom:6px;`;

    const labelEl = document.createElement('div');
    labelEl.style.cssText = `font-size:8px;color:${UI.textDim};margin-bottom:2px;display:flex;justify-content:space-between;`;
    labelEl.innerHTML = `<span>${label}</span><span>${current}/${max}</span>`;
    barContainer.appendChild(labelEl);

    const barOuter = document.createElement('div');
    barOuter.style.cssText = `
      width: 100%;
      height: 8px;
      background: rgba(0,0,0,0.4);
      border: 1px solid ${UI.borderDark};
    `;
    const barInner = document.createElement('div');
    const pct = max > 0 ? Math.min(100, (current / max) * 100) : 0;
    barInner.style.cssText = `
      width: ${pct}%;
      height: 100%;
      background: ${color};
    `;
    barOuter.appendChild(barInner);
    barContainer.appendChild(barOuter);
    parent.appendChild(barContainer);
  }

  // ─── Job Tab ───

  private renderJobTab(parent: HTMLElement, unit: RosterUnit): void {
    const currentJobLabel = document.createElement('div');
    currentJobLabel.style.cssText = `font-size:10px;color:${UI.ctGold};margin-bottom:12px;`;
    currentJobLabel.textContent = `Current Job: ${unit.jobName}`;
    parent.appendChild(currentJobLabel);

    const grid = document.createElement('div');
    grid.style.cssText = `
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 6px;
    `;
    parent.appendChild(grid);

    const allJobIds = Object.keys(JOBS) as JobId[];
    for (const jobId of allJobIds) {
      const job = JOBS[jobId];
      const isCurrent = jobId === unit.jobId;
      const isUnlocked = canUnlockJob(jobId, unit.jobJP);
      const jp = unit.jobJP[jobId] ?? 0;
      const level = getJobLevel(jp);

      let borderColor = UI.borderDark;
      let bgColor = 'rgba(0,0,0,0.2)';
      let textColor = '#555';

      if (isCurrent) {
        borderColor = UI.ctGold;
        bgColor = 'rgba(216,176,64,0.12)';
        textColor = UI.ctGold;
      } else if (isUnlocked) {
        borderColor = UI.hpGreen;
        bgColor = 'rgba(64,200,64,0.06)';
        textColor = UI.text;
      }

      const jobEl = document.createElement('div');
      jobEl.style.cssText = `
        padding: 8px 6px;
        text-align: center;
        border: 2px solid ${borderColor};
        background: ${bgColor};
        cursor: ${isUnlocked && !isCurrent ? 'pointer' : 'default'};
        transition: background 0.1s;
        font-size: 8px;
        position: relative;
      `;

      // Name
      const nameEl = document.createElement('div');
      nameEl.style.cssText = `color:${textColor};margin-bottom:4px;line-height:1.4;`;
      nameEl.textContent = job.name;
      jobEl.appendChild(nameEl);

      // JP / Level
      const jpEl = document.createElement('div');
      jpEl.style.cssText = `color:${UI.textDim};font-size:7px;`;
      jpEl.textContent = isUnlocked || jp > 0 ? `Lv${level} ${jp}JP` : 'Locked';
      jobEl.appendChild(jpEl);

      if (isUnlocked && !isCurrent) {
        jobEl.addEventListener('mouseenter', () => {
          jobEl.style.background = UI.cursorHover;
        });
        jobEl.addEventListener('mouseleave', () => {
          jobEl.style.background = bgColor;
        });
        jobEl.addEventListener('click', () => {
          if (!this.gameState) return;
          this.gameState.roster.changeJob(unit.id, jobId);
          this.render();
        });
      }

      // Tooltip for locked jobs
      if (!isUnlocked) {
        const reqs = job.prerequisites.map(p => {
          const prereqJob = JOBS[p.jobId];
          return `${prereqJob.name} Lv${p.level}`;
        }).join(', ');

        if (reqs) {
          jobEl.title = `Requires: ${reqs}`;
        }
      }

      grid.appendChild(jobEl);
    }
  }

  // ─── Abilities Tab ───

  private renderAbilitiesTab(parent: HTMLElement, unit: RosterUnit): void {
    const jp = unit.jobJP[unit.jobId] ?? 0;

    // Current job's learnable abilities
    const sectionTitle = document.createElement('div');
    sectionTitle.style.cssText = `font-size:10px;color:${UI.ctGold};margin-bottom:8px;`;
    sectionTitle.textContent = `${unit.jobName} Abilities (${jp} JP)`;
    parent.appendChild(sectionTitle);

    const jobAbilities = getAbilitiesForJob(unit.jobId);
    // We need to track learned abilities. Since RosterUnit doesn't have a learnedAbilities field,
    // we store them via jobJP spent pattern. For this UI we'll use a simple approach:
    // abilities are "learned" if the unit has a marker. Since the existing roster doesn't track
    // learned abilities directly, we'll use a convention based on what's available.

    // For now, show all job abilities with learn/equip functionality
    if (jobAbilities.length > 0) {
      for (const ability of jobAbilities) {
        this.renderAbilityRow(parent, ability, unit, jp);
      }
    } else {
      const noAbil = document.createElement('div');
      noAbil.style.cssText = `font-size:8px;color:${UI.textDim};padding:8px;`;
      noAbil.textContent = 'No abilities for this job.';
      parent.appendChild(noAbil);
    }

    // Show all learned abilities by type
    const allAbilities = Object.values(ABILITIES);
    const types: AbilityType[] = ['action', 'reaction', 'support', 'movement'];

    for (const type of types) {
      const typeAbilities = allAbilities.filter(a => a.type === type);
      if (typeAbilities.length === 0) continue;

      const typeTitle = document.createElement('div');
      typeTitle.style.cssText = `
        font-size:9px;
        color:${UI.ctGold};
        margin-top:16px;
        margin-bottom:6px;
        padding-bottom:4px;
        border-bottom:1px solid ${UI.borderDark};
        text-transform: uppercase;
        letter-spacing: 1px;
      `;
      typeTitle.textContent = `${type} Abilities`;
      parent.appendChild(typeTitle);

      for (const ability of typeAbilities) {
        const abilityJp = unit.jobJP[ability.jobId] ?? 0;
        this.renderAbilityRow(parent, ability, unit, abilityJp);
      }
    }
  }

  private renderAbilityRow(parent: HTMLElement, ability: AbilityDefinition, unit: RosterUnit, currentJP: number): void {
    // Simple heuristic: can't track truly learned abilities with current RosterUnit,
    // so we show all with JP cost and let users "learn" by spending JP
    const canAfford = currentJP >= ability.jpCost;

    const row = document.createElement('div');
    row.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 5px 8px;
      margin-bottom: 3px;
      background: rgba(0,0,0,0.2);
      border: 1px solid ${UI.borderDark};
      font-size: 8px;
    `;

    // Type badge
    const typeColors: Record<string, string> = {
      action: '#e88040',
      reaction: '#e06060',
      support: '#60a0e0',
      movement: '#60c060',
    };
    const badge = document.createElement('span');
    badge.style.cssText = `
      color: ${typeColors[ability.type] ?? UI.textDim};
      min-width: 14px;
      font-size: 7px;
    `;
    badge.textContent = ability.type[0].toUpperCase();
    row.appendChild(badge);

    // Name
    const nameEl = document.createElement('span');
    nameEl.style.cssText = `color:${UI.text};flex:1;`;
    nameEl.textContent = ability.name;
    row.appendChild(nameEl);

    // JP Cost
    const costEl = document.createElement('span');
    costEl.style.cssText = `color:${canAfford ? UI.ctGold : UI.textDim};min-width:50px;text-align:right;`;
    costEl.textContent = `${ability.jpCost} JP`;
    row.appendChild(costEl);

    // Learn button (only for current job abilities)
    if (ability.jobId === unit.jobId && canAfford) {
      const learnBtn = document.createElement('span');
      learnBtn.style.cssText = `
        color: ${UI.hpGreen};
        cursor: pointer;
        padding: 2px 6px;
        border: 1px solid ${UI.hpGreen};
        font-size: 7px;
      `;
      learnBtn.textContent = 'Learn';
      learnBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!this.gameState) return;
        // Spend JP to learn
        const currentJPVal = unit.jobJP[unit.jobId] ?? 0;
        if (currentJPVal >= ability.jpCost) {
          unit.jobJP[unit.jobId] = currentJPVal - ability.jpCost;
          this.render();
        }
      });
      row.appendChild(learnBtn);
    }

    // Description tooltip
    row.title = ability.description;

    parent.appendChild(row);
  }

  // ─── Equipment Tab ───

  private renderEquipmentTab(parent: HTMLElement, unit: RosterUnit): void {
    const slots: { slot: EquipmentSlot; label: string; equipKey: keyof typeof unit.equipment }[] = [
      { slot: 'weapon', label: 'Right Hand', equipKey: 'weapon' },
      { slot: 'shield', label: 'Left Hand', equipKey: 'shield' },
      { slot: 'head', label: 'Head', equipKey: 'head' },
      { slot: 'body', label: 'Body', equipKey: 'body' },
      { slot: 'accessory', label: 'Accessory', equipKey: 'accessory' },
    ];

    // Current equipment slots
    const slotsTitle = document.createElement('div');
    slotsTitle.style.cssText = `font-size:10px;color:${UI.ctGold};margin-bottom:8px;`;
    slotsTitle.textContent = 'Equipment';
    parent.appendChild(slotsTitle);

    for (const slotInfo of slots) {
      const equipId = unit.equipment[slotInfo.equipKey];
      const equip = equipId ? getEquipment(equipId) : null;
      const isSelected = this.selectedEquipSlot === slotInfo.slot;

      const slotEl = document.createElement('div');
      slotEl.style.cssText = `
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 8px;
        margin-bottom: 4px;
        background: ${isSelected ? 'rgba(216,176,64,0.12)' : 'rgba(0,0,0,0.2)'};
        border: 2px solid ${isSelected ? UI.ctGold : UI.borderDark};
        cursor: pointer;
        font-size: 9px;
        transition: background 0.1s;
      `;

      slotEl.addEventListener('mouseenter', () => {
        if (!isSelected) slotEl.style.background = UI.cursorHover;
      });
      slotEl.addEventListener('mouseleave', () => {
        slotEl.style.background = isSelected ? 'rgba(216,176,64,0.12)' : 'rgba(0,0,0,0.2)';
      });
      slotEl.addEventListener('click', () => {
        this.selectedEquipSlot = isSelected ? null : slotInfo.slot;
        this.hoveredEquipId = null;
        this.render();
      });

      const labelEl = document.createElement('span');
      labelEl.style.cssText = `color:${UI.textDim};min-width:90px;font-size:8px;`;
      labelEl.textContent = slotInfo.label;
      slotEl.appendChild(labelEl);

      const nameEl = document.createElement('span');
      nameEl.style.cssText = `color:${equip ? UI.text : UI.textDim};flex:1;`;
      nameEl.textContent = equip ? equip.name : 'Empty';
      slotEl.appendChild(nameEl);

      if (equip) {
        const statsStr = this.getEquipStatsSummary(equip);
        if (statsStr) {
          const statsEl = document.createElement('span');
          statsEl.style.cssText = `color:${UI.textDim};font-size:7px;`;
          statsEl.textContent = statsStr;
          slotEl.appendChild(statsEl);
        }
      }

      parent.appendChild(slotEl);
    }

    // Available equipment list when a slot is selected
    if (this.selectedEquipSlot) {
      this.renderEquipmentList(parent, unit, this.selectedEquipSlot);
    }

    // Stat preview when hovering an item
    if (this.hoveredEquipId && this.selectedEquipSlot) {
      this.renderStatPreview(parent, unit, this.hoveredEquipId, this.selectedEquipSlot);
    }
  }

  private renderEquipmentList(parent: HTMLElement, unit: RosterUnit, slot: EquipmentSlot): void {
    const divider = document.createElement('div');
    divider.style.cssText = `
      font-size:9px;
      color:${UI.ctGold};
      margin-top:12px;
      margin-bottom:6px;
      padding-bottom:4px;
      border-bottom:1px solid ${UI.borderDark};
      letter-spacing:1px;
    `;
    divider.textContent = `Available for ${slot.toUpperCase()}`;
    parent.appendChild(divider);

    // Get available equipment from inventory
    const available = this.getAvailableEquipment(unit, slot);

    if (available.length === 0) {
      const noItems = document.createElement('div');
      noItems.style.cssText = `font-size:8px;color:${UI.textDim};padding:8px;`;
      noItems.textContent = 'No compatible equipment available.';
      parent.appendChild(noItems);
      return;
    }

    // Unequip option
    const unequipEl = document.createElement('div');
    unequipEl.style.cssText = `
      display: flex;
      align-items: center;
      padding: 5px 8px;
      margin-bottom: 3px;
      background: rgba(0,0,0,0.2);
      border: 1px solid ${UI.borderDark};
      cursor: pointer;
      font-size: 8px;
      color: ${UI.textDim};
      transition: background 0.1s;
    `;
    unequipEl.textContent = '-- Remove --';
    unequipEl.addEventListener('mouseenter', () => {
      unequipEl.style.background = UI.cursorHover;
    });
    unequipEl.addEventListener('mouseleave', () => {
      unequipEl.style.background = 'rgba(0,0,0,0.2)';
    });
    unequipEl.addEventListener('click', () => {
      this.unequipSlot(unit, slot);
    });
    parent.appendChild(unequipEl);

    for (const equip of available) {
      const row = document.createElement('div');
      row.style.cssText = `
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 5px 8px;
        margin-bottom: 3px;
        background: rgba(0,0,0,0.2);
        border: 1px solid ${UI.borderDark};
        cursor: pointer;
        font-size: 8px;
        transition: background 0.1s;
      `;

      row.addEventListener('mouseenter', () => {
        row.style.background = UI.cursorHover;
        this.hoveredEquipId = equip.id;
        // Update stat preview without full re-render
        this.updateStatPreview(parent, unit, equip.id, slot);
      });
      row.addEventListener('mouseleave', () => {
        row.style.background = 'rgba(0,0,0,0.2)';
        this.hoveredEquipId = null;
        this.removeStatPreview(parent);
      });
      row.addEventListener('click', () => {
        this.equipItem(unit, slot, equip.id);
      });

      const nameEl = document.createElement('span');
      nameEl.style.cssText = `color:${UI.text};flex:1;`;
      nameEl.textContent = equip.name;
      row.appendChild(nameEl);

      const statsStr = this.getEquipStatsSummary(equip);
      if (statsStr) {
        const statsEl = document.createElement('span');
        statsEl.style.cssText = `color:${UI.textDim};font-size:7px;`;
        statsEl.textContent = statsStr;
        row.appendChild(statsEl);
      }

      parent.appendChild(row);
    }
  }

  private getEquipStatsSummary(equip: EquipmentDefinition): string {
    const parts: string[] = [];
    if (equip.wp > 0) parts.push(`WP${equip.wp}`);
    if (equip.hpBonus > 0) parts.push(`HP+${equip.hpBonus}`);
    if (equip.mpBonus > 0) parts.push(`MP+${equip.mpBonus}`);
    if (equip.paBonus > 0) parts.push(`PA+${equip.paBonus}`);
    if (equip.maBonus > 0) parts.push(`MA+${equip.maBonus}`);
    if (equip.speedBonus > 0) parts.push(`Spd+${equip.speedBonus}`);
    if (equip.physEvade > 0) parts.push(`Ev${equip.physEvade}%`);
    return parts.join(' ');
  }

  private renderStatPreview(parent: HTMLElement, unit: RosterUnit, equipId: string, slot: EquipmentSlot): void {
    const equip = getEquipment(equipId);
    if (!equip) return;

    const currentEquipKey = this.slotToEquipKey(slot);
    const currentEquipId = unit.equipment[currentEquipKey];
    const currentEquip = currentEquipId ? getEquipment(currentEquipId) : null;

    const preview = document.createElement('div');
    preview.id = 'equip-stat-preview';
    preview.style.cssText = `
      margin-top: 8px;
      padding: 8px;
      background: rgba(0,0,0,0.3);
      border: 1px solid ${UI.borderDark};
      font-size: 8px;
    `;

    const titleEl = document.createElement('div');
    titleEl.style.cssText = `color:${UI.ctGold};margin-bottom:6px;`;
    titleEl.textContent = equip.name;
    preview.appendChild(titleEl);

    const compareStats: [string, number, number][] = [
      ['HP', currentEquip?.hpBonus ?? 0, equip.hpBonus],
      ['MP', currentEquip?.mpBonus ?? 0, equip.mpBonus],
      ['PA', currentEquip?.paBonus ?? 0, equip.paBonus],
      ['MA', currentEquip?.maBonus ?? 0, equip.maBonus],
      ['Speed', currentEquip?.speedBonus ?? 0, equip.speedBonus],
      ['WP', currentEquip?.wp ?? 0, equip.wp],
      ['P.Evade', currentEquip?.physEvade ?? 0, equip.physEvade],
    ];

    for (const [name, oldVal, newVal] of compareStats) {
      const diff = newVal - oldVal;
      if (diff === 0 && oldVal === 0) continue;

      const statEl = document.createElement('div');
      statEl.style.cssText = `display:flex;justify-content:space-between;margin-bottom:2px;`;

      let diffColor = UI.textDim;
      let diffText = `${newVal}`;
      if (diff > 0) {
        diffColor = UI.hpGreen;
        diffText = `${newVal} (+${diff})`;
      } else if (diff < 0) {
        diffColor = UI.hpRed;
        diffText = `${newVal} (${diff})`;
      }

      statEl.innerHTML = `
        <span style="color:${UI.textDim};">${name}</span>
        <span style="color:${diffColor};">${diffText}</span>
      `;
      preview.appendChild(statEl);
    }

    parent.appendChild(preview);
  }

  private updateStatPreview(parent: HTMLElement, unit: RosterUnit, equipId: string, slot: EquipmentSlot): void {
    this.removeStatPreview(parent);
    this.renderStatPreview(parent, unit, equipId, slot);
  }

  private removeStatPreview(parent: HTMLElement): void {
    const existing = parent.querySelector('#equip-stat-preview');
    if (existing) existing.remove();
  }

  private slotToEquipKey(slot: EquipmentSlot): keyof RosterUnit['equipment'] {
    switch (slot) {
      case 'weapon': return 'weapon';
      case 'shield': return 'shield';
      case 'head': return 'head';
      case 'body': return 'body';
      case 'accessory': return 'accessory';
    }
  }

  private getAvailableEquipment(unit: RosterUnit, slot: EquipmentSlot): EquipmentDefinition[] {
    if (!this.gameState) return [];

    // Get all equipment for this slot that the unit's job can equip
    const allForSlot = getEquipmentBySlot(slot);
    const job = JOBS[unit.jobId];
    if (!job) return [];

    return allForSlot.filter(equip => {
      return equipmentManager.canEquip(equip.id, unit.jobId);
    });
  }

  private equipItem(unit: RosterUnit, slot: EquipmentSlot, equipId: string): void {
    if (!this.gameState) return;

    const equipKey = this.slotToEquipKey(slot);
    unit.equipment[equipKey] = equipId;
    this.selectedEquipSlot = null;
    this.hoveredEquipId = null;
    this.render();
  }

  private unequipSlot(unit: RosterUnit, slot: EquipmentSlot): void {
    if (!this.gameState) return;

    const equipKey = this.slotToEquipKey(slot);
    unit.equipment[equipKey] = null;
    this.selectedEquipSlot = null;
    this.hoveredEquipId = null;
    this.render();
  }

  // ─── Bottom Nav ───

  private renderNavBar(parent: HTMLElement): void {
    const nav = document.createElement('div');
    nav.style.cssText = `
      ${PANEL_STYLE}
      padding: 10px 24px;
      display: flex;
      justify-content: flex-start;
      border-top: 3px solid ${UI.borderOuter};
    `;
    parent.appendChild(nav);

    const backBtn = document.createElement('div');
    backBtn.style.cssText = `
      padding: 8px 20px;
      cursor: pointer;
      font-size: 11px;
      color: ${UI.text};
      border: 2px solid ${UI.borderOuter};
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
    nav.appendChild(backBtn);
  }
}
