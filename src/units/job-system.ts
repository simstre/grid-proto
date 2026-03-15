// ─── Job Management System ───

import type { JobId } from '@/data/jobs';
import { JOBS, getJobLevel, canUnlockJob, JP_LEVEL_THRESHOLDS } from '@/data/jobs';
import { ABILITIES, getAbilitiesForJob, type AbilityDefinition } from '@/data/abilities';

// ─── Types ───

export interface UnitJobData {
  currentJobId: JobId;
  jobJP: Partial<Record<JobId, number>>;
  learnedAbilities: Set<string>;
  abilityLoadout: UnitAbilityLoadout;
}

export interface UnitAbilityLoadout {
  /** Secondary action ability set (the jobId whose action abilities are equipped), or null */
  secondaryAction: JobId | null;
  /** Equipped reaction ability id, or null */
  reactionAbility: string | null;
  /** Equipped support ability id, or null */
  supportAbility: string | null;
  /** Equipped movement ability id, or null */
  movementAbility: string | null;
}

// ─── Job Manager ───

export class JobManager {
  /**
   * Change a unit's current job.
   * Returns true if successful, false if prerequisites not met.
   */
  changeJob(unitData: UnitJobData, newJobId: JobId): boolean {
    if (!canUnlockJob(newJobId, unitData.jobJP)) {
      return false;
    }

    // Initialize JP for the new job if not present
    if (unitData.jobJP[newJobId] === undefined) {
      unitData.jobJP[newJobId] = 0;
    }

    unitData.currentJobId = newJobId;
    return true;
  }

  /**
   * Award JP to a unit for a specific job.
   * Also grants 25% of the earned JP to all other unlocked jobs (spillover).
   */
  earnJP(unitData: UnitJobData, jobId: JobId, amount: number): void {
    // Award full JP to the primary job
    const currentJP = unitData.jobJP[jobId] ?? 0;
    unitData.jobJP[jobId] = currentJP + amount;

    // Award 25% spillover to all other jobs with JP > 0
    const spillover = Math.floor(amount * 0.25);
    if (spillover > 0) {
      const allJobIds = Object.keys(unitData.jobJP) as JobId[];
      for (const otherJobId of allJobIds) {
        if (otherJobId !== jobId) {
          unitData.jobJP[otherJobId] = (unitData.jobJP[otherJobId] ?? 0) + spillover;
        }
      }
    }
  }

  /**
   * Learn an ability by spending JP.
   * Returns true if successful, false if not enough JP or ability already learned.
   */
  learnAbility(unitData: UnitJobData, abilityId: string): boolean {
    if (unitData.learnedAbilities.has(abilityId)) {
      return false; // Already learned
    }

    const ability = ABILITIES[abilityId];
    if (!ability) return false;

    const currentJP = unitData.jobJP[ability.jobId] ?? 0;
    if (currentJP < ability.jpCost) {
      return false; // Not enough JP
    }

    // Spend JP and learn the ability
    unitData.jobJP[ability.jobId] = currentJP - ability.jpCost;
    unitData.learnedAbilities.add(abilityId);
    return true;
  }

  /**
   * Get the list of jobs the unit can currently switch to
   * (i.e. prerequisites are met).
   */
  getAvailableJobs(unitData: UnitJobData): JobId[] {
    const available: JobId[] = [];
    const allJobIds = Object.keys(JOBS) as JobId[];

    for (const jobId of allJobIds) {
      if (canUnlockJob(jobId, unitData.jobJP)) {
        available.push(jobId);
      }
    }
    return available;
  }

  /**
   * Get the abilities the unit can learn in their current job
   * (not yet learned, and the unit has enough JP).
   */
  getLearnableAbilities(unitData: UnitJobData): AbilityDefinition[] {
    const jobAbilities = getAbilitiesForJob(unitData.currentJobId);
    const currentJP = unitData.jobJP[unitData.currentJobId] ?? 0;

    return jobAbilities.filter(
      (a) => !unitData.learnedAbilities.has(a.id) && currentJP >= a.jpCost
    );
  }

  /**
   * Get the unit's equipped ability loadout.
   */
  getEquippedAbilities(unitData: UnitJobData): UnitAbilityLoadout {
    return unitData.abilityLoadout;
  }

  /**
   * Get the current job level for the unit's active job.
   */
  getCurrentJobLevel(unitData: UnitJobData): number {
    const jp = unitData.jobJP[unitData.currentJobId] ?? 0;
    return getJobLevel(jp);
  }

  /**
   * Get JP progress to the next job level.
   */
  getJPProgress(unitData: UnitJobData): { current: number; nextThreshold: number; level: number } {
    const jp = unitData.jobJP[unitData.currentJobId] ?? 0;
    const level = getJobLevel(jp);
    const nextThreshold = level < JP_LEVEL_THRESHOLDS.length
      ? JP_LEVEL_THRESHOLDS[level]  // level is 1-indexed, threshold at [level] is for next
      : JP_LEVEL_THRESHOLDS[JP_LEVEL_THRESHOLDS.length - 1];

    return { current: jp, nextThreshold, level };
  }

  /**
   * Create a default UnitJobData for a new unit.
   */
  static createDefaultJobData(startingJob: JobId = 'squire'): UnitJobData {
    const jobJP: Partial<Record<JobId, number>> = {};
    jobJP[startingJob] = 0;

    return {
      currentJobId: startingJob,
      jobJP,
      learnedAbilities: new Set<string>(),
      abilityLoadout: {
        secondaryAction: null,
        reactionAbility: null,
        supportAbility: null,
        movementAbility: null,
      },
    };
  }
}

export const jobManager = new JobManager();
