import type { BattleMapData } from '@/data/maps/map-types';
import type { CTUnit } from './ct-system';
import { advanceToNextTurn, resolveTurnEnd, predictTurnOrder } from './ct-system';
import { calculateMoveRange, calculateAttackRange, findPath } from './movement';
import { Direction } from '@/core/constants';
import { calculateDamage, calculateHitChance, type DamageInput, type WeaponCategory } from './damage-calc';
import { statusManager, type AppliedStatus, type StatusTickResult } from './status-effects';
import type { ElementAffinityMap } from '@/data/elements';
import type { ZodiacSign } from '@/data/zodiac';

import type { StatusId } from './status-effects';

// ─── Types ───

export interface DamageDisplayData {
  targetId: string;
  amount: number;
  isCritical: boolean;
  isHealing: boolean;
  isMiss: boolean;
  timestamp: number;
}

export type BattlePhase =
  | 'init'
  | 'advancing_ct'
  | 'unit_turn_start'
  | 'select_action'
  | 'select_move'
  | 'select_target'
  | 'confirm_facing'
  | 'executing_action'
  | 'unit_turn_end'
  | 'ai_thinking'
  | 'battle_won'
  | 'battle_lost';

export interface BattleUnit {
  id: string;
  name: string;
  team: 'player' | 'enemy' | 'ally' | 'neutral';
  jobName: string;

  // Position
  x: number;
  y: number;
  facing: Direction;

  // Stats
  maxHP: number;
  currentHP: number;
  maxMP: number;
  currentMP: number;
  pa: number;  // Physical Attack
  ma: number;  // Magic Attack
  speed: number;
  move: number;
  jump: number;
  brave: number;
  faith: number;

  // CT
  ct: number;
  isAlive: boolean;

  // Status (legacy flags kept for CT system compat)
  hasHaste: boolean;
  hasSlow: boolean;
  hasStopped: boolean;
  isPetrified: boolean;

  // New status effect system
  statusEffects: AppliedStatus[];
  statusImmunities: Set<StatusId>;

  // Zodiac & elements
  zodiacSign: ZodiacSign | null;
  elementalAffinities: ElementAffinityMap;

  // Turn state
  hasMoved: boolean;
  hasActed: boolean;

  // Equipment
  weaponPower: number;
  weaponType: string;
  weaponCategory: WeaponCategory;
  weaponAccuracy: number;
  weaponElement: import('@/data/elements').Element | null;
  attackRange: number;
  shieldEvasion: number;
  accessoryEvasion: number;
  classEvasion: number;

  // Support abilities
  hasAttackUp: boolean;

  // Last combat results (for rendering)
  lastDamageResult: DamageDisplayData | null;
}

export interface BattleState {
  map: BattleMapData;
  units: BattleUnit[];
  phase: BattlePhase;
  activeUnitId: string | null;
  selectedTile: { x: number; y: number } | null;
  moveRange: Set<string>;
  attackRange: Set<string>;
  movePath: Array<{ x: number; y: number }>;
  turnOrder: string[];
  turnCount: number;
  damageDisplay: DamageDisplayData[];
}

// ─── Battle Manager ───

export class BattleManager {
  state: BattleState;

  constructor(map: BattleMapData, units: BattleUnit[]) {
    this.state = {
      map,
      units,
      phase: 'init',
      activeUnitId: null,
      selectedTile: null,
      moveRange: new Set(),
      attackRange: new Set(),
      movePath: [],
      turnOrder: [],
      turnCount: 0,
      damageDisplay: [],
    };
  }

  /**
   * Start the battle: advance CT until someone gets a turn.
   */
  startBattle(): void {
    this.state.phase = 'advancing_ct';
    this.advanceCT();
  }

  /**
   * Advance the CT clock until a unit is ready to act.
   */
  advanceCT(): void {
    const ctUnits = this.getCTUnits();
    const readyId = advanceToNextTurn(ctUnits);

    // Sync CT values back
    this.syncCTValues(ctUnits);

    if (!readyId) {
      console.error('No unit could take a turn');
      return;
    }

    this.state.activeUnitId = readyId;
    this.state.turnCount++;
    this.state.turnOrder = predictTurnOrder(this.getCTUnits(), 12);
    this.beginUnitTurn(readyId);
  }

