// ─── Status Effect System ───

export type StatusType = 'buff' | 'debuff';

export interface StatusDefinition {
  id: StatusId;
  name: string;
  type: StatusType;
  /** Duration in ticks (turns). 0 = permanent until removed. */
  defaultDuration: number;
  /** Statuses that this status cancels when applied */
  cancels: StatusId[];
  /** Statuses that prevent this status from being applied */
  blockedBy: StatusId[];
}

export type StatusId =
  | 'haste' | 'slow' | 'protect' | 'shell'
  | 'regen' | 'reraise' | 'poison' | 'blind'
  | 'silence' | 'berserk' | 'confusion' | 'sleep'
  | 'stop' | 'stone' | 'death' | 'float'
  | 'invisible' | 'oil' | 'dontMove' | 'dontAct'
  | 'charm' | 'faithBuff' | 'braveBuff' | 'undead';

export interface AppliedStatus {
  id: StatusId;
  remainingDuration: number; // 0 = permanent
}

// ─── Status Registry ───

const STATUS_DEFS: StatusDefinition[] = [
  { id: 'haste',      name: 'Haste',       type: 'buff',   defaultDuration: 4,  cancels: ['slow'],      blockedBy: ['stop', 'stone', 'death'] },
  { id: 'slow',       name: 'Slow',        type: 'debuff', defaultDuration: 4,  cancels: ['haste'],     blockedBy: ['stop', 'stone', 'death'] },
  { id: 'protect',    name: 'Protect',     type: 'buff',   defaultDuration: 4,  cancels: [],            blockedBy: ['stone', 'death'] },
  { id: 'shell',      name: 'Shell',       type: 'buff',   defaultDuration: 4,  cancels: [],            blockedBy: ['stone', 'death'] },
  { id: 'regen',      name: 'Regen',       type: 'buff',   defaultDuration: 4,  cancels: ['poison'],    blockedBy: ['stone', 'death', 'undead'] },
  { id: 'reraise',    name: 'Reraise',     type: 'buff',   defaultDuration: 0,  cancels: [],            blockedBy: ['death'] },
  { id: 'poison',     name: 'Poison',      type: 'debuff', defaultDuration: 0,  cancels: ['regen'],     blockedBy: ['stone', 'death'] },
  { id: 'blind',      name: 'Blind',       type: 'debuff', defaultDuration: 0,  cancels: [],            blockedBy: ['stone', 'death'] },
  { id: 'silence',    name: 'Silence',     type: 'debuff', defaultDuration: 0,  cancels: [],            blockedBy: ['stone', 'death'] },
  { id: 'berserk',    name: 'Berserk',     type: 'debuff', defaultDuration: 0,  cancels: ['charm', 'confusion'], blockedBy: ['stone', 'death', 'stop'] },
  { id: 'confusion',  name: 'Confusion',   type: 'debuff', defaultDuration: 0,  cancels: ['charm', 'berserk'],   blockedBy: ['stone', 'death', 'stop'] },
  { id: 'sleep',      name: 'Sleep',       type: 'debuff', defaultDuration: 3,  cancels: [],            blockedBy: ['stone', 'death', 'stop'] },
  { id: 'stop',       name: 'Stop',        type: 'debuff', defaultDuration: 3,  cancels: ['haste', 'slow'], blockedBy: ['stone', 'death'] },
  { id: 'stone',      name: 'Stone',       type: 'debuff', defaultDuration: 0,  cancels: [],            blockedBy: ['death'] },
  { id: 'death',      name: 'Death',       type: 'debuff', defaultDuration: 0,  cancels: [],            blockedBy: [] },
  { id: 'float',      name: 'Float',       type: 'buff',   defaultDuration: 0,  cancels: [],            blockedBy: ['stone', 'death'] },
  { id: 'invisible',  name: 'Invisible',   type: 'buff',   defaultDuration: 3,  cancels: [],            blockedBy: ['stone', 'death'] },
  { id: 'oil',        name: 'Oil',         type: 'debuff', defaultDuration: 0,  cancels: [],            blockedBy: ['stone', 'death'] },
  { id: 'dontMove',   name: "Don't Move",  type: 'debuff', defaultDuration: 3,  cancels: [],            blockedBy: ['stone', 'death', 'stop'] },
  { id: 'dontAct',    name: "Don't Act",   type: 'debuff', defaultDuration: 3,  cancels: [],            blockedBy: ['stone', 'death', 'stop'] },
  { id: 'charm',      name: 'Charm',       type: 'debuff', defaultDuration: 3,  cancels: ['berserk', 'confusion'], blockedBy: ['stone', 'death', 'stop'] },
  { id: 'faithBuff',  name: 'Faith',       type: 'buff',   defaultDuration: 4,  cancels: [],            blockedBy: ['stone', 'death'] },
  { id: 'braveBuff',  name: 'Brave',       type: 'buff',   defaultDuration: 4,  cancels: [],            blockedBy: ['stone', 'death'] },
  { id: 'undead',     name: 'Undead',      type: 'debuff', defaultDuration: 0,  cancels: ['regen'],     blockedBy: [] },
];

