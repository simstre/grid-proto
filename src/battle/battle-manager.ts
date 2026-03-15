import type { BattleMapData } from '@/data/maps/map-types';
import type { CTUnit } from './ct-system';
import { advanceToNextTurn, resolveTurnEnd, predictTurnOrder } from './ct-system';
import { calculateMoveRange, calculateAttackRange, findPath } from './movement';
import { Direction } from '@/core/constants';

// ─── Types ───

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

  // Status
  hasHaste: boolean;
  hasSlow: boolean;
  hasStopped: boolean;
  isPetrified: boolean;

  // Turn state
  hasMoved: boolean;
  hasActed: boolean;

  // Equipment (placeholder for now)
  weaponPower: number;
  weaponType: string;
  attackRange: number;
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

    if (unit.team === 'player') {
      this.state.phase = 'select_action';
      this.calculateRanges(unit);
    } else {
      this.state.phase = 'ai_thinking';
      // AI will be implemented later — for now, auto-wait
      setTimeout(() => this.doAITurn(unit), 500);
    }
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

    // Calculate damage (simplified for now - full formula in Phase 3)
    const damage = this.calculateBasicDamage(unit, target);
    target.currentHP = Math.max(0, target.currentHP - damage);

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
        const damage = this.calculateBasicDamage(unit, enemy);
        enemy.currentHP = Math.max(0, enemy.currentHP - damage);
        if (enemy.currentHP <= 0) enemy.isAlive = false;
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

  private calculateBasicDamage(attacker: BattleUnit, defender: BattleUnit): number {
    // Simplified damage formula: PA * WeaponPower
    // Full formula system will be in damage-calc.ts (Phase 3)
    const raw = attacker.pa * attacker.weaponPower;
    // Add some randomness (±10%)
    const variance = 0.9 + Math.random() * 0.2;
    return Math.max(1, Math.floor(raw * variance));
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
    hasMoved: false,
    hasActed: false,
    weaponPower: 5,
    weaponType: 'sword',
    attackRange: 1,
    ...overrides,
  };
}