  private beginUnitTurn(unitId: string): void {
    const unit = this.getUnit(unitId);
    if (!unit) return;

    unit.hasMoved = false;
    unit.hasActed = false;

    // Sync legacy status flags from new status system
    this.syncStatusFlags(unit);

    // Check if turn should be skipped (stop, stone, sleep, death)
    if (statusManager.shouldSkipTurn(unit.statusEffects)) {
      // Still process tick effects (e.g. poison can kill a stopped unit)
      this.processStatusTicks(unit);
      this.endTurn();
      return;
    }

    // Process start-of-turn status ticks (poison damage, regen, etc.)
    this.processStatusTicks(unit);

    // Check if unit died from poison
    if (unit.currentHP <= 0) {
      unit.currentHP = 0;
      unit.isAlive = false;
      this.checkBattleEnd();
      if (this.state.phase === 'battle_won' || this.state.phase === 'battle_lost') return;
      this.endTurn();
      return;
    }

    // Restrict actions based on status
    if (statusManager.cannotMove(unit.statusEffects)) {
      unit.hasMoved = true; // can't move
    }
    if (statusManager.cannotAct(unit.statusEffects)) {
      unit.hasActed = true; // can't act
    }

    if (unit.team === 'player') {
      this.state.phase = 'select_action';
      this.calculateRanges(unit);
    } else {
      this.state.phase = 'ai_thinking';
      // AI will be implemented later — for now, auto-wait
      setTimeout(() => this.doAITurn(unit), 500);
    }
  }

  private processStatusTicks(unit: BattleUnit): void {
    const results = statusManager.processStartOfTurn(
      unit.statusEffects,
      unit.maxHP,
      unit.maxMP
    );

    for (const result of results) {
      if (result.hpChange !== 0) {
        unit.currentHP = Math.max(0, Math.min(unit.maxHP, unit.currentHP + result.hpChange));
        this.addDamageDisplay(unit.id, Math.abs(result.hpChange), false, result.hpChange > 0, false);
      }
    }

    // Sync flags after status changes
    this.syncStatusFlags(unit);
  }

  private syncStatusFlags(unit: BattleUnit): void {
    unit.hasHaste = statusManager.hasStatus(unit.statusEffects, 'haste');
    unit.hasSlow = statusManager.hasStatus(unit.statusEffects, 'slow');
    unit.hasStopped = statusManager.hasStatus(unit.statusEffects, 'stop');
    unit.isPetrified = statusManager.hasStatus(unit.statusEffects, 'stone');
  }

  private addDamageDisplay(
    targetId: string,
    amount: number,
    isCritical: boolean,
    isHealing: boolean,
    isMiss: boolean
  ): void {
    this.state.damageDisplay.push({
      targetId,
      amount,
      isCritical,
      isHealing,
      isMiss,
      timestamp: Date.now(),
    });
  }

  private calculateRanges(unit: BattleUnit): void {
    const occupied = this.getOccupiedTiles(unit.id);
    this.state.moveRange = calculateMoveRange(
      unit.x, unit.y, unit.move, unit.jump,
      this.state.map, occupied
    );
    this.state.attackRange = calculateAttackRange(
      unit.x, unit.y, 1, unit.attackRange,
      this.state.map
    );
  }

  /**
   * Player selects "Move" from the action menu.
   */
  selectMove(): void {
    if (this.state.phase !== 'select_action') return;
    const unit = this.getActiveUnit();
    if (!unit || unit.hasMoved) return;

    this.state.phase = 'select_move';
  }

