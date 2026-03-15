// ─── Pre-Battle Formation Screen ───

import type { RosterUnit } from '@/overworld/roster';
import type { StoryBattle } from '@/data/campaign';

// ─── Types ───

export interface UnitPlacement {
  unitId: string;
  position: { x: number; y: number };
}

export interface FormationData {
  battleId: string;
  placements: UnitPlacement[];
}

export interface FormationValidationResult {
  valid: boolean;
  errors: string[];
}

// ─── Constants ───

/** Maximum number of player units per battle (FFT standard) */
export const MAX_DEPLOYMENT = 5;

/** Minimum number of player units per battle */
export const MIN_DEPLOYMENT = 1;

// ─── FormationManager ───

export class FormationManager {
  private currentFormation: FormationData | null = null;

  /**
   * Get the list of units available for deployment.
   * Filters out units who are KO'd or otherwise unavailable.
   */
  getAvailableUnits(roster: RosterUnit[]): RosterUnit[] {
    return roster.filter((unit) => unit.level > 0);
  }

  /**
   * Set the formation for a battle.
   */
  setFormation(battleId: string, unitPlacements: UnitPlacement[]): void {
    this.currentFormation = {
      battleId,
      placements: [...unitPlacements],
    };
  }

  /**
   * Get the current formation, if set.
   */
  getFormation(): FormationData | null {
    return this.currentFormation;
  }

  /**
   * Clear the current formation.
   */
  clearFormation(): void {
    this.currentFormation = null;
  }

  /**
   * Validate a formation against battle requirements.
   */
  validateFormation(
    formation: FormationData,
    battle: StoryBattle,
    availableUnits: RosterUnit[]
  ): FormationValidationResult {
    const errors: string[] = [];

    // Check unit count
    if (formation.placements.length < MIN_DEPLOYMENT) {
      errors.push(`Must deploy at least ${MIN_DEPLOYMENT} unit(s).`);
    }
    if (formation.placements.length > MAX_DEPLOYMENT) {
      errors.push(`Cannot deploy more than ${MAX_DEPLOYMENT} units.`);
    }

    // Check for duplicate units
    const unitIds = formation.placements.map((p) => p.unitId);
    const uniqueIds = new Set(unitIds);
    if (uniqueIds.size !== unitIds.length) {
      errors.push('Cannot deploy the same unit more than once.');
    }

    // Check for duplicate positions
    const posKeys = formation.placements.map((p) => `${p.position.x},${p.position.y}`);
    const uniquePos = new Set(posKeys);
    if (uniquePos.size !== posKeys.length) {
      errors.push('Two units cannot occupy the same starting position.');
    }

    // Check all unit ids exist in roster
    const availableIds = new Set(availableUnits.map((u) => u.id));
    for (const placement of formation.placements) {
      if (!availableIds.has(placement.unitId)) {
        errors.push(`Unit "${placement.unitId}" is not available for deployment.`);
      }
    }

    // Check battle id matches
    if (formation.battleId !== battle.id) {
      errors.push('Formation battle ID does not match the target battle.');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Auto-fill a formation using the first N available units placed at
   * the map's player start positions.
   */
  autoFormation(
    battleId: string,
    availableUnits: RosterUnit[],
    startPositions: { x: number; y: number }[]
  ): FormationData {
    const count = Math.min(availableUnits.length, startPositions.length, MAX_DEPLOYMENT);
    const placements: UnitPlacement[] = [];

    for (let i = 0; i < count; i++) {
      placements.push({
        unitId: availableUnits[i].id,
        position: { ...startPositions[i] },
      });
    }

    const formation: FormationData = { battleId, placements };
    this.currentFormation = formation;
    return formation;
  }
}

export const formationManager = new FormationManager();
