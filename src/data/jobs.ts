// ─── Job Definitions ───

import type { WeaponCategory } from '@/battle/damage-calc';

// ─── Types ───

export type JobId =
  | 'squire' | 'chemist'
  | 'knight' | 'archer'
  | 'whiteMage' | 'blackMage'
  | 'monk' | 'thief'
  | 'timeMage' | 'summoner'
  | 'geomancer' | 'dragoon'
  | 'samurai' | 'ninja'
  | 'calculator' | 'dancer'
  | 'bard' | 'mime'
  | 'oracle' | 'mediator';

export type ArmorCategory = 'shield' | 'helmet' | 'hat' | 'armor' | 'clothing' | 'robe' | 'accessory';
export type GenderRestriction = 'male' | 'female' | null;

export interface JobPrerequisite {
  jobId: JobId;
  level: number;
}

export interface JobDefinition {
  id: JobId;
  name: string;
  description: string;
  prerequisites: JobPrerequisite[];
  genderRestriction: GenderRestriction;

  // Stat multipliers (applied to base stats)
  hpMult: number;
  mpMult: number;
  paMult: number;
  maMult: number;
  speedMult: number;
  moveBase: number;
  jumpBase: number;

  // Stat growth per level
  hpGrowth: number;
  mpGrowth: number;
  paGrowth: number;
  maGrowth: number;
  speedGrowth: number;

  // Equipment
  equippableWeapons: WeaponCategory[];
  equippableArmor: ArmorCategory[];

  // Innate action ability set
  innateActionAbilitySet: string;
}

/** JP thresholds for job levels 1–8 */
export const JP_LEVEL_THRESHOLDS: number[] = [0, 100, 200, 400, 700, 1100, 1600, 2100];

// ─── Job Definitions ───