  /**
   * Player clicks a tile to move to.
   */
  confirmMove(x: number, y: number): boolean {
    if (this.state.phase !== 'select_move') return false;
    const unit = this.getActiveUnit();
    if (!unit) return false;

    const key = `${x},${y}`;
    if (!this.state.moveRange.has(key)) return false;

    // Find path for animation
    const occupied = this.getOccupiedTiles(unit.id);
    const path = findPath(unit.x, unit.y, x, y, unit.jump, this.state.map, occupied);
    if (!path) return false;

    this.state.movePath = path;
    unit.x = x;
    unit.y = y;
    unit.hasMoved = true;

    // Recalculate attack range from new position
    this.state.attackRange = calculateAttackRange(
      unit.x, unit.y, 1, unit.attackRange,
      this.state.map
    );

    this.state.phase = 'select_action';
    return true;
  }

  /**
   * Player selects "Attack" from the action menu.
   */
  selectAttack(): void {
    if (this.state.phase !== 'select_action') return;
    const unit = this.getActiveUnit();
    if (!unit || unit.hasActed) return;

    this.state.phase = 'select_target';
  }

  /**
   * Player confirms an attack on a target tile.
   */
  confirmAttack(targetX: number, targetY: number): boolean {
    if (this.state.phase !== 'select_target') return false;
    const unit = this.getActiveUnit();
    if (!unit) return false;

    const key = `${targetX},${targetY}`;
    if (!this.state.attackRange.has(key)) return false;

    // Find target unit
    const target = this.state.units.find(
      (u) => u.x === targetX && u.y === targetY && u.isAlive && u.id !== unit.id
    );
    if (!target) return false;

    // Face toward target
    unit.facing = this.getFacingToward(unit.x, unit.y, targetX, targetY);

    // Build damage input
    const dmgInput = this.buildDamageInput(unit, target, false);

    // Hit check
    const hitResult = calculateHitChance(dmgInput);
    if (!hitResult.hit) {
      this.addDamageDisplay(target.id, 0, false, false, true);
      target.lastDamageResult = {
        targetId: target.id, amount: 0, isCritical: false, isHealing: false, isMiss: true, timestamp: Date.now(),
      };
      unit.hasActed = true;
      this.state.phase = 'select_action';
      return true;
    }

    // Calculate damage
    const dmgResult = calculateDamage(dmgInput);

    if (dmgResult.isHealing) {
      target.currentHP = Math.min(target.maxHP, target.currentHP + dmgResult.damage);
    } else {
      target.currentHP = Math.max(0, target.currentHP - dmgResult.damage);
    }

    this.addDamageDisplay(target.id, dmgResult.damage, dmgResult.isCritical, dmgResult.isHealing, false);
    target.lastDamageResult = {
      targetId: target.id,
      amount: dmgResult.damage,
      isCritical: dmgResult.isCritical,
      isHealing: dmgResult.isHealing,
      isMiss: false,
      timestamp: Date.now(),
    };

    if (target.currentHP <= 0) {
      target.isAlive = false;
    }

    unit.hasActed = true;
    this.state.phase = 'select_action';

    // Check win/lose conditions
    this.checkBattleEnd();

    return true;
  }

  /**
   * Player selects "Wait" — end turn with facing selection.
   */
  selectWait(): void {
    this.state.phase = 'confirm_facing';
  }

  /**
   * Confirm facing direction and end turn.
   */
  confirmFacing(direction: Direction): void {
    const unit = this.getActiveUnit();
    if (unit) {
      unit.facing = direction;
    }
    this.endTurn();
  }

  /**
   * End the current unit's turn and advance CT.
   */
  endTurn(): void {
    const unit = this.getActiveUnit();
    if (!unit) return;

    const ctUnit = this.getCTUnits().find((u) => u.id === unit.id);
    if (ctUnit) {
      resolveTurnEnd(ctUnit, unit.hasMoved, unit.hasActed);
      unit.ct = ctUnit.ct;
    }

    this.state.phase = 'advancing_ct';
    this.state.activeUnitId = null;
    this.state.moveRange = new Set();
    this.state.attackRange = new Set();
    this.state.movePath = [];

    // Small delay then advance to next turn
    setTimeout(() => this.advanceCT(), 300);
  }

