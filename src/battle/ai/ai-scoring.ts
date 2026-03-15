// ─── AI Action Scoring System ───
// Evaluates (move, action) pairs and assigns scores to determine optimal AI decisions.
// Scoring weights are tunable and modified by AI behavior profiles.

import type { BattleUnit } from '@/battle/battle-manager';
import type { BattleMapData } from '@/data/maps/map-types';
import { calculateAttackRange } from '@/battle/movement';
import type { ScoringWeights } from './ai-behaviors';

// ─── Types ───

export type AIActionType = 'attack' | 'ability' | 'wait' | 'item';

export interface AIAction {
  moveTarget: { x: number; y: number };
  actionType: AIActionType;
  targetTile?: { x: number; y: number };
  targetUnitId?: string;
  score: number;
}

// ─── Base scoring constants ───

const SCORE_KILL = 1000;
const SCORE_DAMAGE_MIN = 100;
const SCORE_DAMAGE_MAX = 500;
const SCORE_HEAL_LOW_ALLY = 400;
const SCORE_SELF_PRESERVATION = 200;
const SCORE_CLUSTER_MIN = 50;
const SCORE_CLUSTER_MAX = 100;
const SCORE_VULNERABILITY_MIN = -300;
const SCORE_VULNERABILITY_MAX = -100;
const SCORE_STATUS_MIN = 100;
const SCORE_STATUS_MAX = 200;

// ─── Helpers ───

/**
 * Quick damage estimate without full formula — used for scoring, not actual damage.
 * Avoids randomness (crits, random weapons) for consistent AI evaluation.
 */
export function estimateDamage(attacker: BattleUnit, defender: BattleUnit): number {
  // Simple PA * WP estimate for physical, MA * WP for magic weapons
  const isMagicWeapon = attacker.weaponCategory === 'staff' || attacker.weaponCategory === 'rod';
  const baseStat = isMagicWeapon ? attacker.ma : attacker.pa;
  let damage = baseStat * attacker.weaponPower;

  // Rough hit chance factor (don't estimate full evasion, just basic)
  const hitFactor = Math.min(1.0, (attacker.weaponAccuracy + attacker.speed - defender.speed) / 100);
  damage = Math.floor(damage * Math.max(0.1, hitFactor));

  return Math.max(1, damage);
}

function manhattanDist(ax: number, ay: number, bx: number, by: number): number {
  return Math.abs(ax - bx) + Math.abs(ay - by);
}

/**
 * Count how many enemy units can attack a given position.
 */
function countThreatsAtPosition(
  x: number,
  y: number,
  unit: BattleUnit,
  allUnits: BattleUnit[],
  map: BattleMapData
): number {
  let threats = 0;
  for (const other of allUnits) {
    if (!other.isAlive || other.team === unit.team) continue;
    // Check if enemy could reach this tile with attack (from their current position)
    const dist = manhattanDist(other.x, other.y, x, y);
    // Simple check: can enemy reach within move + attack range?
    if (dist <= other.move + other.attackRange) {
      threats++;
    }
  }
  return threats;
}

/**
 * Count nearby allies for clustering bonus.
 */
function countNearbyAllies(
  x: number,
  y: number,
  unit: BattleUnit,
  allUnits: BattleUnit[]
): number {
  let count = 0;
  for (const other of allUnits) {
    if (!other.isAlive || other.id === unit.id || other.team !== unit.team) continue;
    if (manhattanDist(x, y, other.x, other.y) <= 3) {
      count++;
    }
  }
  return count;
}

/**
 * Find the nearest enemy distance from a position.
 */
function nearestEnemyDist(
  x: number,
  y: number,
  unit: BattleUnit,
  allUnits: BattleUnit[]
): number {
  let minDist = Infinity;
  for (const other of allUnits) {
    if (!other.isAlive || other.team === unit.team) continue;
    const d = manhattanDist(x, y, other.x, other.y);
    if (d < minDist) minDist = d;
  }
  return minDist;
}

// ─── Main scoring function ───

/**
 * Score a single (move, action) pair for an AI unit.
 */