const jobDefs: JobDefinition[] = [
  {
    id: 'squire',
    name: 'Squire',
    description: 'A basic fighter who serves as a foundation for all other jobs.',
    prerequisites: [],
    genderRestriction: null,
    hpMult: 1.0, mpMult: 0.8, paMult: 1.0, maMult: 0.8, speedMult: 1.0,
    moveBase: 4, jumpBase: 3,
    hpGrowth: 11, mpGrowth: 3, paGrowth: 48, maGrowth: 46, speedGrowth: 100,
    equippableWeapons: ['sword', 'knightSword', 'axe', 'knife'],
    equippableArmor: ['shield', 'helmet', 'armor', 'clothing', 'accessory'],
    innateActionAbilitySet: 'Fundamentals',
  },
  {
    id: 'chemist',
    name: 'Chemist',
    description: 'A specialist in using items to heal and support allies.',
    prerequisites: [],
    genderRestriction: null,
    hpMult: 0.8, mpMult: 0.8, paMult: 0.75, maMult: 0.8, speedMult: 1.0,
    moveBase: 3, jumpBase: 3,
    hpGrowth: 8, mpGrowth: 3, paGrowth: 40, maGrowth: 50, speedGrowth: 100,
    equippableWeapons: ['gun', 'knife'],
    equippableArmor: ['hat', 'clothing', 'accessory'],
    innateActionAbilitySet: 'Items',
  },
  {
    id: 'knight',
    name: 'Knight',
    description: 'A heavily armored warrior skilled at breaking enemy equipment and stats.',
    prerequisites: [{ jobId: 'squire', level: 2 }],
    genderRestriction: null,
    hpMult: 1.2, mpMult: 0.5, paMult: 1.2, maMult: 0.6, speedMult: 0.9,
    moveBase: 3, jumpBase: 3,
    hpGrowth: 12, mpGrowth: 2, paGrowth: 50, maGrowth: 40, speedGrowth: 95,
    equippableWeapons: ['sword', 'knightSword'],
    equippableArmor: ['shield', 'helmet', 'armor', 'accessory'],
    innateActionAbilitySet: 'Battle Skill',
  },
  {
    id: 'archer',
    name: 'Archer',
    description: 'A ranged fighter who can charge shots for extra damage.',
    prerequisites: [{ jobId: 'squire', level: 2 }],
    genderRestriction: null,
    hpMult: 0.9, mpMult: 0.5, paMult: 0.9, maMult: 0.6, speedMult: 1.0,
    moveBase: 3, jumpBase: 3,
    hpGrowth: 10, mpGrowth: 2, paGrowth: 45, maGrowth: 40, speedGrowth: 100,
    equippableWeapons: ['bow', 'crossbow'],
    equippableArmor: ['hat', 'clothing', 'accessory'],
    innateActionAbilitySet: 'Charge',
  },
  {
    id: 'whiteMage',
    name: 'White Mage',
    description: 'A healer who wields restorative and protective magic.',
    prerequisites: [{ jobId: 'chemist', level: 2 }],
    genderRestriction: null,
    hpMult: 0.8, mpMult: 1.2, paMult: 0.5, maMult: 1.2, speedMult: 0.9,
    moveBase: 3, jumpBase: 3,
    hpGrowth: 8, mpGrowth: 8, paGrowth: 30, maGrowth: 55, speedGrowth: 90,
    equippableWeapons: ['staff'],
    equippableArmor: ['hat', 'robe', 'accessory'],
    innateActionAbilitySet: 'White Magic',
  },
  {
    id: 'blackMage',
    name: 'Black Mage',
    description: 'A master of destructive elemental magic.',
    prerequisites: [{ jobId: 'chemist', level: 2 }],
    genderRestriction: null,
    hpMult: 0.7, mpMult: 1.3, paMult: 0.4, maMult: 1.5, speedMult: 0.9,
    moveBase: 3, jumpBase: 3,
    hpGrowth: 7, mpGrowth: 9, paGrowth: 25, maGrowth: 60, speedGrowth: 90,
    equippableWeapons: ['rod'],
    equippableArmor: ['hat', 'robe', 'accessory'],
    innateActionAbilitySet: 'Black Magic',
  },
  {
    id: 'monk',
    name: 'Monk',
    description: 'A martial artist who fights bare-handed with devastating power.',
    prerequisites: [{ jobId: 'knight', level: 2 }],
    genderRestriction: null,
    hpMult: 1.3, mpMult: 0.5, paMult: 1.3, maMult: 0.5, speedMult: 1.1,
    moveBase: 3, jumpBase: 4,
    hpGrowth: 13, mpGrowth: 2, paGrowth: 55, maGrowth: 35, speedGrowth: 105,
    equippableWeapons: ['fist'],
    equippableArmor: ['hat', 'clothing', 'accessory'],
    innateActionAbilitySet: 'Punch Art',
  },
  {
    id: 'thief',
    name: 'Thief',
    description: 'A nimble rogue who steals from enemies and moves quickly.',
    prerequisites: [{ jobId: 'archer', level: 2 }],
    genderRestriction: null,
    hpMult: 0.85, mpMult: 0.5, paMult: 0.9, maMult: 0.5, speedMult: 1.3,
    moveBase: 4, jumpBase: 4,
    hpGrowth: 9, mpGrowth: 2, paGrowth: 45, maGrowth: 30, speedGrowth: 120,
    equippableWeapons: ['knife'],
    equippableArmor: ['hat', 'clothing', 'accessory'],
    innateActionAbilitySet: 'Steal',
  },
  {
    id: 'timeMage',
    name: 'Time Mage',
    description: 'A wizard who manipulates time and space.',
    prerequisites: [{ jobId: 'whiteMage', level: 2 }],
    genderRestriction: null,
    hpMult: 0.7, mpMult: 1.2, paMult: 0.4, maMult: 1.3, speedMult: 1.0,
    moveBase: 3, jumpBase: 3,
    hpGrowth: 7, mpGrowth: 8, paGrowth: 25, maGrowth: 55, speedGrowth: 100,
    equippableWeapons: ['staff'],
    equippableArmor: ['hat', 'robe', 'accessory'],
    innateActionAbilitySet: 'Time Magic',
  },
  {
    id: 'summoner',
    name: 'Summoner',
    description: 'A mage who calls forth powerful espers to aid in battle.',
    prerequisites: [{ jobId: 'timeMage', level: 2 }],
    genderRestriction: null,
    hpMult: 0.65, mpMult: 1.5, paMult: 0.35, maMult: 1.5, speedMult: 0.85,
    moveBase: 3, jumpBase: 3,
    hpGrowth: 6, mpGrowth: 10, paGrowth: 20, maGrowth: 65, speedGrowth: 85,
    equippableWeapons: ['staff', 'rod'],
    equippableArmor: ['hat', 'robe', 'accessory'],
    innateActionAbilitySet: 'Summon Magic',
  },
  {
    id: 'oracle',
    name: 'Oracle',
    description: 'A mystic who uses Yin-Yang magic to inflict debilitating status effects.',
    prerequisites: [{ jobId: 'whiteMage', level: 3 }],
    genderRestriction: null,
    hpMult: 0.75, mpMult: 1.1, paMult: 0.5, maMult: 1.2, speedMult: 0.95,
    moveBase: 3, jumpBase: 3,
    hpGrowth: 7, mpGrowth: 7, paGrowth: 30, maGrowth: 55, speedGrowth: 95,
    equippableWeapons: ['staff', 'book'],
    equippableArmor: ['hat', 'robe', 'accessory'],
    innateActionAbilitySet: 'Yin-Yang Magic',
  },
  {
    id: 'mediator',
    name: 'Mediator',
    description: 'A negotiator who uses talk skills to manipulate allies and enemies.',
    prerequisites: [{ jobId: 'oracle', level: 2 }],
    genderRestriction: null,
    hpMult: 0.8, mpMult: 0.8, paMult: 0.8, maMult: 0.9, speedMult: 1.0,
    moveBase: 3, jumpBase: 3,
    hpGrowth: 8, mpGrowth: 5, paGrowth: 40, maGrowth: 50, speedGrowth: 100,
    equippableWeapons: ['gun', 'knife'],
    equippableArmor: ['hat', 'clothing', 'accessory'],
    innateActionAbilitySet: 'Talk Skill',
  },
  {
    id: 'geomancer',
    name: 'Geomancer',
    description: 'A nature warrior who uses the terrain itself as a weapon.',
    prerequisites: [{ jobId: 'monk', level: 3 }],
    genderRestriction: null,
    hpMult: 1.0, mpMult: 0.8, paMult: 1.0, maMult: 1.0, speedMult: 1.0,
    moveBase: 4, jumpBase: 3,
    hpGrowth: 10, mpGrowth: 5, paGrowth: 45, maGrowth: 50, speedGrowth: 100,
    equippableWeapons: ['sword', 'axe'],
    equippableArmor: ['shield', 'hat', 'clothing', 'accessory'],
    innateActionAbilitySet: 'Elemental',
  },
  {
    id: 'dragoon',
    name: 'Dragoon',
    description: 'A spear-wielding warrior who leaps into battle from above.',
    prerequisites: [{ jobId: 'thief', level: 3 }],
    genderRestriction: null,
    hpMult: 1.1, mpMult: 0.5, paMult: 1.1, maMult: 0.5, speedMult: 0.95,
    moveBase: 3, jumpBase: 5,
    hpGrowth: 11, mpGrowth: 2, paGrowth: 50, maGrowth: 35, speedGrowth: 95,
    equippableWeapons: ['spear'],
    equippableArmor: ['shield', 'helmet', 'armor', 'accessory'],
    innateActionAbilitySet: 'Jump',
  },
  {
    id: 'samurai',
    name: 'Samurai',
    description: 'A master swordsman who draws power from katanas.',
    prerequisites: [
      { jobId: 'knight', level: 4 },
      { jobId: 'monk', level: 5 },
      { jobId: 'dragoon', level: 2 },
    ],
    genderRestriction: null,
    hpMult: 1.1, mpMult: 0.6, paMult: 1.3, maMult: 0.7, speedMult: 1.0,
    moveBase: 3, jumpBase: 3,
    hpGrowth: 11, mpGrowth: 3, paGrowth: 55, maGrowth: 40, speedGrowth: 100,
    equippableWeapons: ['katana'],
    equippableArmor: ['helmet', 'armor', 'clothing', 'accessory'],
    innateActionAbilitySet: 'Draw Out',
  },
  {
    id: 'ninja',
    name: 'Ninja',
    description: 'A swift assassin who can dual-wield and throw items.',
    prerequisites: [
      { jobId: 'archer', level: 4 },
      { jobId: 'thief', level: 5 },
      { jobId: 'geomancer', level: 2 },
    ],
    genderRestriction: null,
    hpMult: 0.85, mpMult: 0.3, paMult: 1.1, maMult: 0.4, speedMult: 1.5,
    moveBase: 4, jumpBase: 4,
    hpGrowth: 9, mpGrowth: 1, paGrowth: 50, maGrowth: 25, speedGrowth: 130,
    equippableWeapons: ['ninjaBlade', 'knife'],
    equippableArmor: ['hat', 'clothing', 'accessory'],
    innateActionAbilitySet: 'Throw',
  },
  {
    id: 'calculator',
    name: 'Calculator',
    description: 'A scholar who casts spells instantly using mathematical conditions.',
    prerequisites: [
      { jobId: 'whiteMage', level: 4 },
      { jobId: 'blackMage', level: 4 },
      { jobId: 'timeMage', level: 3 },
      { jobId: 'oracle', level: 3 },
    ],
    genderRestriction: null,
    hpMult: 0.6, mpMult: 0.5, paMult: 0.3, maMult: 1.0, speedMult: 0.5,
    moveBase: 3, jumpBase: 3,
    hpGrowth: 5, mpGrowth: 4, paGrowth: 15, maGrowth: 45, speedGrowth: 50,
    equippableWeapons: ['book', 'staff'],
    equippableArmor: ['hat', 'robe', 'accessory'],
    innateActionAbilitySet: 'Math Skill',
  },
  {
    id: 'dancer',
    name: 'Dancer',
    description: 'An enchanting performer whose dances weaken all enemies.',
    prerequisites: [
      { jobId: 'geomancer', level: 4 },
      { jobId: 'dragoon', level: 4 },
    ],
    genderRestriction: 'female',
    hpMult: 0.75, mpMult: 0.7, paMult: 0.7, maMult: 0.8, speedMult: 1.2,
    moveBase: 4, jumpBase: 3,
    hpGrowth: 7, mpGrowth: 4, paGrowth: 35, maGrowth: 45, speedGrowth: 115,
    equippableWeapons: ['cloth', 'knife'],
    equippableArmor: ['hat', 'clothing', 'accessory'],
    innateActionAbilitySet: 'Dance',
  },
  {
    id: 'bard',
    name: 'Bard',
    description: 'A musical performer whose songs buff all allies.',
    prerequisites: [
      { jobId: 'summoner', level: 4 },
      { jobId: 'mediator', level: 4 },
    ],
    genderRestriction: 'male',
    hpMult: 0.7, mpMult: 0.9, paMult: 0.5, maMult: 0.9, speedMult: 1.1,
    moveBase: 3, jumpBase: 3,
    hpGrowth: 6, mpGrowth: 6, paGrowth: 25, maGrowth: 50, speedGrowth: 105,
    equippableWeapons: ['instrument'],
    equippableArmor: ['hat', 'clothing', 'accessory'],
    innateActionAbilitySet: 'Sing',
  },
  {
    id: 'mime',
    name: 'Mime',
    description: 'A mysterious performer who mimics the last action used by any ally.',
    prerequisites: [
      { jobId: 'squire', level: 8 },
      { jobId: 'chemist', level: 8 },
      { jobId: 'geomancer', level: 4 },
      { jobId: 'dragoon', level: 4 },
      { jobId: 'summoner', level: 4 },
      { jobId: 'mediator', level: 4 },
    ],
    genderRestriction: null,
    hpMult: 1.0, mpMult: 1.0, paMult: 1.0, maMult: 1.0, speedMult: 1.0,
    moveBase: 3, jumpBase: 3,
    hpGrowth: 10, mpGrowth: 5, paGrowth: 45, maGrowth: 45, speedGrowth: 100,
    equippableWeapons: [],
    equippableArmor: ['accessory'],
    innateActionAbilitySet: 'Mimic',
  },
];

// ─── Exports ───

export const JOBS: Record<JobId, JobDefinition> = {} as Record<JobId, JobDefinition>;
for (const job of jobDefs) {
  JOBS[job.id] = job;
}

export function getJob(id: JobId): JobDefinition {
  return JOBS[id];
}

/**
 * Get the job level (1–8) from earned JP for that job.
 */
export function getJobLevel(jp: number): number {
  for (let i = JP_LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (jp >= JP_LEVEL_THRESHOLDS[i]) return i + 1;
  }
  return 1;
}

/**
 * Check if a unit can unlock a given job based on their JP across all jobs.
 */
export function canUnlockJob(
  jobId: JobId,
  jobJP: Partial<Record<JobId, number>>
): boolean {
  const job = JOBS[jobId];
  if (!job) return false;
  for (const prereq of job.prerequisites) {
    const jp = jobJP[prereq.jobId] ?? 0;
    if (getJobLevel(jp) < prereq.level) return false;
  }
  return true;
}