  /**
   * Cancel the current selection and go back.
   */
  cancel(): void {
    switch (this.state.phase) {
      case 'select_move':
      case 'select_target':
      case 'confirm_facing':
        this.state.phase = 'select_action';
        break;
    }
  }

  // ─── AI (placeholder) ───

  private doAITurn(unit: BattleUnit): void {
    // Simple AI: move toward nearest enemy and attack if possible
    const enemies = this.state.units.filter(
      (u) => u.isAlive && u.team !== unit.team
    );

    if (enemies.length === 0) {
      this.endTurn();
      return;
    }

    // Find nearest enemy
    let nearest = enemies[0];
    let nearestDist = Infinity;
    for (const enemy of enemies) {
      const dist = Math.abs(enemy.x - unit.x) + Math.abs(enemy.y - unit.y);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = enemy;
      }
    }

    // Calculate move range
    const occupied = this.getOccupiedTiles(unit.id);
    const moveRange = calculateMoveRange(
      unit.x, unit.y, unit.move, unit.jump,
      this.state.map, occupied
    );

    // Find best tile to move to (closest to nearest enemy)
    let bestTile = { x: unit.x, y: unit.y };
    let bestDist = nearestDist;

    for (const key of moveRange) {
      const [mx, my] = key.split(',').map(Number);
      const dist = Math.abs(mx - nearest.x) + Math.abs(my - nearest.y);
      if (dist < bestDist) {
        bestDist = dist;
        bestTile = { x: mx, y: my };
      }
    }

    // Move
    if (bestTile.x !== unit.x || bestTile.y !== unit.y) {
      unit.x = bestTile.x;
      unit.y = bestTile.y;
      unit.hasMoved = true;
    }

    // Attack if in range
    const attackRange = calculateAttackRange(
      unit.x, unit.y, 1, unit.attackRange,
      this.state.map
    );

    for (const enemy of enemies) {
      if (attackRange.has(`${enemy.x},${enemy.y}`)) {
        unit.facing = this.getFacingToward(unit.x, unit.y, enemy.x, enemy.y);
        const dmgInput = this.buildDamageInput(unit, enemy, false);
        const hitResult = calculateHitChance(dmgInput);

        if (hitResult.hit) {
          const dmgResult = calculateDamage(dmgInput);
          if (dmgResult.isHealing) {
            enemy.currentHP = Math.min(enemy.maxHP, enemy.currentHP + dmgResult.damage);
          } else {
            enemy.currentHP = Math.max(0, enemy.currentHP - dmgResult.damage);
          }
          this.addDamageDisplay(enemy.id, dmgResult.damage, dmgResult.isCritical, dmgResult.isHealing, false);
          enemy.lastDamageResult = {
            targetId: enemy.id, amount: dmgResult.damage, isCritical: dmgResult.isCritical,
            isHealing: dmgResult.isHealing, isMiss: false, timestamp: Date.now(),
          };
          if (enemy.currentHP <= 0) enemy.isAlive = false;
        } else {
          this.addDamageDisplay(enemy.id, 0, false, false, true);
          enemy.lastDamageResult = {
            targetId: enemy.id, amount: 0, isCritical: false, isHealing: false, isMiss: true, timestamp: Date.now(),
          };
        }
        unit.hasActed = true;
        break;
      }
    }

    // Face nearest enemy
    unit.facing = this.getFacingToward(unit.x, unit.y, nearest.x, nearest.y);

