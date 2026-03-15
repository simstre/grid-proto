// ─── Party Roster Management ───

import type { JobId } from '@/data/jobs';
import { JOBS } from '@/data/jobs';

// ─── Types ───

export interface EquipmentLoadout {
  weapon: string | null;
  shield: string | null;
  head: string | null;
  body: string | null;
  accessory: string | null;
}

export interface RosterUnit {
  id: string;
  name: string;
  level: number;
  exp: number;
  jobId: JobId;
  jobName: string;
  equipment: EquipmentLoadout;
  isStoryCharacter: boolean;

  // Base stats (before job multipliers)
  baseHP: number;
  baseMP: number;
  basePA: number;
  baseMA: number;
  baseSpeed: number;

  // Derived stats (after job multipliers, set by recalcStats)
  maxHP: number;
  maxMP: number;
  pa: number;
  ma: number;
  speed: number;
  move: number;
  jump: number;
  brave: number;
  faith: number;

  // JP for each job the unit has trained
  jobJP: Partial<Record<JobId, number>>;
}

// ─── Stat calculation ───

function recalcStats(unit: RosterUnit): void {
  const job = JOBS[unit.jobId];
  if (!job) return;

  unit.maxHP = Math.floor(unit.baseHP * job.hpMult);
  unit.maxMP = Math.floor(unit.baseMP * job.mpMult);
  unit.pa = Math.floor(unit.basePA * job.paMult);
  unit.ma = Math.floor(unit.baseMA * job.maMult);
  unit.speed = Math.floor(unit.baseSpeed * job.speedMult);
  unit.move = job.moveBase;
  unit.jump = job.jumpBase;
  unit.jobName = job.name;
}

// ─── Level-up logic ───

function applyLevelUp(unit: RosterUnit): void {
  const job = JOBS[unit.jobId];
  if (!job) return;

  unit.level += 1;

  // Increase base stats using job growth rates
  // Growth values are per 100 (so 50 means +0.5 per level, accumulated)
  unit.baseHP += Math.max(1, Math.floor(job.hpGrowth / 10));
  unit.baseMP += Math.max(0, Math.floor(job.mpGrowth / 10));

  // PA/MA/Speed grow slower — roughly 1 point every 4–5 levels
  if (unit.level % 3 === 0) {
    unit.basePA += job.paGrowth >= 45 ? 1 : 0;
    unit.baseMA += job.maGrowth >= 45 ? 1 : 0;
  }
  if (unit.level % 4 === 0) {
    unit.baseSpeed += job.speedGrowth >= 95 ? 1 : 0;
  }

  recalcStats(unit);
}

// ─── Roster class ───

export class Roster {
  private units: Map<string, RosterUnit> = new Map();

  addUnit(unit: RosterUnit): void {
    recalcStats(unit);
    this.units.set(unit.id, unit);
  }

  removeUnit(id: string): boolean {
    const unit = this.units.get(id);
    if (unit?.isStoryCharacter) return false; // can't remove story characters
    return this.units.delete(id);
  }

  getUnit(id: string): RosterUnit | undefined {
    return this.units.get(id);
  }

  getAllUnits(): RosterUnit[] {
    return Array.from(this.units.values());
  }

  getUnitCount(): number {
    return this.units.size;
  }

  /**
   * Award EXP to a unit. Triggers level-up(s) if EXP threshold is crossed.
   * 100 EXP per level.
   */
  awardExp(unitId: string, amount: number): { leveled: boolean; newLevel: number } {
    const unit = this.units.get(unitId);
    if (!unit) return { leveled: false, newLevel: 0 };

    unit.exp += amount;
    let leveled = false;

    while (unit.exp >= 100) {
      unit.exp -= 100;
      applyLevelUp(unit);
      leveled = true;
    }

    return { leveled, newLevel: unit.level };
  }

  /**
   * Award JP to a unit for a specific job.
   */
  awardJP(unitId: string, jobId: JobId, amount: number): void {
    const unit = this.units.get(unitId);
    if (!unit) return;

    unit.jobJP[jobId] = (unit.jobJP[jobId] ?? 0) + amount;
  }

  /**
   * Change a unit's job (if allowed).
   */
  changeJob(unitId: string, newJobId: JobId): boolean {
    const unit = this.units.get(unitId);
    if (!unit) return false;

    const job = JOBS[newJobId];
    if (!job) return false;

    unit.jobId = newJobId;
    recalcStats(unit);
    return true;
  }
}

// ─── Starting roster factory ───

function createRosterUnit(
  id: string,
  name: string,
  jobId: JobId,
  level: number,
  isStoryCharacter: boolean,
  overrides: Partial<RosterUnit> = {}
): RosterUnit {
  const unit: RosterUnit = {
    id,
    name,
    level,
    exp: 0,
    jobId,
    jobName: '',
    equipment: { weapon: null, shield: null, head: null, body: null, accessory: null },
    isStoryCharacter,
    baseHP: 80 + level * 10,
    baseMP: 20 + level * 3,
    basePA: 6 + Math.floor(level * 0.8),
    baseMA: 5 + Math.floor(level * 0.6),
    baseSpeed: 5 + Math.floor(level * 0.4),
    maxHP: 0,
    maxMP: 0,
    pa: 0,
    ma: 0,
    speed: 0,
    move: 0,
    jump: 0,
    brave: 70,
    faith: 70,
    jobJP: {},
    ...overrides,
  };

  return unit;
}

/**
 * Create the starting party roster.
 */
export function createStartingRoster(): Roster {
  const roster = new Roster();

  roster.addUnit(createRosterUnit('ramza', 'Ramza', 'squire', 3, true, {
    brave: 75,
    faith: 70,
    equipment: { weapon: 'broadSword', shield: 'buckler', head: 'leatherCap', body: 'leatherArmor', accessory: null },
  }));

  roster.addUnit(createRosterUnit('delita', 'Delita', 'knight', 4, true, {
    brave: 80,
    faith: 65,
    equipment: { weapon: 'longSword', shield: 'bronzeShield', head: 'ironHelm', body: 'chainMail', accessory: null },
  }));

  roster.addUnit(createRosterUnit('generic1', 'Algus', 'squire', 1, false, {
    brave: 65,
    faith: 60,
    equipment: { weapon: 'broadSword', shield: null, head: null, body: 'leatherArmor', accessory: null },
  }));

  roster.addUnit(createRosterUnit('generic2', 'Lavian', 'chemist', 1, false, {
    brave: 60,
    faith: 75,
    equipment: { weapon: null, shield: null, head: 'featherHat', body: 'linenRobe', accessory: null },
  }));

  return roster;
}