const STATUS_MAP = new Map<StatusId, StatusDefinition>();
for (const def of STATUS_DEFS) {
  STATUS_MAP.set(def.id, def);
}

export function getStatusDefinition(id: StatusId): StatusDefinition | undefined {
  return STATUS_MAP.get(id);
}

// ─── Status tick effects ───

export interface StatusTickResult {
  statusId: StatusId;
  hpChange: number;   // negative = damage, positive = heal
  mpChange: number;
  expired: boolean;
  message?: string;
}

// ─── Status Manager ───

export class StatusManager {
  /**
   * Try to apply a status to a unit.
   * Returns true if the status was applied, false if blocked or immune.
   */
  applyStatus(
    statuses: AppliedStatus[],
    statusId: StatusId,
    immunities: Set<StatusId>,
    duration?: number
  ): boolean {
    const def = STATUS_MAP.get(statusId);
    if (!def) return false;

    // Check immunity
    if (immunities.has(statusId)) return false;

    // Check if blocked by an existing status
    for (const blocker of def.blockedBy) {
      if (statuses.some((s) => s.id === blocker)) return false;
    }

    // Remove statuses that this one cancels
    for (const cancelId of def.cancels) {
      this.removeStatus(statuses, cancelId);
    }

    // Remove existing instance if re-applying (refresh duration)
    this.removeStatus(statuses, statusId);

    statuses.push({
      id: statusId,
      remainingDuration: duration ?? def.defaultDuration,
    });

    return true;
  }

  /**
   * Remove a status from the array. Returns true if found and removed.
   */
  removeStatus(statuses: AppliedStatus[], statusId: StatusId): boolean {
    const idx = statuses.findIndex((s) => s.id === statusId);
    if (idx === -1) return false;
    statuses.splice(idx, 1);
    return true;
  }

  /**
   * Check if a unit has a specific status.
   */
  hasStatus(statuses: AppliedStatus[], statusId: StatusId): boolean {
    return statuses.some((s) => s.id === statusId);
  }

  /**
   * Process all status effects at the start of a unit's turn.
   * Returns tick results for display and an array of expired status IDs.
   */
  processStartOfTurn(
    statuses: AppliedStatus[],
    maxHP: number,
    _maxMP: number
  ): StatusTickResult[] {
    const results: StatusTickResult[] = [];

    for (let i = statuses.length - 1; i >= 0; i--) {
      const status = statuses[i];
      const result: StatusTickResult = {
        statusId: status.id,
        hpChange: 0,
        mpChange: 0,
        expired: false,
      };

      // Apply tick effects
      switch (status.id) {
        case 'poison':
          result.hpChange = -Math.max(1, Math.floor(maxHP / 8));
          result.message = 'Poison damage!';
          break;
        case 'regen':
          result.hpChange = Math.max(1, Math.floor(maxHP / 8));
          result.message = 'HP restored!';
          break;
      }

      // Tick down duration
      if (status.remainingDuration > 0) {
        status.remainingDuration--;
        if (status.remainingDuration <= 0) {
          result.expired = true;
          statuses.splice(i, 1);
        }
      }

      results.push(result);
    }

    return results;
  }

  /**
   * Check if a unit's turn should be skipped due to status effects.
   */
  shouldSkipTurn(statuses: AppliedStatus[]): boolean {
    return statuses.some((s) =>
      s.id === 'stop' || s.id === 'stone' || s.id === 'sleep' || s.id === 'death'
    );
  }

  /**
   * Check if a unit cannot move due to status.
   */
  cannotMove(statuses: AppliedStatus[]): boolean {
    return statuses.some((s) => s.id === 'dontMove');
  }

  /**
   * Check if a unit cannot act due to status.
   */
  cannotAct(statuses: AppliedStatus[]): boolean {
    return statuses.some((s) => s.id === 'dontAct' || s.id === 'silence');
  }
}

/** Singleton status manager */
export const statusManager = new StatusManager();