export function scoreAction(
  action: AIAction,
  unit: BattleUnit,
  allUnits: BattleUnit[],
  map: BattleMapData,
  weights: ScoringWeights
): number {
  let score = 0;
  const mx = action.moveTarget.x;
  const my = action.moveTarget.y;

  // ─── Attack scoring ───
  if (action.actionType === 'attack' && action.targetUnitId) {
    const target = allUnits.find((u) => u.id === action.targetUnitId);
    if (target && target.isAlive) {
      const estDmg = estimateDamage(unit, target);

      // Kill potential
      if (estDmg >= target.currentHP) {
        score += SCORE_KILL * weights.killPotential;
      }

      // Damage as % of target maxHP (scaled between SCORE_DAMAGE_MIN and SCORE_DAMAGE_MAX)
      const dmgPct = Math.min(1.0, estDmg / target.maxHP);
      score += (SCORE_DAMAGE_MIN + (SCORE_DAMAGE_MAX - SCORE_DAMAGE_MIN) * dmgPct) * weights.damageDealt;

      // Prefer targeting low-HP enemies (easier kills)
      const targetHpPct = target.currentHP / target.maxHP;
      if (targetHpPct < 0.3) {
        score += 150 * weights.killPotential;
      }
    }
  }

  // ─── Wait scoring ───
  if (action.actionType === 'wait') {
    // Slight penalty for doing nothing when enemies exist
    score -= 50;
  }

  // ─── Positional scoring (applies to all actions) ───

  // After-move vulnerability: how many enemies can attack this position
  const threats = countThreatsAtPosition(mx, my, unit, allUnits, map);
  const vulnScore = threats === 0
    ? 0
    : SCORE_VULNERABILITY_MIN + (SCORE_VULNERABILITY_MAX - SCORE_VULNERABILITY_MIN) * Math.min(1, (threats - 1) / 3);
  score += vulnScore * weights.afterMoveVulnerability;

  // Clustering: stay near allies
  const nearbyAllies = countNearbyAllies(mx, my, unit, allUnits);
  const clusterScore = SCORE_CLUSTER_MIN + (SCORE_CLUSTER_MAX - SCORE_CLUSTER_MIN) * Math.min(1, nearbyAllies / 3);
  score += clusterScore * weights.clustering;

  // Self-preservation: if HP is low, prefer safer positions
  const hpPct = unit.currentHP / unit.maxHP;
  if (hpPct < 0.4) {
    // Bonus for moving away from enemies when hurt
    const enemyDist = nearestEnemyDist(mx, my, unit, allUnits);
    if (enemyDist > 2) {
      score += SCORE_SELF_PRESERVATION * (1 - hpPct) * weights.selfPreservation;
    }
  }

  // Flee from enemies (mainly for healers)
  if (weights.fleeFromEnemies > 1.0) {
    const enemyDist = nearestEnemyDist(mx, my, unit, allUnits);
    score += Math.min(enemyDist * 20, 150) * (weights.fleeFromEnemies - 1.0);
  }

  // Coward behavior: strong flee when HP < 50%
  if (weights.selfPreservation >= 2.0 && hpPct < 0.5) {
    const enemyDist = nearestEnemyDist(mx, my, unit, allUnits);
    score += enemyDist * 40 * weights.selfPreservation;
    // Only attack if no enemies adjacent
    if (action.actionType === 'attack' && threats > 0) {
      score -= 200;
    }
  }

  // Avoid combat modifier (for support units)
  if (weights.avoidCombat > 1.0 && action.actionType === 'attack') {
    score -= 100 * (weights.avoidCombat - 1.0);
  }

  return score;
}

/**
 * Score a healing action on an ally.
 */
export function scoreHealAction(
  targetUnit: BattleUnit,
  healAmount: number,
  weights: ScoringWeights
): number {
  const hpPct = targetUnit.currentHP / targetUnit.maxHP;

  // High priority if ally is below 30% HP
  if (hpPct < 0.3) {
    return SCORE_HEAL_LOW_ALLY * weights.healingAlly;
  }

  // Medium priority for allies below 60%
  if (hpPct < 0.6) {
    return (SCORE_HEAL_LOW_ALLY * 0.5) * weights.healingAlly;
  }

  // Low priority for minor healing
  return 50 * weights.healingAlly;
}

/**
 * Score applying a status effect.
 */
export function scoreStatusAction(
  _statusId: string,
  _targetUnit: BattleUnit,
  weights: ScoringWeights
): number {
  // Base status value (can be expanded per-status later)
  return ((SCORE_STATUS_MIN + SCORE_STATUS_MAX) / 2) * weights.statusInfliction;
}
