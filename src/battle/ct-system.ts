import { CT_THRESHOLD, CT_COST_MOVE_AND_ACT, CT_COST_MOVE_OR_ACT, CT_COST_WAIT } from '@/core/constants';

export interface CTUnit {
  id: string;
  ct: number;
  speed: number;
  isAlive: boolean;
  hasHaste: boolean;
  hasSlow: boolean;
  hasStopped: boolean;
  isPetrified: boolean;
}

/**
 * Advance the clock by one tick. Each active unit gains CT equal to their effective speed.
 * Returns the ID of the unit that gets to act (CT >= 100), or null if no one is ready.
 */
export function advanceClockTick(units: CTUnit[]): string | null {
  // Increment CT for all active units
  for (const unit of units) {
    if (!unit.isAlive || unit.hasStopped || unit.isPetrified) continue;

    let effectiveSpeed = unit.speed;
    if (unit.hasHaste) effectiveSpeed = Math.floor(effectiveSpeed * 1.5);
    if (unit.hasSlow) effectiveSpeed = Math.floor(effectiveSpeed * 0.5);
    effectiveSpeed = Math.max(1, effectiveSpeed);

    unit.ct += effectiveSpeed;
  }

  // Find the unit with the highest CT that crosses the threshold
  let bestUnit: CTUnit | null = null;
  for (const unit of units) {
    if (!unit.isAlive || unit.hasStopped || unit.isPetrified) continue;
    if (unit.ct < CT_THRESHOLD) continue;

    if (!bestUnit || unit.ct > bestUnit.ct) {
      bestUnit = unit;
    }
  }

  return bestUnit?.id ?? null;
}

/**
 * Run the clock forward until someone gets a turn. Returns the unit ID.
 * Safety limit prevents infinite loops.
 */
export function advanceToNextTurn(units: CTUnit[], maxTicks: number = 1000): string | null {
  for (let i = 0; i < maxTicks; i++) {
    const readyId = advanceClockTick(units);
    if (readyId) return readyId;
  }
  return null;
}

/**
 * Resolve a unit's turn end. Reduce CT based on what they did.
 */
export function resolveTurnEnd(unit: CTUnit, moved: boolean, acted: boolean): void {
  if (moved && acted) {
    unit.ct -= CT_COST_MOVE_AND_ACT;
  } else if (moved || acted) {
    unit.ct -= CT_COST_MOVE_OR_ACT;
  } else {
    unit.ct -= CT_COST_WAIT;
  }
  // CT can go negative briefly, that's fine
}

/**
 * Get the predicted turn order for the next N turns.
 * Creates a simulation copy so the real state is not modified.
 */
export function predictTurnOrder(units: CTUnit[], turns: number = 10): string[] {
  // Deep clone the CT state
  const sim = units.map((u) => ({ ...u }));
  const order: string[] = [];

  for (let t = 0; t < turns; t++) {
    const id = advanceToNextTurn(sim);
    if (!id) break;

    order.push(id);

    // Assume each unit moves+acts (worst case CT reduction)
    const unit = sim.find((u) => u.id === id);
    if (unit) {
      unit.ct -= CT_COST_MOVE_AND_ACT;
    }
  }

  return order;
}
