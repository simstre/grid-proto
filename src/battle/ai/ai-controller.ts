// ─── AI Controller ───
// Decision loop that evaluates all (move, action) pairs for an AI unit
// and returns the highest-scoring action. Faithful to FFT's AI behavior:
// the AI does NOT account for reaction abilities.

import type { BattleUnit } from '@/battle/battle-manager';
import type { BattleMapData } from '@/data/maps/map-types';
import { calculateMoveRange, calculateAttackRange } from '@/battle/movement';
import type { AIAction } from './ai-scoring';
import { scoreAction } from './ai-scoring';
import type { AIBehavior, ScoringWeights } from './ai-behaviors';
import { getBehaviorWeights, getDefaultBehavior } from './ai-behaviors';

// ─── Constants ───

/** Maximum candidate move positions to fully evaluate (performance limiter) */
const MAX_CANDIDATE_POSITIONS = 50;

// ─── AI Controller ───

export class AIController {
  private weights: ScoringWeights;
  private behavior: AIBehavior;

  constructor(behavior?: AIBehavior) {
    this.behavior = behavior ?? 'aggressive';
    this.weights = getBehaviorWeights(this.behavior);
  }

  /**
   * Decide the best (move, action) pair for an AI unit.
   * Evaluates reachable positions and possible actions from each position.
   */
  decideTurn(
    unit: BattleUnit,
    allUnits: BattleUnit[],
    map: BattleMapData
  ): AIAction {
    const enemies = allUnits.filter((u) => u.isAlive && u.team !== unit.team);
    const occupied = this.getOccupiedTiles(unit, allUnits);

    // Get all reachable move tiles + staying put
    const moveRange = calculateMoveRange(
      unit.x, unit.y, unit.move, unit.jump,
      map, occupied
    );

    // Build candidate positions (move targets)
    let candidates = this.buildCandidates(unit, moveRange, enemies);

    // Prune to top N candidates by heuristic (closest to enemies, or safest)
    if (candidates.length > MAX_CANDIDATE_POSITIONS) {
      candidates = this.pruneCandiates(candidates, unit, enemies);
    }

    // Evaluate all (position, action) pairs
    let bestAction: AIAction = {
      moveTarget: { x: unit.x, y: unit.y },
      actionType: 'wait',
      score: -Infinity,
    };

    for (const pos of candidates) {
      const actions = this.generateActionsFromPosition(pos, unit, allUnits, map);
      for (const action of actions) {
        action.score = scoreAction(action, unit, allUnits, map, this.weights);
        if (action.score > bestAction.score) {
          bestAction = action;
        }
      }
    }

    return bestAction;
  }

  /**
   * Create a controller with behavior derived from unit's job.
   */
  static forUnit(unit: BattleUnit): AIController {
    const behavior = getDefaultBehavior(unit.jobName);
    return new AIController(behavior);
  }

  // ─── Private helpers ───

  private getOccupiedTiles(unit: BattleUnit, allUnits: BattleUnit[]): Set<string> {
    const occupied = new Set<string>();
    for (const other of allUnits) {
      if (!other.isAlive || other.id === unit.id) continue;
      occupied.add(`${other.x},${other.y}`);
    }
    return occupied;
  }

  /**
   * Build candidate positions from move range + current position.
   */
  private buildCandidates(
    unit: BattleUnit,
    moveRange: Set<string>,
    _enemies: BattleUnit[]
  ): Array<{ x: number; y: number }> {
    const candidates: Array<{ x: number; y: number }> = [];

    // Always include staying put
    candidates.push({ x: unit.x, y: unit.y });

    // Add all reachable tiles
    for (const key of moveRange) {
      const [mx, my] = key.split(',').map(Number);
      candidates.push({ x: mx, y: my });
    }

    return candidates;
  }

  /**
   * Prune candidates to the top N by heuristic distance to nearest enemy.
   * Aggressive units prefer closer positions; defensive units prefer safer ones.
   */
  private pruneCandiates(
    candidates: Array<{ x: number; y: number }>,
    unit: BattleUnit,
    enemies: BattleUnit[]
  ): Array<{ x: number; y: number }> {
    // Score each candidate by proximity heuristic
    const scored = candidates.map((pos) => {
      let minDist = Infinity;
      for (const enemy of enemies) {
        const d = Math.abs(pos.x - enemy.x) + Math.abs(pos.y - enemy.y);
        if (d < minDist) minDist = d;
      }

      // Aggressive behaviors prefer closer, defensive prefer farther
      const isAggressive = this.behavior === 'aggressive';
      const heuristic = isAggressive ? -minDist : minDist;

      // Always include current position with high priority
      const isCurrentPos = pos.x === unit.x && pos.y === unit.y;

      return { pos, heuristic, isCurrentPos };
    });

    // Sort: current position first, then by heuristic (descending)
    scored.sort((a, b) => {
      if (a.isCurrentPos) return -1;
      if (b.isCurrentPos) return 1;
      return b.heuristic - a.heuristic;
    });

    return scored.slice(0, MAX_CANDIDATE_POSITIONS).map((s) => s.pos);
  }

  /**
   * Generate all possible actions from a given position.
   */
  private generateActionsFromPosition(
    pos: { x: number; y: number },
    unit: BattleUnit,
    allUnits: BattleUnit[],
    map: BattleMapData
  ): AIAction[] {
    const actions: AIAction[] = [];

    // Always consider waiting at this position
    actions.push({
      moveTarget: pos,
      actionType: 'wait',
      score: 0,
    });

    // Skip attack generation if unit can't act
    if (unit.hasActed) return actions;

    // Calculate attack range from this candidate position
    const attackTiles = calculateAttackRange(
      pos.x, pos.y, 1, unit.attackRange, map
    );

    // Check each enemy as potential target
    for (const target of allUnits) {
      if (!target.isAlive || target.team === unit.team) continue;

      const targetKey = `${target.x},${target.y}`;
      if (attackTiles.has(targetKey)) {
        actions.push({
          moveTarget: pos,
          actionType: 'attack',
          targetTile: { x: target.x, y: target.y },
          targetUnitId: target.id,
          score: 0,
        });
      }
    }

    return actions;
  }
}