    this.checkBattleEnd();
    this.endTurn();
  }

  // ─── Helpers ───

  private getUnit(id: string): BattleUnit | undefined {
    return this.state.units.find((u) => u.id === id);
  }

  getActiveUnit(): BattleUnit | undefined {
    return this.state.activeUnitId ? this.getUnit(this.state.activeUnitId) : undefined;
  }

  private getCTUnits(): CTUnit[] {
    return this.state.units.map((u) => ({
      id: u.id,
      ct: u.ct,
      speed: u.speed,
      isAlive: u.isAlive,
      hasHaste: u.hasHaste,
      hasSlow: u.hasSlow,
      hasStopped: u.hasStopped,
      isPetrified: u.isPetrified,
    }));
  }

  private syncCTValues(ctUnits: CTUnit[]): void {
    for (const ctUnit of ctUnits) {
      const battleUnit = this.getUnit(ctUnit.id);
      if (battleUnit) battleUnit.ct = ctUnit.ct;
    }
  }

  private getOccupiedTiles(excludeId?: string): Set<string> {
    const occupied = new Set<string>();
    for (const unit of this.state.units) {
      if (!unit.isAlive) continue;
      if (unit.id === excludeId) continue;
      occupied.add(`${unit.x},${unit.y}`);
    }
    return occupied;
  }

  private getFacingToward(fromX: number, fromY: number, toX: number, toY: number): Direction {
    const dx = toX - fromX;
    const dy = toY - fromY;
    if (Math.abs(dx) >= Math.abs(dy)) {
      return dx > 0 ? Direction.East : Direction.West;
    }
    return dy > 0 ? Direction.South : Direction.North;
  }

  private buildDamageInput(
    attacker: BattleUnit,
    defender: BattleUnit,
    isMagic: boolean,
    abilityPower?: number,
    abilityElement?: import('@/data/elements').Element
  ): DamageInput {
    return {
      pa: attacker.pa,
      ma: attacker.ma,
      speed: attacker.speed,
      brave: attacker.brave,
      faith: attacker.faith,
      weaponPower: attacker.weaponPower,
      weaponCategory: attacker.weaponCategory,
      weaponAccuracy: attacker.weaponAccuracy,
      weaponElement: attacker.weaponElement,
      attackerFacing: attacker.facing,
      attackerStatuses: attacker.statusEffects,
      attackerZodiac: attacker.zodiacSign,
      hasAttackUp: attacker.hasAttackUp,
      defenderMaxHP: defender.maxHP,
      defenderCurrentHP: defender.currentHP,
      defenderFaith: defender.faith,
      defenderFacing: defender.facing,
      defenderStatuses: defender.statusEffects,
      defenderZodiac: defender.zodiacSign,
      defenderElementAffinities: defender.elementalAffinities,
      shieldEvasion: defender.shieldEvasion,
      accessoryEvasion: defender.accessoryEvasion,
      classEvasion: defender.classEvasion,
      defenderSpeed: defender.speed,
      isMagic,
      abilityPower,
      abilityElement,
    };
  }

  private checkBattleEnd(): void {
    const playerAlive = this.state.units.some((u) => u.team === 'player' && u.isAlive);
    const enemyAlive = this.state.units.some((u) => u.team === 'enemy' && u.isAlive);

    if (!enemyAlive) {
      this.state.phase = 'battle_won';
    } else if (!playerAlive) {
      this.state.phase = 'battle_lost';
    }
  }
}

// ─── Factory helpers ───

export function createBattleUnit(
  id: string,
  name: string,
  team: BattleUnit['team'],
  x: number,
  y: number,
  overrides: Partial<BattleUnit> = {}
): BattleUnit {
  return {
    id,
    name,
    team,
    jobName: 'Squire',
    x,
    y,
    facing: team === 'player' ? Direction.East : Direction.West,
    maxHP: 100,
    currentHP: 100,
    maxMP: 30,
    currentMP: 30,
    pa: 8,
    ma: 6,
    speed: 6,
    move: 4,
    jump: 3,
    brave: 70,
    faith: 70,
    ct: 0,
    isAlive: true,
    hasHaste: false,
    hasSlow: false,
    hasStopped: false,
    isPetrified: false,
    statusEffects: [],
    statusImmunities: new Set<StatusId>(),
    zodiacSign: null,
    elementalAffinities: {},
    hasMoved: false,
    hasActed: false,
    weaponPower: 5,
    weaponType: 'sword',
    weaponCategory: 'sword' as WeaponCategory,
    weaponAccuracy: 90,
    weaponElement: null,
    attackRange: 1,
    shieldEvasion: 0,
    accessoryEvasion: 0,
    classEvasion: 5,
    hasAttackUp: false,
    lastDamageResult: null,
    ...overrides,
  };
}
